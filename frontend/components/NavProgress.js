"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function NavProgress() {
  const pathname = usePathname();
  const scaleX = useMotionValue(0);
  const springScaleX = useSpring(scaleX, {
    stiffness: 200,
    damping: 25,
    restDelta: 0.001,
  });
  const timeoutRef = useRef(null);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    scaleX.set(0.15);
    const fastTimeout = setTimeout(() => {
      scaleX.set(0.7);
    }, 100);

    timeoutRef.current = setTimeout(() => {
      scaleX.set(1);
      setTimeout(() => {
        scaleX.set(0);
      }, 200);
    }, 400);

    return () => {
      clearTimeout(fastTimeout);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pathname, scaleX]);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[100] h-[2px] origin-left bg-gradient-to-r from-[var(--color-accent)] via-[var(--color-gold)] to-[var(--color-accent)]"
      style={{ scaleX: springScaleX }}
    />
  );
}
