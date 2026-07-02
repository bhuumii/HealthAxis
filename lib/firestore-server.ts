import type { DistrictData } from "@/lib/types";
import {
  composeDistrictData,
  type BedDoc,
  type CentreDoc,
  type DoctorDoc,
  type FootfallDoc,
  type StockDoc,
  type TestDoc
} from "@/lib/firestore-compose";
import { getAdminFirestore } from "@/lib/firebase-admin";

export async function getDistrictDataFromFirestore(): Promise<DistrictData | null> {
  const db = getAdminFirestore();
  if (!db) return null;

  const [centres, stocks, beds, doctors, tests, footfall] = await Promise.all([
    db.collection("centres").get(),
    db.collection("stock_items").get(),
    db.collection("beds").get(),
    db.collection("doctors").get(),
    db.collection("tests").get(),
    db.collection("footfall_logs").get()
  ]);

  return composeDistrictData({
    centres: centres.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CentreDoc),
    stocks: stocks.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as StockDoc),
    beds: beds.docs.map((doc) => doc.data() as BedDoc),
    doctors: doctors.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as DoctorDoc),
    tests: tests.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as TestDoc),
    footfall: footfall.docs.map((doc) => doc.data() as FootfallDoc)
  });
}
