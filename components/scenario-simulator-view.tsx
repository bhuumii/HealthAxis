"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCcw, SlidersHorizontal } from "lucide-react";
import { AnimatedNumber, entranceTransition, riseIn, staggerContainer } from "@/components/motion-primitives";
import { StatusBadge } from "@/components/status-badge";
import { districtKpis, getDistrictStatuses, getRedistributionRecommendations } from "@/lib/analytics";
import { detectCentreAnomalies } from "@/lib/anomalyDetection";
import { useDistrictData } from "@/lib/use-district-data";
import {
  BASE_SIMULATION_LEVERS,
  SIMULATION_PRESETS,
  applyScenarioSimulation,
  simulationIsActive,
  type SimulationLevers
} from "@/lib/simulation";
import type { CentreStatus, StockForecast } from "@/lib/types";

const sliderConfig: Array<{
  key: keyof SimulationLevers;
  label: string;
  description: string;
  min: number;
  neutral: number;
  max: number;
  step: number;
}> = [
  { key: "doctorAbsenteeism", label: "Doctor absenteeism", description: "Below 1x improves staffing; above 1x worsens absence.", min: 0.3, neutral: 1, max: 3, step: 0.05 },
  { key: "bedDemand", label: "Bed demand surge", description: "Below 1x eases bed pressure; above 1x adds demand.", min: 0.3, neutral: 1, max: 3, step: 0.05 },
  { key: "testDemand", label: "Test demand surge", description: "Below 1x reduces test pressure; above 1x increases downtime.", min: 0.3, neutral: 1, max: 3, step: 0.05 },
  { key: "medicineConsumption", label: "Medicine consumption rate", description: "Below 1x slows consumption; above 1x accelerates stock use.", min: 0.3, neutral: 1, max: 3, step: 0.05 }
];

function useDebouncedValue<T>(value: T, delayMs = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debounced;
}

function leverLabel(value: number) {
  return `${value.toFixed(2).replace(/\.00$/, "").replace(/0$/, "")}x`;
}

function forecastKey(forecast: StockForecast) {
  return `${forecast.centreId}:${forecast.medicineId}`;
}

function scoreDelta(before?: CentreStatus, after?: CentreStatus) {
  if (!before || !after) return 0;
  return Number((after.interventionScore - before.interventionScore).toFixed(1));
}

function shortCentreName(name: string) {
  return name.replace(/\s+(Primary|Community) Health Centre$/i, "");
}

function compareClass(after: number, before: number) {
  if (after > before) return "text-[#9f3a38]";
  if (after < before) return "text-[#47705d]";
  return "text-[#46515c]";
}

