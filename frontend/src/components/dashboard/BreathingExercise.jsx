import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Wind } from "lucide-react";

export const BREATHING_TECHNIQUES = [
  {
    id: "4-7-8",
    name: "4-7-8 Breathing",
    description: "Activates parasympathetic nervous system",
    phases: [
      { label: "Inhale",  duration: 4, instruction: "Breathe in slowly through your nose", scale: 1.4 },
      { label: "Hold",    duration: 7, instruction: "Hold your breath gently",             scale: 1.4 },
      { label: "Exhale",  duration: 8, instruction: "Exhale completely through your mouth", scale: 0.6 },
    ],
    color: "#6C63FF",
  },
  {
    id: "box",
    name: "Box Breathing",
    description: "Used by Navy SEALs for calm under pressure",
    phases: [
      { label: "Inhale",  duration: 4, instruction: "Breathe in through your nose",   scale: 1.4 },
      { label: "Hold",    duration: 4, instruction: "Hold at the top",                scale: 1.4 },
      { label: "Exhale",  duration: 4, instruction: "Breathe out through your mouth", scale: 0.6 },
      { label: "Hold",    duration: 4, instruction: "Hold at the bottom",             scale: 0.6 },
    ],
    color: "#22d3ee",
  },
  {
    id: "diaphragmatic",
    name: "Diaphragmatic",
    description: "Deep belly breathing for quick stress relief",
    phases: [
      { label: "Inhale",  duration: 5, instruction: "Expand your belly, not your chest", scale: 1.5 },
      { label: "Exhale",  duration: 5, instruction: "Let your belly fall naturally",      scale: 0.6 },
    ],
    color: "#10b981",
  },
];

function getTechniqueIndex(techniqueId) {
  const idx = BREATHING_TECHNIQUES.findIndex((technique) => technique.id === techniqueId);
  return idx >= 0 ? idx : 0;
}

