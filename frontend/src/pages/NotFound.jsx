import React from "react";
import { Link } from "react-router-dom";
import { Brain, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="p-3 rounded-2xl bg-indigo-600/20 mb-6">
        <Brain size={36} className="text-indigo-400" />
      </div>

      <p className="text-7xl font-black text-indigo-600 mb-2 tracking-tight">404</p>
      <h1 className="text-xl font-bold text-white mb-2">Page not found</h1>
      <p className="text-gray-400 text-sm mb-8 max-w-xs leading-relaxed">
        Looks like this page went for a nap and didn't come back. Let's get you somewhere useful.
      </p>

      <Link to="/dashboard"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">
        <Home size={16} />
        Back to Dashboard
      </Link>
    </div>
  );
}