export function ScenarioSimulatorView() {
  const { data } = useDistrictData();
  const [levers, setLevers] = useState<SimulationLevers>(BASE_SIMULATION_LEVERS);
  const debouncedLevers = useDebouncedValue(levers, 260);
  const active = simulationIsActive(debouncedLevers);

  const simulatedData = useMemo(() => applyScenarioSimulation(data, debouncedLevers), [data, debouncedLevers]);
  const currentKpis = useMemo(() => districtKpis(data), [data]);
  const simulatedKpis = useMemo(() => districtKpis(simulatedData), [simulatedData]);
  const currentStatuses = useMemo(() => getDistrictStatuses(data), [data]);
  const simulatedStatuses = useMemo(() => getDistrictStatuses(simulatedData), [simulatedData]);
  const currentStatusMap = useMemo(() => new Map(currentStatuses.map((status) => [status.centre.id, status])), [currentStatuses]);
  const simulatedStatusMap = useMemo(() => new Map(simulatedStatuses.map((status) => [status.centre.id, status])), [simulatedStatuses]);
  const currentForecastMap = useMemo(() => new Map(currentStatuses.flatMap((status) => status.forecasts.map((forecast) => [forecastKey(forecast), forecast]))), [currentStatuses]);
  const simulatedForecasts = useMemo(() => simulatedStatuses.flatMap((status) => status.forecasts), [simulatedStatuses]);
  const simulatedRecommendations = useMemo(() => getRedistributionRecommendations(simulatedData), [simulatedData]);

  const currentFlagged = useMemo(() => currentStatuses.filter((status) => status.flagged), [currentStatuses]);
  const simulatedFlagged = useMemo(() => simulatedStatuses.filter((status) => status.flagged), [simulatedStatuses]);
  const newlyFlagged = simulatedFlagged.filter((status) => !currentStatusMap.get(status.centre.id)?.flagged);
  const resolvedFlagged = currentFlagged.filter((status) => !simulatedStatusMap.get(status.centre.id)?.flagged);
  const changedFlagged = simulatedFlagged.slice(0, 8);

  const changedForecasts = simulatedForecasts
    .map((forecast) => {
      const before = currentForecastMap.get(forecastKey(forecast));
      const delta = before ? Number((forecast.daysUntilStockout - before.daysUntilStockout).toFixed(1)) : 0;
      return { forecast, before, delta };
    })
    .filter(({ forecast, before, delta }) => forecast.severity !== "good" || before?.severity !== "good" || Math.abs(delta) >= 2)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.forecast.daysUntilStockout - b.forecast.daysUntilStockout)
    .slice(0, 8);

  const anomalyCount = useMemo(() => simulatedData.centres.reduce((total, centre) => total + detectCentreAnomalies(centre).length, 0), [simulatedData]);

  function setLever(key: keyof SimulationLevers, value: number) {
    setLevers((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setLevers(BASE_SIMULATION_LEVERS);
  }

  return (
    <main className="craft-page mx-auto max-w-7xl px-4 lg:px-8">
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="craft-eyebrow">{data.district}, {data.state}</p>
          <h1 className="craft-title mt-3">Scenario simulator</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#46515c]">Adjust hypothetical operating conditions and see how the same dashboard calculations respond without changing live data.</p>
        </div>
        <button className="craft-button inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#d5bd91] bg-[#fff8e8] px-3 text-sm font-bold text-[#8a6426] hover:bg-[#fff3d2]" type="button" onClick={reset}>
          <RotateCcw size={15} strokeWidth={1.65} /> Reset to live data
        </button>
      </section>

      <section className="mb-5 flex items-start gap-3 rounded-lg border border-[#d5bd91] bg-[#fff8e8] px-4 py-3 text-sm text-[#6d5120] shadow-sm">
        <AlertTriangle className="mt-0.5 shrink-0 text-[#9a6a22]" size={17} strokeWidth={1.65} />
        <div>
          <p className="font-extrabold text-[#8a6426]">Simulation mode — showing hypothetical results, not live data</p>
        </div>
      </section>

      <motion.section className="space-y-5" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div className="craft-card p-5" variants={riseIn} transition={entranceTransition}>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={17} strokeWidth={1.65} className="text-[#164e63]" />
              <h2 className="craft-section-title">Scenario controls</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {SIMULATION_PRESETS.map((preset) => (
                <button key={preset.id} className="craft-button rounded-md border border-[#cfd8df] bg-white px-3 py-2 text-left hover:bg-[#f8fafb]" type="button" onClick={() => setLevers(preset.levers)}>
                  <span className="block text-sm font-extrabold text-[#17212b]">{preset.label}</span>
                  <span className="mt-0.5 block text-xs leading-4 text-slate-500">{preset.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {sliderConfig.map((slider) => (
              <label className="block rounded-lg border border-[#dde4e9] bg-[#f8fafb] p-3" key={slider.key}>
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-sm font-extrabold text-[#17212b]">{slider.label}</span>
                    <span className="mt-0.5 block text-xs leading-4 text-slate-500">{slider.description}</span>
                  </span>
                  <span className="craft-number shrink-0 rounded-md bg-white px-2 py-1 text-sm font-extrabold text-[#164e63] ring-1 ring-[#cfd8df]">{leverLabel(levers[slider.key])}</span>
                </span>
                <div className="mt-3">
                  <input
                    className="w-full accent-[#164e63]"
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    step={slider.step}
                    value={levers[slider.key]}
                    onChange={(event) => setLever(slider.key, Number(event.target.value))}
                  />
                  <div className="relative mt-1 h-4 text-[11px] font-bold text-slate-500">
                    <span className="absolute left-0">Better</span>
                    <span
                      className="absolute -translate-x-1/2 text-[#164e63]"
                      style={{ left: `${((slider.neutral - slider.min) / (slider.max - slider.min)) * 100}%` }}
                    >
                      | 1x
                    </span>
                    <span className="absolute right-0">Worse</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </motion.div>

        <motion.div className="space-y-5" variants={staggerContainer}>
          <motion.section className="craft-hero-band grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4" variants={riseIn} transition={entranceTransition}>
            <KpiCompare label="Centres" before={currentKpis.centres} after={simulatedKpis.centres} />
            <KpiCompare label="Stock warnings" before={currentKpis.warnings} after={simulatedKpis.warnings} />
            <KpiCompare label="Flagged centres" before={currentKpis.flagged} after={simulatedKpis.flagged} />
            <KpiCompare label="Avg bed use" before={currentKpis.avgBeds} after={simulatedKpis.avgBeds} suffix="%" />
          </motion.section>

          <motion.section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]" variants={staggerContainer}>
            <motion.div className="craft-card self-start p-5" variants={riseIn} transition={entranceTransition}>
              <h2 className="craft-section-title">Intervention impact</h2>
              <p className="mt-1 text-sm text-slate-500">Centres entering or leaving the district intervention list under this scenario.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <ImpactList title="Newly needs intervention" items={newlyFlagged} empty="No new centres enter the list." currentStatusMap={currentStatusMap} />
                <ImpactList title="Drops out" items={resolvedFlagged} empty="No centres drop out." simulatedStatusMap={simulatedStatusMap} />
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {changedFlagged.map((status) => {
                  const before = currentStatusMap.get(status.centre.id);
                  return (
                    <div className="craft-card-muted flex min-h-24 flex-col justify-between gap-3 p-3" key={status.centre.id}>
                      <span>
                        <span className="block text-sm font-bold text-[#17212b]">{shortCentreName(status.centre.name)}</span>
                        <span className="text-xs text-slate-500">Updated risk score</span>
                      </span>
                      <span>
                        <span className="craft-number block text-xl font-extrabold text-[#17212b]"><AnimatedNumber value={status.interventionScore} decimals={1} /></span>
                        <span className={"text-xs font-bold " + compareClass(status.interventionScore, before?.interventionScore ?? status.interventionScore)}>
                          {scoreDelta(before, status) >= 0 ? "+" : ""}{scoreDelta(before, status)}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div className="craft-card self-start p-5" variants={riseIn} transition={entranceTransition}>
              <h2 className="craft-section-title">Stock-out forecast changes</h2>
              <p className="mt-1 text-sm text-slate-500">Largest simulated medicine forecast changes using the existing EWMA forecast.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {changedForecasts.length ? changedForecasts.map(({ forecast, before, delta }) => (
                  <div className="craft-card-muted flex min-h-32 flex-col justify-between p-3" key={forecastKey(forecast)}>
                    <div className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-sm font-bold text-[#17212b]">{forecast.medicineName}</span>
                        <span className="text-xs text-slate-500">{shortCentreName(forecast.centreName)} · {forecast.category}</span>
                      </span>
                      <StatusBadge value={forecast.severity} />
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <span className="text-xs text-slate-500">Before: {before?.daysUntilStockout ?? "—"} days</span>
                      <span className="text-right">
                        <span className="craft-number block text-2xl font-extrabold text-[#17212b]"><AnimatedNumber value={forecast.daysUntilStockout} decimals={1} /> days</span>
                        <span className={"text-xs font-bold " + (delta > 0 ? "text-[#47705d]" : delta < 0 ? "text-[#9f3a38]" : "text-slate-500")}>{delta >= 0 ? "+" : ""}{delta} days</span>
                      </span>
                    </div>
                  </div>
                )) : <p className="rounded-md bg-[#f8fafb] p-3 text-sm text-slate-500">No simulated stock warnings.</p>}
              </div>
            </motion.div>
          </motion.section>

          <motion.section className="craft-card p-5" variants={riseIn} transition={entranceTransition}>
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="craft-section-title">Simulated redistribution plan</h2>
                <p className="mt-1 text-sm text-slate-500">Recommendations from the existing redistribution algorithm after applying the scenario.</p>
              </div>
              <span className="rounded-md bg-[#eef3f5] px-2 py-1 text-xs font-bold text-[#164e63] ring-1 ring-[#cfd8df]">{simulatedRecommendations.length} transfers</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr className="border-b border-[#cfd8df]">
                    <th className="py-2 pr-4">Transfer</th>
                    <th className="py-2 pr-4">Priority</th>
                    <th className="py-2 pr-4">Donor cover</th>
                    <th className="py-2 pr-4">Recipient cover</th>
                    <th className="py-2 pr-4">Unmet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dde4e9]">
                  {simulatedRecommendations.slice(0, 8).map((recommendation) => (
                    <tr key={`${recommendation.itemId}-${recommendation.fromCentreId}-${recommendation.toCentreId}-${recommendation.quantity}`}>
                      <td className="py-3 pr-4">
                        <p className="font-bold text-[#17212b]">Move {recommendation.quantity} {recommendation.unit} {recommendation.itemName}</p>
                        <p className="mt-1 text-xs text-slate-500">{shortCentreName(recommendation.fromCentreName)} → {shortCentreName(recommendation.toCentreName)}</p>
                      </td>
                      <td className="py-3 pr-4"><span className={`inline-flex rounded px-2 py-0.5 text-xs font-bold ring-1 ${recommendation.priority === "high" ? "bg-[#f8eeee] text-[#9f3a38] ring-[#d7aaaa]" : "bg-[#f7f1e6] text-[#8a6426] ring-[#d5bd91]"}`}>{recommendation.priority}</span></td>
                      <td className="py-3 pr-4 text-[#46515c]">{recommendation.fromDaysCoverBefore} → {recommendation.fromDaysCoverAfter} days</td>
                      <td className="py-3 pr-4 text-[#46515c]">{recommendation.toDaysCoverBefore} → {recommendation.toDaysCoverAfter} days</td>
                      <td className="py-3 pr-4 text-[#46515c]">{recommendation.unmetDemandAfter ? `${recommendation.unmetDemandAfter} ${recommendation.unit}` : "Covered"}</td>
                    </tr>
                  ))}
                  {!simulatedRecommendations.length ? <tr><td className="py-6 text-center text-sm font-semibold text-slate-500" colSpan={5}>No transfers recommended under this scenario.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </motion.section>

          <p className="text-xs text-slate-500">Simulation status: {active ? "scenario levers active" : "all levers reset to live data"}. Simulated anomaly signals detected: {anomalyCount}.</p>
        </motion.div>
      </motion.section>
    </main>
  );
}

function KpiCompare({ label, before, after, suffix = "" }: { label: string; before: number; after: number; suffix?: string }) {
  return (
    <div className="craft-dark-tile p-4">
      <p className="text-xs font-extrabold uppercase text-[#5c6873]">{label}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <span>
          <span className="block text-xs text-slate-500">Before</span>
          <span className="craft-number text-2xl font-extrabold text-[#46515c]"><AnimatedNumber value={before} suffix={suffix} decimals={Number.isInteger(before) ? 0 : 1} /></span>
        </span>
        <span>
          <span className="block text-xs text-slate-500">After</span>
          <span className="craft-number bg-gradient-to-br from-[#17212b] to-[#164e63] bg-clip-text text-2xl font-extrabold text-transparent"><AnimatedNumber value={after} suffix={suffix} decimals={Number.isInteger(after) ? 0 : 1} /></span>
        </span>
      </div>
    </div>
  );
}

function ImpactList({
  title,
  items,
  empty,
  currentStatusMap,
  simulatedStatusMap
}: {
  title: string;
  items: CentreStatus[];
  empty: string;
  currentStatusMap?: Map<string, CentreStatus>;
  simulatedStatusMap?: Map<string, CentreStatus>;
}) {
  return (
    <div className="craft-card-muted p-3">
      <p className="text-sm font-extrabold text-[#17212b]">{title}</p>
      <div className="mt-3 space-y-2">
        {items.length ? items.slice(0, 5).map((status) => {
          const peer = currentStatusMap?.get(status.centre.id) ?? simulatedStatusMap?.get(status.centre.id);
          const score = currentStatusMap ? status.interventionScore : peer?.interventionScore ?? status.interventionScore;
          return (
            <div className="flex items-center justify-between gap-3 text-sm" key={status.centre.id}>
              <span className="font-semibold text-[#46515c]">{shortCentreName(status.centre.name)}</span>
              <span className="craft-number font-extrabold text-[#17212b]">{score}</span>
            </div>
          );
        }) : <p className="text-sm text-slate-500">{empty}</p>}
      </div>
    </div>
  );
}
