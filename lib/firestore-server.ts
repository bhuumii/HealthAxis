import { getDistrictBySlug } from "@/lib/districts";
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

export async function getDistrictDataFromFirestore(districtSlug = "suryanagar"): Promise<DistrictData | null> {
  const db = getAdminFirestore();
  if (!db) return null;

  const district = getDistrictBySlug(districtSlug);
  const byDistrict = (collectionName: string) => db.collection(collectionName).where("district", "==", district.name).get();

  const [centres, stocks, beds, doctors, tests, footfall] = await Promise.all([
    byDistrict("centres"),
    byDistrict("stock_items"),
    byDistrict("beds"),
    byDistrict("doctors"),
    byDistrict("tests"),
    byDistrict("footfall_logs")
  ]);

  if (centres.empty) return null;

  return composeDistrictData({
    centres: centres.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CentreDoc),
    stocks: stocks.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as StockDoc),
    beds: beds.docs.map((doc) => doc.data() as BedDoc),
    doctors: doctors.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as DoctorDoc),
    tests: tests.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as TestDoc),
    footfall: footfall.docs.map((doc) => doc.data() as FootfallDoc)
  });
}
