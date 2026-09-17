import React from "react";
import { Activity, Server, FileText, BarChart2, ShieldCheck, Play } from "lucide-react";

interface HeaderProps {
  activeTab: "overview" | "inference" | "evaluation" | "api";
  setActiveTab: (tab: "overview" | "inference" | "evaluation" | "api") => void;
  isOnline: boolean;
  onOpenBatch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isOnline,
  onOpenBatch
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
              <Activity className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-base tracking-tight">OTT Audience Intelligence</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  ML Service
                </span>
              </div>
              <p className="text-xs text-slate-400">Unsupervised Behavioral Clustering</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === "overview"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Audience Segments
            </button>
            <button
              onClick={() => setActiveTab("inference")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === "inference"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              Live Prediction
            </button>
            <button
              onClick={() => setActiveTab("evaluation")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === "evaluation"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Independent Evaluation
            </button>
            <button
              onClick={() => setActiveTab("api")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === "api"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              API Specs
            </button>
          </nav>

          {/* Right Actions & Health Status */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenBatch}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Batch Inference
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                }`}
              />
              <span className="text-xs text-slate-300 font-mono">
                {isOnline ? "API Online" : "Connecting..."}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
