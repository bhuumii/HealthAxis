"use client";

import Link from "next/link";
import { getCentreForecasts, getRedistributionRecommendations } from "@/lib/analytics";
import { useDistrictData } from "@/lib/use-district-data";
import { useLanguage } from "@/components/language-provider";

export function RedistributionView() {
  const { data } = useDistrictData();
  const { t } = useLanguage();
  const recommendations = getRedistributionRecommendations(data);

  function coverAfter(centreId: string, itemId: string, quantity: number) {
    const centre = data.centres.find((candidate) => candidate.id === centreId);
    const forecast = centre ? getCentreForecasts(centre).find((candidate) => candidate.medicineId === itemId) : null;
    if (!forecast) return "-";
    return `${forecast.daysUntilStockout} → ${Number(((forecast.currentStock + quantity) / Math.max(forecast.avgDailyUse, 0.1)).toFixed(1))}`;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <section className="mb-6">
        <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950 lg:text-5xl">{t("redistribution")}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">Rule-based transfers from surplus centres to deficit centres within the same district.</p>
      </section>
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">From centre</th>
                <th className="px-4 py-3">To centre</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Days cover before/after</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recommendations.map((recommendation) => (
                <tr key={`${recommendation.itemId}-${recommendation.fromCentreId}-${recommendation.toCentreId}`} className="hover:bg-slate-50">
                  <td className="px-4 py-4 font-bold text-slate-950">{recommendation.itemName}</td>
                  <td className="px-4 py-4 text-slate-700"><Link className="font-semibold text-emerald-700" href={`/centres/${recommendation.fromCentreId}`}>{recommendation.fromCentreName}</Link></td>
                  <td className="px-4 py-4 text-slate-700"><Link className="font-semibold text-emerald-700" href={`/centres/${recommendation.toCentreId}`}>{recommendation.toCentreName}</Link></td>
                  <td className="px-4 py-4 text-slate-700">{recommendation.quantity} {recommendation.unit}</td>
                  <td className="px-4 py-4 text-slate-700">{coverAfter(recommendation.toCentreId, recommendation.itemId, recommendation.quantity)} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
