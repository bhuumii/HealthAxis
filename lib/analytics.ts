import type {
  CentreStatus,
  DistrictData,
  HealthCentre,
  MedicineStock,
  RedistributionRecommendation,
  Severity,
  StockForecast
} from "@/lib/types";

const WARNING_DAYS = 10;
const CRITICAL_DAYS = 5;
export const INTERVENTION_FLAG_THRESHOLD = 40;

export function calculateInterventionScore(components: {
  stockComponent: number;
  bedComponent: number;
  doctorComponent: number;
  testComponent: number;
}): number {
  return (
    components.stockComponent * 0.35 +
    components.bedComponent * 0.25 +
    components.doctorComponent * 0.25 +
    components.testComponent * 0.15
  );
}

function last<T>(items: T[]): T {
  return items[items.length - 1];
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function movingAverage(values: number[], window = 7): number {
  return average(values.slice(-window));
}

export function exponentialSmoothing(values: number[], alpha = 0.45): number {
  if (!values.length) return 0;
  return values.slice(1).reduce((forecast, value) => alpha * value + (1 - alpha) * forecast, values[0]);
}

export function forecastStock(centre: HealthCentre, medicine: MedicineStock): StockForecast {
  const current = last(medicine.history).closing;
  const dailyUse = medicine.history.map((point) => point.consumed);
  const avgDailyUse = movingAverage(dailyUse, 7);
  const smoothedDemand = exponentialSmoothing(dailyUse);
  const demand = Math.max(avgDailyUse, 0.1);
  const daysUntilStockout = current / demand;
  let severity: Severity = "good";

  if (daysUntilStockout <= CRITICAL_DAYS || current <= medicine.minThreshold * 0.5) {
    severity = "bad";
  } else if (daysUntilStockout <= WARNING_DAYS || current <= medicine.minThreshold) {
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
    avgDailyUse: Number(avgDailyUse.toFixed(1)),
    smoothedDemand: Number(smoothedDemand.toFixed(1)),
    daysUntilStockout: Number(daysUntilStockout.toFixed(1)),
    severity
  };
}

export function getCentreForecasts(centre: HealthCentre): StockForecast[] {
  return centre.medicines.map((medicine) => forecastStock(centre, medicine));
}

export function bedOccupancyPct(centre: HealthCentre): number {
  const latest = last(centre.beds.history);
  return latest.total ? latest.occupied / latest.total : 0;
}

export function doctorAbsenceRate(centre: HealthCentre, days = 14): number {
  const recentDates = [...new Set(centre.attendance.map((record) => record.date))].slice(-days);
  const recent = centre.attendance.filter((record) => recentDates.includes(record.date));
  if (!recent.length) return 0;
  const absences = recent.filter((record) => record.status === "absent").length;
  return absences / recent.length;
}

export function testUnavailablePct(centre: HealthCentre): number {
  if (!centre.tests.length) return 0;
  return centre.tests.filter((test) => !test.available).length / centre.tests.length;
}

function statusFromStock(forecasts: StockForecast[]): Severity {
  if (forecasts.some((forecast) => forecast.severity === "bad")) return "bad";
  if (forecasts.some((forecast) => forecast.severity === "warn")) return "warn";
  return "good";
}

function statusFromBeds(occupancy: number): Severity {
  if (occupancy >= 1.0) return "bad";
  if (occupancy >= 0.85) return "warn";
  return "good";
}

function statusFromDoctors(absenceRate: number): Severity {
  if (absenceRate >= 0.32) return "bad";
  if (absenceRate >= 0.18) return "warn";
  return "good";
}

function statusFromTests(unavailablePct: number): Severity {
  if (unavailablePct >= 0.35) return "bad";
  if (unavailablePct >= 0.18) return "warn";
  return "good";
}

export function getCentreStatus(centre: HealthCentre): CentreStatus {
  const forecasts = getCentreForecasts(centre);
  const occupancy = bedOccupancyPct(centre);
  const absenceRate = doctorAbsenceRate(centre);
  const unavailablePct = testUnavailablePct(centre);
  const stockRisk = forecasts.filter((forecast) => forecast.severity === "bad").length / forecasts.length;
  const stockWarn = forecasts.filter((forecast) => forecast.severity === "warn").length / forecasts.length;
  const stockComponent = clamp(stockRisk * 100 + stockWarn * 45, 0, 100);
  const bedComponent = clamp((occupancy - 0.75) / 0.35, 0, 1) * 100;
  const doctorComponent = clamp(absenceRate / 0.45, 0, 1) * 100;
  const testComponent = unavailablePct * 100;
  const interventionScore = calculateInterventionScore({
    stockComponent,
    bedComponent,
    doctorComponent,
    testComponent
  });

  return {
    centre,
    stock: statusFromStock(forecasts),
    beds: statusFromBeds(occupancy),
    doctors: statusFromDoctors(absenceRate),
    tests: statusFromTests(unavailablePct),
    footfallToday: last(centre.patientFootfall).count,
    bedOccupancyPct: Number((occupancy * 100).toFixed(1)),
    doctorAbsenceRate: Number((absenceRate * 100).toFixed(1)),
    unavailableTestPct: Number((unavailablePct * 100).toFixed(1)),
    interventionScore: Number(interventionScore.toFixed(1)),
    flagged: interventionScore >= INTERVENTION_FLAG_THRESHOLD,
    forecasts
  };
}

export function getDistrictStatuses(data: DistrictData): CentreStatus[] {
  return data.centres.map(getCentreStatus).sort((a, b) => b.interventionScore - a.interventionScore);
}

export function getStockWarnings(data: DistrictData): StockForecast[] {
  return data.centres
    .flatMap((centre) => getCentreForecasts(centre))
    .filter((forecast) => forecast.severity !== "good")
    .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
}

export function getRedistributionRecommendations(data: DistrictData): RedistributionRecommendation[] {
  const recommendations: RedistributionRecommendation[] = [];
  const itemIds = [...new Set(data.centres.flatMap((centre) => centre.medicines.map((medicine) => medicine.id)))];

  for (const itemId of itemIds) {
    const forecasts = data.centres
      .map((centre) => {
        const medicine = centre.medicines.find((candidate) => candidate.id === itemId);
        return medicine ? forecastStock(centre, medicine) : null;
      })
      .filter((forecast): forecast is StockForecast => Boolean(forecast));

    const deficits = forecasts
      .filter((forecast) => forecast.daysUntilStockout <= WARNING_DAYS || forecast.currentStock < forecast.minThreshold)
      .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);

    const surplus = forecasts
      .filter((forecast) => forecast.daysUntilStockout >= 21 && forecast.currentStock > forecast.minThreshold * 2)
      .sort((a, b) => b.daysUntilStockout - a.daysUntilStockout);

    for (const deficit of deficits) {
      const donor = surplus.find((candidate) => candidate.centreId !== deficit.centreId);
      if (!donor) continue;

      const targetCover = Math.ceil(deficit.avgDailyUse * 14);
      const needed = Math.max(0, targetCover - deficit.currentStock);
      const transferable = Math.floor((donor.currentStock - donor.minThreshold * 1.5) * 0.35);
      const quantity = Math.max(0, Math.min(needed, transferable));

      if (quantity > 0) {
        recommendations.push({
          itemId,
          itemName: deficit.medicineName,
          unit: deficit.unit,
          fromCentreId: donor.centreId,
          fromCentreName: donor.centreName,
          toCentreId: deficit.centreId,
          toCentreName: deficit.centreName,
          quantity,
          reason: `${deficit.centreName} has ${deficit.daysUntilStockout} days of cover; ${donor.centreName} has ${donor.daysUntilStockout} days.`
        });
      }
    }
  }

  return recommendations.slice(0, 10);
}

export function districtKpis(data: DistrictData) {
  const statuses = getDistrictStatuses(data);
  const warnings = getStockWarnings(data);
  const flagged = statuses.filter((status) => status.flagged);
  const avgBeds = average(statuses.map((status) => status.bedOccupancyPct));
  const avgAbsence = average(statuses.map((status) => status.doctorAbsenceRate));

  return {
    centres: statuses.length,
    warnings: warnings.length,
    flagged: flagged.length,
    avgBeds: Number(avgBeds.toFixed(1)),
    avgAbsence: Number(avgAbsence.toFixed(1))
  };
}
