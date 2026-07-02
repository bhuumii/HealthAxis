import districtJson from "@/data/district-data.json";
import type { DistrictData } from "@/lib/types";

export function getDistrictData(): DistrictData {
  return districtJson as DistrictData;
}
