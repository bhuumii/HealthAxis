"use client";

import { Radio } from "lucide-react";

export function LiveDataIndicator({ isLive, pulse, lastUpdatedAt }: { isLive: boolean; pulse: boolean; lastUpdatedAt: Date | null }) {
  const label = isLive ? "Live Firestore" : "Fallback data";
  const timestamp = lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "waiting";

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${isLive ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}>
      <span className="relative flex h-2.5 w-2.5">
        {pulse ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" /> : null}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isLive ? "bg-emerald-600" : "bg-amber-500"}`} />
      </span>
      <Radio size={14} />
      <span>{label}</span>
      <span className="text-slate-500">{timestamp}</span>
    </div>
  );
}
