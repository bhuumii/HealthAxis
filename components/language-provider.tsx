"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Language = "en" | "hi" | "mr" | "ta" | "te";

const labels: Record<Language, Record<string, string>> = {
  en: {
    overview: "Overview",
    intervention: "Intervention",
    alerts: "Alerts",
    districtOverview: "District overview",
    districtLead:
      "Live operational view across PHCs and CHCs with stock, bed, doctor, and test readiness signals.",
    centres: "Centres",
    stockWarnings: "Stock warnings",
    flaggedCentres: "Flagged centres",
    avgBedUse: "Avg bed use",
    centreReadiness: "Centre readiness",
    priorityAlerts: "Priority alerts",
    redistribution: "Resource redistribution",
    askAi: "Ask the district assistant",
    askPlaceholder: "Example: which centres are low on antibiotics today?",
    ask: "Ask",
    thinking: "Checking...",
    open: "Open",
    stock: "Stock",
    beds: "Beds",
    doctors: "Doctors",
    tests: "Tests",
    patientsToday: "Patients today",
    daysCover: "days cover",
    currentStock: "Current stock",
    dailyUse: "Avg daily use",
    smoothedDemand: "Forecast demand",
    needsIntervention: "Needs district intervention",
    interventionLead: "Centres crossing the weighted risk threshold for administrator follow-up.",
    noFlags: "No centres currently cross the intervention threshold.",
    score: "Score",
    doctorAttendance: "Doctor attendance",
    testAvailability: "Test availability",
    footfall: "Patient footfall",
    occupancy: "Bed occupancy",
    forecast: "Medicine forecast",
    status: "Status"
  },
  hi: {
    overview: "सारांश",
    intervention: "हस्तक्षेप",
    alerts: "अलर्ट",
    districtOverview: "जिला सारांश",
    districtLead: "PHC और CHC के लिए स्टॉक, बेड, डॉक्टर और टेस्ट readiness का लाइव परिचालन दृश्य।",
    centres: "केंद्र",
    stockWarnings: "स्टॉक चेतावनी",
    flaggedCentres: "चिह्नित केंद्र",
    avgBedUse: "औसत बेड उपयोग",
    centreReadiness: "केंद्र तैयारी",
    priorityAlerts: "प्राथमिक चेतावनी",
    redistribution: "संसाधन पुनर्वितरण",
    askAi: "जिला सहायक से पूछें",
    askPlaceholder: "उदाहरण: आज कौन से केंद्र antibiotics में कम हैं?",
    ask: "पूछें",
    thinking: "जांच रहे हैं...",
    open: "खोलें",
    stock: "स्टॉक",
    beds: "बेड",
    doctors: "डॉक्टर",
    tests: "टेस्ट",
    patientsToday: "आज मरीज",
    daysCover: "दिन कवर",
    currentStock: "मौजूदा स्टॉक",
    dailyUse: "औसत दैनिक उपयोग",
    smoothedDemand: "पूर्वानुमान मांग",
    needsIntervention: "जिला हस्तक्षेप आवश्यक",
    interventionLead: "वे केंद्र जिनका weighted risk score प्रशासकीय follow-up threshold पार कर रहा है।",
    noFlags: "अभी कोई केंद्र intervention threshold पार नहीं कर रहा है।",
    score: "स्कोर",
    doctorAttendance: "डॉक्टर उपस्थिति",
    testAvailability: "टेस्ट उपलब्धता",
    footfall: "मरीज footfall",
    occupancy: "बेड occupancy",
    forecast: "दवा पूर्वानुमान",
    status: "स्थिति"
  },
  mr: {
    overview: "आढावा",
    intervention: "हस्तक्षेप",
    alerts: "इशारे",
    districtOverview: "जिल्हा आढावा",
    districtLead: "PHC आणि CHC मधील स्टॉक, बेड, डॉक्टर आणि चाचणी तयारीचे थेट परिचालन दृश्य.",
    centres: "केंद्रे",
    stockWarnings: "स्टॉक इशारे",
    flaggedCentres: "धोक्यातील केंद्रे",
    avgBedUse: "सरासरी बेड वापर",
    centreReadiness: "केंद्र तयारी",
    priorityAlerts: "प्राधान्य इशारे",
    redistribution: "संसाधन पुनर्वाटप",
    askAi: "जिल्हा सहाय्यकाला विचारा",
    askPlaceholder: "उदा: आज कोणती केंद्रे antibiotics मध्ये कमी आहेत?",
    ask: "विचारा",
    thinking: "तपासत आहे...",
    open: "उघडा",
    stock: "स्टॉक",
    beds: "बेड",
    doctors: "डॉक्टर",
    tests: "चाचण्या",
    patientsToday: "आजचे रुग्ण",
    daysCover: "दिवस कव्हर",
    currentStock: "सध्याचा स्टॉक",
    dailyUse: "सरासरी दैनिक वापर",
    smoothedDemand: "अंदाजित मागणी",
    needsIntervention: "जिल्हा हस्तक्षेप आवश्यक",
    interventionLead: "ज्या केंद्रांचा weighted risk score प्रशासकीय follow-up threshold ओलांडतो.",
    noFlags: "सध्या कोणतेही केंद्र intervention threshold ओलांडत नाही.",
    score: "स्कोअर",
    doctorAttendance: "डॉक्टर उपस्थिती",
    testAvailability: "चाचणी उपलब्धता",
    footfall: "रुग्ण footfall",
    occupancy: "बेड occupancy",
    forecast: "औषध अंदाज",
    status: "स्थिती"
  },
  ta: {
    overview: "கண்ணோட்டம்",
    intervention: "தலையீடு",
    alerts: "எச்சரிக்கைகள்",
    districtOverview: "மாவட்ட கண்ணோட்டம்",
    districtLead: "PHC மற்றும் CHC மையங்களில் மருந்து இருப்பு, படுக்கைகள், மருத்துவர்கள் மற்றும் பரிசோதனை தயார்நிலையின் நேரடி செயல்பாட்டு பார்வை.",
    centres: "மையங்கள்",
    stockWarnings: "இருப்பு எச்சரிக்கைகள்",
    flaggedCentres: "குறியிடப்பட்ட மையங்கள்",
    avgBedUse: "சராசரி படுக்கை பயன்பாடு",
    centreReadiness: "மைய தயார்நிலை",
    priorityAlerts: "முன்னுரிமை எச்சரிக்கைகள்",
    redistribution: "வள மறுவினியோகம்",
    askAi: "மாவட்ட உதவியாளரிடம் கேளுங்கள்",
    askPlaceholder: "உதா: இன்று எந்த மையங்களில் antibiotics குறைவாக உள்ளன?",
    ask: "கேள்",
    thinking: "சரிபார்க்கிறது...",
    open: "திற",
    stock: "இருப்பு",
    beds: "படுக்கைகள்",
    doctors: "மருத்துவர்கள்",
    tests: "பரிசோதனைகள்",
    patientsToday: "இன்றைய நோயாளிகள்",
    daysCover: "நாட்கள் கவர்",
    currentStock: "தற்போதைய இருப்பு",
    dailyUse: "சராசரி தினசரி பயன்பாடு",
    smoothedDemand: "முன்கணிப்பு தேவை",
    needsIntervention: "மாவட்ட தலையீடு தேவை",
    interventionLead: "எடை செய்யப்பட்ட அபாய வரம்பை மீறும் மையங்கள் நிர்வாக follow-up க்காக காட்டப்படுகின்றன.",
    noFlags: "தற்போது எந்த மையமும் தலையீட்டு வரம்பை மீறவில்லை.",
    score: "மதிப்பெண்",
    doctorAttendance: "மருத்துவர் வருகை",
    testAvailability: "பரிசோதனை கிடைப்புத் தன்மை",
    footfall: "நோயாளர் வருகை",
    occupancy: "படுக்கை occupancy",
    forecast: "மருந்து முன்கணிப்பு",
    status: "நிலை"
  },
  te: {
    overview: "అవలోకనం",
    intervention: "జోక్యం",
    alerts: "హెచ్చరికలు",
    districtOverview: "జిల్లా అవలోకనం",
    districtLead: "PHC మరియు CHC కేంద్రాల్లో స్టాక్, పడకలు, వైద్యులు మరియు పరీక్షల సిద్ధతపై ప్రత్యక్ష నిర్వహణ దృశ్యం.",
    centres: "కేంద్రాలు",
    stockWarnings: "స్టాక్ హెచ్చరికలు",
    flaggedCentres: "గుర్తించబడిన కేంద్రాలు",
    avgBedUse: "సగటు పడక వినియోగం",
    centreReadiness: "కేంద్ర సిద్ధత",
    priorityAlerts: "ప్రాధాన్య హెచ్చరికలు",
    redistribution: "వనరుల పునర్విభజన",
    askAi: "జిల్లా సహాయకుడిని అడగండి",
    askPlaceholder: "ఉదా: నేడు antibiotics తక్కువగా ఉన్న కేంద్రాలు ఏవి?",
    ask: "అడగండి",
    thinking: "పరిశీలిస్తోంది...",
    open: "తెరవండి",
    stock: "స్టాక్",
    beds: "పడకలు",
    doctors: "వైద్యులు",
    tests: "పరీక్షలు",
    patientsToday: "నేటి రోగులు",
    daysCover: "రోజుల కవర్",
    currentStock: "ప్రస్తుత స్టాక్",
    dailyUse: "సగటు రోజువారీ వినియోగం",
    smoothedDemand: "అంచనా డిమాండ్",
    needsIntervention: "జిల్లా జోక్యం అవసరం",
    interventionLead: "weighted risk threshold దాటిన కేంద్రాలు నిర్వాహక follow-up కోసం చూపబడుతున్నాయి.",
    noFlags: "ప్రస్తుతం ఏ కేంద్రం intervention threshold దాటలేదు.",
    score: "స్కోరు",
    doctorAttendance: "వైద్యుల హాజరు",
    testAvailability: "పరీక్షల లభ్యత",
    footfall: "రోగుల రాకపోకలు",
    occupancy: "పడక occupancy",
    forecast: "మందుల అంచనా",
    status: "స్థితి"
  }

};

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("healthaxis-language") as Language | null;
    if (saved && labels[saved]) setLanguageState(saved);
  }, []);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem("healthaxis-language", nextLanguage);
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: string) => labels[language][key] ?? labels.en[key] ?? key
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}

export const languageNames: Record<Language, string> = {
  en: "English",
  hi: "हिन्दी",
  mr: "मराठी",
  ta: "தமிழ்",
  te: "తెలుగు"
};
