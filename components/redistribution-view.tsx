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
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950 lg:text-5xl">{t("redistribution")}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">Recommended transfers are computed by a deterministic allocation algorithm, with Gemini used only by the assistant route to phrase explanations.</p>
        </div>
        <LiveDataIndicator isLive={isLive} pulse={livePulse} lastUpdatedAt={lastUpdatedAt} />
      </section>

      <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-bold text-slate-950">Allocation method</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{REDISTRIBUTION_METHOD}</p>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
              <tr>
                <th className="px-4 py-3">Recommended transfer</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Donor cover</th>
                <th className="px-4 py-3">Recipient cover</th>
                <th className="px-4 py-3">Unmet demand</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recommendations.map((recommendation) => (
                <tr key={`${recommendation.itemId}-${recommendation.fromCentreId}-${recommendation.toCentreId}-${recommendation.quantity}`} className="hover:bg-slate-50">
                  <td className="px-4 py-4 text-slate-700">
                    <p className="font-bold text-slate-950">Move {recommendation.quantity} {recommendation.unit} of {recommendation.itemName}</p>
                    <p className="mt-1 text-sm">
                      from <Link className="font-semibold text-emerald-700" href={`/centres/${recommendation.fromCentreId}`}>{recommendation.fromCentreName}</Link> to <Link className="font-semibold text-emerald-700" href={`/centres/${recommendation.toCentreId}`}>{recommendation.toCentreName}</Link>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{recommendation.reason}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${recommendation.priority === "high" ? "bg-red-50 text-red-700 ring-red-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}>
                      {recommendation.priority === "high" ? "High" : "Medium"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{recommendation.fromDaysCoverBefore} {"->"} {recommendation.fromDaysCoverAfter} days</td>
                  <td className="px-4 py-4 text-slate-700">{recommendation.toDaysCoverBefore} {"->"} {recommendation.toDaysCoverAfter} days</td>
                  <td className="px-4 py-4 text-slate-700">{recommendation.unmetDemandAfter} {recommendation.unit}</td>
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
