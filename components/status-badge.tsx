import type { Severity } from "@/lib/types";

const badgeClasses: Record<Severity, string> = {
  good: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warn: "bg-amber-50 text-amber-700 ring-amber-200",
  bad: "bg-red-50 text-red-700 ring-red-200"
};

export function StatusBadge({ value, label }: { value: Severity; label?: string }) {
  const text = label ?? (value === "bad" ? "Critical" : value === "warn" ? "Watch" : "Stable");
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${badgeClasses[value]}`}>
      {text}
    </span>
  );
}
