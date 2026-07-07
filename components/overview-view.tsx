"use client";

import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Search, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import { AnimatedNumber, entranceTransition, riseIn, staggerContainer } from "@/components/motion-primitives";
import { AssistantPanel } from "@/components/assistant-panel";
import { useAuth } from "@/components/auth-provider";
import { DISTRICTS, useDistrictSelection } from "@/components/district-provider";
import { CustomSelect } from "@/components/custom-select";
import type { DistrictSlug } from "@/lib/districts";
import { LiveDataIndicator } from "@/components/live-data-indicator";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/components/language-provider";
import { districtKpis, getDistrictStatuses } from "@/lib/analytics";
import { detectCentreAnomalies } from "@/lib/anomalyDetection";
import { useDistrictData } from "@/lib/use-district-data";
import type { AnomalySignal, CentreStatus, Severity } from "@/lib/types";

type StatusFilter = "all" | "bad" | "warn" | "good";
type SortMode = "critical" | "patients" | "az";
type OverviewChartMetric = "beds" | "stock" | "doctors" | "tests" | "footfall";

function displayUserName(displayName?: string | null, email?: string | null) {
  const rawName = displayName?.trim() || email?.split("@")[0] || "User";
  const withoutTrailingId = rawName.replace(/\s+\d{4,}$/, "").replace(/\d+$/, "").trim();
  const firstName = withoutTrailingId.split(/[\s._-]+/)[0] || "User";
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

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
  },
  {
    metric: "footfall",
    title: "Footfall",
    subtitle: "Today's patient count across all centres.",
    color: "#5b5fc7"
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
  if (metric === "tests") return status.unavailableTestPct;
  return status.footfallToday;
}

function chartBarColor(status: CentreStatus, metric: OverviewChartMetric, fallback: string) {
  if (metric === "stock") return severityColor[status.stock];
  if (metric === "beds") return severityColor[status.beds];
  if (metric === "doctors") return severityColor[status.doctors];
  if (metric === "tests") return severityColor[status.tests];
  if (metric === "footfall") return fallback;
  return fallback;
}

function chipClass(value: StatusFilter, active: boolean) {
  if (!active) return "bg-white text-[#46515c] ring-[#cfd8df] hover:bg-[#eef3f5]";
  if (value === "bad") return "bg-[#f8eeee] text-[#9f3a38] ring-[#d7aaaa]";
  if (value === "warn") return "bg-[#f7f1e6] text-[#8a6426] ring-[#d5bd91]";
  if (value === "good") return "bg-[#eef5f1] text-[#47705d] ring-[#b8cdbc]";
  return "bg-[#164e63] text-white ring-[#164e63]";
}

function formatStockCountdown(days: number) {
  if (days <= 0) return "runs out today";
  if (days < 1) return "less than 1 day left";
  return `~${Math.ceil(days)} days left`;
}

function stockOutRisk(status: CentreStatus) {
  const lowestDays = Math.min(...status.forecasts.map((forecast) => forecast.daysUntilStockout));
  if (lowestDays < 7) return { label: `Stock-out risk: ${formatStockCountdown(lowestDays)}`, className: "bg-[#f8eeee] text-[#9f3a38] ring-[#d7aaaa]" };
  if (lowestDays < 14) return { label: `Stock-out risk: ${formatStockCountdown(lowestDays)}`, className: "bg-[#f7f1e6] text-[#8a6426] ring-[#d5bd91]" };
  return null;
}

function plainAnomalyText(anomaly: AnomalySignal) {
  const direction = anomaly.direction === "below" ? "far below" : "far above";
  if (anomaly.metric === "stock") {
    return `Unusual pattern: ${anomaly.label.replace(/ closing stock$/i, '')} stock level is ${direction} its normal trend for this centre`;
  }
  if (anomaly.metric === "beds") return `Unusual pattern: bed occupancy is ${direction} its normal trend for this centre`;
  if (anomaly.metric === "doctors") return `Unusual pattern: doctor absence is ${direction} its normal trend for this centre`;
  return `Unusual pattern: patient visits are ${direction} their normal trend for this centre`;
}

