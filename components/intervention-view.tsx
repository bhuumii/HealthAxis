"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { entranceTransition, riseIn, staggerContainer } from "@/components/motion-primitives";
import { ArrowRight, Siren } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/components/language-provider";
import { getDistrictStatuses } from "@/lib/analytics";
import { useDistrictData } from "@/lib/use-district-data";

export function InterventionView() {
  const { data } = useDistrictData();
  const { t } = useLanguage();
  const flagged = getDistrictStatuses(data).filter((status) => status.flagged);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <section className="mb-6">
        <p className="text-xs font-bold uppercase text-[#164e63]">{data.district}, {data.state}</p>
        <h1 className="mt-2 text-3xl font-bold text-[#17212b] lg:text-4xl">{t("needsIntervention")}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#46515c]">{t("interventionLead")}</p>
      </section>

      {flagged.length === 0 ? (
        <section className="rounded-md border border-[#cfd8df] bg-white p-4 text-[#46515c]">{t("noFlags")}</section>
      ) : (
        <motion.section className="grid gap-4 lg:grid-cols-2" variants={staggerContainer} initial="hidden" animate="visible">
          {flagged.map((status) => (
            <motion.article className="rounded-md border border-[#cfd8df] bg-white p-4 transition-colors duration-200 ease-out hover:border-[#b8c7d0] hover:bg-[#fbfcfd]" variants={riseIn} transition={entranceTransition} whileHover={{ scale: 1.01 }} key={status.centre.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-normal text-slate-500">{status.centre.type} · {status.centre.block}</p>
                  <h2 className="mt-1 text-lg font-bold text-[#17212b]">{status.centre.name}</h2>
                </div>
                <Link className="inline-flex items-center gap-2 rounded-md bg-[#164e63] px-3 py-2 text-sm font-bold text-white hover:bg-[#0d3848]" href={`/centres/${status.centre.id}`}>
                  {t("open")} <ArrowRight size={15} strokeWidth={1.75} />
                </Link>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <Siren size={20} className="text-[#9f3a38]" />
                <span className="text-sm font-bold text-slate-500">{t("score")}</span>
                <span className="text-2xl font-bold text-[#17212b]">{status.interventionScore}</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-sm bg-[#eef3f5]">
                <div className={`h-full ${status.interventionScore >= 70 ? "bg-[#9f3a38]" : "bg-[#9a6a22]"}`} style={{ width: `${status.interventionScore}%` }} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric label={t("stock")} badge={<StatusBadge value={status.stock} />} />
                <Metric label={t("beds")} badge={<StatusBadge value={status.beds} label={`${status.bedOccupancyPct}%`} />} />
                <Metric label={t("doctors")} badge={<StatusBadge value={status.doctors} label={`${status.doctorAbsenceRate}% absent`} />} />
                <Metric label={t("tests")} badge={<StatusBadge value={status.tests} label={`${status.unavailableTestPct}% down`} />} />
              </div>
            </motion.article>
          ))}
        </motion.section>
      )}
    </main>
  );
}

function Metric({ label, badge }: { label: string; badge: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[#dde4e9] bg-[#f8fafb] p-2.5">
      <p className="mb-2 text-xs font-bold uppercase tracking-normal text-slate-500">{label}</p>
      {badge}
    </div>
  );
}
