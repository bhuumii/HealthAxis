"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bed, Boxes, Building2, ChevronDown, Search, Siren, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnimatePresence, motion } from "framer-motion";
import { AssistantPanel } from "@/components/assistant-panel";
import { LiveDataIndicator } from "@/components/live-data-indicator";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/components/language-provider";
import { districtKpis, getDistrictStatuses } from "@/lib/analytics";
import { detectCentreAnomalies } from "@/lib/anomalyDetection";
import { useDistrictData } from "@/lib/use-district-data";
import type { CentreStatus, Severity } from "@/lib/types";

type StatusFilter = "all" | "bad" | "warn" | "good";
type SortMode = "critical" | "patients" | "az";
type OverviewChartMetric = "beds" | "stock" | "doctors" | "tests";

const filterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "bad", label: "Critical" },
  { value: "warn", label: "Watch" },
  { value: "good", label: "Stable" }
];

function centreOverallStatus(status: CentreStatus): Severity {
  const indicators = [status.stock, status.beds, status.doctors, status.tests];
  if (indicators.includes("bad")) return "bad";
  if (indicators.includes("warn")) return "warn";
  return "good";
}

function issueCount(status: CentreStatus) {
  return [status.stock, status.beds, status.doctors, status.tests].filter((value) => value !== "good").length;
}

function criticalCount(status: CentreStatus) {
  return [status.stock, status.beds, status.doctors, status.tests].filter((value) => value === "bad").length;
}

const severityColor: Record<Severity, string> = {
  good: "#047857",
  warn: "#b7791f",
  bad: "#b42318"
};

const overviewCharts: Array<{
  metric: OverviewChartMetric;
  title: string;
  subtitle: string;
  color: string;
}> = [
  {
    metric: "beds",
    title: "Bed occupancy",
    subtitle: "Current bed occupancy percentage across all centres.",
    color: "#b7791f"
  },
  {
    metric: "stock",
    title: "Stock severity",
    subtitle: "Mapped severity score: Critical 100, Watch 60, Stable 20.",
    color: "#b42318"
  },
  {
    metric: "doctors",
    title: "Doctor absenteeism",
    subtitle: "Current doctor absence percentage across centres.",
    color: "#047857"
  },
  {
    metric: "tests",
    title: "Test downtime",
    subtitle: "Current diagnostic test unavailability percentage.",
    color: "#2563eb"
  }
];

function severityScore(value: Severity) {
  if (value === "bad") return 100;
  if (value === "warn") return 60;
  return 20;
}

function chartValue(status: CentreStatus, metric: OverviewChartMetric) {
  if (metric === "beds") return status.bedOccupancyPct;
  if (metric === "stock") return severityScore(status.stock);
  if (metric === "doctors") return status.doctorAbsenceRate;
  return status.unavailableTestPct;
}

function chartBarColor(status: CentreStatus, metric: OverviewChartMetric, fallback: string) {
  if (metric === "stock") return severityColor[status.stock];
  if (metric === "beds") return severityColor[status.beds];
  if (metric === "doctors") return severityColor[status.doctors];
  if (metric === "tests") return severityColor[status.tests];
  return fallback;
}

function chipClass(value: StatusFilter, active: boolean) {
  if (!active) return "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50";
  if (value === "bad") return "bg-red-50 text-red-700 ring-red-200";
  if (value === "warn") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (value === "good") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return "bg-slate-900 text-white ring-slate-900";
}

function stockOutRisk(status: CentreStatus) {
  const lowestDays = Math.min(...status.forecasts.map((forecast) => forecast.daysUntilStockout));
  if (lowestDays < 7) return { label: "High stock-out risk: " + lowestDays + " days", className: "bg-red-50 text-red-700 ring-red-200" };
  if (lowestDays < 14) return { label: "Medium stock-out risk: " + lowestDays + " days", className: "bg-amber-50 text-amber-700 ring-amber-200" };
  return null;
}

