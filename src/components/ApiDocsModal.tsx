import React, { useState } from "react";
import { Copy, Check, ExternalLink, Code } from "lucide-react";

export const ApiDocsModal: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const endpoints = [
    {
      method: "GET",
      path: "/health",
      desc: "Liveness & model initialization check for orchestrators",
      curl: "curl -X GET http://localhost:3000/health",
      response: `{\n  "status": "healthy",\n  "model_loaded": true,\n  "timestamp": "2026-09-17T12:00:00Z"\n}`
    },
    {
      method: "GET",
      path: "/info",
      desc: "Model algorithm, cluster count, training features, and unsupervised quality metrics",
      curl: "curl -X GET http://localhost:3000/info",
      response: `{\n  "algorithm": "KMeans",\n  "n_clusters": 5,\n  "dataset_rows": 5000,\n  "metrics": {\n    "silhouette_score": 0.40,\n    "davies_bouldin_score": 1.01,\n    "calinski_harabasz_score": 3263,\n    "stability_mean_ari": 1.00\n  }\n}`
    },
    {
      method: "GET",
      path: "/segments",
      desc: "List all discovered behavioral segments with audience population sizes",
      curl: "curl -X GET http://localhost:3000/segments",
      response: `{\n  "total_users": 5000,\n  "n_clusters": 5,\n  "segments": [\n    {\n      "cluster_id": 0,\n      "segment_name": "Highly Engaged Action Viewers",\n      "user_count": 1246,\n      "percentage": 24.92\n    }\n  ]\n}`
    },
    {
      method: "POST",
      path: "/predict",
      desc: "Classify a viewer into an audience segment without retraining",
      curl: `curl -X POST http://localhost:3000/predict \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "watch_time": 2450,\n    "session_duration": 58,\n    "visit_frequency": 22,\n    "completion_rate": 0.91,\n    "action_preference": 0.82\n  }'`,
      response: `{\n  "cluster_id": 0,\n  "segment_name": "Highly Engaged Action Viewers",\n  "confidence": null,\n  "similarity_indicator": {\n    "normalized_similarity": 0.3969,\n    "distance": 2.772,\n    "disclaimer": "K-Means is an unsupervised geometric clustering algorithm."\n  },\n  "dominant_characteristics": [\n    "High Action Preference",\n    "High Visit Frequency"\n  ]\n}`
    },
    {
      method: "POST",
      path: "/predict/batch",
      desc: "Batch classification of multiple viewer records",
      curl: `curl -X POST http://localhost:3000/predict/batch \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "viewers": [\n      {"user_reference": "U01", "watch_time": 2500, "session_duration": 60, "visit_frequency": 22, "completion_rate": 0.90},\n      {"user_reference": "U02", "watch_time": 400, "session_duration": 18, "visit_frequency": 5, "completion_rate": 0.40}\n    ]\n  }'`,
      response: `{\n  "count": 2,\n  "results": [\n    {\n      "user_reference": "U01",\n      "cluster_id": 0,\n      "segment_name": "Highly Engaged Action Viewers"\n    },\n    {\n      "user_reference": "U02",\n      "cluster_id": 2,\n      "segment_name": "Short-Session Casual Comedy Viewers"\n    }\n  ]\n}`
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-100 text-base">Production REST API Specification</h3>
          <p className="text-xs text-slate-400">
            OpenAPI compliant endpoints with standard status codes, Pydantic validation, and CORS headers.
          </p>
        </div>
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-md shadow-indigo-600/20"
        >
          <ExternalLink className="w-4 h-4" />
          Open Interactive Swagger UI
        </a>
      </div>

      {/* Endpoints List */}
      <div className="space-y-4">
        {endpoints.map((ep, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  ep.method === "GET"
                    ? "bg-sky-950 text-sky-400 border border-sky-800/80"
                    : "bg-emerald-950 text-emerald-400 border border-emerald-800/80"
                }`}>
                  {ep.method}
                </span>
                <span className="font-mono text-sm font-semibold text-slate-200">{ep.path}</span>
              </div>
              <span className="text-xs text-slate-400">{ep.desc}</span>
            </div>

            {/* Curl Command */}
            <div className="relative group">
              <pre className="p-3 bg-slate-950 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800/80">
                {ep.curl}
              </pre>
              <button
                onClick={() => copyToClipboard(ep.curl, idx)}
                className="absolute top-2.5 right-2.5 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
              >
                {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{copiedIndex === idx ? "Copied" : "Copy"}</span>
              </button>
            </div>

            {/* Sample Response */}
            <details className="text-xs text-slate-400 group">
              <summary className="cursor-pointer font-medium hover:text-slate-200 transition-colors list-none flex items-center gap-1">
                <Code className="w-3.5 h-3.5 text-indigo-400" />
                <span>View Sample Response</span>
              </summary>
              <pre className="mt-2 p-3 bg-slate-950 rounded-lg font-mono text-[11px] text-slate-300 border border-slate-800/80 overflow-x-auto">
                {ep.response}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
};
