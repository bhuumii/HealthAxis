"use client";

import Link from "next/link";
import { LiveDataIndicator } from "@/components/live-data-indicator";
import { getRedistributionRecommendations } from "@/lib/analytics";
import { REDISTRIBUTION_METHOD } from "@/lib/redistribution";
import { useDistrictData } from "@/lib/use-district-data";
import { useLanguage } from "@/components/language-provider";

export function RedistributionView() {
  const { data, isLive, livePulse, lastUpdatedAt } = useDistrictData();
  const { t } = useLanguage();
  const recommendations = getRedistributionRecommendations(data);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <section className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="mt-2 text-3xl font-bold text-[#17212b] lg:text-4xl">{t("redistribution")}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#46515c]">Recommended transfers are computed by a deterministic allocation algorithm, with Gemini used only by the assistant route to phrase explanations.</p>
        </div>
        <LiveDataIndicator isLive={isLive} pulse={livePulse} lastUpdatedAt={lastUpdatedAt} />
      </section>

      <section className="mb-4 rounded-md border border-[#cfd8df] bg-white p-4">
        <p className="text-sm font-bold text-[#17212b]">Allocation method</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{REDISTRIBUTION_METHOD}</p>
      </section>

      <section className="overflow-hidden rounded-md border border-[#cfd8df] bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f8fafb] text-xs uppercase text-[#5c6873]">
              <tr>
                <th className="px-4 py-3">Recommended transfer</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Donor cover</th>
                <th className="px-4 py-3">Recipient cover</th>
                <th className="px-4 py-3">Unmet demand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dde4e9]">
              {recommendations.map((recommendation) => (
                <tr key={`${recommendation.itemId}-${recommendation.fromCentreId}-${recommendation.toCentreId}-${recommendation.quantity}`} className="hover:bg-[#f8fafb]">
                  <td className="px-4 py-3 text-[#46515c]">
                    <p className="font-bold text-[#17212b]">Move {recommendation.quantity} {recommendation.unit} of {recommendation.itemName}</p>
                    <p className="mt-1 text-sm">
                      from <Link className="font-semibold text-[#164e63]" href={`/centres/${recommendation.fromCentreId}`}>{recommendation.fromCentreName}</Link> to <Link className="font-semibold text-[#164e63]" href={`/centres/${recommendation.toCentreId}`}>{recommendation.toCentreName}</Link>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{recommendation.reason}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-bold ring-1 ${recommendation.priority === "high" ? "bg-[#f8eeee] text-[#9f3a38] ring-[#d7aaaa]" : "bg-[#f7f1e6] text-[#8a6426] ring-[#d5bd91]"}`}>
                      {recommendation.priority === "high" ? "High" : "Medium"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#46515c]">{recommendation.fromDaysCoverBefore} {"->"} {recommendation.fromDaysCoverAfter} days</td>
                  <td className="px-4 py-3 text-[#46515c]">{recommendation.toDaysCoverBefore} {"->"} {recommendation.toDaysCoverAfter} days</td>
                  <td className="px-4 py-3 text-[#46515c]">{recommendation.unmetDemandAfter} {recommendation.unit}</td>
                </tr>
              ))}
              {!recommendations.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-slate-500" colSpan={5}>No redistribution is currently recommended.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
