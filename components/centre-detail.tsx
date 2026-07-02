"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FlaskConical, UserCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/components/language-provider";
import { getCentreStatus } from "@/lib/analytics";
import { useDistrictData } from "@/lib/use-district-data";
import type { HealthCentre, Severity } from "@/lib/types";

type TrendMetric = "stock" | "beds" | "doctors" | "tests";

const trendTabs: Array<{ value: TrendMetric; label: string }> = [
  { value: "stock", label: "Stock" },
  { value: "beds", label: "Beds" },
  { value: "doctors", label: "Doctors" },
  { value: "tests", label: "Tests" }
];

const severityStyles: Record<Severity, { line: string; chip: string }> = {
  good: { line: "#047857", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  warn: { line: "#b7791f", chip: "bg-amber-50 text-amber-700 ring-amber-200" },
  bad: { line: "#b42318", chip: "bg-red-50 text-red-700 ring-red-200" }
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function simulatedTrend(dates: string[], anchor: number, max = 100) {
  return dates.map((date, index) => {
    if (index === dates.length - 1) return { date, value: Number(anchor.toFixed(1)) };
    const distanceFromToday = dates.length - 1 - index;
    const wave = Math.sin((index + anchor) * 0.9) * 6;
    const drift = Math.cos((distanceFromToday + anchor) * 0.45) * 4;
    return { date, value: Number(clamp(anchor + wave + drift, 0, max).toFixed(1)) };
  });
}

function doctorAbsenceTrend(centre: HealthCentre) {
  const dates = [...new Set(centre.attendance.map((record) => record.date))].slice(-30);
  return dates.map((date) => {
    const dayRecords = centre.attendance.filter((record) => record.date === date);
    const absent = dayRecords.filter((record) => record.status === "absent").length;
    const value = dayRecords.length ? (absent / dayRecords.length) * 100 : 0;
    return { date: date.slice(5), value: Number(value.toFixed(1)) };
  });
}

function buildTrendData(centre: HealthCentre, status: ReturnType<typeof getCentreStatus>, metric: TrendMetric) {
  const primaryStock = centre.medicines[0];
  const bedDates = centre.beds.history.slice(-30).map((point) => point.date.slice(5));

  if (metric === "stock") {
    return {
      title: `${primaryStock.name} stock trend`,
      subtitle: "Closing stock over the last 30 days from stock history.",
      unit: primaryStock.unit,
      status: status.stock,
      data: primaryStock.history.slice(-30).map((point) => ({ date: point.date.slice(5), value: point.closing }))
    };
  }

  if (metric === "beds") {
    return {
      title: "Bed occupancy trend",
      subtitle: "Daily occupied beds as a percentage of total beds over the last 30 days.",
      unit: "%",
      status: status.beds,
      data: centre.beds.history.slice(-30).map((point) => ({
        date: point.date.slice(5),
        value: Number(((point.occupied / point.total) * 100).toFixed(1))
      }))
    };
  }

  if (metric === "doctors") {
    return {
      title: "Doctor absenteeism trend",
      subtitle: "Daily doctor absence percentage from attendance history over the last 30 days.",
      unit: "% absent",
      status: status.doctors,
      data: doctorAbsenceTrend(centre)
    };
  }

  return {
    title: "Diagnostic test downtime trend",
    subtitle: "Simulated 30-day trend anchored to today's actual test downtime because per-day test history is not stored yet.",
    unit: "% down",
    status: status.tests,
    data: simulatedTrend(bedDates, status.unavailableTestPct)
  };
}

function chipClass(severity: Severity, active: boolean) {
  return active ? severityStyles[severity].chip : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50";
}

export function CentreDetail({ centreId }: { centreId: string }) {
  const { t } = useLanguage();
  const { data } = useDistrictData();
  const [activeMetric, setActiveMetric] = useState<TrendMetric>("stock");
  const centre = data.centres.find((candidate) => candidate.id === centreId);

  if (!centre) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <Link className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700" href="/overview">
          <ArrowLeft size={17} /> {t("overview")}
        </Link>
        <p className="mt-6 rounded-2xl bg-white p-6 text-slate-600 shadow-sm ring-1 ring-slate-200">Centre not found in the current district data.</p>
      </main>
    );
  }

  const status = getCentreStatus(centre);
  const recentDates = [...new Set(centre.attendance.map((record) => record.date))].slice(-7);
  const trend = buildTrendData(centre, status, activeMetric);
  const lineColor = severityStyles[trend.status].line;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-900" href="/overview">
            <ArrowLeft size={17} /> {t("overview")}
          </Link>
          <p className="text-sm font-bold uppercase tracking-normal text-emerald-700">{centre.type} · {centre.block}</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950 lg:text-5xl">{centre.name}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Catchment population {centre.catchmentPopulation.toLocaleString("en-IN")}. Intervention score {status.interventionScore}/100.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={t("stock")} value={<StatusBadge value={status.stock} />} />
        <Kpi label={t("occupancy")} value={`${status.bedOccupancyPct}%`} />
        <Kpi label={t("doctorAttendance")} value={`${(100 - status.doctorAbsenceRate).toFixed(1)}%`} />
        <Kpi label={t("testAvailability")} value={`${(100 - status.unavailableTestPct).toFixed(1)}%`} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeMetric}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                >
                  <h2 className="text-lg font-bold text-slate-950">{trend.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{trend.subtitle}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendTabs.map((tab) => {
                const tabStatus = buildTrendData(centre, status, tab.value).status;
                return (
                  <button
                    key={tab.value}
                    className={`inline-flex h-9 items-center rounded-full px-3 text-sm font-bold ring-1 transition ${chipClass(tabStatus, activeMetric === tab.value)}`}
                    type="button"
                    onClick={() => setActiveMetric(tab.value)}
                    aria-pressed={activeMetric === tab.value}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4 h-80 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMetric}
                className="h-full"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.26, ease: "easeOut" }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend.data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} unit={trend.unit === "%" ? "%" : undefined} />
                    <Tooltip formatter={(value) => [`${value}${trend.unit.startsWith("%") ? "%" : ` ${trend.unit}`}`, trendTabs.find((tab) => tab.value === activeMetric)?.label ?? "Value"]} />
                    <Line type="monotone" dataKey="value" stroke={lineColor} strokeWidth={3} dot={false} isAnimationActive animationDuration={280} />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-bold text-slate-950">{t("testAvailability")}</h2>
          <div className="mt-4 space-y-3">
            {centre.tests.map((test) => (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100" key={test.id}>
                <span>
                  <strong className="block text-sm text-slate-950">{test.name}</strong>
                  <small className="text-slate-500">Unavailable {test.unavailableDays30}/30 days</small>
                </span>
                <span className={`inline-flex items-center gap-1 text-sm font-bold ${test.available ? "text-emerald-700" : "text-red-700"}`}>
                  <FlaskConical size={16} /> {test.available ? "Available" : "Down"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-bold text-slate-950">{t("forecast")}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-normal text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-3 pr-4">Item</th>
                <th className="py-3 pr-4">{t("currentStock")}</th>
                <th className="py-3 pr-4">{t("dailyUse")}</th>
                <th className="py-3 pr-4">{t("smoothedDemand")}</th>
                <th className="py-3 pr-4">{t("status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {status.forecasts.map((forecast) => (
                <tr key={forecast.medicineId}>
                  <td className="py-3 pr-4 font-semibold text-slate-950">{forecast.medicineName}</td>
                  <td className="py-3 pr-4 text-slate-700">{forecast.currentStock} {forecast.unit}</td>
                  <td className="py-3 pr-4 text-slate-700">{forecast.avgDailyUse}</td>
                  <td className="py-3 pr-4 text-slate-700">{forecast.smoothedDemand} · {forecast.daysUntilStockout} days</td>
                  <td className="py-3 pr-4"><StatusBadge value={forecast.severity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-bold text-slate-950">{t("doctorAttendance")}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {centre.doctors.map((doctor) => {
            const recent = centre.attendance.filter((record) => record.doctorId === doctor.id && recentDates.includes(record.date));
            const present = recent.filter((record) => record.status === "present").length;
            const rate = recent.length ? Math.round((present / recent.length) * 100) : 0;
            return (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100" key={doctor.id}>
                <span>
                  <strong className="block text-sm text-slate-950">{doctor.name}</strong>
                  <small className="text-slate-500">{doctor.role} · {doctor.specialty}</small>
                </span>
                <span className={`inline-flex items-center gap-1 text-sm font-bold ${rate < 70 ? "text-red-700" : rate < 85 ? "text-amber-700" : "text-emerald-700"}`}>
                  <UserCheck size={16} /> {rate}%
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <div className="mt-3 text-3xl font-black text-slate-950">{value}</div>
    </div>
  );
}
