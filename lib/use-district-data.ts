"use client";

import { useEffect, useRef, useState } from "react";
import fallbackData from "@/data/district-data.json";
import { subscribeToDistrictData } from "@/lib/firestore-district";
import type { DistrictData } from "@/lib/types";

export function useDistrictData() {
  const [data, setData] = useState<DistrictData>(fallbackData as DistrictData);
  const [source, setSource] = useState<"firestore" | "fallback">("fallback");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [livePulse, setLivePulse] = useState(false);
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToDistrictData(
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
  }, []);

  return { data, source, error, isLive: source === "firestore" && !error, livePulse, lastUpdatedAt };
}
