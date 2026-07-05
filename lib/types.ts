export type CentreType = "PHC" | "CHC";
export type AttendanceStatus = "present" | "absent" | "late";
export type Severity = "good" | "warn" | "bad";

export interface StockHistoryPoint {
  date: string;
  opening: number;
  received: number;
  consumed: number;
  closing: number;
}

export interface MedicineStock {
  id: string;
  name: string;
  category: string;
  unit: string;
  minThreshold: number;
  critical: boolean;
  history: StockHistoryPoint[];
}

export interface BedHistoryPoint {
  date: string;
  total: number;
  occupied: number;
}

export interface Doctor {
  id: string;
  name: string;
  role: string;
  specialty: string;
}

export interface AttendanceRecord {
  date: string;
  doctorId: string;
  status: AttendanceStatus;
}

export interface DiagnosticTest {
  id: string;
  name: string;
  available: boolean;
  unavailableDays30: number;
}

export interface PatientFootfallPoint {
  date: string;
  count: number;
}

export interface HealthCentre {
  id: string;
  name: string;
  type: CentreType;
  block: string;
  catchmentPopulation: number;
  district: string;
  districtSlug: string;
  state: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  medicines: MedicineStock[];
  beds: {
    total: number;
    history: BedHistoryPoint[];
  };
  doctors: Doctor[];
  attendance: AttendanceRecord[];
  tests: DiagnosticTest[];
  patientFootfall: PatientFootfallPoint[];
}

export interface DistrictData {
  district: string;
  districtSlug: string;
  state: string;
  generatedAt: string;
  centres: HealthCentre[];
}

export interface StockForecast {
  centreId: string;
  centreName: string;
  medicineId: string;
  medicineName: string;
  category: string;
  unit: string;
  currentStock: number;
  minThreshold: number;
  avgDailyUse: number;
  smoothedDemand: number;
  daysUntilStockout: number;
  projectedStockoutDate: string | null;
  method: string;
  historyDays: number;
  severity: Severity;
}

export interface AnomalySignal {
  centreId: string;
  centreName: string;
  metric: "stock" | "beds" | "doctors" | "footfall";
  label: string;
  currentValue: number;
  baselineMean: number;
  standardDeviation: number;
  zScore: number;
  direction: "above" | "below";
}

export interface CentreStatus {
  centre: HealthCentre;
  stock: Severity;
  beds: Severity;
  doctors: Severity;
  tests: Severity;
  footfallToday: number;
  bedOccupancyPct: number;
  doctorAbsenceRate: number;
  unavailableTestPct: number;
  interventionScore: number;
  flagged: boolean;
  forecasts: StockForecast[];
}

export interface RedistributionRecommendation {
  itemId: string;
  itemName: string;
  unit: string;
  fromCentreId: string;
  fromCentreName: string;
  toCentreId: string;
  toCentreName: string;
  quantity: number;
  priority: "high" | "medium";
  fromDaysCoverBefore: number;
  fromDaysCoverAfter: number;
  toDaysCoverBefore: number;
  toDaysCoverAfter: number;
  unmetDemandAfter: number;
  reason: string;
}