export function OverviewView() {
  const { data, error, isLive, livePulse, lastUpdatedAt } = useDistrictData();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { districtSlug, setDistrictSlug, hrefWithDistrict } = useDistrictSelection();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("critical");
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
    <main className="craft-page mx-auto max-w-7xl px-4 lg:px-8">
      <section className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="craft-eyebrow">{data.district}, {data.state}</p>
          <h1 className="craft-title mt-3">Welcome, {displayUserName(user?.displayName, user?.email)}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#46515c]">{t("overviewSelectDistrict")}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="block text-sm font-bold text-[#46515c]">
            <span>District</span>
            <CustomSelect
              value={districtSlug}
              options={DISTRICTS.map((district) => ({ value: district.slug as DistrictSlug, label: district.name }))}
              onChange={setDistrictSlug}
              ariaLabel="District"
              className="mt-2 min-w-56"
            />
          </div>
          <LiveDataIndicator isLive={isLive} pulse={livePulse} lastUpdatedAt={lastUpdatedAt} />
        </div>
      </section>

      {error ? <p className="mb-4 rounded-md border border-[#d5bd91] bg-[#f7f1e6] px-3 py-2 text-sm text-[#8a6426]">{t("liveDataFallback")}</p> : null}

      <motion.section key={`stats-${districtSlug}`} className="craft-hero-band grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4 lg:p-6" variants={staggerContainer} initial="hidden" animate="visible">
        <StatCard label={t("centres")} value={kpis.centres} />
        <StatCard label={t("stockWarnings")} value={kpis.warnings} />
        <StatCard label={t("flaggedCentres")} value={kpis.flagged} />
        <StatCard label={t("avgBedUse")} value={kpis.avgBeds} suffix="%" />
      </motion.section>

      <motion.section key={`ops-${districtSlug}`} className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={riseIn} transition={entranceTransition}><MetricChartStack statuses={statuses} /></motion.div>
        <motion.div variants={riseIn} transition={entranceTransition}><AssistantPanel data={data} /></motion.div>
      </motion.section>

      <motion.section className="mt-8" variants={riseIn} initial="hidden" animate="visible" transition={entranceTransition}>
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="craft-section-title">{t("centreReadiness")}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("centreReadinessShowing").replace("{visible}", String(visibleStatuses.length)).replace("{total}", String(statuses.length))}</p>
          </div>
          <Link className="craft-button inline-flex rounded-md px-3 py-2 text-sm font-bold text-[#164e63] hover:bg-white hover:text-[#0d3848] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8c7d0]" href={hrefWithDistrict("/intervention")}>
            {t("needsIntervention")}
          </Link>
        </div>

        <div className="craft-card mb-4 grid gap-3 p-3 lg:grid-cols-[minmax(260px,1fr)_auto_230px] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={1.75} />
            <input
              className="h-11 w-full rounded-md border border-[#cfd8df] bg-[#f8fafb] pl-10 pr-10 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#164e63] focus:ring-2 focus:ring-[#dbe8ed]"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
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
                className={`craft-button inline-flex h-9 items-center rounded-md px-3 text-sm font-bold ring-1 ${chipClass(option.value, statusFilter === option.value)}`}
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
              <motion.article key={status.centre.id} className="craft-card craft-lift p-4" variants={riseIn} transition={entranceTransition} whileHover={{ y: -4, scale: 1.01 }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase text-slate-500">{status.centre.type} · {status.centre.block}</p>
                    <h3 className="mt-1 text-lg font-extrabold leading-tight text-[#17212b]">{status.centre.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{status.footfallToday} {t("patientsToday").toLowerCase()}</p>
                  </div>
                  <Link className="craft-icon-button grid h-10 w-10 place-items-center rounded-md border border-[#cfd8df] bg-white text-[#46515c] hover:border-[#164e63] hover:bg-[#f8fafb] hover:text-[#164e63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8c7d0]" href={hrefWithDistrict(`/centres/${status.centre.id}`)} aria-label={`Open ${status.centre.name}`}>
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
                    {anomalies.length ? <span className="inline-flex rounded bg-[#eef3f5] px-2 py-0.5 text-xs font-bold text-[#164e63] ring-1 ring-[#b8c7d0]">{plainAnomalyText(anomalies[0])}</span> : null}
                  </div>
                ) : null}
              </motion.article>
              );
            })}
          </motion.div>
        ) : (
          <div className="craft-card p-6 text-center">
            <p className="text-base font-bold text-slate-950">{t("noCentreMatch")}</p>
            <p className="mt-1 text-sm text-slate-500">{t("noCentreMatchLead")}</p>
          </div>
        )}
      </motion.section>
    </main>
  );
}

