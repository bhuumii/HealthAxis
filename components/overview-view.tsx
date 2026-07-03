"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown, Search, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedNumber, easeOut, entranceTransition, riseIn, staggerContainer } from "@/components/motion-primitives";
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
  good: "#47705d",
  warn: "#8a6426",
  bad: "#9f3a38"
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
    color: "#8a6426"
  },
  {
    metric: "stock",
    title: "Stock severity",
    subtitle: "Mapped severity score: Critical 100, Watch 60, Stable 20.",
    color: "#9f3a38"
  },
  {
    metric: "doctors",
    title: "Doctor absenteeism",
    subtitle: "Current doctor absence percentage across centres.",
    color: "#47705d"
  },
  {
    metric: "tests",
    title: "Test downtime",
    subtitle: "Current diagnostic test unavailability percentage.",
    color: "#164e63"
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
  if (!active) return "bg-white text-[#46515c] ring-[#cfd8df] hover:bg-[#eef3f5]";
  if (value === "bad") return "bg-[#f8eeee] text-[#9f3a38] ring-[#d7aaaa]";
  if (value === "warn") return "bg-[#f7f1e6] text-[#8a6426] ring-[#d5bd91]";
  if (value === "good") return "bg-[#eef5f1] text-[#47705d] ring-[#b8cdbc]";
  return "bg-[#164e63] text-white ring-[#164e63]";
}

