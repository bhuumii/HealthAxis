import type { AnomalySignal, HealthCentre } from "@/lib/types";

type SeriesPoint = { date: string; value: number; label: string; metric: AnomalySignal["metric"] };

const Z_SCORE_THRESHOLD = 2;

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[], baselineMean: number) {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, value) => sum + (value - baselineMean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function detectSeriesAnomaly(centre: HealthCentre, series: SeriesPoint[]): AnomalySignal | null {
  const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const recentCandidates = sorted.slice(-3);
  const anomalies = recentCandidates.map((point) => {
    const pointIndex = sorted.indexOf(point);
    const baseline = sorted.slice(Math.max(0, pointIndex - 30), pointIndex).map((entry) => entry.value);

    if (baseline.length < 7) return null;

    const baselineMean = mean(baseline);
    const sd = standardDeviation(baseline, baselineMean);
    if (sd === 0) return null;

    const zScore = (point.value - baselineMean) / sd;
    if (Math.abs(zScore) <= Z_SCORE_THRESHOLD) return null;

    return {
      centreId: centre.id,
      centreName: centre.name,
      metric: point.metric,
      label: point.label,
      currentValue: round(point.value),
      baselineMean: round(baselineMean),
      standardDeviation: round(sd),
      zScore: round(zScore, 2),
      direction: zScore > 0 ? "above" : "below"
    };
  });

  return anomalies
    .filter((signal): signal is AnomalySignal => Boolean(signal))
    .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))[0] ?? null;
}

function doctorAbsenceSeries(centre: HealthCentre): SeriesPoint[] {
  const dates = [...new Set(centre.attendance.map((record) => record.date))];
  return dates.map((date) => {
    const dayRecords = centre.attendance.filter((record) => record.date === date);
    const absent = dayRecords.filter((record) => record.status === "absent").length;
    const value = dayRecords.length ? (absent / dayRecords.length) * 100 : 0;
    return { date, value, label: "Doctor absence", metric: "doctors" };
  });
}

export function detectCentreAnomalies(centre: HealthCentre): AnomalySignal[] {
  const series: SeriesPoint[][] = [
    centre.beds.history.map((point) => ({
      date: point.date,
      value: point.total ? (point.occupied / point.total) * 100 : 0,
      label: "Bed occupancy",
      metric: "beds"
    })),
    doctorAbsenceSeries(centre),
    centre.patientFootfall.map((point) => ({
      date: point.date,
      value: point.count,
      label: "Patient footfall",
      metric: "footfall"
    })),
    ...centre.medicines.map((medicine) =>
      medicine.history.map((point) => ({
        date: point.date,
        value: point.closing,
        label: `${medicine.name} closing stock`,
        metric: "stock" as const
      }))
    )
  ];

  return series
    .map((points) => detectSeriesAnomaly(centre, points))
    .filter((signal): signal is AnomalySignal => Boolean(signal))
    .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}

export function hasAnomalies(centre: HealthCentre) {
  return detectCentreAnomalies(centre).length > 0;
}

export const ANOMALY_METHOD = "Per-centre baseline using up to the previous 30 historical values; flag when today or one of the last two days is more than 2 standard deviations from that centre baseline.";
