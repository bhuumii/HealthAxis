"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw, SlidersHorizontal } from "lucide-react";
import { AnimatedNumber, entranceTransition, riseIn, staggerContainer } from "@/components/motion-primitives";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/components/language-provider";
import { districtKpis, getDistrictStatuses, getRedistributionRecommendations } from "@/lib/analytics";
import { detectCentreAnomalies } from "@/lib/anomalyDetection";
import { useDistrictData } from "@/lib/use-district-data";
import {
  BASE_SIMULATION_LEVERS,
  SIMULATION_PRESETS,
  applyScenarioSimulation,
  simulationIsActive,
  type SimulationLevers
} from "@/lib/simulation";
import type { CentreStatus, StockForecast } from "@/lib/types";


const simulatorCopy = {
  en: {
    title: "Scenario simulator",
    lead: "Adjust hypothetical operating conditions and see how the same dashboard calculations respond without changing live data.",
    reset: "Reset to live data",
    banner: "Simulation mode - showing hypothetical results, not live data",
    controls: "Scenario controls",
    better: "Better",
    worse: "Worse",
    neutral: "| 1x",
    before: "Before",
    after: "After",
    interventionImpact: "Intervention impact",
    interventionLead: "Centres entering or leaving the district intervention list under this scenario.",
    newlyNeeds: "Newly needs intervention",
    dropsOut: "Drops out",
    noNew: "No new centres enter the list.",
    noDrop: "No centres drop out.",
    updatedRisk: "Updated risk score",
    forecastChanges: "Stock-out forecast changes",
    forecastLead: "Largest simulated medicine forecast changes using the existing EWMA forecast.",
    noStockWarnings: "No simulated stock warnings.",
    redistributionPlan: "Simulated redistribution plan",
    redistributionLead: "Recommendations from the existing redistribution algorithm after applying the scenario.",
    transfers: "transfers",
    transfer: "Transfer",
    move: "Move",
    priority: "Priority",
    donorCover: "Donor cover",
    recipientCover: "Recipient cover",
    unmet: "Unmet",
    covered: "Covered",
    noTransfers: "No transfers recommended under this scenario.",
    statusPrefix: "Simulation status:",
    active: "scenario levers active",
    inactive: "all levers reset to live data",
    anomalies: "Simulated anomaly signals detected",
    days: "days",
    doctorAbsenteeism: "Doctor absenteeism",
    doctorAbsenteeismDesc: "Below 1x improves staffing; above 1x worsens absence.",
    bedDemand: "Bed demand surge",
    bedDemandDesc: "Below 1x eases bed pressure; above 1x adds demand.",
    testDemand: "Test demand surge",
    testDemandDesc: "Below 1x reduces test pressure; above 1x increases downtime.",
    medicineConsumption: "Medicine consumption rate",
    medicineConsumptionDesc: "Below 1x slows consumption; above 1x accelerates stock use."
  },
  hi: {
    title: "परिदृश्य सिम्युलेटर",
    lead: "काल्पनिक स्थितियां बदलें और देखें कि वही डैशबोर्ड गणनाएं बिना live data बदले कैसे बदलती हैं।",
    reset: "Live data पर रीसेट",
    banner: "Simulation mode - काल्पनिक परिणाम दिखाए जा रहे हैं, live data नहीं",
    controls: "परिदृश्य नियंत्रण",
    better: "बेहतर",
    worse: "खराब",
    neutral: "| 1x",
    before: "पहले",
    after: "बाद में",
    interventionImpact: "हस्तक्षेप प्रभाव",
    interventionLead: "इस scenario में जिला हस्तक्षेप सूची में आने या बाहर जाने वाले केंद्र।",
    newlyNeeds: "नए हस्तक्षेप केंद्र",
    dropsOut: "सूची से बाहर",
    noNew: "कोई नया केंद्र सूची में नहीं आता।",
    noDrop: "कोई केंद्र सूची से बाहर नहीं जाता।",
    updatedRisk: "अपडेटेड जोखिम स्कोर",
    forecastChanges: "Stock-out forecast बदलाव",
    forecastLead: "मौजूदा EWMA forecast से सबसे बड़े simulated medicine बदलाव।",
    noStockWarnings: "कोई simulated stock warning नहीं।",
    redistributionPlan: "Simulated पुनर्वितरण योजना",
    redistributionLead: "Scenario लागू करने के बाद मौजूदा redistribution algorithm की recommendations।",
    transfers: "transfers",
    transfer: "Transfer",
    move: "Move",
    priority: "Priority",
    donorCover: "Donor cover",
    recipientCover: "Recipient cover",
    unmet: "Unmet",
    covered: "Covered",
    noTransfers: "इस scenario में कोई transfer recommended नहीं है।",
    statusPrefix: "Simulation status:",
    active: "scenario levers active",
    inactive: "सभी levers live data पर reset",
    anomalies: "Simulated anomaly signals detected",
    days: "दिन",
    doctorAbsenteeism: "डॉक्टर अनुपस्थिति",
    doctorAbsenteeismDesc: "1x से नीचे staffing बेहतर; 1x से ऊपर अनुपस्थिति बढ़ती है।",
    bedDemand: "बेड मांग surge",
    bedDemandDesc: "1x से नीचे bed pressure कम; 1x से ऊपर demand बढ़ती है।",
    testDemand: "Test demand surge",
    testDemandDesc: "1x से नीचे test pressure कम; 1x से ऊपर downtime बढ़ता है।",
    medicineConsumption: "दवा consumption rate",
    medicineConsumptionDesc: "1x से नीचे consumption धीमा; 1x से ऊपर stock use तेज।"
  },
  mr: {
    title: "परिस्थिती सिम्युलेटर",
    lead: "काल्पनिक ऑपरेटिंग स्थिती बदला आणि live data न बदलता dashboard calculations कशा बदलतात ते पहा.",
    reset: "Live data वर रीसेट",
    banner: "Simulation mode - काल्पनिक परिणाम दाखवत आहे, live data नाही",
    controls: "परिस्थिती नियंत्रण",
    better: "चांगले",
    worse: "वाईट",
    neutral: "| 1x",
    before: "आधी",
    after: "नंतर",
    interventionImpact: "हस्तक्षेप परिणाम",
    interventionLead: "या scenario मध्ये district intervention यादीत येणारी किंवा बाहेर जाणारी केंद्रे.",
    newlyNeeds: "नवीन हस्तक्षेप आवश्यक",
    dropsOut: "यादीतून बाहेर",
    noNew: "कोणतेही नवीन केंद्र यादीत येत नाही.",
    noDrop: "कोणतेही केंद्र बाहेर जात नाही.",
    updatedRisk: "अपडेटेड risk score",
    forecastChanges: "Stock-out forecast बदल",
    forecastLead: "मौजूदा EWMA forecast वापरून सर्वात मोठे simulated medicine बदल.",
    noStockWarnings: "कोणतीही simulated stock warning नाही.",
    redistributionPlan: "Simulated पुनर्वाटप योजना",
    redistributionLead: "Scenario लागू केल्यानंतर existing redistribution algorithm च्या recommendations.",
    transfers: "transfers",
    transfer: "Transfer",
    move: "Move",
    priority: "Priority",
    donorCover: "Donor cover",
    recipientCover: "Recipient cover",
    unmet: "Unmet",
    covered: "Covered",
    noTransfers: "या scenario मध्ये कोणतेही transfer recommended नाही.",
    statusPrefix: "Simulation status:",
    active: "scenario levers active",
    inactive: "सर्व levers live data वर reset",
    anomalies: "Simulated anomaly signals detected",
    days: "दिवस",
    doctorAbsenteeism: "डॉक्टर अनुपस्थिती",
    doctorAbsenteeismDesc: "1x पेक्षा कमी staffing सुधारते; 1x पेक्षा जास्त अनुपस्थिती वाढते.",
    bedDemand: "बेड मागणी surge",
    bedDemandDesc: "1x पेक्षा कमी bed pressure कमी; 1x पेक्षा जास्त demand वाढते.",
    testDemand: "Test demand surge",
    testDemandDesc: "1x पेक्षा कमी test pressure कमी; 1x पेक्षा जास्त downtime वाढतो.",
    medicineConsumption: "औषध consumption rate",
    medicineConsumptionDesc: "1x पेक्षा कमी consumption कमी; 1x पेक्षा जास्त stock use वाढतो."
  },
  gu: {
    title: "પરિસ્થિતિ સિમ્યુલેટર",
    lead: "કાલ્પનિક કામગીરી સ્થિતિ બદલો અને live data બદલે વગર dashboard calculations કેવી રીતે બદલાય છે તે જુઓ.",
    reset: "Live data પર રીસેટ",
    banner: "Simulation mode - કાલ્પનિક પરિણામો બતાવે છે, live data નથી",
    controls: "પરિસ્થિતિ નિયંત્રણો",
    better: "સારું",
    worse: "ખરાબ",
    neutral: "| 1x",
    before: "પહેલાં",
    after: "પછી",
    interventionImpact: "હસ્તક્ષેપ અસર",
    interventionLead: "આ scenario હેઠળ district intervention યાદીમાં આવતા અથવા બહાર જતા કેન્દ્રો.",
    newlyNeeds: "નવા હસ્તક્ષેપ જરૂરી",
    dropsOut: "યાદીમાંથી બહાર",
    noNew: "કોઈ નવું કેન્દ્ર યાદીમાં આવતું નથી.",
    noDrop: "કોઈ કેન્દ્ર બહાર જતું નથી.",
    updatedRisk: "અપડેટેડ risk score",
    forecastChanges: "Stock-out forecast ફેરફાર",
    forecastLead: "હાલના EWMA forecast નો ઉપયોગ કરીને સૌથી મોટા simulated medicine ફેરફારો.",
    noStockWarnings: "કોઈ simulated stock warning નથી.",
    redistributionPlan: "Simulated પુનર્વિતરણ યોજના",
    redistributionLead: "Scenario લાગુ કર્યા પછી existing redistribution algorithm ની recommendations.",
    transfers: "transfers",
    transfer: "Transfer",
    move: "Move",
    priority: "Priority",
    donorCover: "Donor cover",
    recipientCover: "Recipient cover",
    unmet: "Unmet",
    covered: "Covered",
    noTransfers: "આ scenario માં કોઈ transfer recommended નથી.",
    statusPrefix: "Simulation status:",
    active: "scenario levers active",
    inactive: "બધા levers live data પર reset",
    anomalies: "Simulated anomaly signals detected",
    days: "દિવસ",
    doctorAbsenteeism: "ડૉક્ટર ગેરહાજરી",
    doctorAbsenteeismDesc: "1x કરતાં નીચે staffing સારી; 1x કરતાં ઉપર ગેરહાજરી વધે છે.",
    bedDemand: "બેડ માંગ surge",
    bedDemandDesc: "1x કરતાં નીચે bed pressure ઘટે; 1x કરતાં ઉપર demand વધે.",
    testDemand: "Test demand surge",
    testDemandDesc: "1x કરતાં નીચે test pressure ઘટે; 1x કરતાં ઉપર downtime વધે.",
    medicineConsumption: "દવા consumption rate",
    medicineConsumptionDesc: "1x કરતાં નીચે consumption ધીમું; 1x કરતાં ઉપર stock use ઝડપી."
  },
  te: {
    title: "సన్నివేశ సిమ్యులేటర్",
    lead: "కల్పిత ఆపరేటింగ్ పరిస్థితులను మార్చి, live data మార్చకుండా dashboard calculations ఎలా స్పందిస్తాయో చూడండి.",
    reset: "Live data కి రీసెట్",
    banner: "Simulation mode - కల్పిత ఫలితాలు చూపిస్తుంది, live data కాదు",
    controls: "సన్నివేశ నియంత్రణలు",
    better: "మెరుగైనది",
    worse: "చెడు",
    neutral: "| 1x",
    before: "ముందు",
    after: "తర్వాత",
    interventionImpact: "జోక్యం ప్రభావం",
    interventionLead: "ఈ scenarioలో district intervention జాబితాలోకి వచ్చే లేదా బయటకు వెళ్లే కేంద్రాలు.",
    newlyNeeds: "కొత్తగా జోక్యం అవసరం",
    dropsOut: "జాబితా నుంచి బయటకు",
    noNew: "కొత్త కేంద్రాలు జాబితాలోకి రావు.",
    noDrop: "ఏ కేంద్రం బయటకు వెళ్లదు.",
    updatedRisk: "అప్‌డేటెడ్ risk score",
    forecastChanges: "Stock-out forecast మార్పులు",
    forecastLead: "ప్రస్తుత EWMA forecast ఉపయోగించి అతిపెద్ద simulated medicine మార్పులు.",
    noStockWarnings: "Simulated stock warnings లేవు.",
    redistributionPlan: "Simulated పునర్విభజన ప్రణాళిక",
    redistributionLead: "Scenario అమలు చేసిన తర్వాత existing redistribution algorithm recommendations.",
    transfers: "transfers",
    transfer: "Transfer",
    move: "Move",
    priority: "Priority",
    donorCover: "Donor cover",
    recipientCover: "Recipient cover",
    unmet: "Unmet",
    covered: "Covered",
    noTransfers: "ఈ scenarioలో transfer recommendations లేవు.",
    statusPrefix: "Simulation status:",
    active: "scenario levers active",
    inactive: "అన్ని levers live data కి reset",
    anomalies: "Simulated anomaly signals detected",
    days: "రోజులు",
    doctorAbsenteeism: "డాక్టర్ గైర్హాజరు",
    doctorAbsenteeismDesc: "1x కంటే తక్కువ staffing మెరుగుపడుతుంది; 1x కంటే ఎక్కువ గైర్హాజరు పెరుగుతుంది.",
    bedDemand: "బెడ్ demand surge",
    bedDemandDesc: "1x కంటే తక్కువ bed pressure తగ్గుతుంది; 1x కంటే ఎక్కువ demand పెరుగుతుంది.",
    testDemand: "Test demand surge",
    testDemandDesc: "1x కంటే తక్కువ test pressure తగ్గుతుంది; 1x కంటే ఎక్కువ downtime పెరుగుతుంది.",
    medicineConsumption: "మందుల consumption rate",
    medicineConsumptionDesc: "1x కంటే తక్కువ consumption తగ్గుతుంది; 1x కంటే ఎక్కువ stock use వేగంగా పెరుగుతుంది."
  },
  bn: {
    title: "পরিস্থিতি সিমুলেটর",
    lead: "কাল্পনিক অপারেটিং অবস্থা বদলে দেখুন live data না বদলে dashboard calculations কীভাবে বদলায়।",
    reset: "Live data-তে রিসেট",
    banner: "Simulation mode - কাল্পনিক ফলাফল দেখাচ্ছে, live data নয়",
    controls: "পরিস্থিতি নিয়ন্ত্রণ",
    better: "ভালো",
    worse: "খারাপ",
    neutral: "| 1x",
    before: "আগে",
    after: "পরে",
    interventionImpact: "হস্তক্ষেপ প্রভাব",
    interventionLead: "এই scenario-তে district intervention তালিকায় ঢোকা বা বের হওয়া কেন্দ্র।",
    newlyNeeds: "নতুন হস্তক্ষেপ প্রয়োজন",
    dropsOut: "তালিকা থেকে বের",
    noNew: "নতুন কোনো কেন্দ্র তালিকায় ঢুকছে না।",
    noDrop: "কোনো কেন্দ্র বের হচ্ছে না।",
    updatedRisk: "আপডেটেড risk score",
    forecastChanges: "Stock-out forecast পরিবর্তন",
    forecastLead: "বর্তমান EWMA forecast ব্যবহার করে সবচেয়ে বড় simulated medicine পরিবর্তন।",
    noStockWarnings: "কোনো simulated stock warning নেই।",
    redistributionPlan: "Simulated পুনর্বণ্টন পরিকল্পনা",
    redistributionLead: "Scenario প্রয়োগের পর existing redistribution algorithm-এর recommendations.",
    transfers: "transfers",
    transfer: "Transfer",
    move: "Move",
    priority: "Priority",
    donorCover: "Donor cover",
    recipientCover: "Recipient cover",
    unmet: "Unmet",
    covered: "Covered",
    noTransfers: "এই scenario-তে কোনো transfer recommended নয়।",
    statusPrefix: "Simulation status:",
    active: "scenario levers active",
    inactive: "সব levers live data-তে reset",
    anomalies: "Simulated anomaly signals detected",
    days: "দিন",
    doctorAbsenteeism: "ডাক্তার অনুপস্থিতি",
    doctorAbsenteeismDesc: "1x-এর নিচে staffing ভালো; 1x-এর ওপরে অনুপস্থিতি বাড়ে।",
    bedDemand: "বেড demand surge",
    bedDemandDesc: "1x-এর নিচে bed pressure কমে; 1x-এর ওপরে demand বাড়ে।",
    testDemand: "Test demand surge",
    testDemandDesc: "1x-এর নিচে test pressure কমে; 1x-এর ওপরে downtime বাড়ে।",
    medicineConsumption: "ওষুধ consumption rate",
    medicineConsumptionDesc: "1x-এর নিচে consumption ধীর; 1x-এর ওপরে stock use দ্রুত।"
  },
  ta: {
    title: "நிகழ்வு சிமுலேட்டர்",
    lead: "கற்பனை செயல்பாட்டு நிலைகளை மாற்றி, live data மாற்றாமல் dashboard calculations எப்படி மாறுகின்றன என்பதைப் பாருங்கள்.",
    reset: "Live data-க்கு reset",
    banner: "Simulation mode - கற்பனை முடிவுகள் காட்டப்படுகிறது, live data அல்ல",
    controls: "நிகழ்வு கட்டுப்பாடுகள்",
    better: "மேம்பாடு",
    worse: "மோசம்",
    neutral: "| 1x",
    before: "முன்",
    after: "பின்",
    interventionImpact: "தலையீட்டு விளைவு",
    interventionLead: "இந்த scenario-வில் district intervention பட்டியலில் சேரும் அல்லது வெளியேறும் மையங்கள்.",
    newlyNeeds: "புதிய தலையீடு தேவை",
    dropsOut: "பட்டியலிலிருந்து வெளியே",
    noNew: "புதிய மையங்கள் பட்டியலில் சேரவில்லை.",
    noDrop: "எந்த மையமும் வெளியேறவில்லை.",
    updatedRisk: "புதுப்பிக்கப்பட்ட risk score",
    forecastChanges: "Stock-out forecast மாற்றங்கள்",
    forecastLead: "தற்போதைய EWMA forecast பயன்படுத்தி மிகப்பெரிய simulated medicine மாற்றங்கள்.",
    noStockWarnings: "Simulated stock warnings இல்லை.",
    redistributionPlan: "Simulated மறுவினியோக திட்டம்",
    redistributionLead: "Scenario பயன்படுத்திய பின் existing redistribution algorithm recommendations.",
    transfers: "transfers",
    transfer: "Transfer",
    move: "Move",
    priority: "Priority",
    donorCover: "Donor cover",
    recipientCover: "Recipient cover",
    unmet: "Unmet",
    covered: "Covered",
    noTransfers: "இந்த scenario-வில் transfer recommendations இல்லை.",
    statusPrefix: "Simulation status:",
    active: "scenario levers active",
    inactive: "அனைத்து levers live data-க்கு reset",
    anomalies: "Simulated anomaly signals detected",
    days: "நாட்கள்",
    doctorAbsenteeism: "மருத்துவர் अनुपस्थितி",
    doctorAbsenteeismDesc: "1x-க்கு கீழே staffing மேம்படும்; 1x-க்கு மேல் अनुपस्थितி அதிகரிக்கும்.",
    bedDemand: "படுக்கை demand surge",
    bedDemandDesc: "1x-க்கு கீழே bed pressure குறையும்; 1x-க்கு மேல் demand அதிகரிக்கும்.",
    testDemand: "Test demand surge",
    testDemandDesc: "1x-க்கு கீழே test pressure குறையும்; 1x-க்கு மேல் downtime அதிகரிக்கும்.",
    medicineConsumption: "மருந்து consumption rate",
    medicineConsumptionDesc: "1x-க்கு கீழே consumption மெதுவாகும்; 1x-க்கு மேல் stock use வேகமாகும்."
  },
  kn: {
    title: "ಸನ್ನಿವೇಶ ಸಿಮ್ಯುಲೇಟರ್",
    lead: "ಕಲ್ಪಿತ ಕಾರ್ಯಾಚರಣೆ ಪರಿಸ್ಥಿತಿಗಳನ್ನು ಬದಲಿಸಿ, live data ಬದಲಿಸದೆ dashboard calculations ಹೇಗೆ ಬದಲಾಗುತ್ತವೆ ನೋಡಿ.",
    reset: "Live data ಗೆ reset",
    banner: "Simulation mode - ಕಲ್ಪಿತ ಫಲಿತಾಂಶಗಳನ್ನು ತೋರಿಸುತ್ತದೆ, live data ಅಲ್ಲ",
    controls: "ಸನ್ನಿವೇಶ ನಿಯಂತ್ರಣಗಳು",
    better: "ಉತ್ತಮ",
    worse: "ಕೆಟ್ಟದು",
    neutral: "| 1x",
    before: "ಮೊದಲು",
    after: "ನಂತರ",
    interventionImpact: "ಹಸ್ತಕ್ಷೇಪ ಪರಿಣಾಮ",
    interventionLead: "ಈ scenario ನಲ್ಲಿ district intervention ಪಟ್ಟಿಗೆ ಸೇರುವ ಅಥವಾ ಹೊರಬರುವ ಕೇಂದ್ರಗಳು.",
    newlyNeeds: "ಹೊಸ ಹಸ್ತಕ್ಷೇಪ ಅಗತ್ಯ",
    dropsOut: "ಪಟ್ಟಿಯಿಂದ ಹೊರಗೆ",
    noNew: "ಹೊಸ ಕೇಂದ್ರಗಳು ಪಟ್ಟಿಗೆ ಸೇರುವುದಿಲ್ಲ.",
    noDrop: "ಯಾವ ಕೇಂದ್ರವೂ ಹೊರಬರುವುದಿಲ್ಲ.",
    updatedRisk: "ನವೀಕರಿಸಿದ risk score",
    forecastChanges: "Stock-out forecast ಬದಲಾವಣೆಗಳು",
    forecastLead: "ಪ್ರಸ್ತುತ EWMA forecast ಬಳಸಿ ಅತಿ ದೊಡ್ಡ simulated medicine ಬದಲಾವಣೆಗಳು.",
    noStockWarnings: "Simulated stock warnings ಇಲ್ಲ.",
    redistributionPlan: "Simulated ಮರುವಿತರಣಾ ಯೋಜನೆ",
    redistributionLead: "Scenario ಅನ್ವಯಿಸಿದ ನಂತರ existing redistribution algorithm recommendations.",
    transfers: "transfers",
    transfer: "Transfer",
    move: "Move",
    priority: "Priority",
    donorCover: "Donor cover",
    recipientCover: "Recipient cover",
    unmet: "Unmet",
    covered: "Covered",
    noTransfers: "ಈ scenario ನಲ್ಲಿ transfer recommendations ಇಲ್ಲ.",
    statusPrefix: "Simulation status:",
    active: "scenario levers active",
    inactive: "ಎಲ್ಲ levers live data ಗೆ reset",
    anomalies: "Simulated anomaly signals detected",
    days: "ದಿನಗಳು",
    doctorAbsenteeism: "ವೈದ್ಯರ ಗೈರುಹಾಜರಿ",
    doctorAbsenteeismDesc: "1x ಕ್ಕಿಂತ ಕೆಳಗೆ staffing ಉತ್ತಮ; 1x ಕ್ಕಿಂತ ಮೇಲೆ ಗೈರುಹಾಜರಿ ಹೆಚ್ಚುತ್ತದೆ.",
    bedDemand: "ಬೆಡ್ demand surge",
    bedDemandDesc: "1x ಕ್ಕಿಂತ ಕೆಳಗೆ bed pressure ಕಡಿಮೆ; 1x ಕ್ಕಿಂತ ಮೇಲೆ demand ಹೆಚ್ಚುತ್ತದೆ.",
    testDemand: "Test demand surge",
    testDemandDesc: "1x ಕ್ಕಿಂತ ಕೆಳಗೆ test pressure ಕಡಿಮೆ; 1x ಕ್ಕಿಂತ ಮೇಲೆ downtime ಹೆಚ್ಚುತ್ತದೆ.",
    medicineConsumption: "ಔಷಧ consumption rate",
    medicineConsumptionDesc: "1x ಕ್ಕಿಂತ ಕೆಳಗೆ consumption ನಿಧಾನ; 1x ಕ್ಕಿಂತ ಮೇಲೆ stock use ವೇಗ."
  },
  ml: {
    title: "സാഹചര്യ സിമുലേറ്റർ",
    lead: "കാല്പനിക പ്രവർത്തന സാഹചര്യങ്ങൾ മാറ്റി, live data മാറ്റാതെ dashboard calculations എങ്ങനെ മാറുന്നു എന്ന് കാണുക.",
    reset: "Live data-ലേക്ക് reset",
    banner: "Simulation mode - കാല്പനിക ഫലങ്ങൾ കാണിക്കുന്നു, live data അല്ല",
    controls: "സാഹചര്യ നിയന്ത്രണങ്ങൾ",
    better: "മെച്ചം",
    worse: "മോശം",
    neutral: "| 1x",
    before: "മുമ്പ്",
    after: "ശേഷം",
    interventionImpact: "ഇടപെടൽ പ്രഭാവം",
    interventionLead: "ഈ scenario-യിൽ district intervention പട്ടികയിൽ പ്രവേശിക്കുന്നതോ പുറത്താകുന്നതോ ആയ കേന്ദ്രങ്ങൾ.",
    newlyNeeds: "പുതിയ ഇടപെടൽ ആവശ്യം",
    dropsOut: "പട്ടികയിൽ നിന്ന് പുറത്തേക്ക്",
    noNew: "പുതിയ കേന്ദ്രങ്ങൾ പട്ടികയിൽ പ്രവേശിക്കുന്നില്ല.",
    noDrop: "ഒരു കേന്ദ്രവും പുറത്താകുന്നില്ല.",
    updatedRisk: "അപ്ഡേറ്റഡ് risk score",
    forecastChanges: "Stock-out forecast മാറ്റങ്ങൾ",
    forecastLead: "നിലവിലെ EWMA forecast ഉപയോഗിച്ച് വലിയ simulated medicine മാറ്റങ്ങൾ.",
    noStockWarnings: "Simulated stock warnings ഇല്ല.",
    redistributionPlan: "Simulated പുനർവിതരണ പദ്ധതി",
    redistributionLead: "Scenario പ്രയോഗിച്ചതിന് ശേഷം existing redistribution algorithm recommendations.",
    transfers: "transfers",
    transfer: "Transfer",
    move: "Move",
    priority: "Priority",
    donorCover: "Donor cover",
    recipientCover: "Recipient cover",
    unmet: "Unmet",
    covered: "Covered",
    noTransfers: "ഈ scenario-യിൽ transfer recommendations ഇല്ല.",
    statusPrefix: "Simulation status:",
    active: "scenario levers active",
    inactive: "എല്ലാ levers live data-ലേക്ക് reset",
    anomalies: "Simulated anomaly signals detected",
    days: "ദിവസം",
    doctorAbsenteeism: "ഡോക്ടർ अनुपस्थितി",
    doctorAbsenteeismDesc: "1x-നു താഴെ staffing മെച്ചപ്പെടും; 1x-നു മുകളിൽ अनुपस्थितി കൂടും.",
    bedDemand: "ബെഡ് demand surge",
    bedDemandDesc: "1x-നു താഴെ bed pressure കുറയും; 1x-നു മുകളിൽ demand കൂടും.",
    testDemand: "Test demand surge",
    testDemandDesc: "1x-നു താഴെ test pressure കുറയും; 1x-നു മുകളിൽ downtime കൂടും.",
    medicineConsumption: "മരുന്ന് consumption rate",
    medicineConsumptionDesc: "1x-നു താഴെ consumption കുറയും; 1x-നു മുകളിൽ stock use വേഗമാകും."
  },
  pa: {
    title: "ਸਿਨਾਰਿਓ ਸਿਮੂਲੇਟਰ",
    lead: "ਕਲਪਨਾਤਮਕ operational ਹਾਲਾਤ ਬਦਲੋ ਅਤੇ ਵੇਖੋ ਕਿ live data ਬਿਨਾਂ ਬਦਲੇ dashboard calculations ਕਿਵੇਂ ਬਦਲਦੀਆਂ ਹਨ।",
    reset: "Live data ਤੇ reset",
    banner: "Simulation mode - ਕਲਪਨਾਤਮਕ ਨਤੀਜੇ ਦਿਖਾ ਰਿਹਾ ਹੈ, live data ਨਹੀਂ",
    controls: "ਸਿਨਾਰਿਓ ਕੰਟਰੋਲ",
    better: "ਚੰਗਾ",
    worse: "ਮਾੜਾ",
    neutral: "| 1x",
    before: "ਪਹਿਲਾਂ",
    after: "ਬਾਅਦ",
    interventionImpact: "ਹਸਤਖੇਪ ਪ੍ਰਭਾਵ",
    interventionLead: "ਇਸ scenario ਵਿੱਚ district intervention ਸੂਚੀ ਵਿੱਚ ਆਉਣ ਜਾਂ ਬਾਹਰ ਜਾਣ ਵਾਲੇ ਕੇਂਦਰ।",
    newlyNeeds: "ਨਵਾਂ ਹਸਤਖੇਪ ਲੋੜੀਂਦਾ",
    dropsOut: "ਸੂਚੀ ਤੋਂ ਬਾਹਰ",
    noNew: "ਕੋਈ ਨਵਾਂ ਕੇਂਦਰ ਸੂਚੀ ਵਿੱਚ ਨਹੀਂ ਆਉਂਦਾ।",
    noDrop: "ਕੋਈ ਕੇਂਦਰ ਬਾਹਰ ਨਹੀਂ ਜਾਂਦਾ।",
    updatedRisk: "ਅਪਡੇਟਡ risk score",
    forecastChanges: "Stock-out forecast ਬਦਲਾਅ",
    forecastLead: "ਮੌਜੂਦਾ EWMA forecast ਨਾਲ ਸਭ ਤੋਂ ਵੱਡੇ simulated medicine ਬਦਲਾਅ।",
    noStockWarnings: "ਕੋਈ simulated stock warning ਨਹੀਂ।",
    redistributionPlan: "Simulated ਮੁੜ-ਵੰਡ ਯੋਜਨਾ",
    redistributionLead: "Scenario ਲਾਗੂ ਕਰਨ ਤੋਂ ਬਾਅਦ existing redistribution algorithm recommendations.",
    transfers: "transfers",
    transfer: "Transfer",
    move: "Move",
    priority: "Priority",
    donorCover: "Donor cover",
    recipientCover: "Recipient cover",
    unmet: "Unmet",
    covered: "Covered",
    noTransfers: "ਇਸ scenario ਵਿੱਚ ਕੋਈ transfer recommended ਨਹੀਂ।",
    statusPrefix: "Simulation status:",
    active: "scenario levers active",
    inactive: "ਸਾਰੇ levers live data ਤੇ reset",
    anomalies: "Simulated anomaly signals detected",
    days: "ਦਿਨ",
    doctorAbsenteeism: "ਡਾਕਟਰ ਗੈਰਹਾਜ਼ਰੀ",
    doctorAbsenteeismDesc: "1x ਤੋਂ ਘੱਟ staffing ਬਿਹਤਰ; 1x ਤੋਂ ਵੱਧ ਗੈਰਹਾਜ਼ਰੀ ਵਧਦੀ ਹੈ।",
    bedDemand: "ਬੈਡ demand surge",
    bedDemandDesc: "1x ਤੋਂ ਘੱਟ bed pressure ਘਟਦਾ; 1x ਤੋਂ ਵੱਧ demand ਵਧਦੀ।",
    testDemand: "Test demand surge",
    testDemandDesc: "1x ਤੋਂ ਘੱਟ test pressure ਘਟਦਾ; 1x ਤੋਂ ਵੱਧ downtime ਵਧਦਾ।",
    medicineConsumption: "ਦਵਾ consumption rate",
    medicineConsumptionDesc: "1x ਤੋਂ ਘੱਟ consumption ਹੌਲੀ; 1x ਤੋਂ ਵੱਧ stock use ਤੇਜ਼।"
  },
  ur: {
    title: "Scenario simulator",
    lead: "فرضی operating حالات بدلیں اور دیکھیں کہ live data بدلے بغیر dashboard calculations کیسے بدلتی ہیں۔",
    reset: "Live data پر reset",
    banner: "Simulation mode - فرضی نتائج دکھائے جا رہے ہیں، live data نہیں",
    controls: "Scenario controls",
    better: "بہتر",
    worse: "خراب",
    neutral: "| 1x",
    before: "پہلے",
    after: "بعد",
    interventionImpact: "Intervention impact",
    interventionLead: "اس scenario میں district intervention فہرست میں آنے یا نکلنے والے مراکز۔",
    newlyNeeds: "نئے intervention کی ضرورت",
    dropsOut: "فہرست سے باہر",
    noNew: "کوئی نیا مرکز فہرست میں نہیں آتا۔",
    noDrop: "کوئی مرکز باہر نہیں نکلتا۔",
    updatedRisk: "Updated risk score",
    forecastChanges: "Stock-out forecast تبدیلیاں",
    forecastLead: "موجودہ EWMA forecast سے سب سے بڑی simulated medicine تبدیلیاں۔",
    noStockWarnings: "کوئی simulated stock warning نہیں۔",
    redistributionPlan: "Simulated redistribution plan",
    redistributionLead: "Scenario لگانے کے بعد existing redistribution algorithm recommendations.",
    transfers: "transfers",
    transfer: "Transfer",
    move: "Move",
    priority: "Priority",
    donorCover: "Donor cover",
    recipientCover: "Recipient cover",
    unmet: "Unmet",
    covered: "Covered",
    noTransfers: "اس scenario میں کوئی transfer recommended نہیں۔",
    statusPrefix: "Simulation status:",
    active: "scenario levers active",
    inactive: "تمام levers live data پر reset",
    anomalies: "Simulated anomaly signals detected",
    days: "دن",
    doctorAbsenteeism: "ڈاکٹر غیر حاضری",
    doctorAbsenteeismDesc: "1x سے کم staffing بہتر؛ 1x سے اوپر غیر حاضری بڑھتی ہے۔",
    bedDemand: "Bed demand surge",
    bedDemandDesc: "1x سے کم bed pressure کم؛ 1x سے اوپر demand بڑھتی ہے۔",
    testDemand: "Test demand surge",
    testDemandDesc: "1x سے کم test pressure کم؛ 1x سے اوپر downtime بڑھتا ہے۔",
    medicineConsumption: "Medicine consumption rate",
    medicineConsumptionDesc: "1x سے کم consumption آہستہ؛ 1x سے اوپر stock use تیز۔"
  }
};

