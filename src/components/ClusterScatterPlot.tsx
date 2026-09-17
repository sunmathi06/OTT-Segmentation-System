import React, { useState, useMemo } from "react";
import { PCAData, PCAPoint } from "../types";
import { Layers, Info } from "lucide-react";

interface ClusterScatterPlotProps {
  pcaData: PCAData | null;
  selectedClusterId: number | null;
  onSelectCluster: (clusterId: number) => void;
}

const CLUSTER_COLORS = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#f43f5e", // Rose
  "#8b5cf6", // Purple
];

export const ClusterScatterPlot: React.FC<ClusterScatterPlotProps> = ({
  pcaData,
  selectedClusterId,
  onSelectCluster
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<PCAPoint | null>(null);

  // Compute bounding box for projection
  const bounds = useMemo(() => {
    if (!pcaData || pcaData.points.length === 0) {
      return { minX: -6, maxX: 6, minY: -6, maxY: 6 };
    }
    const xs = pcaData.points.map(p => p.x);
    const ys = pcaData.points.map(p => p.y);
    return {
      minX: Math.min(...xs) - 0.5,
      maxX: Math.max(...xs) + 0.5,
      minY: Math.min(...ys) - 0.5,
      maxY: Math.max(...ys) + 0.5,
    };
  }, [pcaData]);

  if (!pcaData) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
        Loading PCA behavioral projection...
      </div>
    );
  }

  // SVG dimensions
  const width = 600;
  const height = 360;
  const padding = 35;

  const scaleX = (val: number) => {
    const range = bounds.maxX - bounds.minX || 1;
    return padding + ((val - bounds.minX) / range) * (width - padding * 2);
  };

  const scaleY = (val: number) => {
    const range = bounds.maxY - bounds.minY || 1;
    return height - padding - ((val - bounds.minY) / range) * (height - padding * 2);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            2D PCA Behavioral Space &amp; Cluster Separation
          </h3>
          <p className="text-xs text-slate-400">
            Unsupervised projection of viewer behavioral features (PC1: {(pcaData.variance_explained[0] * 100).toFixed(1)}%, PC2: {(pcaData.variance_explained[1] * 100).toFixed(1)}% variance)
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {pcaData.centroids.map(c => (
            <button
              key={c.cluster_id}
              onClick={() => onSelectCluster(c.cluster_id)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-opacity ${
                selectedClusterId === null || selectedClusterId === c.cluster_id
                  ? "opacity-100 font-semibold"
                  : "opacity-40"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: CLUSTER_COLORS[c.cluster_id % CLUSTER_COLORS.length] }}
              />
              <span className="text-slate-300">C{c.cluster_id}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full overflow-hidden bg-slate-950/70 border border-slate-800/80 rounded-lg">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
        >
          {/* Grid lines */}
          <line
            x1={padding}
            y1={scaleY(0)}
            x2={width - padding}
            y2={scaleY(0)}
            stroke="#1e293b"
            strokeDasharray="4 4"
          />
          <line
            x1={scaleX(0)}
            y1={padding}
            x2={scaleX(0)}
            y2={height - padding}
            stroke="#1e293b"
            strokeDasharray="4 4"
          />

          {/* Sample viewer points */}
          {pcaData.points.map((pt, i) => {
            const isFaded = selectedClusterId !== null && selectedClusterId !== pt.cluster_id;
            const isHovered = hoveredPoint?.user_id === pt.user_id;
            const color = CLUSTER_COLORS[pt.cluster_id % CLUSTER_COLORS.length];

            return (
              <circle
                key={i}
                cx={scaleX(pt.x)}
                cy={scaleY(pt.y)}
                r={isHovered ? 5 : 2.5}
                fill={color}
                opacity={isFaded ? 0.15 : (isHovered ? 1 : 0.65)}
                className="transition-all cursor-pointer"
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
                onClick={() => onSelectCluster(pt.cluster_id)}
              />
            );
          })}

          {/* Centroids */}
          {pcaData.centroids.map((c) => {
            const cx = scaleX(c.x);
            const cy = scaleY(c.y);
            const color = CLUSTER_COLORS[c.cluster_id % CLUSTER_COLORS.length];
            const isSelected = selectedClusterId === c.cluster_id;

            return (
              <g
                key={c.cluster_id}
                className="cursor-pointer"
                onClick={() => onSelectCluster(c.cluster_id)}
              >
                {/* Glow ring */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 16 : 12}
                  fill={color}
                  fillOpacity={0.25}
                  stroke={color}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  className="animate-pulse"
                />
                {/* Centroid core */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill="#ffffff"
                  stroke={color}
                  strokeWidth={2}
                />
                {/* Centroid label */}
                <text
                  x={cx}
                  y={cy - 16}
                  fill="#f1f5f9"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                  className="pointer-events-none drop-shadow"
                >
                  C{c.cluster_id}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900/95 border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded-md shadow-xl backdrop-blur-sm"
            style={{
              left: `${Math.min(scaleX(hoveredPoint.x) + 10, width - 180)}px`,
              top: `${Math.max(scaleY(hoveredPoint.y) - 40, 10)}px`,
            }}
          >
            <div className="font-semibold text-indigo-300">{hoveredPoint.segment_name}</div>
            <div className="text-slate-400 text-[11px]">
              Viewer: {hoveredPoint.user_id} &bull; Cluster {hoveredPoint.cluster_id}
            </div>
            <div className="text-slate-500 text-[10px] font-mono">
              PC1: {hoveredPoint.x.toFixed(2)}, PC2: {hoveredPoint.y.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
        <span>Principal Component 1 (Watch Duration &amp; Engagement)</span>
        <span>Principal Component 2 (Genre Affinity Dispersion)</span>
      </div>
    </div>
  );
};
