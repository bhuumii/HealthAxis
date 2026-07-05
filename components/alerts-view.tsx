"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { entranceTransition, riseIn, staggerContainer } from "@/components/motion-primitives";
import { AlertTriangle, ArrowRight, Info } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { useDistrictSelection } from "@/components/district-provider";
import { useLanguage } from "@/components/language-provider";
import { getStockWarnings } from "@/lib/analytics";
import { useDistrictData } from "@/lib/use-district-data";

function formatDaysRemaining(days: number) {
  if (days <= 0) return "Runs out today";
  if (days < 1) return "Less than 1 day left";
  return `~${Math.ceil(days)} days left`;
}

export function AlertsView() {
  const { data } = useDistrictData();
  const { t } = useLanguage();
  const { hrefWithDistrict } = useDistrictSelection();
  const warnings = getStockWarnings(data);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <section className="mb-6">
        <h1 className="mt-2 text-3xl font-bold text-[#17212b] lg:text-4xl">{t("priorityAlerts")}</h1>
        <p className="mt-2 text-sm leading-6 text-[#46515c]">These alerts show medicines and supplies that may run out soon. Technical forecast details are still available on each centre page.</p>
      </section>
      <motion.section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" variants={staggerContainer} initial="hidden" animate="visible">
        {warnings.map((warning) => (
          <motion.article className="rounded-md border border-[#cfd8df] bg-white p-4 transition-colors duration-200 ease-out hover:border-[#b8c7d0] hover:bg-[#fbfcfd]" variants={riseIn} transition={entranceTransition} whileHover={{ scale: 1.01 }} key={`${warning.centreId}-${warning.medicineId}`}>
            <div className="flex items-start justify-between gap-4">
              <AlertTriangle className={warning.severity === "bad" ? "text-[#9f3a38]" : "text-[#8a6426]"} size={22} />
              <StatusBadge value={warning.severity} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-[#17212b]">{warning.medicineName}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">{warning.centreName}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-[#dde4e9] bg-[#f8fafb] p-2.5">
                <dt className="font-bold text-slate-500">{t("currentStock")}</dt>
                <dd className="mt-1 text-lg font-bold text-[#17212b]">{warning.currentStock} {warning.unit}</dd>
              </div>
              <div className="rounded-md border border-[#dde4e9] bg-[#f8fafb] p-2.5">
                <dt className="flex items-center gap-1 font-bold text-slate-500">
                  Days remaining
                  <span title="Estimated days before this item runs out at current usage rate.">
                    <Info size={13} strokeWidth={1.75} className="text-slate-400" />
                  </span>
                </dt>
                <dd className="mt-1 text-lg font-bold text-[#17212b]">{formatDaysRemaining(warning.daysUntilStockout)}</dd>
                <dd className="mt-1 text-xs leading-4 text-slate-500">Estimated time before this item runs out at current usage.</dd>
              </div>
            </dl>
            <Link className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#164e63] hover:text-[#0d3848]" href={hrefWithDistrict(`/centres/${warning.centreId}`)}>
              {t("open")} <ArrowRight size={15} strokeWidth={1.75} />
            </Link>
          </motion.article>
        ))}
      </motion.section>
    </main>
  );
}