function MetricChartStack({ statuses }: { statuses: CentreStatus[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const stackRef = useRef<HTMLDivElement | null>(null);
  const wheelLockRef = useRef(false);
  const wheelDeltaRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);

  function nextIndexFor(direction: number) {
    return Math.max(0, Math.min(overviewCharts.length - 1, activeIndex + direction));
  }

  function moveBy(direction: number) {
    const nextIndex = nextIndexFor(direction);
    if (nextIndex === activeIndex) return false;
    setActiveIndex(nextIndex);
    return true;
  }

  useEffect(() => {
    function handleWindowWheel(event: globalThis.WheelEvent) {
      const section = stackRef.current;
      if (!section || Math.abs(event.deltaY) < 2) return;

      const rect = section.getBoundingClientRect();
      const sectionVisible = rect.top < window.innerHeight * 0.88 && rect.bottom > window.innerHeight * 0.12;
      if (!sectionVisible) return;

      const direction = event.deltaY > 0 ? 1 : -1;
      const nextIndex = Math.max(0, Math.min(overviewCharts.length - 1, activeIndex + direction));
      if (nextIndex === activeIndex) {
        wheelDeltaRef.current = 0;
        return;
      }

      event.preventDefault();
      wheelDeltaRef.current += event.deltaY;

      if (wheelLockRef.current || Math.abs(wheelDeltaRef.current) < 220) return;

      wheelLockRef.current = true;
      wheelDeltaRef.current = 0;
      setActiveIndex(nextIndex);
      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 580);
    }

    window.addEventListener("wheel", handleWindowWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWindowWheel);
  }, [activeIndex]);

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStartYRef.current === null) return;

    const endY = event.changedTouches[0]?.clientY ?? touchStartYRef.current;
    const delta = touchStartYRef.current - endY;
    touchStartYRef.current = null;

    if (Math.abs(delta) < 90) return;
    moveBy(delta > 0 ? 1 : -1);
  }

  return (
    <div
      ref={stackRef}
      className="overflow-hidden rounded-lg border border-[#cfd8df] bg-white shadow-sm"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {overviewCharts.map((chart, index) => (
        <MetricChartCard
          key={chart.metric}
          chart={chart}
          index={index}
          isActive={activeIndex === index}
          statuses={statuses}
        />
      ))}
    </div>
  );
}

function MetricChartCard({
  chart,
  index,
  isActive,
  statuses
}: {
  chart: (typeof overviewCharts)[number];
  index: number;
  isActive: boolean;
  statuses: CentreStatus[];
}) {
  const chartData = statuses.map((status) => ({
    name: status.centre.block,
    value: chartValue(status, chart.metric),
    color: chartBarColor(status, chart.metric, chart.color)
  }));

  return (
    <article className={`relative overflow-hidden border-b border-[#d8e0e5] bg-white last:border-b-0 transition-[box-shadow,transform] duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${isActive ? "shadow-md" : ""}`}>
      <div className={`flex items-center justify-between gap-4 overflow-hidden bg-[#f8fafb] px-4 text-[#17212b] transition-[height,background-color] duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-5 ${isActive ? "h-14 sm:h-16" : "h-11 sm:h-12"}`} style={{ borderLeft: `4px solid ${chart.color}` }}>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-extrabold leading-tight sm:text-base">{chart.title} by centre</h2>
          <p className="mt-0.5 hidden truncate text-xs font-semibold text-[#46515c] sm:block">{chart.subtitle}</p>
        </div>
        <span className="shrink-0 text-xs font-extrabold text-[#46515c]">{index + 1}/{overviewCharts.length}</span>
      </div>

      <div className={`overflow-hidden transition-[max-height,opacity] duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${isActive ? "max-h-[350px] opacity-100" : "max-h-0 opacity-0"}`} aria-hidden={!isActive}>
        <div className={`bg-white p-4 transition-[opacity,transform] duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-5 ${isActive ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.985] opacity-0"}`}>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 16, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={chart.metric === "stock" ? [0, 100] : undefined} unit={chart.metric === "stock" || chart.metric === "footfall" ? undefined : "%"} />
                <Tooltip
                  formatter={(value) => [chart.metric === "stock" ? `${value} severity score` : chart.metric === "footfall" ? `${value} patients` : `${value}%`, chart.title]}
                />
                <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive animationDuration={520} animationEasing="ease-out">
                  {chartData.map((entry) => (
                    <Cell key={`${chart.metric}-${entry.name}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </article>
  );
}

function StatCard({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <motion.div
      className="craft-dark-tile craft-lift p-5"
      variants={riseIn}
      transition={entranceTransition}
      whileHover={{ scale: 1.01 }}
    >
      <div className="text-xs font-extrabold uppercase text-[#5c6873]">{label}</div>
      <p className="craft-number mt-6 bg-gradient-to-br from-[#17212b] to-[#164e63] bg-clip-text text-4xl font-extrabold leading-none text-transparent lg:text-5xl"><AnimatedNumber value={value} suffix={suffix} /></p>
    </motion.div>
  );
}

function PillMetric({ label, badge }: { label: string; badge: React.ReactNode }) {
  return (
    <div className="craft-card-muted p-3">
      <p className="mb-2 text-xs font-extrabold uppercase text-slate-500">{label}</p>
      {badge}
    </div>
  );
}
