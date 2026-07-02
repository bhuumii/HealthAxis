import { NextResponse } from "next/server";

const languageLabels: Record<string, string> = {
  hi: "Hindi",
  mr: "Marathi",
  ta: "Tamil",
  te: "Telugu",
  en: "English"
};

function geminiModel() {
  const configured = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
  return configured.toLowerCase().includes("pro") ? "gemini-2.0-flash-lite" : configured;
}

export async function POST(request: Request) {
  const { texts, targetLanguage } = (await request.json()) as { texts?: string[]; targetLanguage?: string };
  const apiKey = process.env.GEMINI_API_KEY;

  if (!texts?.length || !targetLanguage || targetLanguage === "en") {
    return NextResponse.json({ translations: texts ?? [] });
  }

  if (!apiKey) {
    return NextResponse.json({ translations: texts, source: "fallback" });
  }

  const language = languageLabels[targetLanguage] ?? targetLanguage;
  const prompt = `Translate each JSON array string into ${language}. Preserve numbers, medicine names, PHC/CHC names, and units. Return only a JSON array of strings.\n\n${JSON.stringify(texts)}`;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel()}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
      })
    }
  );

  if (!response.ok) {
    return NextResponse.json({ translations: texts, source: "fallback" }, { status: 200 });
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

  try {
    const translations = JSON.parse(cleaned);
    return NextResponse.json({ translations: Array.isArray(translations) ? translations : texts });
  } catch {
    return NextResponse.json({ translations: texts, source: "fallback" });
  }
}
