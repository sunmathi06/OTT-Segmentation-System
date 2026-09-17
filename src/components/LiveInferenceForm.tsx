import React, { useState } from "react";
import { PredictionResult } from "../types";
import { Play, Sparkles, AlertCircle, CheckCircle2, RotateCcw, Zap } from "lucide-react";

interface LiveInferenceFormProps {
  onPredict: (payload: any) => Promise<PredictionResult | null>;
}

const PRESETS = [
  {
    name: "Action Enthusiast",
    description: "High watch time, high action preference, frequent visits",
    data: {
      watch_time: 2450.0,
      session_duration: 58.0,
      visit_frequency: 22,
      completion_rate: 0.91,
      action_preference: 0.82,
      family_preference: 0.05,
      comedy_preference: 0.08,
      drama_preference: 0.05,
      skip_intro_rate: 0.88,
      weekend_watch_ratio: 0.45,
      primary_device: "SmartTV",
      subscription_tier: "Premium"
    }
  },
  {
    name: "Weekend Family Co-Viewer",
    description: "High family genre, weekend heavy, moderate sessions",
    data: {
      watch_time: 920.0,
      session_duration: 46.0,
      visit_frequency: 8,
      completion_rate: 0.68,
      action_preference: 0.06,
      family_preference: 0.76,
      comedy_preference: 0.12,
      drama_preference: 0.06,
      skip_intro_rate: 0.40,
      weekend_watch_ratio: 0.72,
      primary_device: "SmartTV",
      subscription_tier: "Standard"
    }
  },
  {
    name: "Short-Session Casual",
    description: "Short sessions, comedy heavy, mobile focused",
    data: {
      watch_time: 410.0,
      session_duration: 18.0,
      visit_frequency: 6,
      completion_rate: 0.42,
      action_preference: 0.18,
      family_preference: 0.08,
      comedy_preference: 0.58,
      drama_preference: 0.16,
      skip_intro_rate: 0.30,
      weekend_watch_ratio: 0.35,
      primary_device: "Mobile",
      subscription_tier: "Free"
    }
  },
  {
    name: "Frequent Multi-Genre",
    description: "Balanced genres across action, drama, comedy, high frequency",
    data: {
      watch_time: 1680.0,
      session_duration: 42.0,
      visit_frequency: 18,
      completion_rate: 0.75,
      action_preference: 0.28,
      family_preference: 0.22,
      comedy_preference: 0.25,
      drama_preference: 0.25,
      skip_intro_rate: 0.65,
      weekend_watch_ratio: 0.42,
      primary_device: "Web",
      subscription_tier: "Standard"
    }
  },
  {
    name: "Completion-Oriented Binger",
    description: "High completion, long session, high drama, high intro skip",
    data: {
      watch_time: 2950.0,
      session_duration: 75.0,
      visit_frequency: 24,
      completion_rate: 0.96,
      action_preference: 0.15,
      family_preference: 0.08,
      comedy_preference: 0.15,
      drama_preference: 0.62,
      skip_intro_rate: 0.94,
      weekend_watch_ratio: 0.50,
      primary_device: "SmartTV",
      subscription_tier: "Premium"
    }
  }
];

export const LiveInferenceForm: React.FC<LiveInferenceFormProps> = ({ onPredict }) => {
  const [formData, setFormData] = useState(PRESETS[0].data);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<string>("Action Enthusiast");

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.name);
    setFormData(preset.data);
    setResult(null);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setActivePreset(""); // customized
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await onPredict(formData);
      if (res) setResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Form Left Side */}
      <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5">
        {/* Preset Selector */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Load Behavioral Archetype Presets
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPreset(p)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  activePreset === p.name
                    ? "bg-indigo-600 border-indigo-500 text-white font-semibold shadow-sm"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Primary Numeric Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Watch Time (min)
              </label>
              <input
                type="number"
                min="0"
                value={formData.watch_time}
                onChange={(e) => handleChange("watch_time", parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Session (min)
              </label>
              <input
                type="number"
                min="1"
                max="720"
                value={formData.session_duration}
                onChange={(e) => handleChange("session_duration", parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Visit Freq (/mo)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.visit_frequency}
                onChange={(e) => handleChange("visit_frequency", parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Completion Rate
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={formData.completion_rate}
                onChange={(e) => handleChange("completion_rate", parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          {/* Genre Preferences Sliders */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
            <span className="text-xs font-semibold text-slate-300 block">
              Genre Affinity Distribution (0.0 - 1.0)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Action Affinity</span>
                  <span className="font-mono text-slate-200">{(formData.action_preference * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={formData.action_preference}
                  onChange={(e) => handleChange("action_preference", parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Family Affinity</span>
                  <span className="font-mono text-slate-200">{(formData.family_preference * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={formData.family_preference}
                  onChange={(e) => handleChange("family_preference", parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Comedy Affinity</span>
                  <span className="font-mono text-slate-200">{(formData.comedy_preference * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={formData.comedy_preference}
                  onChange={(e) => handleChange("comedy_preference", parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Drama Affinity</span>
                  <span className="font-mono text-slate-200">{(formData.drama_preference * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={formData.drama_preference}
                  onChange={(e) => handleChange("drama_preference", parseFloat(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Categoricals & Secondary Behavior */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Primary Device</label>
              <select
                value={formData.primary_device}
                onChange={(e) => handleChange("primary_device", e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="SmartTV">SmartTV</option>
                <option value="Mobile">Mobile</option>
                <option value="Web">Web</option>
                <option value="Tablet">Tablet</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Subscription Tier</label>
              <select
                value={formData.subscription_tier}
                onChange={(e) => handleChange("subscription_tier", e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Free">Free</option>
                <option value="Standard">Standard</option>
                <option value="Premium">Premium</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Skip Intro Rate</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={formData.skip_intro_rate}
                onChange={(e) => handleChange("skip_intro_rate", parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Weekend Ratio</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={formData.weekend_watch_ratio}
                onChange={(e) => handleChange("weekend_watch_ratio", parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            {loading ? "Running Unsupervised Segmentation..." : "Classify Viewer into Segment"}
          </button>
        </form>
      </div>

      {/* Result Card Right Side */}
      <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Audience Segmentation Result</h3>
            <span className="text-[11px] font-mono text-slate-500">K-Means Model</span>
          </div>

          {result ? (
            <div className="space-y-4 animate-fade-in">
              {/* Segment Title & Cluster Badge */}
              <div>
                <span className="inline-block text-xs font-mono font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/80 mb-2">
                  Assigned Cluster ID: {result.cluster_id}
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {result.segment_name}
                </h2>
              </div>

              {/* Centroid Proximity Metric */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Centroid Proximity:</span>
                  <span className="font-semibold text-emerald-400">
                    {(result.similarity_indicator.normalized_similarity * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Euclidean Distance:</span>
                  <span className="font-mono text-slate-300">
                    {result.similarity_indicator.distance}
                  </span>
                </div>
              </div>

              {/* Mathematical Disclaimer */}
              <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-800/40 text-[11px] text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {result.similarity_indicator.disclaimer}
                </span>
              </div>

              {/* Dominant Traits */}
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Dominant Cluster Traits
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {result.dominant_characteristics.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm">Select an archetype preset or adjust parameters, then click &ldquo;Classify Viewer&rdquo;.</p>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
          Inference executes in ~15ms using fitted preprocessing ColumnTransformer + K-Means model.
        </div>
      </div>
    </div>
  );
};
