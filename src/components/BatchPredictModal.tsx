import React, { useState } from "react";
import { X, Play, Download, CheckCircle2 } from "lucide-react";

interface BatchPredictModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_BATCH = [
  {
    user_reference: "USER_ACT_01",
    watch_time: 2500.0,
    session_duration: 60.0,
    visit_frequency: 22,
    completion_rate: 0.92,
    action_preference: 0.85,
    family_preference: 0.05,
    primary_device: "SmartTV"
  },
  {
    user_reference: "USER_FAM_02",
    watch_time: 900.0,
    session_duration: 45.0,
    visit_frequency: 8,
    completion_rate: 0.65,
    action_preference: 0.05,
    family_preference: 0.75,
    primary_device: "SmartTV"
  },
  {
    user_reference: "USER_CAS_03",
    watch_time: 400.0,
    session_duration: 18.0,
    visit_frequency: 5,
    completion_rate: 0.40,
    comedy_preference: 0.60,
    primary_device: "Mobile"
  },
  {
    user_reference: "USER_CMP_04",
    watch_time: 2900.0,
    session_duration: 72.0,
    visit_frequency: 25,
    completion_rate: 0.95,
    drama_preference: 0.65,
    primary_device: "SmartTV"
  }
];

export const BatchPredictModal: React.FC<BatchPredictModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [inputJson, setInputJson] = useState(JSON.stringify(DEFAULT_BATCH, null, 2));
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunBatch = async () => {
    setLoading(true);
    setError(null);
    try {
      const parsed = JSON.parse(inputJson);
      const resp = await fetch("/predict/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewers: parsed })
      });
      if (!resp.ok) {
        throw new Error(`Batch request failed with HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setResults(data.results);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadResults = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ott_batch_segmentation_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div>
            <h3 className="font-bold text-slate-100 text-base">Batch Audience Segmentation</h3>
            <p className="text-xs text-slate-400">Classify multiple viewer records simultaneously via POST /predict/batch</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Viewer Records JSON Payload (Array of Viewers)
            </label>
            <textarea
              rows={8}
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              className="w-full font-mono text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleRunBatch}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {loading ? "Processing Batch..." : "Run Batch Classification"}
            </button>

            {results && (
              <button
                onClick={handleDownloadResults}
                className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </button>
            )}
          </div>

          {/* Results Table */}
          {results && (
            <div className="mt-4 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">User Reference</th>
                    <th className="p-2.5">Cluster ID</th>
                    <th className="p-2.5">Assigned Segment</th>
                    <th className="p-2.5">Proximity Indicator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {results.map((res, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-mono text-slate-300 font-semibold">{res.user_reference}</td>
                      <td className="p-2.5 font-mono text-indigo-400">Cluster {res.cluster_id}</td>
                      <td className="p-2.5 text-slate-100 font-medium">{res.segment_name}</td>
                      <td className="p-2.5 text-emerald-400 font-mono">
                        {(res.similarity_indicator?.normalized_similarity * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
