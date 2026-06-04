import React from "react";
import { Brain } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-950 z-50">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
        <div className="relative p-4 rounded-full bg-indigo-600">
          <Brain size={32} className="text-white" />
        </div>
      </div>
      <p className="mt-4 text-indigo-400 font-medium text-sm tracking-widest uppercase animate-pulse">
        Loading Mentora…
      </p>
    </div>
  );
}
