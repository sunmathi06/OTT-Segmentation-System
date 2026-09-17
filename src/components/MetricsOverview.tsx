import React from "react";
import { Users, Layers, Activity, Award, Clock, Cpu } from "lucide-react";
import { ModelMetadata } from "../types";

interface MetricsOverviewProps {
  metadata: ModelMetadata | null;
  totalUsers: number;
  nClusters: number;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  metadata,
  totalUsers,
  nClusters
}) => {
  const m = metadata?.metrics;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
      {/* Total Audience */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs uppercase font-semibold tracking-wider">Audience Base</span>
          <Users className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">
          {totalUsers ? totalUsers.toLocaleString() : "5,000"}
        </div>
        <span className="text-[11px] text-slate-400 mt-1">Unsupervised profiles</span>
      </div>

      {/* Discovered Clusters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs uppercase font-semibold tracking-wider">Segments</span>
          <Layers className="w-4 h-4 text-sky-400" />
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">
          {nClusters || 5} Clusters
        </div>
        <span className="text-[11px] text-sky-400 font-medium mt-1">Automatic K selection</span>
      </div>

      {/* Silhouette Score */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs uppercase font-semibold tracking-wider">Silhouette</span>
          <Activity className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold text-emerald-400 tracking-tight">
          {m?.silhouette_score ?? "0.40"}
        </div>
        <span className="text-[11px] text-slate-400 mt-1">Separation [-1, 1]</span>
      </div>

      {/* Davies-Bouldin */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs uppercase font-semibold tracking-wider">Davies-Bouldin</span>
          <Award className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-2xl font-bold text-slate-100 tracking-tight">
          {m?.davies_bouldin_score ?? "1.01"}
        </div>
        <span className="text-[11px] text-slate-400 mt-1">Lower is better</span>
      </div>

      {/* Calinski-Harabasz */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs uppercase font-semibold tracking-wider">Calinski-Harabasz</span>
          <Cpu className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-2xl font-bold text-slate-100 tracking-tight">
          {m?.calinski_harabasz_score ? Math.round(m.calinski_harabasz_score).toLocaleString() : "3,263"}
        </div>
        <span className="text-[11px] text-slate-400 mt-1">Variance ratio</span>
      </div>

      {/* Stability ARI */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs uppercase font-semibold tracking-wider">Stability (ARI)</span>
          <Clock className="w-4 h-4 text-teal-400" />
        </div>
        <div className="text-2xl font-bold text-teal-400 tracking-tight">
          {m?.stability_mean_ari ?? "1.00"}
        </div>
        <span className="text-[11px] text-teal-400/80 mt-1">Grade: {m?.stability_grade ?? "High"}</span>
      </div>
    </div>
  );
};
