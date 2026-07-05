"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDistrictSelection } from "@/components/district-provider";
import { getDistrictData } from "@/lib/data";
import { subscribeToDistrictData } from "@/lib/firestore-district";
import type { DistrictData } from "@/lib/types";

export function useDistrictData() {
  const { district, districtSlug } = useDistrictSelection();
  const fallbackData = useMemo(() => getDistrictData(districtSlug), [districtSlug]);
  const [data, setData] = useState<DistrictData>(fallbackData);
  const [source, setSource] = useState<"firestore" | "fallback">("fallback");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [livePulse, setLivePulse] = useState(false);
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setData(fallbackData);
    setSource("fallback");
    setError(null);
    setLivePulse(false);
  }, [fallbackData]);

  useEffect(() => {
    const unsubscribe = subscribeToDistrictData(
      district,
      (nextData) => {
        if (nextData.centres.length) {
          setData(nextData);
          setSource("firestore");
          setError(null);
          setLastUpdatedAt(new Date());
          setLivePulse(true);

          if (updateTimer.current) clearTimeout(updateTimer.current);
          updateTimer.current = setTimeout(() => setLivePulse(false), 1400);
        }
      },
      (nextError) => {
        setError(nextError.message);
        setSource("fallback");
        setLivePulse(false);
      }
    );

    return () => {
      unsubscribe();
      if (updateTimer.current) clearTimeout(updateTimer.current);
    };
  }, [district, fallbackData]);

  return { data, source, error, isLive: source === "firestore" && !error, livePulse, lastUpdatedAt };
}
