import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { MetricsOverview } from "./components/MetricsOverview";
import { SegmentsList } from "./components/SegmentsList";
import { ClusterScatterPlot } from "./components/ClusterScatterPlot";
import { SegmentDetailModal } from "./components/SegmentDetailModal";
import { LiveInferenceForm } from "./components/LiveInferenceForm";
import { BatchPredictModal } from "./components/BatchPredictModal";
import { EvaluationDashboard } from "./components/EvaluationDashboard";
import { ApiDocsModal } from "./components/ApiDocsModal";

import {
  SegmentSummary,
  SegmentDetail,
  ModelMetadata,
  PCAData,
  EvaluationResults,
  PredictionResult
} from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"overview" | "inference" | "evaluation" | "api">("overview");
  const [isOnline, setIsOnline] = useState(false);
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const [segments, setSegments] = useState<SegmentSummary[]>([]);
  const [segmentDetails, setSegmentDetails] = useState<Record<number, SegmentDetail>>({});
  const [selectedClusterId, setSelectedClusterId] = useState<number | null>(null);
  const [modalSegment, setModalSegment] = useState<SegmentDetail | null>(null);
  const [pcaData, setPcaData] = useState<PCAData | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResults | null>(null);
  const [isBatchOpen, setIsBatchOpen] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    try {
      // 1. Health check
      const healthRes = await fetch("/health");
      if (healthRes.ok) {
        setIsOnline(true);
      }

      // 2. Info & metadata
      const infoRes = await fetch("/info");
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        setMetadata(infoData);
      }

      // 3. Segments list
      const segRes = await fetch("/segments");
      if (segRes.ok) {
        const segData = await segRes.json();
        setSegments(segData.segments || []);

        // Fetch detail for each segment in parallel
        const detailsMap: Record<number, SegmentDetail> = {};
        await Promise.all(
          (segData.segments || []).map(async (s: SegmentSummary) => {
            try {
              const dRes = await fetch(`/segments/${s.cluster_id}`);
              if (dRes.ok) {
                detailsMap[s.cluster_id] = await dRes.json();
              }
            } catch (e) {
              console.error(e);
            }
          })
        );
        setSegmentDetails(detailsMap);
      }

      // 4. PCA projection data
      const pcaRes = await fetch("/pca");
      if (pcaRes.ok) {
        const pData = await pcaRes.json();
        setPcaData(pData);
      }

      // 5. Evaluation results
      const evalRes = await fetch("/api/evaluation/results");
      if (evalRes.ok) {
        const eData = await evalRes.json();
        setEvaluation(eData);
      }
    } catch (err) {
      console.warn("Failed fetching backend data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectCluster = (clusterId: number) => {
    setSelectedClusterId(clusterId);
    if (segmentDetails[clusterId]) {
      setModalSegment(segmentDetails[clusterId]);
    }
  };

  const handlePredict = async (payload: any): Promise<PredictionResult | null> => {
    try {
      const resp = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const res: PredictionResult = await resp.json();
        return res;
      } else {
        const err = await resp.json();
        alert("Inference Error: " + (err.detail || err.message || "Failed to classify viewer"));
        return null;
      }
    } catch (e: any) {
      alert("Network Error: " + e.message);
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOnline={isOnline}
        onOpenBatch={() => setIsBatchOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <MetricsOverview
              metadata={metadata}
              totalUsers={segments.reduce((acc, s) => acc + s.user_count, 0)}
              nClusters={segments.length}
            />

            {/* 2D PCA Space Scatter Plot */}
            <ClusterScatterPlot
              pcaData={pcaData}
              selectedClusterId={selectedClusterId}
              onSelectCluster={handleSelectCluster}
            />

            {/* Segments Grid */}
            <SegmentsList
              segments={segments}
              selectedClusterId={selectedClusterId}
              onSelectCluster={handleSelectCluster}
              segmentDetails={segmentDetails}
            />
          </div>
        )}

        {/* Inference Tab */}
        {activeTab === "inference" && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Live Behavioral Inference</h2>
              <p className="text-xs text-slate-400 mt-1">
                Classify individual viewers into discovered segments using trained preprocessing and K-Means clustering.
              </p>
            </div>
            <LiveInferenceForm onPredict={handlePredict} />
          </div>
        )}

        {/* Evaluation Tab */}
        {activeTab === "evaluation" && (
          <div className="space-y-6">
            <EvaluationDashboard
              evaluation={evaluation}
              onRefresh={fetchData}
            />
          </div>
        )}

        {/* API Docs Tab */}
        {activeTab === "api" && (
          <div className="space-y-6">
            <ApiDocsModal />
          </div>
        )}
      </main>

      {/* Segment Detail Modal / Drawer */}
      <SegmentDetailModal
        segment={modalSegment}
        onClose={() => setModalSegment(null)}
      />

      {/* Batch Inference Modal */}
      <BatchPredictModal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>OTT Audience Intelligence &amp; Behavioral Segmentation Service &bull; K-Means Unsupervised ML</span>
          <span>FastAPI &bull; Scikit-Learn &bull; Docker Compose &bull; React &bull; Tailwind CSS</span>
        </div>
      </footer>
    </div>
  );
}
