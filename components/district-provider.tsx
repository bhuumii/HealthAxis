"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_DISTRICT_SLUG, DISTRICTS, getDistrictBySlug, normalizeDistrictSlug, type DistrictOption, type DistrictSlug } from "@/lib/districts";

type DistrictContextValue = {
  district: DistrictOption;
  districtSlug: DistrictSlug;
  setDistrictSlug: (slug: string) => void;
  hrefWithDistrict: (href: string) => string;
};

const DistrictContext = createContext<DistrictContextValue | null>(null);

function readSlugFromWindow() {
  if (typeof window === "undefined") return DEFAULT_DISTRICT_SLUG;
  return normalizeDistrictSlug(new URLSearchParams(window.location.search).get("district"));
}

export function DistrictProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [districtSlug, setDistrictSlugState] = useState<DistrictSlug>(DEFAULT_DISTRICT_SLUG);

  useEffect(() => {
    setDistrictSlugState(readSlugFromWindow());

    const onPopState = () => setDistrictSlugState(readSlugFromWindow());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    setDistrictSlugState(readSlugFromWindow());
  }, [pathname]);

  const hrefWithDistrict = useCallback(
    (href: string) => {
      const [path, query = ""] = href.split("?");
      const params = new URLSearchParams(query);
      params.set("district", districtSlug);
      const queryString = params.toString();
      return queryString ? `${path}?${queryString}` : path;
    },
    [districtSlug]
  );

  const setDistrictSlug = useCallback(
    (slug: string) => {
      const nextSlug = normalizeDistrictSlug(slug);
      setDistrictSlugState(nextSlug);

      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      params.set("district", nextSlug);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router]
  );

  const value = useMemo<DistrictContextValue>(
    () => ({
      district: getDistrictBySlug(districtSlug),
      districtSlug,
      setDistrictSlug,
      hrefWithDistrict
    }),
    [districtSlug, hrefWithDistrict, setDistrictSlug]
  );

  return <DistrictContext.Provider value={value}>{children}</DistrictContext.Provider>;
}

export function useDistrictSelection() {
  const context = useContext(DistrictContext);
  if (!context) throw new Error("useDistrictSelection must be used inside DistrictProvider");
  return context;
}

export { DISTRICTS };
