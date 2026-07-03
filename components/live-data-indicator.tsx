"use client";

export function LiveDataIndicator({ isLive, pulse, lastUpdatedAt }: { isLive: boolean; pulse: boolean; lastUpdatedAt: Date | null }) {
  const label = isLive ? "Live data feed" : "Fallback dataset";
  const timestamp = lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "waiting";

  return (
    <div className={`inline-flex items-center gap-2 rounded border px-2.5 py-1 text-xs font-bold transition ${isLive ? "border-[#b8cdbc] bg-[#eef5f1] text-[#47705d]" : "border-[#d5bd91] bg-[#f7f1e6] text-[#8a6426]"}`}>
      <span className="relative flex h-2 w-2">
        {pulse ? <span className="absolute inline-flex h-full w-full animate-ping rounded-sm bg-[#47705d] opacity-50" /> : null}
        <span className={`relative inline-flex h-2 w-2 rounded-sm ${isLive ? "bg-[#47705d]" : "bg-[#9a6a22]"}`} />
      </span>
      <span>{label}</span>
      <span className="text-slate-500">{timestamp}</span>
    </div>
  );
}
