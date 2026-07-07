"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FlaskConical, UserCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedNumber, easeOut, entranceTransition, riseIn, staggerContainer } from "@/components/motion-primitives";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LiveDataIndicator } from "@/components/live-data-indicator";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/components/language-provider";
import { useDistrictSelection } from "@/components/district-provider";
import { getCentreStatus } from "@/lib/analytics";
import { detectCentreAnomalies } from "@/lib/anomalyDetection";
import { useDistrictData } from "@/lib/use-district-data";
import type { AnomalySignal, HealthCentre, Severity } from "@/lib/types";

type TrendMetric = "stock" | "beds" | "doctors" | "tests";
type TrendPoint = { date: string; value?: number } & Record<string, string | number | undefined>;
type TrendSeries = { key: string; label: string; color: string };
type TrendData = {
  title: string;
  subtitle: string;
  unit: string;
  status: Severity;
  data: TrendPoint[];
  series?: TrendSeries[];
  domain?: [number, number];
};

type RestockDotProps = {
  cx?: number;
  cy?: number;
  payload?: Record<string, unknown>;
  restockKey: string;
  color: string;
  opacity: number;
};

const trendTabs: Array<{ value: TrendMetric; label: string }> = [
  { value: "stock", label: "Stock" },
  { value: "beds", label: "Beds" },
  { value: "doctors", label: "Doctors" },
  { value: "tests", label: "Tests" }
];

const severityStyles: Record<Severity, { line: string; chip: string }> = {
  good: { line: "#47705d", chip: "bg-[#eef5f1] text-[#47705d] ring-[#b8cdbc]" },
  warn: { line: "#8a6426", chip: "bg-[#f7f1e6] text-[#8a6426] ring-[#d5bd91]" },
  bad: { line: "#9f3a38", chip: "bg-[#f8eeee] text-[#9f3a38] ring-[#d7aaaa]" }
};

