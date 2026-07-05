"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AnimatedNumber, entranceTransition, riseIn, staggerContainer } from "@/components/motion-primitives";
import { ArrowRight, Siren } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { useDistrictSelection } from "@/components/district-provider";
import { useLanguage } from "@/components/language-provider";
import { getDistrictStatuses } from "@/lib/analytics";
import { useDistrictData } from "@/lib/use-district-data";

export function InterventionView() {
  const { data } = useDistrictData();
  const { t } = useLanguage();
  const { hrefWithDistrict } = useDistrictSelection();
  const flagged = getDistrictStatuses(data).filter((status) => status.flagged);

  return (
    <main className="craft-page mx-auto max-w-7xl px-4 lg:px-8">
      <section className="mb-8">
        <p className="craft-eyebrow">{data.district}, {data.state}</p>
        <h1 className="craft-title mt-3">{t("needsIntervention")}</h1>
        <p className="mt-3 w-full text-sm leading-6 text-[#46515c]">{t("interventionLead")}</p>
      </section>

      {flagged.length === 0 ? (
        <section className="craft-card p-5 text-[#46515c]">{t("noFlags")}</section>
      ) : (
        <motion.section className="grid gap-4 lg:grid-cols-2" variants={staggerContainer} initial="hidden" animate="visible">
          {flagged.map((status) => (
            <motion.article className="craft-card craft-lift p-5" variants={riseIn} transition={entranceTransition} whileHover={{ y: -4, scale: 1.01 }} key={status.centre.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-normal text-slate-500">{status.centre.type} · {status.centre.block}</p>
                  <h2 className="mt-1 text-xl font-extrabold leading-tight text-[#17212b]">{status.centre.name}</h2>
                </div>
                <Link className="craft-button inline-flex items-center gap-2 rounded-md bg-[#164e63] px-3 py-2 text-sm font-bold text-white hover:bg-[#0d3848]" href={hrefWithDistrict(`/centres/${status.centre.id}`)}>
                  {t("open")} <ArrowRight size={15} strokeWidth={1.55} />
                </Link>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Siren size={20} strokeWidth={1.55} className="text-[#9f3a38]" />
                <span className="text-sm font-bold text-slate-500">{t("score")}</span>
                <span className="craft-number text-5xl font-extrabold leading-none text-[#17212b]"><AnimatedNumber value={status.interventionScore} /></span>
                <span className="text-xs leading-5 text-slate-500">0-100 combined risk across stock, beds, doctors, and tests. Higher means more urgent.</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-sm bg-[#eef3f5]">
                <motion.div className={`h-full ${status.interventionScore >= 70 ? "bg-[#9f3a38]" : "bg-[#9a6a22]"}`} initial={{ width: 0 }} animate={{ width: `${status.interventionScore}%` }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }} />
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
    <div className="craft-card-muted p-3">
      <p className="mb-2 text-xs font-extrabold uppercase text-slate-500">{label}</p>
      {badge}
    </div>
  );
}