function stockOutRisk(status: CentreStatus) {
  const lowestDays = Math.min(...status.forecasts.map((forecast) => forecast.daysUntilStockout));
  if (lowestDays < 7) return { label: "High stock-out risk: " + lowestDays + " days", className: "bg-[#f8eeee] text-[#9f3a38] ring-[#d7aaaa]" };
  if (lowestDays < 14) return { label: "Medium stock-out risk: " + lowestDays + " days", className: "bg-[#f7f1e6] text-[#8a6426] ring-[#d5bd91]" };
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
    <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      <section className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-[#164e63]">{data.district}, {data.state}</p>
          <h1 className="mt-2 text-3xl font-bold text-[#17212b] lg:text-4xl">{t("districtOverview")}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#46515c]">{t("districtLead")}</p>
        </div>
        <LiveDataIndicator isLive={isLive} pulse={livePulse} lastUpdatedAt={lastUpdatedAt} />
      </section>

      {error ? <p className="mb-4 rounded-md border border-[#d5bd91] bg-[#f7f1e6] px-3 py-2 text-sm text-[#8a6426]">Some live data could not be loaded. Showing the latest available district data.</p> : null}

      <motion.section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" variants={staggerContainer} initial="hidden" animate="visible">
        <StatCard label={t("centres")} value={kpis.centres} />
        <StatCard label={t("stockWarnings")} value={kpis.warnings} />
        <StatCard label={t("flaggedCentres")} value={kpis.flagged} />
        <StatCard label={t("avgBedUse")} value={kpis.avgBeds} suffix="%" />
      </motion.section>

      <motion.section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={riseIn} transition={entranceTransition}><MetricChartStack statuses={statuses} activeIndex={activeChart} setActiveIndex={setActiveChart} /></motion.div>
        <motion.div variants={riseIn} transition={entranceTransition}><AssistantPanel data={data} /></motion.div>
      </motion.section>

      <motion.section className="mt-6" variants={riseIn} initial="hidden" animate="visible" transition={entranceTransition}>
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#17212b]">{t("centreReadiness")}</h2>
            <p className="mt-1 text-sm text-slate-500">Showing {visibleStatuses.length} of {statuses.length} centres.</p>
          </div>
          <Link className="text-sm font-bold text-[#164e63] transition duration-200 ease-out hover:text-[#0d3848] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8c7d0]" href="/intervention">
            {t("needsIntervention")}
          </Link>
        </div>

        <div className="mb-4 grid gap-3 rounded-md border border-[#cfd8df] bg-white p-3 lg:grid-cols-[minmax(260px,1fr)_auto_230px] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={1.75} />
            <input
              className="h-11 w-full rounded-md border border-[#cfd8df] bg-[#f8fafb] pl-10 pr-10 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#164e63] focus:ring-2 focus:ring-[#dbe8ed]"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search village or centre name..."
              aria-label="Search village or centre name"
            />
            {search ? (
              <button
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-slate-400 hover:bg-[#eef3f5] hover:text-[#17212b]"
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={15} strokeWidth={1.75} />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                className={`inline-flex h-9 items-center rounded px-3 text-sm font-bold ring-1 transition duration-200 ease-out hover:scale-[1.01] ${chipClass(option.value, statusFilter === option.value)}`}
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
              className="h-11 w-full appearance-none rounded-md border border-[#cfd8df] bg-[#f8fafb] px-3 pr-10 text-sm font-bold text-slate-700 outline-none transition focus:border-[#164e63] focus:ring-2 focus:ring-[#dbe8ed]"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              aria-label="Sort centres"
            >
              <option value="critical">Most critical first</option>
              <option value="patients">Most patients today</option>
              <option value="az">A-Z</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={1.75} />
          </div>
        </div>

        {visibleStatuses.length ? (
          <motion.div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" variants={staggerContainer} initial="hidden" animate="visible">
            {visibleStatuses.map((status) => {
              const anomalies = detectCentreAnomalies(status.centre);
              const risk = stockOutRisk(status);

              return (
              <motion.article key={status.centre.id} className="rounded-md border border-[#cfd8df] bg-white p-4 transition-colors duration-200 ease-out hover:border-[#b8c7d0]" variants={riseIn} transition={entranceTransition} whileHover={{ scale: 1.01 }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-normal text-slate-500">{status.centre.type} · {status.centre.block}</p>
                    <h3 className="mt-1 text-base font-bold text-[#17212b]">{status.centre.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{status.footfallToday} {t("patientsToday").toLowerCase()}</p>
                  </div>
                  <Link className="grid h-10 w-10 place-items-center rounded-md border border-[#cfd8df] bg-white text-[#46515c] transition duration-200 ease-out hover:scale-[1.02] hover:border-[#164e63] hover:bg-[#f8fafb] hover:text-[#164e63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8c7d0]" href={`/centres/${status.centre.id}`} aria-label={`Open ${status.centre.name}`}>
                    <ArrowRight size={16} strokeWidth={1.75} />
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
                    {risk ? <span className={"inline-flex rounded px-2 py-0.5 text-xs font-bold ring-1 " + risk.className}>{risk.label}</span> : null}
                    {anomalies.length ? <span className="inline-flex rounded bg-[#eef3f5] px-2 py-0.5 text-xs font-bold text-[#164e63] ring-1 ring-[#b8c7d0]">Unusual pattern: {anomalies[0].label}</span> : null}
                  </div>
                ) : null}
              </motion.article>
              );
            })}
          </motion.div>
        ) : (
          <div className="rounded-md border border-[#cfd8df] bg-white p-6 text-center">
            <p className="text-base font-bold text-slate-950">No centres match your search or filter</p>
            <p className="mt-1 text-sm text-slate-500">Try clearing the search or selecting a different status.</p>
          </div>
        )}
      </motion.section>
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
          className="absolute left-3 right-3 h-24 rounded-md border border-[#cfd8df] bg-white text-left transition hover:-translate-y-0.5"
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
            <span className="text-sm font-bold text-[#17212b]">{chart.title}</span>
            <span className="h-2 w-12 rounded-sm" style={{ backgroundColor: chart.color }} />
          </div>
        </button>
      ))}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeChart.metric}
          className="absolute inset-x-0 top-12 z-20 rounded-md border border-[#cfd8df] bg-white p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: easeOut }}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">{activeChart.title} by centre</h2>
              <p className="text-sm text-slate-500">{activeChart.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="grid h-9 w-9 place-items-center rounded-md border border-[#cfd8df] bg-white text-[#46515c] hover:border-[#164e63] hover:text-[#164e63]"
                type="button"
                onClick={() => setActiveIndex(previousIndex)}
                aria-label="Previous chart"
              >
                <ArrowLeft size={15} strokeWidth={1.75} />
              </button>
              <button
                className="grid h-9 w-9 place-items-center rounded-md border border-[#cfd8df] bg-white text-[#46515c] hover:border-[#164e63] hover:text-[#164e63]"
                type="button"
                onClick={() => setActiveIndex(nextIndex)}
                aria-label="Next chart"
              >
                <ArrowRight size={15} strokeWidth={1.75} />
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
                <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive animationDuration={360} animationEasing="ease-out">
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
                  className={`h-2.5 rounded-sm transition-all ${index === activeIndex ? "w-8 bg-[#164e63]" : "w-2.5 bg-[#cfd8df] hover:bg-[#9aa9b3]"}`}
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

function StatCard({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <motion.div
      className="rounded-md border border-[#cfd8df] bg-white p-4 transition-colors duration-200 ease-out hover:border-[#b8c7d0] hover:bg-[#fbfcfd]"
      variants={riseIn}
      transition={entranceTransition}
      whileHover={{ scale: 1.01 }}
    >
      <div className="text-xs font-bold uppercase text-[#5c6873]">{label}</div>
      <p className="mt-4 text-3xl font-bold text-[#17212b]"><AnimatedNumber value={value} suffix={suffix} /></p>
    </motion.div>
  );
}

function PillMetric({ label, badge }: { label: string; badge: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[#dde4e9] bg-[#f8fafb] p-2.5">
      <p className="mb-2 text-xs font-bold uppercase tracking-normal text-slate-500">{label}</p>
      {badge}
    </div>
  );
}
