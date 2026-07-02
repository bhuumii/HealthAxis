"use client";

import Link from "next/link";
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
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <section className="mb-6">
        <p className="text-sm font-bold uppercase tracking-normal text-emerald-700">{data.district}, {data.state}</p>
        <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950 lg:text-5xl">{t("needsIntervention")}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{t("interventionLead")}</p>
      </section>

      {flagged.length === 0 ? (
        <section className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm ring-1 ring-slate-200">{t("noFlags")}</section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {flagged.map((status) => (
            <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200" key={status.centre.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-normal text-slate-500">{status.centre.type} · {status.centre.block}</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">{status.centre.name}</h2>
                </div>
                <Link className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800" href={`/centres/${status.centre.id}`}>
                  {t("open")} <ArrowRight size={16} />
                </Link>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <Siren size={20} className="text-red-700" />
                <span className="text-sm font-bold text-slate-500">{t("score")}</span>
                <span className="text-2xl font-black text-slate-950">{status.interventionScore}</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full ${status.interventionScore >= 70 ? "bg-red-600" : "bg-amber-500"}`} style={{ width: `${status.interventionScore}%` }} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric label={t("stock")} badge={<StatusBadge value={status.stock} />} />
                <Metric label={t("beds")} badge={<StatusBadge value={status.beds} label={`${status.bedOccupancyPct}%`} />} />
                <Metric label={t("doctors")} badge={<StatusBadge value={status.doctors} label={`${status.doctorAbsenceRate}% absent`} />} />
                <Metric label={t("tests")} badge={<StatusBadge value={status.tests} label={`${status.unavailableTestPct}% down`} />} />
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function Metric({ label, badge }: { label: string; badge: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <p className="mb-2 text-xs font-bold uppercase tracking-normal text-slate-500">{label}</p>
      {badge}
    </div>
  );
}
