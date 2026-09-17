export interface SegmentSummary {
  cluster_id: number;
  segment_name: string;
  user_count: number;
  percentage: number;
}

export interface SegmentDetail {
  cluster_id: number;
  segment_name: string;
  user_count: number;
  percentage: number;
  average_feature_values: Record<string, number>;
  categorical_distributions: Record<string, Record<string, number>>;
  dominant_characteristics: string[];
}

export interface ModelMetadata {
  algorithm: string;
  n_clusters: number;
  dataset_rows: number;
  training_timestamp: string;
  version: string;
  features: {
    numerical: string[];
    categorical: string[];
    engineered: string[];
  };
  metrics: {
    silhouette_score: number;
    davies_bouldin_score: number;
    calinski_harabasz_score: number;
    inertia: number;
    stability_mean_ari: number;
    stability_grade: string;
  };
}

export interface PredictionResult {
  cluster_id: number;
  segment_name: string;
  confidence: null;
  similarity_indicator: {
    type: string;
    normalized_similarity: number;
    distance: number;
    disclaimer: string;
  };
  dominant_characteristics: string[];
}

export interface PCAPoint {
  x: number;
  y: number;
  cluster_id: number;
  user_id: string;
  segment_name: string;
}

export interface PCACentroid {
  x: number;
  y: number;
  cluster_id: number;
  segment_name: string;
}

export interface PCAData {
  points: PCAPoint[];
  centroids: PCACentroid[];
  variance_explained: [number, number];
}

export interface EvaluationResults {
  timestamp: string;
  model: {
    algorithm: string;
    n_clusters: number;
    total_samples_evaluated: number;
    silhouette_score: number;
    davies_bouldin_score: number;
    calinski_harabasz_score: number;
    inertia: number;
    cluster_distribution: Record<string, { count: number; percentage: number }>;
    stability: {
      mean_adjusted_rand_index: number;
      stability_grade: string;
      is_stable: boolean;
    };
  };
  system: {
    health_check: boolean;
    model_loaded: boolean;
    endpoints_verified: Record<string, boolean>;
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    error_rate_pct: number;
    throughput_req_per_sec: number;
    latency_ms: {
      average: number;
      median: number;
      p95: number;
      min: number;
      max: number;
    };
  };
}
