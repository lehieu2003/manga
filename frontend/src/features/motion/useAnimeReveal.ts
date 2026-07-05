import { animate } from "animejs/animation";
import { stagger } from "animejs/utils";
import { useEffect, useRef } from "react";

type RevealOptions = {
  selector?: string;
  delay?: number;
  staggerMs?: number;
  distance?: number;
  duration?: number;
};

const DEFAULT_SELECTOR = "[data-motion-item]";

export function useAnimeReveal<T extends HTMLElement>(
  deps: readonly unknown[],
  {
    selector = DEFAULT_SELECTOR,
    delay = 0,
    staggerMs = 42,
    distance = 14,
    duration = 520,
  }: RevealOptions = {},
) {
  const rootRef = useRef<T | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || shouldReduceMotion()) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (!targets.length) return;

    const animation = animate(targets, {
      opacity: [0, 1],
      y: [distance, 0],
      duration,
      delay: stagger(staggerMs, { start: delay }),
      ease: "outCubic",
    });

    return () => {
      animation.revert();
    };
  }, [delay, distance, duration, selector, staggerMs, ...deps]);

  return rootRef;
}

function shouldReduceMotion() {
  if (typeof window.matchMedia !== "function") return false;

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
