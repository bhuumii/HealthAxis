import { NextResponse } from "next/server";
import { getDistrictData } from "@/lib/data";
import { getDistrictStatuses, getRedistributionRecommendations } from "@/lib/analytics";
import { getDistrictDataFromFirestore } from "@/lib/firestore-server";
import type { CentreStatus, DistrictData } from "@/lib/types";

const languageLabels: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
  ta: "Tamil",
  te: "Telugu"
};

function geminiModel() {
  const configured = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
  return configured.toLowerCase().includes("pro") ? "gemini-2.0-flash-lite" : configured;
}

function centreSummary(status: CentreStatus) {
  const criticalStock = status.forecasts.filter((forecast) => forecast.severity === "bad");
  const watchStock = status.forecasts.filter((forecast) => forecast.severity === "warn");
  const worstStockItems = [...status.forecasts]
    .filter((forecast) => forecast.severity !== "good")
    .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)
    .slice(0, 3)
    .map((forecast) => `${forecast.medicineName} (${forecast.daysUntilStockout} days cover, ${forecast.currentStock} ${forecast.unit})`);
  const unavailableTests = status.centre.tests.filter((test) => !test.available).map((test) => test.name);

  return {
    centreId: status.centre.id,
    centre: status.centre.name,
    type: status.centre.type,
    block: status.centre.block,
    interventionScore: status.interventionScore,
    flagged: status.flagged,
    overallRankSignal: "Higher interventionScore means more urgent need for district support.",
    stockStatus: status.stock,
    criticalStockOutCount: criticalStock.length,
    watchStockCount: watchStock.length,
    worstStockItems,
    bedStatus: status.beds,
    bedOccupancyPct: status.bedOccupancyPct,
    doctorStatus: status.doctors,
    doctorAbsenceRatePct: status.doctorAbsenceRate,
    testStatus: status.tests,
    unavailableTestPct: status.unavailableTestPct,
    unavailableTests,
    patientsToday: status.footfallToday
  };
}

type AssistantCentreSummary = ReturnType<typeof centreSummary>;

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function editDistance(a: string, b: string) {
  const matrix = Array.from({ length: a.length + 1 }, (_, row) =>
    Array.from({ length: b.length + 1 }, (_, column) => (row === 0 ? column : column === 0 ? row : 0))
  );

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      matrix[row][column] =
        a[row - 1] === b[column - 1]
          ? matrix[row - 1][column - 1]
          : Math.min(matrix[row - 1][column - 1], matrix[row - 1][column], matrix[row][column - 1]) + 1;
    }
  }

  return matrix[a.length][b.length];
}

