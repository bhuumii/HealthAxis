"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { getStockWarnings } from "@/lib/analytics";
import type { DistrictData, StockForecast } from "@/lib/types";

function fallbackAnswer(question: string, warnings: StockForecast[]) {
  const normalized = question.toLowerCase();
  const matched = warnings.filter((warning) => {
    const text = `${warning.medicineName} ${warning.category} ${warning.centreName}`.toLowerCase();
    return normalized
      .split(/\W+/)
      .filter((token) => token.length > 3)
      .some((token) => text.includes(token));
  });
  const result = matched.length ? matched : warnings.slice(0, 4);

  if (!result.length) return "No low-stock centres were found in the current district data.";

  return result
    .slice(0, 5)
    .map(
      (warning) =>
        `${warning.centreName}: ${warning.medicineName} has ${warning.currentStock} ${warning.unit} left, about ${warning.daysUntilStockout} days left before it runs out.`
    )
    .join(" ");
}

export function AssistantPanel({ data }: { data: DistrictData }) {
  const { t, language } = useLanguage();
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const warnings = useMemo(() => getStockWarnings(data), [data]);

  async function askAssistant() {
    if (!question.trim()) return;
    const asked = question.trim();
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch("/api/gemini/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: asked, language, districtSlug: data.districtSlug })
      });
      if (!response.ok) throw new Error("Gemini route unavailable");
      const payload = (await response.json()) as { answer?: string };
      setAnswers((current) => [payload.answer || fallbackAnswer(asked, warnings), ...current].slice(0, 8));
    } catch {
      setAnswers((current) => [fallbackAnswer(asked, warnings), ...current].slice(0, 8));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-md border border-[#cfd8df] bg-white p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[#17212b]">{t("askAi")}</h2>
        <p className="mt-1 text-sm text-slate-500">Run structured questions against the current district operating dataset.</p>
      </div>
      <div className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-md border border-[#cfd8df] bg-[#f8fafb] px-3 py-2 text-sm outline-none focus:border-[#164e63] focus:ring-2 focus:ring-[#dbe8ed]"
          value={question}
          placeholder={t("askPlaceholder")}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void askAssistant();
          }}
        />
        <button
          className="inline-flex items-center gap-2 rounded-md bg-[#164e63] px-4 py-2 text-sm font-bold text-white hover:bg-[#0d3848] disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={askAssistant}
          disabled={loading}
        >
          <Send size={15} strokeWidth={1.75} />
          {loading ? t("thinking") : t("ask")}
        </button>
      </div>
      <div className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-md border border-[#dde4e9] bg-[#f8fafb] p-3">
        {answers.length ? (
          answers.map((answer, index) => (
            <p key={`${answer}-${index}`} className="rounded border border-[#dde4e9] bg-white p-2.5 text-sm leading-6 text-[#46515c]">
              {answer}
            </p>
          ))
        ) : (
          <p className="p-3 text-sm text-slate-500">Enter a query about stock risk, bed occupancy, workforce coverage, diagnostic availability, or transfer options.</p>
        )}
      </div>
    </section>
  );
}