type SimulatorCopy = typeof simulatorCopy.en;

function getSimulatorCopy(language: string): SimulatorCopy {
  return simulatorCopy[language as keyof typeof simulatorCopy] ?? simulatorCopy.en;
}

const sliderConfig: Array<{
  key: keyof SimulationLevers;
  label: string;
  description: string;
  min: number;
  neutral: number;
  max: number;
  step: number;
}> = [
  { key: "doctorAbsenteeism", label: "Doctor absenteeism", description: "Below 1x improves staffing; above 1x worsens absence.", min: 0.3, neutral: 1, max: 3, step: 0.05 },
  { key: "bedDemand", label: "Bed demand surge", description: "Below 1x eases bed pressure; above 1x adds demand.", min: 0.3, neutral: 1, max: 3, step: 0.05 },
  { key: "testDemand", label: "Test demand surge", description: "Below 1x reduces test pressure; above 1x increases downtime.", min: 0.3, neutral: 1, max: 3, step: 0.05 },
  { key: "medicineConsumption", label: "Medicine consumption rate", description: "Below 1x slows consumption; above 1x accelerates stock use.", min: 0.3, neutral: 1, max: 3, step: 0.05 }
];

function useDebouncedValue<T>(value: T, delayMs = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debounced;
}

function leverLabel(value: number) {
  return `${value.toFixed(2).replace(/\.00$/, "").replace(/0$/, "")}x`;
}