const stockLineColors = ["#9f3a38", "#8a6426", "#164e63"];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function RestockDot({ cx, cy, payload, restockKey, color, opacity }: RestockDotProps) {
  if (typeof cx !== "number" || typeof cy !== "number" || !payload?.[restockKey]) return null;
  return <circle cx={cx} cy={cy} r={4} fill="white" stroke={color} strokeWidth={2} opacity={opacity} />;
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

function stockCoverTrend(centre: HealthCentre, status: ReturnType<typeof getCentreStatus>) {
  const riskiestForecasts = [...status.forecasts].sort((a, b) => a.daysUntilStockout - b.daysUntilStockout).slice(0, 3);
  const dates = [...new Set(centre.medicines.flatMap((medicine) => medicine.history.map((point) => point.date)))].slice(-30);
  const series = riskiestForecasts.map((forecast, index) => ({
    key: `stock${index}`,
    label: forecast.medicineName,
    color: stockLineColors[index] ?? severityStyles[status.stock].line
  }));

  const data = dates.map((date) => {
    const point: TrendPoint = { date: date.slice(5) };
    riskiestForecasts.forEach((forecast, index) => {
      const medicine = centre.medicines.find((candidate) => candidate.id === forecast.medicineId);
      const historyPoint = medicine?.history.find((entry) => entry.date === date);
      const demand = Math.max(forecast.smoothedDemand || forecast.avgDailyUse, 0.1);
      point[`stock${index}`] = historyPoint ? Number(clamp(historyPoint.closing / demand, 0, 60).toFixed(1)) : undefined;
      point[`stock${index}Restock`] = historyPoint && historyPoint.received > 0 ? historyPoint.received : undefined;
    });
    return point;
  });

  return { data, series };
}

function buildTrendData(centre: HealthCentre, status: ReturnType<typeof getCentreStatus>, metric: TrendMetric): TrendData {
  const bedDates = centre.beds.history.slice(-30).map((point) => point.date.slice(5));

  if (metric === "stock") {
    const { data, series } = stockCoverTrend(centre, status);
    return {
      title: "Lowest medicine stock cover",
      subtitle: "Days of cover for the three medicines most likely to run out.",
      unit: "days",
      status: status.stock,
      data,
      series,
      domain: [0, 60]
    };
  }

  if (metric === "beds") {
    return {
      title: "Bed occupancy trend",
      subtitle: "Daily occupied beds as a percentage of total beds over 30 days.",
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
      subtitle: "Daily doctor absence percentage from attendance history over 30 days.",
      unit: "% absent",
      status: status.doctors,
      data: doctorAbsenceTrend(centre)
    };
  }

  const testDates = [...new Set(centre.tests.flatMap((test) => test.history?.map((point) => point.date) ?? []))].slice(-30);
  const testData = testDates.length ? testDates.map((date) => {
    const unavailable = centre.tests.filter((test) => test.history?.find((point) => point.date === date)?.available === false).length;
    return { date: date.slice(5), value: Number(((unavailable / Math.max(centre.tests.length, 1)) * 100).toFixed(1)) };
  }) : simulatedTrend(bedDates, status.unavailableTestPct);

  return {
    title: "Diagnostic test downtime trend",
    subtitle: testDates.length ? "Daily percentage of diagnostic tests unavailable from test history." : "30-day modeled trend anchored to the current diagnostic downtime indicator.",
    unit: "% down",
    status: status.tests,
    data: testData
  };
}

function chipClass(severity: Severity, active: boolean) {
  return active ? severityStyles[severity].chip : "bg-white text-[#46515c] ring-[#cfd8df] hover:bg-[#eef3f5]";
}

function plainAnomalyText(anomaly: AnomalySignal) {
  const direction = anomaly.direction === "below" ? "far below" : "far above";
  if (anomaly.metric === "stock") return ` ${anomaly.label.replace(/ closing stock$/i, '')} stock level is ${direction} its normal trend for this centre.`;
  if (anomaly.metric === "beds") return ` Bed occupancy is ${direction} its normal trend for this centre.`;
  if (anomaly.metric === "doctors") return ` Doctor absence is ${direction} its normal trend for this centre.`;
  return ` Patient visits are ${direction} their normal trend for this centre.`;
}

export function CentreDetail({ centreId }: { centreId: string }) {
  const { t } = useLanguage();
  const { hrefWithDistrict } = useDistrictSelection();
  const { data, isLive, livePulse, lastUpdatedAt } = useDistrictData();
  const [activeMetric, setActiveMetric] = useState<TrendMetric>("stock");
  const [focusedStockLine, setFocusedStockLine] = useState<string | null>(null);
  const centre = data.centres.find((candidate) => candidate.id === centreId);

  if (!centre) {
    return (
      <main className="craft-page mx-auto max-w-7xl px-4 lg:px-8">
        <Link className="craft-button inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-[#164e63] hover:bg-white" href={hrefWithDistrict("/overview")}>
          <ArrowLeft size={16} strokeWidth={1.55} /> {t("overview")}
        </Link>
        <p className="craft-card mt-6 p-5 text-[#46515c]">Centre not found in the current district data.</p>
      </main>
    );
  }

  const status = getCentreStatus(centre);
  const anomalies = detectCentreAnomalies(centre);
  const urgentForecasts = [...status.forecasts].sort((a, b) => a.daysUntilStockout - b.daysUntilStockout).slice(0, 3);
  const recentDates = [...new Set(centre.attendance.map((record) => record.date))].slice(-7);
  const trend = buildTrendData(centre, status, activeMetric);
  const lineColor = severityStyles[trend.status].line;

  return (
    <main className="craft-page mx-auto max-w-7xl px-4 lg:px-8">
      <section className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <Link className="craft-button mb-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-[#164e63] hover:bg-white hover:text-[#0d3848]" href={hrefWithDistrict("/overview")}>
            <ArrowLeft size={16} strokeWidth={1.55} /> {t("overview")}
          </Link>
          <p className="craft-eyebrow">{centre.type} · {centre.block}</p>
          <h1 className="craft-title mt-3">{centre.name}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#46515c]">
            Catchment population {centre.catchmentPopulation.toLocaleString("en-IN")}. Intervention score {status.interventionScore}/100.
          </p>
        </div>
        <LiveDataIndicator isLive={isLive} pulse={livePulse} lastUpdatedAt={lastUpdatedAt} />
      </section>

      <motion.section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" variants={staggerContainer} initial="hidden" animate="visible">
        <Kpi label={t("stock")} value={<StatusBadge value={status.stock} size="lg" />} />
        <Kpi label={t("occupancy")} numericValue={status.bedOccupancyPct} suffix="%" />
        <Kpi label={t("doctorAttendance")} numericValue={100 - status.doctorAbsenceRate} suffix="%" decimals={1} />
        <Kpi label={t("testAvailability")} numericValue={100 - status.unavailableTestPct} suffix="%" decimals={1} />
      </motion.section>

      {anomalies.length ? (
        <motion.section className="craft-card mt-5 bg-[#eef3f5] p-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={entranceTransition}>
          <p className="text-sm font-bold text-[#164e63]">Unusual pattern detected</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {anomalies.slice(0, 3).map((anomaly) => (
              <span className="inline-flex rounded bg-white px-2 py-0.5 text-xs font-bold text-[#164e63] ring-1 ring-[#b8c7d0]" key={anomaly.metric + "-" + anomaly.label}>
                {plainAnomalyText(anomaly)} {anomaly.currentValue} vs {anomaly.baselineMean} baseline ({anomaly.zScore} SD)
              </span>
            ))}
          </div>
        </motion.section>
      ) : null}

      <motion.section className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]" variants={staggerContainer} initial="hidden" animate="visible">
        <div className="craft-card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeMetric}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: easeOut }}
                >
                  <h2 className="craft-section-title">{trend.title}</h2>
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
                    className={`craft-button inline-flex h-9 items-center rounded-md px-3 text-sm font-bold ring-1 ${chipClass(tabStatus, activeMetric === tab.value)}`}
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
          <div className="mt-4 h-72 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMetric}
                className="h-full"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: easeOut }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend.data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} unit={trend.unit === "%" ? "%" : undefined} domain={trend.domain} />
                    <Tooltip
                      formatter={(value, name) => {
                        const label = trend.series?.find((series) => series.key === name)?.label ?? trendTabs.find((tab) => tab.value === activeMetric)?.label ?? "Value";
                        return [`${value}${trend.unit.startsWith("%") ? "%" : ` ${trend.unit}`}`, label];
                      }}
                    />
                    {trend.series ? trend.series.map((series) => {
                      const dimmed = Boolean(focusedStockLine && focusedStockLine !== series.key);
                      const opacity = dimmed ? 0.18 : 1;
                      return (
                        <Line
                          key={series.key}
                          type="monotone"
                          dataKey={series.key}
                          name={series.label}
                          stroke={series.color}
                          strokeWidth={focusedStockLine === series.key ? 3 : 2.25}
                          strokeOpacity={opacity}
                          dot={(props) => <RestockDot {...props} restockKey={`${series.key}Restock`} color={series.color} opacity={opacity} />}
                          activeDot={{ r: 5, stroke: series.color, strokeWidth: 2 }}
                          isAnimationActive
                          animationDuration={280}
                          animationEasing="ease-out"
                        />
                      );
                    }) : (
                      <Line type="monotone" dataKey="value" stroke={lineColor} strokeWidth={2} dot={false} isAnimationActive animationDuration={280} animationEasing="ease-out" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            </AnimatePresence>
          </div>
          {trend.series ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
              {trend.series.map((series) => {
                const active = focusedStockLine === series.key;
                const dimmed = Boolean(focusedStockLine && !active);
                return (
                  <button
                    className={`craft-button inline-flex items-center gap-1.5 rounded-md border px-2 py-1 transition ${active ? "border-[#164e63] bg-[#eef3f5] text-[#164e63]" : "border-transparent hover:border-[#cfd8df] hover:bg-white"} ${dimmed ? "opacity-45" : "opacity-100"}`}
                    key={series.key}
                    type="button"
                    onClick={() => setFocusedStockLine((current) => current === series.key ? null : series.key)}
                    aria-pressed={active}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} />
                    {series.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {urgentForecasts.map((forecast) => (
              <div className="craft-card-muted p-3" key={forecast.medicineId}>
                <p className="text-xs font-extrabold uppercase text-slate-500">Projected stock-out</p>
                <p className="mt-1 text-sm font-bold text-[#17212b]">{forecast.medicineName}</p>
                <p className="craft-number mt-2 text-4xl font-extrabold leading-none text-[#17212b]"><AnimatedNumber value={forecast.daysUntilStockout} /> <span className="text-sm font-bold tracking-normal text-slate-500">days</span></p>
                <p className="mt-1 text-xs text-slate-500">{forecast.projectedStockoutDate ?? "No date projected"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="craft-card p-5">
          <h2 className="craft-section-title">{t("testAvailability")}</h2>
          <div className="mt-4 space-y-3">
            {centre.tests.map((test) => (
              <div className="craft-card-muted flex items-center justify-between gap-3 p-3" key={test.id}>
                <span>
                  <strong className="block text-sm text-[#17212b]">{test.name}</strong>
                  <small className="text-slate-500">Unavailable {test.unavailableDays30}/30 days</small>
                </span>
                <span className={`inline-flex items-center gap-1 text-sm font-bold ${test.available ? "text-[#47705d]" : "text-[#9f3a38]"}`}>
                  <FlaskConical size={15} strokeWidth={1.55} /> {test.available ? "Available" : "Down"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section className="craft-card mt-7 p-5" variants={riseIn} initial="hidden" animate="visible" transition={entranceTransition}>
        <h2 className="craft-section-title">{t("forecast")}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-normal text-slate-500">
              <tr className="border-b border-[#cfd8df]">
                <th className="py-2 pr-4">Item</th>
                <th className="py-2 pr-4">{t("currentStock")}</th>
                <th className="py-2 pr-4">{t("dailyUse")}</th>
                <th className="py-2 pr-4">{t("smoothedDemand")}</th>
                <th className="py-2 pr-4">Projected stock-out</th>
                <th className="py-2 pr-4">Method</th>
                <th className="py-2 pr-4">{t("status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dde4e9]">
              {status.forecasts.map((forecast) => (
                <tr key={forecast.medicineId}>
                  <td className="py-2 pr-4 font-semibold text-[#17212b]">{forecast.medicineName}</td>
                  <td className="py-2 pr-4 text-[#46515c]">{forecast.currentStock} {forecast.unit}</td>
                  <td className="py-2 pr-4 text-[#46515c]">{forecast.avgDailyUse}</td>
                  <td className="py-2 pr-4 text-[#46515c]">{forecast.smoothedDemand} · {forecast.daysUntilStockout} days</td>
                  <td className="py-2 pr-4 text-[#46515c]">{forecast.projectedStockoutDate ?? "Beyond one year"}</td>
                  <td className="py-2 pr-4 text-[#46515c]">{forecast.method}</td>
                  <td className="py-2 pr-4"><StatusBadge value={forecast.severity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>

      <motion.section className="craft-card mt-7 p-5" variants={riseIn} initial="hidden" animate="visible" transition={entranceTransition}>
        <h2 className="craft-section-title">{t("doctorAttendance")}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {centre.doctors.map((doctor) => {
            const recent = centre.attendance.filter((record) => record.doctorId === doctor.id && recentDates.includes(record.date));
            const present = recent.filter((record) => record.status === "present").length;
            const rate = recent.length ? Math.round((present / recent.length) * 100) : 0;
            return (
              <div className="craft-card-muted flex items-center justify-between gap-3 p-3" key={doctor.id}>
                <span>
                  <strong className="block text-sm text-[#17212b]">{doctor.name}</strong>
                  <small className="text-slate-500">{doctor.role} · {doctor.specialty}</small>
                </span>
                <span className={`inline-flex items-center gap-1 text-sm font-bold ${rate < 70 ? "text-[#9f3a38]" : rate < 85 ? "text-[#8a6426]" : "text-[#47705d]"}`}>
                  <UserCheck size={15} strokeWidth={1.55} /> <AnimatedNumber value={rate} suffix="%" />
                </span>
              </div>
            );
          })}
        </div>
      </motion.section>
    </main>
  );
}

function Kpi({ label, value, numericValue, suffix = "", decimals = 0 }: { label: string; value?: React.ReactNode; numericValue?: number; suffix?: string; decimals?: number }) {
  return (
    <motion.div
      className="craft-card craft-lift p-5"
      variants={riseIn}
      transition={entranceTransition}
      whileHover={{ y: -4, scale: 1.01 }}
    >
      <p className="text-xs font-extrabold uppercase text-[#5c6873]">{label}</p>
      <div className="craft-number mt-6 bg-gradient-to-br from-[#17212b] to-[#164e63] bg-clip-text text-3xl font-extrabold leading-none text-transparent lg:text-4xl">{typeof numericValue === "number" ? <AnimatedNumber value={numericValue} suffix={suffix} decimals={decimals} /> : value}</div>
    </motion.div>
  );
}
