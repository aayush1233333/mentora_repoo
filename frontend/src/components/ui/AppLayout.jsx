import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useSession } from "../../context/SessionContext";
import { useNotifications } from "../../hooks/useNotifications";
import NotificationBell from "./NotificationBell";
import {
  LayoutDashboard, Activity, BarChart2, MessageCircle,
  LogOut, Moon, Sun, Menu, Brain, Settings, Clock
} from "lucide-react";

const NAV = [
  { to: "/dashboard",  icon: LayoutDashboard, label: "Dashboard"  },
  { to: "/monitoring", icon: Activity,        label: "Monitoring"  },
  { to: "/reports",    icon: BarChart2,        label: "Reports"     },
  { to: "/history",    icon: Clock,            label: "History"     },
  { to: "/chatbot",    icon: MessageCircle,    label: "Chatbot"     },
  { to: "/settings",   icon: Settings,         label: "Settings"    },
];

const SC = { Normal: "#10b981", Stressed: "#f59e0b", Fatigued: "#ef4444", Unknown: "#6b7280" };

export default function AppLayout() {
  const { logout, user } = useAuth();
  const { dark, toggle } = useTheme();
  const { active, state, fatigueScore } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  useNotifications(fatigueScore, state);

  return (
    <div className={`flex h-screen overflow-hidden ${dark ? "dark bg-gray-950" : "bg-gray-50"}`}>
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col w-64 transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} border-r`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-inherit">
          <div className="p-2 rounded-xl bg-indigo-600"><Brain size={20} className="text-white" /></div>
          <div>
            <h1 className="font-bold text-lg leading-none text-indigo-600">Mentora</h1>
            <p className="text-xs text-gray-400 mt-0.5">Well-Being Tracker</p>
          </div>
        </div>

        {active && (
          <div className="mx-4 mt-4 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700">
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Session Active</span>
            </div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-gray-500">Fatigue</span>
              <span className="text-xs font-bold" style={{ color: SC[state] || "#6b7280" }}>{fatigueScore}/100 · {state}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${fatigueScore}%`, background: SC[state] }} />
            </div>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-indigo-600 text-white shadow-sm" : dark ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-100"}`}>
              <Icon size={17} />{label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-inherit space-y-0.5">
          <button onClick={toggle} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${dark ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-100"}`}>
            {dark ? <Sun size={17} /> : <Moon size={17} />}{dark ? "Light Mode" : "Dark Mode"}
          </button>
          <button onClick={() => { logout(); navigate("/login"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <LogOut size={17} />Sign Out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className={`flex items-center justify-between px-4 md:px-6 py-4 border-b ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
          <button onClick={() => setOpen(true)} className="md:hidden p-1 rounded text-gray-500 hover:text-gray-700"><Menu size={22} /></button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <span className={`hidden sm:block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>
                {user?.email?.split("@")[0] || "User"}
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto"><Outlet /></main>
      </div>
    </div>
  );
}
