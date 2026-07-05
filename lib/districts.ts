export const DISTRICTS = [
  { slug: "suryanagar", name: "Suryanagar", state: "Uttar Pradesh" },
  { slug: "shivpur-kalan", name: "Shivpur Kalan", state: "Uttar Pradesh" },
  { slug: "mahadevganj", name: "Mahadevganj", state: "Uttar Pradesh" }
] as const;

export type DistrictSlug = (typeof DISTRICTS)[number]["slug"];
export type DistrictOption = (typeof DISTRICTS)[number];

export const DEFAULT_DISTRICT_SLUG: DistrictSlug = "suryanagar";

export function normalizeDistrictSlug(value: string | null | undefined): DistrictSlug {
  const match = DISTRICTS.find((district) => district.slug === value);
  return match?.slug ?? DEFAULT_DISTRICT_SLUG;
}

export function getDistrictBySlug(value: string | null | undefined): DistrictOption {
  const slug = normalizeDistrictSlug(value);
  return DISTRICTS.find((district) => district.slug === slug) ?? DISTRICTS[0];
}
