import React from "react";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";
import { usePomodoro } from "../../hooks/usePomodoro";

export default function PomodoroTimer({ dark }) {
  const { phase, fmt, pct, running, cycles, toggle, reset, skip } = usePomodoro();

  const r   = 54;
  const circ = 2 * Math.PI * r;
  const off  = circ * (1 - pct / 100);

  return (
    <div className={`rounded-2xl p-5 ${dark ? "bg-gray-900 border border-gray-800" : "bg-white border border-gray-200"} shadow-sm`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>
          Pomodoro Timer
        </h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium`}
          style={{ background: phase.color + "22", color: phase.color }}>
          {phase.label}
        </span>
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* SVG ring */}
        <div className="relative">
          <svg width={130} height={130} className="-rotate-90">
            <circle cx={65} cy={65} r={r} fill="none" stroke="#1e293b" strokeWidth={8} />
            <circle cx={65} cy={65} r={r} fill="none"
              stroke={phase.color} strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={off}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-mono font-bold ${dark ? "text-white" : "text-gray-800"}`}>
              {fmt}
            </span>
            <span className="text-xs text-gray-400 mt-0.5">Cycle {Math.floor(cycles / 4) + 1}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button onClick={reset}
            className={`p-2 rounded-lg ${dark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"} transition-colors`}>
            <RotateCcw size={16} />
          </button>
          <button onClick={toggle}
            className="px-5 py-2 rounded-xl font-semibold text-sm text-white transition-colors flex items-center gap-2"
            style={{ background: phase.color }}>
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? "Pause" : "Start"}
          </button>
          <button onClick={skip}
            className={`p-2 rounded-lg ${dark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"} transition-colors`}>
            <SkipForward size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
