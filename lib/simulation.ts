import type { AttendanceRecord, DistrictData, HealthCentre } from "@/lib/types";

export type SimulationLevers = {
  doctorAbsenteeism: number;
  bedDemand: number;
  testDemand: number;
  medicineConsumption: number;
};

export const BASE_SIMULATION_LEVERS: SimulationLevers = {
  doctorAbsenteeism: 1,
  bedDemand: 1,
  testDemand: 1,
  medicineConsumption: 1
};

export const SIMULATION_PRESETS: Array<{ id: string; label: string; description: string; levers: SimulationLevers }> = [
  {
    id: "monsoon",
    label: "Monsoon outbreak",
    description: "Higher diagnostic load plus faster medicine consumption for seasonal fever and dehydration response.",
    levers: { doctorAbsenteeism: 1.15, bedDemand: 1.35, testDemand: 2.45, medicineConsumption: 2.2 }
  },
  {
    id: "strike",
    label: "Doctor strike",
    description: "Sharp workforce absence shock with moderate knock-on diagnostic slowdown.",
    levers: { doctorAbsenteeism: 2.75, bedDemand: 1.05, testDemand: 1.25, medicineConsumption: 1.15 }
  },
  {
    id: "mass-casualty",
    label: "Mass casualty event",
    description: "Emergency influx driving bed pressure and acute medicine usage together.",
    levers: { doctorAbsenteeism: 1.25, bedDemand: 2.25, testDemand: 1.65, medicineConsumption: 2.65 }
  },
  {
    id: "successful-intervention",
    label: "Successful intervention",
    description: "Extra staffing, lower bed pressure, steadier testing, and slower medicine use after outreach.",
    levers: { doctorAbsenteeism: 0.45, bedDemand: 0.7, testDemand: 0.65, medicineConsumption: 0.6 }
  }
];

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function cloneDistrictData(data: DistrictData): DistrictData {
  return {
    ...data,
    centres: data.centres.map((centre) => ({
      ...centre,
      coordinates: { ...centre.coordinates },
      medicines: centre.medicines.map((medicine) => ({
        ...medicine,
        history: medicine.history.map((point) => ({ ...point }))
      })),
      beds: {
        ...centre.beds,
        history: centre.beds.history.map((point) => ({ ...point }))
      },
      doctors: centre.doctors.map((doctor) => ({ ...doctor })),
      attendance: centre.attendance.map((record) => ({ ...record })),
      tests: centre.tests.map((test) => ({ ...test })),
      patientFootfall: centre.patientFootfall.map((point) => ({ ...point }))
    }))
  };
}

function applyBedDemand(centre: HealthCentre, multiplier: number) {
  if (multiplier === 1) return;
  centre.beds.history = centre.beds.history.map((point) => ({
    ...point,
    occupied: Math.round(clamp(point.occupied * multiplier, 0, point.total * 1.35))
  }));
}

function targetAbsenceRate(records: AttendanceRecord[], multiplier: number) {
  if (!records.length) return 0;
  const currentAbsent = records.filter((record) => record.status === "absent").length;
  return clamp((currentAbsent / records.length) * multiplier, 0, 0.92);
}

function applyDoctorAbsenteeism(centre: HealthCentre, multiplier: number) {
  if (multiplier === 1 || !centre.attendance.length) return;

  const targetAbsent = Math.round(centre.attendance.length * targetAbsenceRate(centre.attendance, multiplier));
  let remainingAbsent = targetAbsent;

  centre.attendance = centre.attendance.map((record) => {
    if (record.status === "absent" && remainingAbsent > 0) {
      remainingAbsent -= 1;
      return record;
    }
    if (record.status === "absent") return { ...record, status: "present" };
    return record;
  });

  centre.attendance = centre.attendance.map((record) => {
    if (remainingAbsent <= 0 || record.status === "absent") return record;
    remainingAbsent -= 1;
    return { ...record, status: "absent" };
  });
}

function applyTestDemand(centre: HealthCentre, multiplier: number) {
  if (multiplier === 1 || !centre.tests.length) return;

  const currentUnavailable = centre.tests.filter((test) => !test.available).length;
  const pressureAdjustment = centre.tests.length * Math.max(0, multiplier - 1) * 0.18;
  const targetUnavailable = Math.round(clamp(currentUnavailable * multiplier + pressureAdjustment, 0, centre.tests.length));
  let remainingUnavailable = targetUnavailable;

  centre.tests = centre.tests
    .map((test) => ({
      ...test,
      unavailableDays30: Math.round(clamp(test.unavailableDays30 * multiplier, 0, 30))
    }))
    .sort((a, b) => b.unavailableDays30 - a.unavailableDays30)
    .map((test) => {
      if (remainingUnavailable > 0) {
        remainingUnavailable -= 1;
        return { ...test, available: false, unavailableDays30: Math.max(test.unavailableDays30, multiplier > 1 ? 10 : test.unavailableDays30) };
      }
      return { ...test, available: true };
    });
}

function applyMedicineConsumption(centre: HealthCentre, multiplier: number) {
  if (multiplier === 1) return;

  centre.medicines = centre.medicines.map((medicine) => ({
    ...medicine,
    history: medicine.history.map((point) => ({
      ...point,
      consumed: Math.round(point.consumed * multiplier),
      closing: Math.max(0, Math.round(point.opening + point.received - point.consumed * multiplier))
    }))
  }));
}

export function applyScenarioSimulation(data: DistrictData, levers: SimulationLevers): DistrictData {
  const simulated = cloneDistrictData(data);
  simulated.centres = simulated.centres.map((centre) => {
    applyDoctorAbsenteeism(centre, levers.doctorAbsenteeism);
    applyBedDemand(centre, levers.bedDemand);
    applyTestDemand(centre, levers.testDemand);
    applyMedicineConsumption(centre, levers.medicineConsumption);
    return centre;
  });
  return simulated;
}

export function simulationIsActive(levers: SimulationLevers) {
  return Object.values(levers).some((value) => round(value) !== 1);
}
