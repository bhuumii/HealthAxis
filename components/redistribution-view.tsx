"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Info } from "lucide-react";
import { entranceTransition, riseIn, staggerContainer } from "@/components/motion-primitives";
import { LiveDataIndicator } from "@/components/live-data-indicator";
import { getRedistributionRecommendations } from "@/lib/analytics";
import { REDISTRIBUTION_METHOD } from "@/lib/redistribution";
import { useDistrictData } from "@/lib/use-district-data";
import { useLanguage } from "@/components/language-provider";
import { useDistrictSelection } from "@/components/district-provider";

export function RedistributionView() {
  const { data, isLive, livePulse, lastUpdatedAt } = useDistrictData();
  const { t } = useLanguage();
  const { hrefWithDistrict } = useDistrictSelection();
  const recommendations = getRedistributionRecommendations(data);

  return (
    <main className="craft-page mx-auto max-w-7xl px-4 lg:px-8">
      <section className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="craft-title mt-2">{t("redistribution")}</h1>
          <p className="mt-3 w-full text-sm leading-6 text-[#46515c]">{t("redistributionLead")}</p>
        </div>
        <LiveDataIndicator isLive={isLive} pulse={livePulse} lastUpdatedAt={lastUpdatedAt} />
      </section>

      <motion.section className="craft-card mb-5 p-5" variants={riseIn} initial="hidden" animate="visible" transition={entranceTransition}>
        <p className="craft-section-title">{t("allocationMethod")}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{REDISTRIBUTION_METHOD}</p>
      </motion.section>

      <motion.section className="craft-table-shell overflow-hidden" variants={staggerContainer} initial="hidden" animate="visible">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f8fafb] text-xs uppercase text-[#5c6873]">
              <tr>
                <th className="px-4 py-3">Recommended transfer</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    Donor cover
                    <span title="Days of stock remaining before and after this transfer.">
                      <Info size={13} strokeWidth={1.55} className="text-slate-400" />
                    </span>
                  </span>
                </th>
                <th className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    Recipient cover
                    <span title="Days of stock remaining before and after this transfer.">
                      <Info size={13} strokeWidth={1.55} className="text-slate-400" />
                    </span>
                  </span>
                </th>
                <th className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    Unmet demand
                    <span title="Amount still needed after this transfer, if any.">
                      <Info size={13} strokeWidth={1.55} className="text-slate-400" />
                    </span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dde4e9]">
              {recommendations.map((recommendation) => (
                <motion.tr key={`${recommendation.itemId}-${recommendation.fromCentreId}-${recommendation.toCentreId}-${recommendation.quantity}`} className="transition-colors hover:bg-[#f8fafb]" variants={riseIn} transition={entranceTransition}>
                  <td className="px-4 py-3 text-[#46515c]">
                    <p className="font-bold text-[#17212b]">Move <span className="craft-number text-2xl font-extrabold text-[#0f2f3b]">{recommendation.quantity}</span> {recommendation.unit} of {recommendation.itemName}</p>
                    <p className="mt-1 text-sm">
                      from <Link className="font-semibold text-[#164e63]" href={hrefWithDistrict(`/centres/${recommendation.fromCentreId}`)}>{recommendation.fromCentreName}</Link> to <Link className="font-semibold text-[#164e63]" href={hrefWithDistrict(`/centres/${recommendation.toCentreId}`)}>{recommendation.toCentreName}</Link>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{recommendation.reason}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-bold ring-1 ${recommendation.priority === "high" ? "bg-[#f8eeee] text-[#9f3a38] ring-[#d7aaaa]" : "bg-[#f7f1e6] text-[#8a6426] ring-[#d5bd91]"}`}>
                      {recommendation.priority === "high" ? "High" : "Medium"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#46515c]">{recommendation.fromDaysCoverBefore} {"→"} {recommendation.fromDaysCoverAfter} days</td>
                  <td className="px-4 py-3 text-[#46515c]">{recommendation.toDaysCoverBefore} {"→"} {recommendation.toDaysCoverAfter} days</td>
                  <td className="px-4 py-3 text-[#46515c]">
                    {recommendation.unmetDemandAfter > 0 ? (
                      <span>{recommendation.unmetDemandAfter} {recommendation.unit} still needed</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-[#eef5f1] px-2 py-0.5 text-xs font-bold text-[#47705d] ring-1 ring-[#b8cdbc]">
                        <CheckCircle2 size={13} strokeWidth={1.55} /> Fully covered
                      </span>
                    )}
                  </td>
                </motion.tr>
              ))}
              {!recommendations.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-slate-500" colSpan={5}>No redistribution is currently recommended.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </motion.section>
    </main>
  );
}
