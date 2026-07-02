import type {
  AttendanceRecord,
  BedHistoryPoint,
  DiagnosticTest,
  DistrictData,
  Doctor,
  HealthCentre,
  MedicineStock,
  PatientFootfallPoint
} from "@/lib/types";

export type CentreDoc = Omit<HealthCentre, "medicines" | "beds" | "doctors" | "attendance" | "tests" | "patientFootfall"> & {
  district?: string;
  state?: string;
  generatedAt?: string;
};

export type StockDoc = MedicineStock & { centreId: string };
export type BedDoc = { centreId: string; total: number; history: BedHistoryPoint[] };
export type DoctorDoc = Doctor & { centreId: string; attendance: AttendanceRecord[] };
export type TestDoc = DiagnosticTest & { centreId: string };
export type FootfallDoc = PatientFootfallPoint & { centreId: string };

export function composeDistrictData(snapshot: {
  centres: CentreDoc[];
  stocks: StockDoc[];
  beds: BedDoc[];
  doctors: DoctorDoc[];
  tests: TestDoc[];
  footfall: FootfallDoc[];
}): DistrictData {
  const firstCentre = snapshot.centres[0];

  return {
    district: firstCentre?.district ?? "Suryanagar",
    state: firstCentre?.state ?? "Uttar Pradesh",
    generatedAt: firstCentre?.generatedAt ?? new Date().toISOString(),
    centres: snapshot.centres
      .map((centre) => {
        const centreDoctors = snapshot.doctors.filter((doctor) => doctor.centreId === centre.id);
        return {
          id: centre.id,
          name: centre.name,
          type: centre.type,
          block: centre.block,
          catchmentPopulation: centre.catchmentPopulation,
          coordinates: centre.coordinates,
          medicines: snapshot.stocks.filter((stock) => stock.centreId === centre.id),
          beds: snapshot.beds.find((bed) => bed.centreId === centre.id) ?? { total: 0, history: [] },
          doctors: centreDoctors.map((doctor) => ({ id: doctor.id, name: doctor.name, role: doctor.role, specialty: doctor.specialty })),
          attendance: centreDoctors.flatMap((doctor) => doctor.attendance),
          tests: snapshot.tests.filter((test) => test.centreId === centre.id),
          patientFootfall: snapshot.footfall
            .filter((point) => point.centreId === centre.id)
            .sort((a, b) => a.date.localeCompare(b.date))
        };
      })
      .filter((centre) => centre.medicines.length && centre.beds.history.length && centre.patientFootfall.length)
  };
}
