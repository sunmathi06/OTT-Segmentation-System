"""
Pydantic Validation Schemas for REST API
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator

class ViewerBehaviorInput(BaseModel):
    watch_time: float = Field(..., ge=0.0, description="Total watch time in minutes", example=1250.0)
    session_duration: float = Field(..., gt=0.0, le=720.0, description="Average session duration in minutes", example=48.0)
    visit_frequency: int = Field(..., ge=0, le=100, description="Visit frequency per month/period", example=20)
    completion_rate: float = Field(..., ge=0.0, le=1.0, description="Fraction of content watched to completion [0.0 - 1.0]", example=0.94)
    action_preference: Optional[float] = Field(0.25, ge=0.0, le=1.0, description="Preference ratio for Action genre [0.0 - 1.0]", example=0.82)
    family_preference: Optional[float] = Field(0.25, ge=0.0, le=1.0, description="Preference ratio for Family genre [0.0 - 1.0]", example=0.05)
    comedy_preference: Optional[float] = Field(0.25, ge=0.0, le=1.0, description="Preference ratio for Comedy genre [0.0 - 1.0]", example=0.05)
    drama_preference: Optional[float] = Field(0.25, ge=0.0, le=1.0, description="Preference ratio for Drama genre [0.0 - 1.0]", example=0.08)
    number_of_sessions: Optional[int] = Field(None, ge=1, description="Total number of viewing sessions")
    primary_device: Optional[str] = Field("SmartTV", description="Primary viewing device (e.g. SmartTV, Mobile, Web, Tablet, Console)")
    subscription_tier: Optional[str] = Field("Standard", description="Subscription plan tier (e.g. Free, Basic, Standard, Premium)")
    weekend_watch_ratio: Optional[float] = Field(0.40, ge=0.0, le=1.0, description="Ratio of watching occurring on weekends [0.0 - 1.0]")
    skip_intro_rate: Optional[float] = Field(0.60, ge=0.0, le=1.0, description="Ratio of intro sequences skipped [0.0 - 1.0]")

    @field_validator("watch_time", "session_duration", "completion_rate")
    @classmethod
    def validate_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Behavioral metrics must not be negative.")
        return v


class BatchViewerItem(ViewerBehaviorInput):
    user_reference: Optional[str] = Field(None, description="Anonymous user reference code (e.g. U001)")


class BatchPredictionRequest(BaseModel):
    viewers: List[BatchViewerItem] = Field(..., min_length=1, max_length=1000, description="List of viewer behavioral records")


class SimilarityIndicator(BaseModel):
    type: str = Field("distance_to_centroid", description="Indicator type specification")
    normalized_similarity: float = Field(..., ge=0.0, le=1.0, description="Inverse normalized Euclidean distance to cluster centroid (custom heuristic, not a calibrated probability)")
    distance: float = Field(..., description="Euclidean distance to cluster center in scaled feature space")
    disclaimer: str = Field(
        "K-Means does not provide Bayesian or probabilistic classification confidence. This value represents relative spatial proximity to the cluster centroid.",
        description="Scientific interpretation note"
    )


class PredictionResponse(BaseModel):
    cluster_id: int = Field(..., description="Assigned cluster index")
    segment_name: str = Field(..., description="Descriptive human-readable audience segment name")
    confidence: Optional[float] = Field(None, description="Confidence placeholder (null for K-Means to prevent misleading calibration)")
    similarity_indicator: Optional[SimilarityIndicator] = Field(None, description="Spatial proximity metric")
    dominant_characteristics: List[str] = Field(default_factory=list, description="Dominant behavioral attributes of this segment")


class BatchResultItem(BaseModel):
    user_reference: Optional[str] = None
    cluster_id: int
    segment_name: str
    dominant_characteristics: List[str] = Field(default_factory=list)


class BatchPredictionResponse(BaseModel):
    count: int
    results: List[BatchResultItem]


class SegmentSummary(BaseModel):
    cluster_id: int
    segment_name: str
    user_count: int
    percentage: float


class SegmentsListResponse(BaseModel):
    total_users: int
    n_clusters: int
    segments: List[SegmentSummary]


class SegmentDetailResponse(BaseModel):
    cluster_id: int
    segment_name: str
    user_count: int
    percentage: float
    behavioral_profile: Dict[str, str]
    average_feature_values: Dict[str, float]
    categorical_distribution: Dict[str, Any]
    dominant_characteristics: List[str]


class HealthResponse(BaseModel):
    status: str = "healthy"
    model_loaded: bool = True
    timestamp: Optional[str] = None


class InfoResponse(BaseModel):
    algorithm: str = "KMeans"
    n_clusters: int
    dataset_rows: int
    features: Dict[str, Any]
    training_timestamp: str
    model_version: str
    metrics: Dict[str, Any]
