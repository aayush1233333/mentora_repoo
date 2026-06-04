import { useState, useEffect, useRef, useCallback } from "react";

const PHASES = [
  { label: "Focus",       minutes: 25, color: "#6C63FF" },
  { label: "Short Break", minutes: 5,  color: "#22d3ee" },
  { label: "Focus",       minutes: 25, color: "#6C63FF" },
  { label: "Short Break", minutes: 5,  color: "#22d3ee" },
  { label: "Focus",       minutes: 25, color: "#6C63FF" },
  { label: "Short Break", minutes: 5,  color: "#22d3ee" },
  { label: "Focus",       minutes: 25, color: "#6C63FF" },
  { label: "Long Break",  minutes: 15, color: "#10b981" },
];

export function usePomodoro() {
  const [phaseIdx,  setPhaseIdx]  = useState(0);
  const [seconds,   setSeconds]   = useState(PHASES[0].minutes * 60);
  const [running,   setRunning]   = useState(false);
  const [cycles,    setCycles]    = useState(0);
  const tickRef = useRef(null);

  const phase = PHASES[phaseIdx % PHASES.length];
  const total = phase.minutes * 60;
  const pct   = ((total - seconds) / total) * 100;

  useEffect(() => {
    if (running) {
      tickRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(tickRef.current);
            const next = (phaseIdx + 1) % PHASES.length;
            setPhaseIdx(next);
            setSeconds(PHASES[next].minutes * 60);
            setRunning(false);
            if (PHASES[next % PHASES.length].label === "Focus") setCycles((c) => c + 1);
            // Browser notification
            if (Notification.permission === "granted") {
              new Notification("Mentora – Pomodoro", {
                body: `Time for: ${PHASES[next % PHASES.length].label}`,
                icon: "/logo192.png",
              });
            }
            return PHASES[next].minutes * 60;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(tickRef.current);
    }
    return () => clearInterval(tickRef.current);
  }, [running, phaseIdx]);

  const toggle = useCallback(() => setRunning((r) => !r), []);

  const reset = useCallback(() => {
    setRunning(false);
    setSeconds(PHASES[phaseIdx % PHASES.length].minutes * 60);
  }, [phaseIdx]);

  const skip = useCallback(() => {
    setRunning(false);
    const next = (phaseIdx + 1) % PHASES.length;
    setPhaseIdx(next);
    setSeconds(PHASES[next].minutes * 60);
  }, [phaseIdx]);

  const fmt = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return { phase, fmt, pct, running, cycles, toggle, reset, skip };
}
