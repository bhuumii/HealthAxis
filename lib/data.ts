import districtsJson from "@/data/districts-data.json";
import { DEFAULT_DISTRICT_SLUG, normalizeDistrictSlug } from "@/lib/districts";
import type { DistrictData } from "@/lib/types";

const districts = districtsJson as DistrictData[];

export function getDistrictData(districtSlug: string = DEFAULT_DISTRICT_SLUG): DistrictData {
  const normalizedSlug = normalizeDistrictSlug(districtSlug);
  return districts.find((district) => district.districtSlug === normalizedSlug) ?? districts[0];
}

export function getAllDistrictData(): DistrictData[] {
  return districts;
}
