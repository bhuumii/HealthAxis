import { forecastMedicineStock } from "@/lib/forecasting";
import type { DistrictData, HealthCentre, MedicineStock, RedistributionRecommendation } from "@/lib/types";

const TARGET_COVER_DAYS = 14;
const DONOR_BUFFER_DAYS = 21;
const DONOR_MIN_THRESHOLD_MULTIPLIER = 1.5;
const MIN_DAILY_DEMAND = 0.1;

type CentreMedicine = {
  centre: HealthCentre;
  medicine: MedicineStock;
  currentStock: number;
  dailyDemand: number;
  daysCover: number;
  minThreshold: number;
};

type Deficit = CentreMedicine & {
  priority: "high" | "medium";
  needed: number;
};

type Donor = CentreMedicine & {
  available: number;
};

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function daysCover(stock: number, dailyDemand: number) {
  return round(stock / Math.max(dailyDemand, MIN_DAILY_DEMAND));
}

function centreMedicine(centre: HealthCentre, medicine: MedicineStock): CentreMedicine {
  const forecast = forecastMedicineStock(centre, medicine);
  const dailyDemand = Math.max(forecast.smoothedDemand, MIN_DAILY_DEMAND);
  return {
    centre,
    medicine,
    currentStock: forecast.currentStock,
    dailyDemand,
    daysCover: forecast.daysUntilStockout,
    minThreshold: forecast.minThreshold
  };
}

function buildDeficit(item: CentreMedicine): Deficit | null {
  const targetStock = Math.max(item.minThreshold, item.dailyDemand * TARGET_COVER_DAYS);
  const needed = Math.ceil(targetStock - item.currentStock);

  if (needed <= 0 || item.daysCover >= TARGET_COVER_DAYS) return null;

  return {
    ...item,
    needed,
    priority: item.daysCover < 7 || item.currentStock <= item.minThreshold * 0.5 ? "high" : "medium"
  };
}

function buildDonor(item: CentreMedicine): Donor | null {
  const bufferStock = Math.max(item.minThreshold * DONOR_MIN_THRESHOLD_MULTIPLIER, item.dailyDemand * DONOR_BUFFER_DAYS);
  const available = Math.floor(item.currentStock - bufferStock);

  if (available <= 0) return null;
  return { ...item, available };
}

export function buildRedistributionPlan(data: DistrictData): RedistributionRecommendation[] {
  const recommendations: RedistributionRecommendation[] = [];
  const itemIds = [...new Set(data.centres.flatMap((centre) => centre.medicines.map((medicine) => medicine.id)))];

  for (const itemId of itemIds) {
    const centreItems = data.centres
      .map((centre) => {
        const medicine = centre.medicines.find((candidate) => candidate.id === itemId);
        return medicine ? centreMedicine(centre, medicine) : null;
      })
      .filter((item): item is CentreMedicine => Boolean(item));

    const deficits = centreItems
      .map(buildDeficit)
      .filter((item): item is Deficit => Boolean(item))
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority === "high" ? -1 : 1;
        return a.daysCover - b.daysCover || b.needed - a.needed;
      });

    const donors = centreItems
      .map(buildDonor)
      .filter((item): item is Donor => Boolean(item))
      .sort((a, b) => b.available - a.available || b.daysCover - a.daysCover);

    for (const deficit of deficits) {
      let remainingNeed = deficit.needed;

      for (const donor of donors) {
        if (remainingNeed <= 0) break;
        if (donor.centre.id === deficit.centre.id || donor.available <= 0) continue;

        const quantity = Math.min(remainingNeed, donor.available);
        if (quantity <= 0) continue;

        const fromBefore = daysCover(donor.currentStock, donor.dailyDemand);
        const toBefore = daysCover(deficit.currentStock, deficit.dailyDemand);
        donor.currentStock -= quantity;
        donor.available -= quantity;
        deficit.currentStock += quantity;
        remainingNeed -= quantity;

        const fromAfter = daysCover(donor.currentStock, donor.dailyDemand);
        const toAfter = daysCover(deficit.currentStock, deficit.dailyDemand);

        recommendations.push({
          itemId,
          itemName: deficit.medicine.name,
          unit: deficit.medicine.unit,
          fromCentreId: donor.centre.id,
          fromCentreName: donor.centre.name,
          toCentreId: deficit.centre.id,
          toCentreName: deficit.centre.name,
          quantity,
          priority: deficit.priority,
          fromDaysCoverBefore: fromBefore,
          fromDaysCoverAfter: fromAfter,
          toDaysCoverBefore: toBefore,
          toDaysCoverAfter: toAfter,
          unmetDemandAfter: Math.max(0, remainingNeed),
          reason: `Move ${quantity} ${deficit.medicine.unit} of ${deficit.medicine.name} from ${donor.centre.name} to ${deficit.centre.name}. ${deficit.centre.name} is ${deficit.priority} priority at ${toBefore} days cover; ${donor.centre.name} remains above its ${DONOR_BUFFER_DAYS}-day or 1.5x-threshold buffer at ${fromAfter} days cover.`
        });
      }
    }
  }

  return recommendations.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === "high" ? -1 : 1;
    return a.toDaysCoverBefore - b.toDaysCoverBefore || b.quantity - a.quantity;
  });
}

export const REDISTRIBUTION_METHOD = "Greedy priority allocation by medicine: classify centres below 14 days cover as deficits, donors only give stock above the larger of 21 days cover or 1.5x minimum threshold, then fill high-risk deficits first to minimize remaining unmet demand.";
