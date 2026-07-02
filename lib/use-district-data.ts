"use client";

import { useEffect, useState } from "react";
import fallbackData from "@/data/district-data.json";
import { subscribeToDistrictData } from "@/lib/firestore-district";
import type { DistrictData } from "@/lib/types";

export function useDistrictData() {
  const [data, setData] = useState<DistrictData>(fallbackData as DistrictData);
  const [source, setSource] = useState<"firestore" | "fallback">("fallback");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToDistrictData(
      (nextData) => {
        if (nextData.centres.length) {
          setData(nextData);
          setSource("firestore");
          setError(null);
        }
      },
      (nextError) => {
        setError(nextError.message);
        setSource("fallback");
      }
    );

    return unsubscribe;
  }, []);

  return { data, source, error };
}
