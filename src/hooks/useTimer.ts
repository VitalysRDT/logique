"use client";

import { useState, useEffect, useRef } from "react";

export function useTimer(deadline: number) {
  const [remainingMs, setRemainingMs] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!deadline || deadline <= 0) {
      setRemainingMs(0);
      return;
    }

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, deadline - now);
      setRemainingMs(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [deadline]);

  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const isExpired = deadline > 0 && remainingMs <= 0;
  const totalMs = deadline > 0 ? deadline - (deadline - remainingMs - remainingMs) : 1;
  const progress = deadline > 0 ? remainingMs / (deadline - Date.now() + remainingMs || 1) : 0;

  return { remainingMs, remainingSeconds, isExpired, progress: Math.max(0, Math.min(1, remainingMs / 1000 / 45)) };
}
