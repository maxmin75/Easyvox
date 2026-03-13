"use client";

import { useEffect, useRef, useState } from "react";

const MIN_USERS = 3;
const MAX_USERS = 87;
const INITIAL_VALUE = 3;

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nextTargetFrom(current: number) {
  let next = current;
  while (next === current) {
    next = randomBetween(MIN_USERS, MAX_USERS);
  }
  return next;
}

export default function TopbarUserTicker() {
  const [count, setCount] = useState(INITIAL_VALUE);
  const currentRef = useRef(INITIAL_VALUE);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    currentRef.current = count;
  }, [count]);

  useEffect(() => {
    let cancelled = false;

    const clearTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const holdThenMove = () => {
      if (cancelled) return;

      timeoutRef.current = setTimeout(() => {
        const target = nextTargetFrom(currentRef.current);
        const direction = target > currentRef.current ? 1 : -1;

        const step = () => {
          if (cancelled) return;

          const nextValue = currentRef.current + direction;
          currentRef.current = nextValue;
          setCount(nextValue);

          if (nextValue === target) {
            holdThenMove();
            return;
          }

          timeoutRef.current = setTimeout(step, randomBetween(85, 150));
        };

        step();
      }, randomBetween(10000, 15000));
    };

    holdThenMove();

    return () => {
      cancelled = true;
      clearTimer();
    };
  }, []);

  return (
    <div className="topbar-user-ribbon" aria-label="Contatore utenti">
      <span className="topbar-user-ribbon-label">user</span>
      <span className="topbar-user-ribbon-badge" aria-live="polite">
        {count}
      </span>
    </div>
  );
}
