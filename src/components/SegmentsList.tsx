import React, { useState } from "react";
import { SegmentSummary, SegmentDetail } from "../types";
import { ChevronRight, Tv, Smartphone, Globe, Sparkles, TrendingUp } from "lucide-react";

interface SegmentsListProps {
  segments: SegmentSummary[];
  selectedClusterId: number | null;
  onSelectCluster: (clusterId: number) => void;
  segmentDetails: Record<number, SegmentDetail>;
}

export const SegmentsList: React.FC<SegmentsListProps> = ({
  segments,
  selectedClusterId,
  onSelectCluster,
  segmentDetails
}) => {
  const getBadgeColor = (id: number) => {
    const colors = [
      "border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
      "border-amber-500/40 bg-amber-500/10 text-amber-300",
      "border-rose-500/40 bg-rose-500/10 text-rose-300",
      "border-purple-500/40 bg-purple-500/10 text-purple-300",
    ];
    return colors[id % colors.length];
  };

  const getAccentGlow = (id: number) => {
    const glow = [
      "hover:border-indigo-500/60",
      "hover:border-emerald-500/60",
      "hover:border-amber-500/60",
      "hover:border-rose-500/60",
      "hover:border-purple-500/60",
    ];
    return glow[id % glow.length];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Discovered Behavioral Segments</h3>
          <p className="text-xs text-slate-400">Click any segment to view full behavioral averages and personalization actions</p>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {segments.length} Clusters Partitioned
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {segments.map((seg) => {
          const detail = segmentDetails[seg.cluster_id];
          const isSelected = selectedClusterId === seg.cluster_id;
          const avg = detail?.average_feature_values;

          return (
            <div
              key={seg.cluster_id}
              onClick={() => onSelectCluster(seg.cluster_id)}
              className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border text-left relative overflow-hidden ${
                isSelected
                  ? "bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/50"
                  : `bg-slate-900/90 border-slate-800 ${getAccentGlow(seg.cluster_id)} hover:bg-slate-800/50`
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div>
                  <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border mb-1.5 ${getBadgeColor(seg.cluster_id)}`}>
                    Cluster {seg.cluster_id} &bull; {seg.percentage}%
                  </span>
                  <h4 className="font-semibold text-slate-100 text-sm leading-snug">
                    {seg.segment_name}
                  </h4>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isSelected ? "text-indigo-400 translate-x-0.5" : ""}`} />
              </div>

              {/* Viewer Population Count */}
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                <span>{seg.user_count.toLocaleString()} Viewers</span>
              </div>

              {/* Key Quantitative Metrics */}
              {avg && (
                <div className="grid grid-cols-3 gap-2 py-2 px-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 mb-3 text-center">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Avg Watch</span>
                    <span className="text-xs font-semibold text-slate-200">
                      {Math.round(avg.watch_time || 0)}m
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Session</span>
                    <span className="text-xs font-semibold text-slate-200">
                      {Math.round(avg.session_duration || 0)}m
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Completion</span>
                    <span className="text-xs font-semibold text-emerald-400">
                      {Math.round((avg.completion_rate || 0) * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Dominant Traits Badges */}
              <div className="flex flex-wrap gap-1.5">
                {(detail?.dominant_characteristics || []).slice(0, 3).map((trait, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
