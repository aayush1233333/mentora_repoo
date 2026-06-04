import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  StopCircle,
  TrendingDown,
  TrendingUp,
  Wind,
} from "lucide-react";
import { useSession } from "../context/SessionContext";
import { useCamera } from "../context/CameraContext";
import { useTheme } from "../context/ThemeContext";
import FatigueGauge from "../components/dashboard/FatigueGauge";
import BreathingExercise, { BREATHING_TECHNIQUES } from "../components/dashboard/BreathingExercise";

const CAPTURE_FPS = 2;
const STATE_COLORS = {
  Normal: "#10b981",
  Stressed: "#f59e0b",
  Fatigued: "#ef4444",
  Unknown: "#6b7280",
};
const BREATHING_NOTES = {
  "4-7-8": "Best when stress is climbing and you want a slower, longer exhale.",
  box: "Great for repeated yawns or a quick focus reset between work blocks.",
  diaphragmatic: "Use this when your body feels heavy and you need a gentler recovery rhythm.",
};

function MetricPill({ label, value, warn, dark }) {
  const num = parseFloat(value) || 0;
  const over = num >= warn;
  return (
    <div className={`flex flex-col items-center rounded-xl px-3 py-2.5 ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
      <span className="mb-1 text-xs text-gray-400">{label}</span>
      <span className="font-mono text-base font-bold" style={{ color: over ? "#ef4444" : "#10b981" }}>
        {value}
      </span>
    </div>
  );
}

function HeadPoseBar({ label, value, dark }) {
  const pct = Math.min(Math.max(((value + 45) / 90) * 100, 0), 100);
  const atCenter = Math.abs(value) < 10;
  return (
    <div>
      <div className="mb-1 flex justify-between">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs font-mono" style={{ color: atCenter ? "#10b981" : "#f59e0b" }}>
          {value > 0 ? "+" : ""}
          {value.toFixed(1)} deg
        </span>
      </div>
      <div className={`relative h-2 overflow-hidden rounded-full ${dark ? "bg-gray-700" : "bg-gray-200"}`}>
        <div className="absolute left-1/2 top-0 h-full w-px bg-gray-400 opacity-50" />
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: atCenter ? "#10b981" : "#f59e0b", maxWidth: "100%" }}
        />
      </div>
    </div>
  );
}

function getBreathingRecommendation({ fatigueScore, state, yawnCount }) {
  if (yawnCount >= 3) {
    return {
      primaryId: "box",
      headline: "Repeated yawns detected",
      body: "A short round of box breathing can steady your focus, then it is a good moment to stand up, drink water, and reset.",
      accent: "#f59e0b",
    };
  }

  if (fatigueScore >= 65 || state === "Fatigued") {
    return {
      primaryId: "diaphragmatic",
      headline: "Your system needs recovery",
      body: "Use slow belly breaths while you step away from the screen. Breathing helps, but a real break matters most here.",
      accent: "#ef4444",
    };
  }

  if (fatigueScore >= 35 || state === "Stressed") {
    return {
      primaryId: "4-7-8",
      headline: "Stress is building",
      body: "A longer exhale pattern is the quickest way to calm your nervous system and bring your breathing back under control.",
      accent: "#f59e0b",
    };
  }

  return {
    primaryId: "box",
    headline: "Keep your rhythm steady",
    body: "A one-minute breathing reset can help you stay centered before fatigue starts climbing.",
    accent: "#10b981",
  };
}

export default function Monitoring() {
  const { dark } = useTheme();
  const {
    startSession,
    sendFrame,
    endSession,
    active,
    fatigueScore,
    state,
    ear,
    mar,
    headPitch,
    headYaw,
    blinkCount,
    yawnCount,
    history,
  } = useSession();
  const {
    start: startCam,
    stop: stopCam,
    active: camActive,
    error: camError,
    startCapture,
    stopCapture,
    attachVideo,
    detachVideo,
  } = useCamera();
  const videoRef = useRef(null);
  const prevScore = useRef(0);
  const prevYawnCount = useRef(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showBreathing, setShowBreathing] = useState(false);
  const [selectedTechniqueId, setSelectedTechniqueId] = useState(BREATHING_TECHNIQUES[0].id);

  const recommendation = getBreathingRecommendation({ fatigueScore, state, yawnCount });
  const trendUp =
    history.length >= 5 &&
    history.slice(-5).reduce((sum, item) => sum + item.score, 0) / 5 >
      history.slice(-10, -5).reduce((sum, item) => sum + item.score, 0) / 5;

  useEffect(() => {
    if (fatigueScore >= 65 && prevScore.current < 65) {
      setSelectedTechniqueId("diaphragmatic");
      setShowBreathing(true);
      setToast({ type: "danger", msg: "High fatigue detected - take a 15-minute break now." });
    } else if (fatigueScore >= 35 && prevScore.current < 35) {
      setSelectedTechniqueId("4-7-8");
      setShowBreathing(true);
      setToast({ type: "warn", msg: "Stress building - try a short breathing exercise." });
    } else if (fatigueScore < 35 && prevScore.current >= 35) {
      setToast({ type: "ok", msg: "Fatigue recovering - great job taking a break." });
    }
    prevScore.current = fatigueScore;
  }, [fatigueScore]);

  useEffect(() => {
    if (yawnCount >= 3 && prevYawnCount.current < 3) {
      setSelectedTechniqueId("box");
      setShowBreathing(true);
      setToast({ type: "warn", msg: "Multiple yawns detected - try box breathing and take a short break." });
    }
    prevYawnCount.current = yawnCount;
  }, [yawnCount]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const previewEl = videoRef.current;
    attachVideo(previewEl);
    return () => detachVideo(previewEl);
  }, [attachVideo, detachVideo]);

  const handleStart = async () => {
    setLoading(true);

    try {
      await startCam();
      const sid = await startSession();
      startCapture(async (b64) => {
        await sendFrame(b64, sid);
      }, CAPTURE_FPS);
    } catch (err) {
      stopCapture();
      stopCam();
      setToast({
        type: "danger",
        msg: err?.response?.data?.detail || err?.message || "Unable to start monitoring.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    stopCapture();
    stopCam();
    setShowBreathing(false);
    await endSession();
  };

  const openBreathing = (techniqueId) => {
    setSelectedTechniqueId(techniqueId);
    setShowBreathing(true);
  };

  return (
    <div className={`min-h-full p-4 md:p-6 ${dark ? "text-white" : "text-gray-900"}`}>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Live Monitoring</h1>
        <p className={`mt-0.5 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
          Real-time facial analysis - no video is ever stored
        </p>
      </div>

      {toast && (
        <div
          className={`mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
            toast.type === "danger"
              ? "border-red-700 bg-red-900/30 text-red-300"
              : toast.type === "warn"
                ? "border-amber-700 bg-amber-900/30 text-amber-300"
                : "border-emerald-700 bg-emerald-900/30 text-emerald-300"
          }`}
        >
          {toast.type === "ok" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          <div
            className={`relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border ${
              dark ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-gray-100"
            }`}
          >
            <video
              ref={videoRef}
              muted
              playsInline
              className={`h-full w-full object-cover ${camActive ? "block" : "hidden"}`}
            />
            {!camActive && (
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <Camera size={48} strokeWidth={1} />
                <p className="text-sm">{camError || "Camera inactive"}</p>
              </div>
            )}
            {camActive && (
              <>
                <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                      style={{ background: STATE_COLORS[state] || STATE_COLORS.Unknown }}
                    />
                    <span
                      className="relative inline-flex h-2 w-2 rounded-full"
                      style={{ background: STATE_COLORS[state] || STATE_COLORS.Unknown }}
                    />
                  </span>
                  <span className="text-xs font-semibold text-white">LIVE</span>
                </div>
                <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                  {trendUp ? (
                    <TrendingUp size={12} className="text-red-400" />
                  ) : (
                    <TrendingDown size={12} className="text-emerald-400" />
                  )}
                  <span className="text-xs font-bold" style={{ color: STATE_COLORS[state] || STATE_COLORS.Unknown }}>
                    {state} · {fatigueScore}/100
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3">
            {!active ? (
              <button
                onClick={handleStart}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                <Camera size={18} />
                {loading ? "Starting..." : "Start Monitoring"}
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-semibold text-white transition-colors hover:bg-red-700"
              >
                <StopCircle size={18} />
                Stop and Save Session
              </button>
            )}
          </div>

          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs ${
              dark ? "bg-gray-800/50 text-gray-400" : "bg-gray-100 text-gray-500"
            }`}
          >
            <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
            Frames are processed and discarded immediately. No video is stored.
          </div>
        </div>

        <div className="space-y-3 lg:col-span-2">
          <div
            className={`flex flex-col items-center rounded-2xl border p-5 shadow-sm ${
              dark ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"
            }`}
          >
            <FatigueGauge score={fatigueScore} state={state} size={160} />
          </div>

          <div className={`rounded-2xl border p-4 shadow-sm ${dark ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"}`}>
            <h3 className={`mb-3 text-xs font-semibold ${dark ? "text-gray-400" : "text-gray-500"}`}>FACIAL METRICS</h3>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <MetricPill label="EAR" value={ear.toFixed(3)} warn={0.2} dark={dark} />
              <MetricPill label="MAR" value={mar.toFixed(3)} warn={0.65} dark={dark} />
              <MetricPill label="Blinks" value={blinkCount} warn={30} dark={dark} />
              <MetricPill label="Yawns" value={yawnCount} warn={3} dark={dark} />
            </div>
            <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
              Frequent yawns are now treated as a stronger recovery signal.
            </p>
          </div>

          <div className={`rounded-2xl border p-4 shadow-sm ${dark ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"}`}>
            <h3 className={`mb-3 text-xs font-semibold ${dark ? "text-gray-400" : "text-gray-500"}`}>HEAD POSE</h3>
            <div className="space-y-3">
              <HeadPoseBar label="Pitch (nod)" value={headPitch} dark={dark} />
              <HeadPoseBar label="Yaw (turn)" value={headYaw} dark={dark} />
            </div>
            <p className="mt-3 text-xs text-gray-400">Head drooping is still one of the strongest fatigue indicators.</p>
          </div>

          <div
            className={`space-y-1.5 rounded-2xl border p-4 text-xs shadow-sm ${
              dark ? "border-gray-800 bg-gray-900 text-gray-400" : "border-gray-200 bg-white text-gray-500"
            }`}
          >
            <p className={`mb-2 text-xs font-semibold ${dark ? "text-gray-300" : "text-gray-600"}`}>Score guide</p>
            {[
              ["0-30", "Normal", "#10b981"],
              ["31-65", "Stressed", "#f59e0b"],
              ["66-100", "Fatigued", "#ef4444"],
            ].map(([range, label, color]) => (
              <div key={range} className="flex items-center gap-2">
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                <span className="font-mono">{range}</span>
                <span>·</span>
                <span style={{ color }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`mt-4 rounded-2xl border p-4 shadow-sm ${dark ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white"}`}>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${recommendation.accent}22`, color: recommendation.accent }}>
              <Wind size={14} />
              Breathing support
            </div>
            <h3 className="text-lg font-semibold">{recommendation.headline}</h3>
            <p className={`mt-1 max-w-2xl text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
              {recommendation.body}
            </p>
          </div>
          <button
            onClick={() => openBreathing(recommendation.primaryId)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <Wind size={16} />
            {showBreathing ? "Switch Exercise" : "Open Exercise"}
          </button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {BREATHING_TECHNIQUES.map((technique) => {
            const isRecommended = technique.id === recommendation.primaryId;
            return (
              <button
                key={technique.id}
                onClick={() => openBreathing(technique.id)}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  dark ? "border-gray-800 bg-gray-950 hover:bg-gray-800" : "border-gray-200 bg-gray-50 hover:bg-white"
                }`}
                style={isRecommended ? { borderColor: technique.color, boxShadow: `0 0 0 1px ${technique.color}33 inset` } : {}}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="font-semibold" style={{ color: technique.color }}>
                    {technique.name}
                  </span>
                  {isRecommended && (
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${technique.color}22`, color: technique.color }}>
                      Recommended
                    </span>
                  )}
                </div>
                <p className={`text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>{technique.description}</p>
                <p className={`mt-2 text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
                  {BREATHING_NOTES[technique.id]}
                </p>
              </button>
            );
          })}
        </div>

        {showBreathing && (
          <BreathingExercise
            key={selectedTechniqueId}
            dark={dark}
            autoStart={fatigueScore >= 35 || yawnCount >= 3}
            initialTechniqueId={selectedTechniqueId}
            onClose={() => setShowBreathing(false)}
          />
        )}
      </div>
    </div>
  );
}