function forecastKey(forecast: StockForecast) {
  return `${forecast.centreId}:${forecast.medicineId}`;
}

function scoreDelta(before?: CentreStatus, after?: CentreStatus) {
  if (!before || !after) return 0;
  return Number((after.interventionScore - before.interventionScore).toFixed(1));
}

function shortCentreName(name: string) {
  return name.replace(/\s+(Primary|Community) Health Centre$/i, "");
}

function compareClass(after: number, before: number) {
  if (after > before) return "text-[#9f3a38]";
  if (after < before) return "text-[#47705d]";
  return "text-[#46515c]";
}

export function ScenarioSimulatorView() {
  const { t, language } = useLanguage();
  const copy = getSimulatorCopy(language);
  const { data } = useDistrictData();
  const [levers, setLevers] = useState<SimulationLevers>(BASE_SIMULATION_LEVERS);
  const debouncedLevers = useDebouncedValue(levers, 260);
  const active = simulationIsActive(debouncedLevers);

  const simulatedData = useMemo(() => applyScenarioSimulation(data, debouncedLevers), [data, debouncedLevers]);
  const currentKpis = useMemo(() => districtKpis(data), [data]);
  const simulatedKpis = useMemo(() => districtKpis(simulatedData), [simulatedData]);
  const currentStatuses = useMemo(() => getDistrictStatuses(data), [data]);
  const simulatedStatuses = useMemo(() => getDistrictStatuses(simulatedData), [simulatedData]);
  const currentStatusMap = useMemo(() => new Map(currentStatuses.map((status) => [status.centre.id, status])), [currentStatuses]);
  const simulatedStatusMap = useMemo(() => new Map(simulatedStatuses.map((status) => [status.centre.id, status])), [simulatedStatuses]);
  const currentForecastMap = useMemo(() => new Map(currentStatuses.flatMap((status) => status.forecasts.map((forecast) => [forecastKey(forecast), forecast]))), [currentStatuses]);
  const simulatedForecasts = useMemo(() => simulatedStatuses.flatMap((status) => status.forecasts), [simulatedStatuses]);
  const simulatedRecommendations = useMemo(() => getRedistributionRecommendations(simulatedData), [simulatedData]);

  const currentFlagged = useMemo(() => currentStatuses.filter((status) => status.flagged), [currentStatuses]);
  const simulatedFlagged = useMemo(() => simulatedStatuses.filter((status) => status.flagged), [simulatedStatuses]);
  const newlyFlagged = simulatedFlagged.filter((status) => !currentStatusMap.get(status.centre.id)?.flagged);
  const resolvedFlagged = currentFlagged.filter((status) => !simulatedStatusMap.get(status.centre.id)?.flagged);
  const changedFlagged = simulatedFlagged.slice(0, 8);

  const changedForecasts = simulatedForecasts
    .map((forecast) => {
      const before = currentForecastMap.get(forecastKey(forecast));
      const delta = before ? Number((forecast.daysUntilStockout - before.daysUntilStockout).toFixed(1)) : 0;
      return { forecast, before, delta };
    })
    .filter(({ forecast, before, delta }) => forecast.severity !== "good" || before?.severity !== "good" || Math.abs(delta) >= 2)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.forecast.daysUntilStockout - b.forecast.daysUntilStockout)
    .slice(0, 8);

  const anomalyCount = useMemo(() => simulatedData.centres.reduce((total, centre) => total + detectCentreAnomalies(centre).length, 0), [simulatedData]);

  function setLever(key: keyof SimulationLevers, value: number) {
    setLevers((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setLevers(BASE_SIMULATION_LEVERS);
  }

  return (
    <main className="craft-page mx-auto max-w-7xl px-4 lg:px-8">
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="craft-eyebrow">{data.district}, {data.state}</p>
          <h1 className="craft-title mt-3">{copy.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#46515c]">{copy.lead}</p>
        </div>
        <button className="craft-button inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#d5bd91] bg-[#fff8e8] px-3 text-sm font-bold text-[#8a6426] hover:bg-[#fff3d2]" type="button" onClick={reset}>
          <RotateCcw size={15} strokeWidth={1.65} /> {copy.reset}
        </button>
      </section>

      <section className="mb-5 flex items-start gap-3 rounded-lg border border-[#d5bd91] bg-[#fff8e8] px-4 py-3 text-sm text-[#6d5120] shadow-sm">
        <AlertTriangle className="mt-0.5 shrink-0 text-[#9a6a22]" size={17} strokeWidth={1.65} />
        <div>
          <p className="font-extrabold text-[#8a6426]">{copy.banner}</p>
        </div>
      </section>

      <motion.section className="space-y-5" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div className="craft-card p-5" variants={riseIn} transition={entranceTransition}>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={17} strokeWidth={1.65} className="text-[#164e63]" />
              <h2 className="craft-section-title">{copy.controls}</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {SIMULATION_PRESETS.map((preset) => (
                <button key={preset.id} className="craft-button rounded-md border border-[#cfd8df] bg-white px-3 py-2 text-left hover:bg-[#f8fafb]" type="button" onClick={() => setLevers(preset.levers)}>
                  <span className="block text-sm font-extrabold text-[#17212b]">{preset.label}</span>
                  <span className="mt-0.5 block text-xs leading-4 text-slate-500">{preset.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {sliderConfig.map((slider) => (
              <label className="block rounded-lg border border-[#dde4e9] bg-[#f8fafb] p-3" key={slider.key}>
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-sm font-extrabold text-[#17212b]">{copy[slider.key]}</span>
                    <span className="mt-0.5 block text-xs leading-4 text-slate-500">{copy[`${slider.key}Desc` as keyof SimulatorCopy]}</span>
                  </span>
                  <span className="craft-number shrink-0 rounded-md bg-white px-2 py-1 text-sm font-extrabold text-[#164e63] ring-1 ring-[#cfd8df]">{leverLabel(levers[slider.key])}</span>
                </span>
                <div className="mt-3">
                  <input
                    className="w-full accent-[#164e63]"
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    step={slider.step}
                    value={levers[slider.key]}
                    onChange={(event) => setLever(slider.key, Number(event.target.value))}
                  />
                  <div className="relative mt-1 h-4 text-[11px] font-bold text-slate-500">
                    <span className="absolute left-0">{copy.better}</span>
                    <span
                      className="absolute -translate-x-1/2 text-[#164e63]"
                      style={{ left: `${((slider.neutral - slider.min) / (slider.max - slider.min)) * 100}%` }}
                    >
                      {copy.neutral}
                    </span>
                    <span className="absolute right-0">{copy.worse}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </motion.div>

        <motion.div className="space-y-5" variants={staggerContainer}>
          <motion.section className="craft-hero-band grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4" variants={riseIn} transition={entranceTransition}>
            <KpiCompare label={t("centres")} before={currentKpis.centres} after={simulatedKpis.centres} beforeLabel={copy.before} afterLabel={copy.after} />
            <KpiCompare label={t("stockWarnings")} before={currentKpis.warnings} after={simulatedKpis.warnings} beforeLabel={copy.before} afterLabel={copy.after} />
            <KpiCompare label={t("flaggedCentres")} before={currentKpis.flagged} after={simulatedKpis.flagged} beforeLabel={copy.before} afterLabel={copy.after} />
            <KpiCompare label={t("avgBedUse")} before={currentKpis.avgBeds} after={simulatedKpis.avgBeds} suffix="%" beforeLabel={copy.before} afterLabel={copy.after} />
          </motion.section>

          <motion.section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]" variants={staggerContainer}>
            <motion.div className="craft-card self-start p-5" variants={riseIn} transition={entranceTransition}>
              <h2 className="craft-section-title">{copy.interventionImpact}</h2>
              <p className="mt-1 text-sm text-slate-500">{copy.interventionLead}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <ImpactList title={copy.newlyNeeds} items={newlyFlagged} empty={copy.noNew} currentStatusMap={currentStatusMap} />
                <ImpactList title={copy.dropsOut} items={resolvedFlagged} empty={copy.noDrop} simulatedStatusMap={simulatedStatusMap} />
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {changedFlagged.map((status) => {
                  const before = currentStatusMap.get(status.centre.id);
                  return (
                    <div className="craft-card-muted flex min-h-24 flex-col justify-between gap-3 p-3" key={status.centre.id}>
                      <span>
                        <span className="block text-sm font-bold text-[#17212b]">{shortCentreName(status.centre.name)}</span>
                        <span className="text-xs text-slate-500">{copy.updatedRisk}</span>
                      </span>
                      <span>
                        <span className="craft-number block text-xl font-extrabold text-[#17212b]"><AnimatedNumber value={status.interventionScore} decimals={1} /></span>
                        <span className={"text-xs font-bold " + compareClass(status.interventionScore, before?.interventionScore ?? status.interventionScore)}>
                          {scoreDelta(before, status) >= 0 ? "+" : ""}{scoreDelta(before, status)}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div className="craft-card self-start p-5" variants={riseIn} transition={entranceTransition}>
              <h2 className="craft-section-title">{copy.forecastChanges}</h2>
              <p className="mt-1 text-sm text-slate-500">{copy.forecastLead}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {changedForecasts.length ? changedForecasts.map(({ forecast, before, delta }) => (
                  <div className="craft-card-muted flex min-h-32 flex-col justify-between p-3" key={forecastKey(forecast)}>
                    <div className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-sm font-bold text-[#17212b]">{forecast.medicineName}</span>
                        <span className="text-xs text-slate-500">{shortCentreName(forecast.centreName)} · {forecast.category}</span>
                      </span>
                      <StatusBadge value={forecast.severity} />
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <span className="text-xs text-slate-500">{copy.before}: {before?.daysUntilStockout ?? "—"} {copy.days}</span>
                      <span className="text-right">
                        <span className="craft-number block text-2xl font-extrabold text-[#17212b]"><AnimatedNumber value={forecast.daysUntilStockout} decimals={1} /> {copy.days}</span>
                        <span className={"text-xs font-bold " + (delta > 0 ? "text-[#47705d]" : delta < 0 ? "text-[#9f3a38]" : "text-slate-500")}>{delta >= 0 ? "+" : ""}{delta} {copy.days}</span>
                      </span>
                    </div>
                  </div>
                )) : <p className="rounded-md bg-[#f8fafb] p-3 text-sm text-slate-500">{copy.noStockWarnings}</p>}
              </div>
            </motion.div>
          </motion.section>

          <motion.section className="craft-card p-5" variants={riseIn} transition={entranceTransition}>
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="craft-section-title">{copy.redistributionPlan}</h2>
                <p className="mt-1 text-sm text-slate-500">{copy.redistributionLead}</p>
              </div>
              <span className="rounded-md bg-[#eef3f5] px-2 py-1 text-xs font-bold text-[#164e63] ring-1 ring-[#cfd8df]">{simulatedRecommendations.length} {copy.transfers}</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr className="border-b border-[#cfd8df]">
                    <th className="py-2 pr-4">{copy.transfer}</th>
                    <th className="py-2 pr-4">{copy.priority}</th>
                    <th className="py-2 pr-4">{copy.donorCover}</th>
                    <th className="py-2 pr-4">{copy.recipientCover}</th>
                    <th className="py-2 pr-4">{copy.unmet}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dde4e9]">
                  {simulatedRecommendations.slice(0, 8).map((recommendation) => (
                    <tr key={`${recommendation.itemId}-${recommendation.fromCentreId}-${recommendation.toCentreId}-${recommendation.quantity}`}>
                      <td className="py-3 pr-4">
                        <p className="font-bold text-[#17212b]">{copy.move} {recommendation.quantity} {recommendation.unit} {recommendation.itemName}</p>
                        <p className="mt-1 text-xs text-slate-500">{shortCentreName(recommendation.fromCentreName)} → {shortCentreName(recommendation.toCentreName)}</p>
                      </td>
                      <td className="py-3 pr-4"><span className={`inline-flex rounded px-2 py-0.5 text-xs font-bold ring-1 ${recommendation.priority === "high" ? "bg-[#f8eeee] text-[#9f3a38] ring-[#d7aaaa]" : "bg-[#f7f1e6] text-[#8a6426] ring-[#d5bd91]"}`}>{recommendation.priority}</span></td>
                      <td className="py-3 pr-4 text-[#46515c]">{recommendation.fromDaysCoverBefore} → {recommendation.fromDaysCoverAfter} {copy.days}</td>
                      <td className="py-3 pr-4 text-[#46515c]">{recommendation.toDaysCoverBefore} → {recommendation.toDaysCoverAfter} {copy.days}</td>
                      <td className="py-3 pr-4 text-[#46515c]">{recommendation.unmetDemandAfter ? `${recommendation.unmetDemandAfter} ${recommendation.unit}` : copy.covered}</td>
                    </tr>
                  ))}
                  {!simulatedRecommendations.length ? <tr><td className="py-6 text-center text-sm font-semibold text-slate-500" colSpan={5}>{copy.noTransfers}</td></tr> : null}
                </tbody>
              </table>
            </div>
          </motion.section>

          <p className="text-xs text-slate-500">{copy.statusPrefix} {active ? copy.active : copy.inactive}. {copy.anomalies}: {anomalyCount}.</p>
        </motion.div>
      </motion.section>
    </main>
  );
}

function KpiCompare({ label, before, after, suffix = "", beforeLabel, afterLabel }: { label: string; before: number; after: number; suffix?: string; beforeLabel: string; afterLabel: string }) {
  return (
    <div className="craft-dark-tile p-4">
      <p className="text-xs font-extrabold uppercase text-[#5c6873]">{label}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <span>
          <span className="block text-xs text-slate-500">{beforeLabel}</span>
          <span className="craft-number text-2xl font-extrabold text-[#46515c]"><AnimatedNumber value={before} suffix={suffix} decimals={Number.isInteger(before) ? 0 : 1} /></span>
        </span>
        <span>
          <span className="block text-xs text-slate-500">{afterLabel}</span>
          <span className="craft-number bg-gradient-to-br from-[#17212b] to-[#164e63] bg-clip-text text-2xl font-extrabold text-transparent"><AnimatedNumber value={after} suffix={suffix} decimals={Number.isInteger(after) ? 0 : 1} /></span>
        </span>
      </div>
    </div>
  );
}

function ImpactList({
  title,
  items,
  empty,
  currentStatusMap,
  simulatedStatusMap
}: {
  title: string;
  items: CentreStatus[];
  empty: string;
  currentStatusMap?: Map<string, CentreStatus>;
  simulatedStatusMap?: Map<string, CentreStatus>;
}) {
  return (
    <div className="craft-card-muted p-3">
      <p className="text-sm font-extrabold text-[#17212b]">{title}</p>
      <div className="mt-3 space-y-2">
        {items.length ? items.slice(0, 5).map((status) => {
          const peer = currentStatusMap?.get(status.centre.id) ?? simulatedStatusMap?.get(status.centre.id);
          const score = currentStatusMap ? status.interventionScore : peer?.interventionScore ?? status.interventionScore;
          return (
            <div className="flex items-center justify-between gap-3 text-sm" key={status.centre.id}>
              <span className="font-semibold text-[#46515c]">{shortCentreName(status.centre.name)}</span>
              <span className="craft-number font-extrabold text-[#17212b]">{score}</span>
            </div>
          );
        }) : <p className="text-sm text-slate-500">{empty}</p>}
      </div>
    </div>
  );
}
