import { motion } from "framer-motion";
import { easeOut } from "@/components/motion-primitives";
import type { Severity } from "@/lib/types";

const badgeClasses: Record<Severity, string> = {
  good: "bg-[#eef5f1] text-[#47705d] ring-[#b8cdbc]",
  warn: "bg-[#f7f1e6] text-[#8a6426] ring-[#d5bd91]",
  bad: "bg-[#f8eeee] text-[#9f3a38] ring-[#d7aaaa]"
};

export function StatusBadge({ value, label }: { value: Severity; label?: string }) {
  const text = label ?? (value === "bad" ? "Critical" : value === "warn" ? "Watch" : "Stable");
  return (
    <motion.span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold ring-1 transition-colors duration-200 ease-out ${badgeClasses[value]}`}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: easeOut }}
    >
      {text}
    </motion.span>
  );
}