export function OverviewView() {
  const { data, error, isLive, livePulse, lastUpdatedAt } = useDistrictData();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("critical");
  const [activeChart, setActiveChart] = useState(0);
  const statuses = getDistrictStatuses(data);
  const kpis = districtKpis(data);

  const visibleStatuses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return statuses
      .filter((status) => {
        const matchesSearch =
          !normalizedSearch ||
          status.centre.name.toLowerCase().includes(normalizedSearch) ||
          status.centre.block.toLowerCase().includes(normalizedSearch);
        const matchesStatus = statusFilter === "all" || centreOverallStatus(status) === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortMode === "patients") return b.footfallToday - a.footfallToday;
        if (sortMode === "az") return a.centre.name.localeCompare(b.centre.name);

        return (
          issueCount(b) - issueCount(a) ||
          criticalCount(b) - criticalCount(a) ||
          b.interventionScore - a.interventionScore ||
          a.centre.name.localeCompare(b.centre.name)
        );
      });
  }, [search, sortMode, statusFilter, statuses]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-normal text-emerald-700">{data.district}, {data.state}</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950 lg:text-5xl">{t("districtOverview")}</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{t("districtLead")}</p>
        </div>
        <LiveDataIndicator isLive={isLive} pulse={livePulse} lastUpdatedAt={lastUpdatedAt} />
      </section>

      {error ? <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">Some live data could not be loaded. Showing the latest available district data.</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label={t("centres")} value={kpis.centres} />
        <StatCard icon={Boxes} label={t("stockWarnings")} value={kpis.warnings} />
        <StatCard icon={Siren} label={t("flaggedCentres")} value={kpis.flagged} />
        <StatCard icon={Bed} label={t("avgBedUse")} value={`${kpis.avgBeds}%`} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <MetricChartStack statuses={statuses} activeIndex={activeChart} setActiveIndex={setActiveChart} />
        <AssistantPanel data={data} />
      </section>

      <section className="mt-6">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">{t("centreReadiness")}</h2>
            <p className="mt-1 text-sm text-slate-500">Showing {visibleStatuses.length} of {statuses.length} centres.</p>
          </div>
          <Link className="text-sm font-bold text-emerald-700 hover:text-emerald-900" href="/intervention">
            {t("needsIntervention")}
          </Link>
        </div>

        <div className="mb-4 grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:grid-cols-[minmax(260px,1fr)_auto_230px] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search village or centre name..."
              aria-label="Search village or centre name"
            />
            {search ? (
              <button
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                className={`inline-flex h-9 items-center rounded-full px-3 text-sm font-bold ring-1 transition ${chipClass(option.value, statusFilter === option.value)}`}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                aria-pressed={statusFilter === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <select
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-10 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              aria-label="Sort centres"
            >
              <option value="critical">Most critical first</option>
              <option value="patients">Most patients today</option>
              <option value="az">A-Z</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
        </div>

        {visibleStatuses.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleStatuses.map((status) => {
              const anomalies = detectCentreAnomalies(status.centre);
              const risk = stockOutRisk(status);

              return (
              <article key={status.centre.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-normal text-slate-500">{status.centre.type} · {status.centre.block}</p>
                    <h3 className="mt-1 text-lg font-black text-slate-950">{status.centre.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{status.footfallToday} {t("patientsToday").toLowerCase()}</p>
                  </div>
                  <Link className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800" href={`/centres/${status.centre.id}`} aria-label={`Open ${status.centre.name}`}>
                    <ArrowRight size={18} />
                  </Link>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <PillMetric label={t("stock")} badge={<StatusBadge value={status.stock} />} />
                  <PillMetric label={t("beds")} badge={<StatusBadge value={status.beds} label={`${status.bedOccupancyPct}%`} />} />
                  <PillMetric label={t("doctors")} badge={<StatusBadge value={status.doctors} label={`${status.doctorAbsenceRate}% absent`} />} />
                  <PillMetric label={t("tests")} badge={<StatusBadge value={status.tests} label={`${status.unavailableTestPct}% down`} />} />
                </div>
                {risk || anomalies.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {risk ? <span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 " + risk.className}>{risk.label}</span> : null}
                    {anomalies.length ? <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200">Unusual pattern: {anomalies[0].label}</span> : null}
                  </div>
                ) : null}
              </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-base font-bold text-slate-950">No centres match your search or filter</p>
            <p className="mt-1 text-sm text-slate-500">Try clearing the search or selecting a different status.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function MetricChartStack({
  statuses,
  activeIndex,
  setActiveIndex
}: {
  statuses: CentreStatus[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}) {
  const activeChart = overviewCharts[activeIndex];
  const chartData = statuses.map((status) => ({
    name: status.centre.block,
    value: chartValue(status, activeChart.metric),
    color: chartBarColor(status, activeChart.metric, activeChart.color)
  }));
  const nextIndex = (activeIndex + 1) % overviewCharts.length;
  const previousIndex = (activeIndex - 1 + overviewCharts.length) % overviewCharts.length;
  const peekingCards = [1, 2, 3].map((offset) => ({
    offset,
    index: (activeIndex + offset) % overviewCharts.length,
    chart: overviewCharts[(activeIndex + offset) % overviewCharts.length]
  }));

  return (
    <div className="relative min-h-[440px]">
      {peekingCards.reverse().map(({ chart, index, offset }) => (
        <button
          key={`${chart.metric}-${offset}`}
          className="absolute left-3 right-3 h-24 rounded-2xl bg-white text-left shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-md"
          style={{
            top: `${(3 - offset) * 14}px`,
            zIndex: 10 - offset,
            transform: `scale(${1 - offset * 0.025})`,
            transformOrigin: "top center"
          }}
          type="button"
          onClick={() => setActiveIndex(index)}
          aria-label={`Show ${chart.title}`}
        >
          <div className="flex items-center justify-between px-5 pt-3">
            <span className="text-sm font-black text-slate-950">{chart.title}</span>
            <span className="h-2 w-12 rounded-full" style={{ backgroundColor: chart.color }} />
          </div>
        </button>
      ))}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeChart.metric}
          className="absolute inset-x-0 top-12 z-20 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
          initial={{ opacity: 0, y: 34, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 310, damping: 30, mass: 0.8 }}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">{activeChart.title} by centre</h2>
              <p className="text-sm text-slate-500">{activeChart.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-800"
                type="button"
                onClick={() => setActiveIndex(previousIndex)}
                aria-label="Previous chart"
              >
                <ArrowLeft size={16} />
              </button>
              <button
                className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-800"
                type="button"
                onClick={() => setActiveIndex(nextIndex)}
                aria-label="Next chart"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 16, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={activeChart.metric === "stock" ? [0, 100] : undefined} unit={activeChart.metric === "stock" ? undefined : "%"} />
                <Tooltip
                  formatter={(value) => [activeChart.metric === "stock" ? `${value} severity score` : `${value}%`, activeChart.title]}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={420}>
                  {chartData.map((entry) => (
                    <Cell key={`${activeChart.metric}-${entry.name}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex gap-2">
              {overviewCharts.map((chart, index) => (
                <button
                  key={chart.metric}
                  className={`h-2.5 rounded-full transition-all ${index === activeIndex ? "w-8 bg-emerald-700" : "w-2.5 bg-slate-300 hover:bg-slate-400"}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show ${chart.title}`}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-slate-500">{activeIndex + 1}/4</span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
        <Icon size={17} className="text-emerald-700" />
        {label}
      </div>
      <p className="mt-4 text-4xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function PillMetric({ label, badge }: { label: string; badge: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <p className="mb-2 text-xs font-bold uppercase tracking-normal text-slate-500">{label}</p>
      {badge}
    </div>
  );
}
