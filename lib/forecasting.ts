import type { HealthCentre, MedicineStock, PatientFootfallForecast, PatientFootfallPoint, Severity, StockForecast, StockHistoryPoint } from "@/lib/types";

const HIGH_RISK_DAYS = 7;
const MEDIUM_RISK_DAYS = 14;
const DEFAULT_ALPHA = 0.35;
const MIN_DAILY_DEMAND = 0.1;

function sortedHistory(history: StockHistoryPoint[]) {
  return [...history].sort((a, b) => a.date.localeCompare(b.date));
}

function sortedFootfall(history: PatientFootfallPoint[]) {
  return [...history].sort((a, b) => a.date.localeCompare(b.date));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

export function exponentialSmoothing(values: number[], alpha = DEFAULT_ALPHA): number {
  if (!values.length) return 0;
  return values.slice(1).reduce((forecast, value) => alpha * value + (1 - alpha) * forecast, values[0]);
}

function projectedStockoutDate(daysUntilStockout: number, latestDate: string) {
  if (!Number.isFinite(daysUntilStockout) || daysUntilStockout >= 365) return null;
  const date = new Date(`${latestDate}T00:00:00`);
  date.setDate(date.getDate() + Math.ceil(daysUntilStockout));
  return date.toISOString().slice(0, 10);
}

export function forecastMedicineStock(centre: HealthCentre, medicine: MedicineStock): StockForecast {
  const history = sortedHistory(medicine.history).slice(-30);
  const latest = history[history.length - 1];
  const current = latest?.closing ?? 0;
  const dailyUse = history.map((point) => Math.max(0, point.consumed));
  const avgDailyUse = average(dailyUse);
  const smoothedDemand = exponentialSmoothing(dailyUse, DEFAULT_ALPHA);
  const demand = Math.max(smoothedDemand, MIN_DAILY_DEMAND);
  const daysUntilStockout = current > 0 ? current / demand : 0;
  let severity: Severity = "good";

  if (daysUntilStockout < HIGH_RISK_DAYS || current <= medicine.minThreshold * 0.5) {
    severity = "bad";
  } else if (daysUntilStockout < MEDIUM_RISK_DAYS || current <= medicine.minThreshold) {
    severity = "warn";
  }

  return {
    centreId: centre.id,
    centreName: centre.name,
    medicineId: medicine.id,
    medicineName: medicine.name,
    category: medicine.category,
    unit: medicine.unit,
    currentStock: Math.round(current),
    minThreshold: medicine.minThreshold,
    avgDailyUse: round(avgDailyUse),
    smoothedDemand: round(smoothedDemand),
    daysUntilStockout: round(daysUntilStockout),
    projectedStockoutDate: latest ? projectedStockoutDate(daysUntilStockout, latest.date) : null,
    method: "30-day EWMA daily consumption, alpha 0.35",
    historyDays: history.length,
    severity
  };
}

export function forecastCentreStock(centre: HealthCentre): StockForecast[] {
  return centre.medicines.map((medicine) => forecastMedicineStock(centre, medicine));
}

export function forecastPatientFootfall(centre: HealthCentre): PatientFootfallForecast {
  const history = sortedFootfall(centre.patientFootfall).slice(-30);
  const counts = history.map((point) => Math.max(0, point.count));
  const smoothedDemand = exponentialSmoothing(counts, DEFAULT_ALPHA);
  const recentAverage = average(counts.slice(-7));
  const recentTrend = counts.length >= 8 ? (average(counts.slice(-3)) - average(counts.slice(-8, -5))) / 2 : 0;
  const expectedTomorrow = Math.max(0, Math.round(smoothedDemand + recentTrend));
  const expectedDayAfterTomorrow = Math.max(0, Math.round(smoothedDemand + recentTrend * 2));

  return {
    centreId: centre.id,
    centreName: centre.name,
    expectedTomorrow,
    expectedDayAfterTomorrow,
    recentAverage: round(recentAverage),
    method: "30-day EWMA daily patient count, alpha 0.35, adjusted by recent 3-day trend",
    historyDays: history.length
  };
}

export const STOCK_RISK_THRESHOLDS = {
  highRiskDays: HIGH_RISK_DAYS,
  mediumRiskDays: MEDIUM_RISK_DAYS
};
