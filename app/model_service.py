"""
Model Service Singleton for Model Loading, Inference, and Profile Lookups.
Loads trained Joblib pipeline once at startup.
"""

import os
import json
import joblib
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger("ott_service.model_service")

class ModelService:
    def __init__(self):
        self.pipeline = None
        self.preprocessor = None
        self.kmeans = None
        self.pca = None
        self.metadata = {}
        self.profiles = {}
        self.pca_data = {}
        self.is_loaded = False
        self._load_artifacts()

    def _load_artifacts(self):
        try:
            if not os.path.exists(settings.model_path):
                logger.warning(f"Model file not found at {settings.model_path}. Please run training first.")
                return

            logger.info(f"Loading pipeline from {settings.model_path}...")
            artifact = joblib.load(settings.model_path)
            self.preprocessor = artifact["preprocessor"]
            self.kmeans = artifact["kmeans"]
            self.pca = artifact.get("pca")

            if os.path.exists(settings.metadata_path):
                with open(settings.metadata_path, "r") as f:
                    self.metadata = json.load(f)

            if os.path.exists(settings.profiles_path):
                with open(settings.profiles_path, "r") as f:
                    self.profiles = json.load(f)

            if os.path.exists(settings.pca_path):
                with open(settings.pca_path, "r") as f:
                    self.pca_data = json.load(f)

            self.is_loaded = True
            logger.info(f"Model service successfully initialized. Clusters: {self.kmeans.n_clusters}")
        except Exception as e:
            logger.error(f"Failed to load model artifacts: {str(e)}", exc_info=True)
            self.is_loaded = False

    def _prepare_dataframe(self, records: List[Dict[str, Any]]) -> pd.DataFrame:
        pop_means = self.profiles.get("population_means", {})
        defaults = {
            "watch_time": pop_means.get("watch_time", 1500.0),
            "session_duration": pop_means.get("session_duration", 45.0),
            "visit_frequency": pop_means.get("visit_frequency", 12.0),
            "completion_rate": pop_means.get("completion_rate", 0.70),
            "number_of_sessions": pop_means.get("number_of_sessions", 25.0),
            "action_preference": pop_means.get("action_preference", 0.25),
            "family_preference": pop_means.get("family_preference", 0.25),
            "comedy_preference": pop_means.get("comedy_preference", 0.25),
            "drama_preference": pop_means.get("drama_preference", 0.25),
            "weekend_watch_ratio": pop_means.get("weekend_watch_ratio", 0.45),
            "skip_intro_rate": pop_means.get("skip_intro_rate", 0.60),
            "primary_device": "SmartTV",
            "subscription_tier": "Standard"
        }
        sanitized = []
        for r in records:
            row = dict(defaults)
            row.update({k: v for k, v in r.items() if v is not None})
            sanitized.append(row)
        return pd.DataFrame(sanitized)

    def predict(self, viewer_data: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_loaded:
            raise RuntimeError("Model pipeline is not loaded. Please ensure training artifacts exist.")

        # Convert dictionary to single-row DataFrame with standard defaults for any omitted optional feature
        df_input = self._prepare_dataframe([viewer_data])
        # Pass through the exact same preprocessing pipeline fitted during training
        X_trans = self.preprocessor.transform(df_input)

        # K-Means assignment
        cluster_id = int(self.kmeans.predict(X_trans)[0])

        # Calculate Euclidean distance to cluster centroid
        centroid = self.kmeans.cluster_centers_[cluster_id]
        dist = float(np.linalg.norm(X_trans[0] - centroid))

        # Normalized similarity indicator: 1 / (1 + distance)
        similarity = float(np.exp(-dist / 3.0))

        # Retrieve profile information
        segment_info = self.get_segment_by_id(cluster_id)
        segment_name = segment_info["segment_name"] if segment_info else f"Audience Segment {cluster_id + 1}"
        dominant_traits = segment_info["dominant_characteristics"] if segment_info else []

        return {
            "cluster_id": cluster_id,
            "segment_name": segment_name,
            "confidence": None, # Kept null per requirement to prevent misleading probability calibration
            "similarity_indicator": {
                "type": "distance_to_centroid",
                "normalized_similarity": round(similarity, 4),
                "distance": round(dist, 4),
                "disclaimer": "K-Means is an unsupervised geometric clustering algorithm. This score measures inverse Euclidean proximity to the cluster centroid, not a calibrated probability."
            },
            "dominant_characteristics": dominant_traits
        }

    def predict_batch(self, viewers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not self.is_loaded:
            raise RuntimeError("Model pipeline is not loaded.")

        df_input = self._prepare_dataframe(viewers)
        user_refs = [v.get("user_reference", f"U{i+1:03d}") for i, v in enumerate(viewers)]

        X_trans = self.preprocessor.transform(df_input)
        cluster_ids = self.kmeans.predict(X_trans)

        results = []
        for i, c_id in enumerate(cluster_ids):
            c_int = int(c_id)
            seg_info = self.get_segment_by_id(c_int)
            results.append({
                "user_reference": user_refs[i],
                "cluster_id": c_int,
                "segment_name": seg_info["segment_name"] if seg_info else f"Audience Segment {c_int + 1}",
                "dominant_characteristics": seg_info.get("dominant_characteristics", []) if seg_info else []
            })
        return results

    def get_segments(self) -> List[Dict[str, Any]]:
        if not self.profiles or "segments" not in self.profiles:
            return []
        return [
            {
                "cluster_id": s["cluster_id"],
                "segment_name": s["segment_name"],
                "user_count": s["user_count"],
                "percentage": s["percentage"]
            }
            for s in self.profiles["segments"]
        ]

    def get_segment_by_id(self, cluster_id: int) -> Optional[Dict[str, Any]]:
        if not self.profiles or "segments" not in self.profiles:
            return None
        for s in self.profiles["segments"]:
            if s["cluster_id"] == cluster_id:
                return {
                    "cluster_id": s["cluster_id"],
                    "segment_name": s["segment_name"],
                    "user_count": s["user_count"],
                    "percentage": s["percentage"],
                    "behavioral_profile": s.get("behavioral_summary", {}),
                    "average_feature_values": s.get("average_metrics", {}),
                    "categorical_distribution": s.get("categorical_distribution", {}),
                    "dominant_characteristics": s.get("dominant_characteristics", [])
                }
        return None

    def get_info(self) -> Dict[str, Any]:
        return {
            "algorithm": self.metadata.get("algorithm", "KMeans"),
            "n_clusters": self.metadata.get("n_clusters", 0),
            "dataset_rows": self.metadata.get("dataset_rows", 0),
            "features": self.metadata.get("features", {}),
            "training_timestamp": self.metadata.get("training_timestamp", ""),
            "model_version": self.metadata.get("model_version", "1.0.0"),
            "metrics": self.metadata.get("metrics", {})
        }

    def get_pca(self) -> Dict[str, Any]:
        return self.pca_data


# Global model service instance
model_service = ModelService()