function findMentionedCentre(question: string, summaries: AssistantCentreSummary[]) {
  const normalized = normalizeText(question);
  const queryTokens = normalized.split(" ").filter((token) => token.length >= 4);
  const genericTerms = new Set(["primary", "community", "health", "centre", "center", "phc", "chc"]);

  let bestMatch: AssistantCentreSummary | null = null;
  let bestScore = 0;

  for (const summary of summaries) {
    const fullName = normalizeText(summary.centre);
    const block = normalizeText(summary.block);
    const aliases = [block, ...fullName.split(" ")].filter((value) => value.length >= 4 && !genericTerms.has(value));
    let score = normalized.includes(fullName) ? 100 : 0;

    if (block && normalized.includes(block)) score = Math.max(score, 90);

    for (const alias of aliases) {
      for (const token of queryTokens) {
        if (token === alias) score = Math.max(score, 80);
        if (Math.abs(token.length - alias.length) <= 2 && editDistance(token, alias) <= 2) {
          score = Math.max(score, 60);
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = summary;
    }
  }

  return bestScore >= 60 ? bestMatch : undefined;
}

function buildAssistantContext(data: DistrictData) {
  const centreSummaries = getDistrictStatuses(data).map(centreSummary);
  const redistribution = getRedistributionRecommendations(data).slice(0, 6).map((recommendation) => ({
    item: recommendation.itemName,
    from: recommendation.fromCentreName,
    to: recommendation.toCentreName,
    quantity: `${recommendation.quantity} ${recommendation.unit}`,
    reason: recommendation.reason
  }));

  return {
    district: `${data.district}, ${data.state}`,
    rankingMethod:
      "Centres are ranked by the same composite interventionScore used by the app's flagging feature: stock-out severity, bed occupancy, doctor absenteeism, and test downtime.",
    centreSummaries,
    recommendedTransfers: redistribution
  };
}

function directMetricAnswer(question: string, data: DistrictData) {
  const normalized = normalizeText(question);
  const summaries = getDistrictStatuses(data).map(centreSummary);
  const namedCentre = findMentionedCentre(question, summaries);

  if (!namedCentre) return null;

  if (/\bbed|occupancy|occupied|beds\b/.test(normalized)) {
    return `${namedCentre.centre}'s current bed occupancy is ${namedCentre.bedOccupancyPct}%.`;
  }

  if (/doctor|attendance|absen/.test(normalized)) {
    return `${namedCentre.centre}'s current doctor absenteeism rate is ${namedCentre.doctorAbsenceRatePct}%.`;
  }

  if (/test|diagnostic|availability|available/.test(normalized)) {
    return `${namedCentre.centre} has ${namedCentre.unavailableTestPct}% test unavailability.`;
  }

  if (/score|intervention|flag/.test(normalized)) {
    return `${namedCentre.centre}'s intervention score is ${namedCentre.interventionScore}/100, and it is ${namedCentre.flagged ? "flagged" : "not flagged"} for district intervention.`;
  }

  return null;
}

function localAnswer(question: string, data: DistrictData) {
  const normalized = question.toLowerCase();
  const summaries = getDistrictStatuses(data).map(centreSummary);
  const top = summaries[0];

  if (!top) return "No centre data is available in the current district data.";

  const directAnswer = directMetricAnswer(question, data);
  if (directAnswer) return directAnswer;

  const namedCentre = findMentionedCentre(question, summaries);
  if (namedCentre && /why|flag|intervention|score|problem|issue/.test(normalized)) {
    const factors = [
      namedCentre.criticalStockOutCount ? `${namedCentre.criticalStockOutCount} critical stock warnings` : null,
      namedCentre.bedOccupancyPct >= 85 ? `${namedCentre.bedOccupancyPct}% bed occupancy` : null,
      namedCentre.doctorAbsenceRatePct >= 10 ? `${namedCentre.doctorAbsenceRatePct}% doctor absence` : null,
      namedCentre.unavailableTestPct > 0 ? `${namedCentre.unavailableTestPct}% tests unavailable` : null
    ].filter(Boolean);
    return `${namedCentre.centre} is ${namedCentre.flagged ? "flagged" : "not flagged"} with an intervention score of ${namedCentre.interventionScore}/100. The main drivers are ${factors.join(", ") || "below-threshold combined operational risk"}.`;
  }

  if (/transfer|redistribution|redistribute|resource|move|send/.test(normalized)) {
    const recommendations = getRedistributionRecommendations(data).slice(0, 3);
    if (!recommendations.length) return "No stock transfer recommendation is currently available from the current district data.";
    const topTransfer = recommendations[0];
    return `Prioritize moving ${topTransfer.quantity} ${topTransfer.unit} of ${topTransfer.itemName} from ${topTransfer.fromCentreName} to ${topTransfer.toCentreName}. ${topTransfer.reason} This is the most actionable transfer because it addresses a low-cover centre using a surplus centre.`;
  }

  if (/stock|medicine|medicines|antibiotic|antibiotics|low|shortage|shortages/.test(normalized)) {
    const centreMatches = summaries
      .map((summary) => {
        const matchingItems = summary.worstStockItems.filter((item) => {
          if (/antibiotic|antibiotics/.test(normalized)) return /amoxicillin|azithromycin/i.test(item);
          return true;
        });
        return { summary, matchingItems };
      })
      .filter(({ matchingItems }) => matchingItems.length > 0)
      .slice(0, 3);

    if (!centreMatches.length) return "No matching low-stock centres were found in the current district data.";

    return centreMatches
      .map(
        ({ summary, matchingItems }) =>
          `${summary.centre} is the priority for stock support: ${summary.criticalStockOutCount} critical stock warnings, score ${summary.interventionScore}/100, with ${matchingItems.slice(0, 2).join(" and ")}.`
      )
      .join(" ");
  }

  const isHelpQuestion = /help|most|urgent|priority|underperform|intervention|struggling|worst/.test(normalized);
  if (isHelpQuestion) {
    const factors = [
      top.criticalStockOutCount ? `${top.criticalStockOutCount} critical stock warnings` : null,
      top.bedOccupancyPct >= 85 ? `${top.bedOccupancyPct}% bed occupancy` : null,
      top.doctorAbsenceRatePct >= 10 ? `${top.doctorAbsenceRatePct}% doctor absence` : null,
      top.unavailableTestPct > 0 ? `${top.unavailableTestPct}% tests unavailable` : null
    ].filter(Boolean);

    return `${top.centre} needs help most today, with the highest intervention score at ${top.interventionScore}/100. The main drivers are ${factors.join(", ") || "its combined operational risk indicators"}. Prioritize district follow-up there before the next highest-risk centre.`;
  }

  return summaries
    .slice(0, 3)
    .map(
      (summary) =>
        `${summary.centre}: score ${summary.interventionScore}/100, ${summary.criticalStockOutCount} critical stock warnings, ${summary.bedOccupancyPct}% bed occupancy, ${summary.doctorAbsenceRatePct}% doctor absence, ${summary.unavailableTestPct}% tests unavailable.`
    )
    .join(" ");
}

export async function POST(request: Request) {
  const { question, language = "en" } = (await request.json()) as { question?: string; language?: string };
  const apiKey = process.env.GEMINI_API_KEY;

  if (!question?.trim()) {
    return NextResponse.json({ answer: "Ask a question about stock, beds, doctors, tests, or flagged centres." });
  }

  const data = (await getDistrictDataFromFirestore()) ?? getDistrictData();
  const directAnswer = directMetricAnswer(question, data);

  if (directAnswer) {
    return NextResponse.json({ answer: directAnswer, source: "deterministic" });
  }

  if (!apiKey) {
    return NextResponse.json({ answer: localAnswer(question, data), source: "fallback" });
  }

  const context = buildAssistantContext(data);
  const answerLanguage = languageLabels[language] ?? "English";
  const prompt = `You are a district health operations assistant for Indian PHC/CHC administrators.

Answer using only this summarized current district context. If the user asks for one specific metric for one named centre, answer only that metric in one short sentence. Do not return a ranked list for a specific metric question. Do not enumerate raw stock records one by one. Synthesize and rank centres by interventionScore unless the user explicitly asks for a specific centre, metric, medicine, or transfer. For questions like "which centre needs help most today", name the single most urgent centre first, then explain the 2-4 worst factors driving that ranking in 2-4 concise sentences. Mention exact metrics from the centre summaries when useful. If comparing centres, keep the answer short and ranked. Reply in ${answerLanguage}.

Summarized context:
${JSON.stringify(context)}

Question: ${question}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel()}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512
        }
      })
    }
  );

  if (!response.ok) {
    return NextResponse.json({ answer: localAnswer(question, data), source: "fallback" });
  }

  const payload = await response.json();
  const answer = payload?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return NextResponse.json({ answer: answer || localAnswer(question, data) });
}
