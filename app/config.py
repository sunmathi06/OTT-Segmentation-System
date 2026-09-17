"""
Application Configuration and Environment Settings
"""

import os
from pydantic import BaseModel

class Settings(BaseModel):
    app_name: str = "OTT Audience Intelligence & Behavioral Segmentation Service"
    version: str = "1.0.0"
    model_path: str = os.getenv("MODEL_PATH", "models/audience_pipeline.joblib")
    metadata_path: str = os.getenv("METADATA_PATH", "models/metadata.json")
    profiles_path: str = os.getenv("PROFILES_PATH", "models/cluster_profiles.json")
    pca_path: str = os.getenv("PCA_PATH", "models/pca_projection.json")
    data_path: str = os.getenv("DATA_PATH", "data/viewers.csv")
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))

settings = Settings()
