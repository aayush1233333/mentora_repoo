import React, { useState, useEffect, useRef } from "react";
import { Bell, X, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { useSession } from "../../context/SessionContext";
import { useTheme } from "../../context/ThemeContext";

const MAX_NOTIFS = 20;

function makeNotif(type, title, body) {
  return { id: Date.now() + Math.random(), type, title, body, ts: Date.now(), read: false };
}

export default function NotificationBell() {
  const { dark } = useTheme();
  const { fatigueScore, state, active } = useSession();
  const [open, setOpen]   = useState(false);
  const [notifs, setNotifs] = useState([]);
  const prevScore = useRef(0);
  const prevState = useRef("Normal");
  const ref = useRef(null);

  // Generate notifications when fatigue crosses thresholds
  useEffect(() => {
    if (!active) return;
    const prev = prevScore.current;
    const prevSt = prevState.current;

    if (fatigueScore >= 65 && prev < 65) {
      setNotifs(n => [makeNotif("danger", "High Fatigue Detected",
        `Score hit ${fatigueScore.toFixed(0)}/100. Please take a 15-min break.`),
        ...n].slice(0, MAX_NOTIFS));
    } else if (fatigueScore >= 35 && prev < 35) {
      setNotifs(n => [makeNotif("warn", "Stress Building",
        `Score is ${fatigueScore.toFixed(0)}/100. Try a quick breathing exercise.`),
        ...n].slice(0, MAX_NOTIFS));
    } else if (fatigueScore < 35 && prev >= 35 && prevSt !== "Normal") {
      setNotifs(n => [makeNotif("success", "Recovering Well",
        `Fatigue score back to ${fatigueScore.toFixed(0)}. Keep it up!`),
        ...n].slice(0, MAX_NOTIFS));
    }

    prevScore.current = fatigueScore;
    prevState.current = state;
  }, [fatigueScore, state, active]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifs.filter(n => !n.read).length;
  const markAllRead = () => setNotifs(n => n.map(x => ({ ...x, read: true })));
  const dismiss = (id) => setNotifs(n => n.filter(x => x.id !== id));

  const iconMap = {
    danger:  <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />,
    warn:    <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />,
    success: <CheckCircle  size={14} className="text-emerald-400 shrink-0 mt-0.5" />,
    info:    <Info         size={14} className="text-blue-400 shrink-0 mt-0.5" />,
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen(o => !o); if (!open) markAllRead(); }}
        className={`relative p-2 rounded-lg transition-colors ${dark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-2 w-80 rounded-2xl border shadow-xl z-50 overflow-hidden
          ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${dark ? "border-gray-800" : "border-gray-100"}`}>
            <span className={`text-sm font-semibold ${dark ? "text-white" : "text-gray-800"}`}>Notifications</span>
            {notifs.length > 0 && (
              <button onClick={() => setNotifs([])} className="text-xs text-gray-400 hover:text-gray-600">Clear all</button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Bell size={28} strokeWidth={1} className="mb-2 opacity-40" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifs.map(n => (
                <div key={n.id} className={`flex gap-3 px-4 py-3 border-b last:border-0 ${dark ? "border-gray-800" : "border-gray-50"}`}>
                  {iconMap[n.type] || iconMap.info}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${dark ? "text-gray-200" : "text-gray-800"}`}>{n.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.body}</p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {new Date(n.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button onClick={() => dismiss(n.id)} className="text-gray-400 hover:text-gray-600 shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