export default function BreathingExercise({
  onClose,
  dark,
  autoStart = false,
  initialTechniqueId = BREATHING_TECHNIQUES[0].id,
}) {
  const initialTechniqueIdx = getTechniqueIndex(initialTechniqueId);
  const [techniqueIdx, setTechniqueIdx] = useState(initialTechniqueIdx);
  const [running,   setRunning]   = useState(autoStart);
  const [phaseIdx,  setPhaseIdx]  = useState(0);
  const [countdown, setCountdown] = useState(BREATHING_TECHNIQUES[initialTechniqueIdx].phases[0].duration);
  const [cycles,    setCycles]    = useState(0);
  const [scale,     setScale]     = useState(1.0);
  const intervalRef = useRef(null);
  const tech = BREATHING_TECHNIQUES[techniqueIdx];
  const phase = tech.phases[phaseIdx];

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setPhaseIdx(0);
    setCountdown(tech.phases[0].duration);
    setScale(1.0);
  }, [tech]);

  useEffect(() => {
    if (!running) return;

    const current = tech.phases[phaseIdx];
    setCountdown(current.duration);
    setScale(current.scale);

    let secs = current.duration;
    intervalRef.current = setInterval(() => {
      secs--;
      setCountdown(secs);
      if (secs <= 0) {
        clearInterval(intervalRef.current);
        const nextIdx = (phaseIdx + 1) % tech.phases.length;
        if (nextIdx === 0) setCycles(c => c + 1);
        setPhaseIdx(nextIdx);
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [running, phaseIdx, tech]);

  useEffect(() => {
    if (!running) {
      setPhaseIdx(0);
      setCountdown(tech.phases[0].duration);
    }
  }, [techniqueIdx, running, tech]);

  const totalSecs = tech.phases.reduce((a, p) => a + p.duration, 0);
  const elapsed = tech.phases.slice(0, phaseIdx).reduce((a, p) => a + p.duration, 0) +
                  (tech.phases[phaseIdx]?.duration - countdown || 0);
  const cyclePct = running ? (elapsed / totalSecs) * 100 : 0;

  return (
    <div className={`rounded-2xl border overflow-hidden ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} shadow-xl`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? "border-gray-800" : "border-gray-100"}`}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: tech.color + "22" }}>
            <Wind size={16} style={{ color: tech.color }} />
          </div>
          <div>
            <h3 className={`font-semibold text-sm ${dark ? "text-white" : "text-gray-800"}`}>Breathing Exercise</h3>
            <p className="text-xs text-gray-400">{tech.description}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className={`p-1.5 rounded-lg ${dark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
            <X size={16} />
          </button>
        )}
      </div>

      <div className="p-5">
        {/* Technique selector */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {BREATHING_TECHNIQUES.map((t, i) => (
            <button key={t.id} onClick={() => { stop(); setCycles(0); setTechniqueIdx(i); }}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${i === techniqueIdx
                  ? "text-white border-transparent"
                  : dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              style={i === techniqueIdx ? { background: t.color, borderColor: t.color } : {}}>
              {t.name}
            </button>
          ))}
        </div>

        {/* Animation circle */}
        <div className="flex flex-col items-center mb-5">
          <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
            {/* Ring progress */}
            <svg width={200} height={200} className="absolute inset-0 -rotate-90">
              <circle cx={100} cy={100} r={88} fill="none"
                stroke={dark ? "#1e293b" : "#f1f5f9"} strokeWidth={6} />
              <circle cx={100} cy={100} r={88} fill="none"
                stroke={tech.color} strokeWidth={6} strokeLinecap="round"
                strokeDasharray={553}
                strokeDashoffset={553 * (1 - cyclePct / 100)}
                style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.5s" }}
              />
            </svg>

            {/* Breathing bubble */}
            <div
              className="rounded-full flex flex-col items-center justify-center transition-all"
              style={{
                width:  running ? `${scale * 80}px`  : "80px",
                height: running ? `${scale * 80}px`  : "80px",
                background: tech.color + (dark ? "33" : "22"),
                border: `2px solid ${tech.color}`,
                transition: `width ${phase?.duration || 1}s ease-in-out, height ${phase?.duration || 1}s ease-in-out`,
              }}>
              {running ? (
                <>
                  <span className="font-mono font-bold text-2xl" style={{ color: tech.color }}>{countdown}</span>
                  <span className="text-xs font-medium mt-0.5" style={{ color: tech.color }}>{phase?.label}</span>
                </>
              ) : (
                <Wind size={22} style={{ color: tech.color }} />
              )}
            </div>
          </div>

          {/* Instruction text */}
          <p className={`text-sm mt-3 text-center min-h-5 ${dark ? "text-gray-300" : "text-gray-600"}`}>
            {running ? phase?.instruction : "Press start when you're ready"}
          </p>
          {cycles > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {cycles} cycle{cycles !== 1 ? "s" : ""} completed
            </p>
          )}
        </div>

        {/* Phase guide */}
        <div className={`flex gap-2 mb-5 overflow-x-auto`}>
          {tech.phases.map((p, i) => (
            <div key={i}
              className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg text-center border transition-colors
                ${running && i === phaseIdx
                  ? "text-white border-transparent"
                  : dark ? "border-gray-700 bg-gray-800/50" : "border-gray-100 bg-gray-50"}`}
              style={running && i === phaseIdx ? { background: tech.color } : {}}>
              <p className={`text-xs font-medium ${running && i === phaseIdx ? "text-white" : dark ? "text-gray-300" : "text-gray-600"}`}>
                {p.label}
              </p>
              <p className={`text-xs ${running && i === phaseIdx ? "text-white/80" : "text-gray-400"}`}>
                {p.duration}s
              </p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={() => running ? stop() : setRunning(true)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: tech.color }}>
            {running ? "Stop" : cycles > 0 ? "Continue" : "Start"}
          </button>
          {cycles > 0 && !running && (
            <button onClick={() => { setCycles(0); setPhaseIdx(0); }}
              className={`px-4 py-2.5 rounded-xl text-sm border transition-colors ${dark ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
