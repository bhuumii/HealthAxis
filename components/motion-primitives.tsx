"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

export const easeOut = [0.16, 1, 0.3, 1] as const;
export const easeInOut = [0.45, 0, 0.2, 1] as const;

export const riseIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.03
    }
  }
};

export const entranceTransition = {
  duration: 0.24,
  ease: easeOut
};

export function AnimatedNumber({
  value,
  suffix = "",
  decimals = 0,
  className
}: {
  value: number;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => `${latest.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}${suffix}`);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.34,
      ease: easeOut
    });

    return controls.stop;
  }, [motionValue, value]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
