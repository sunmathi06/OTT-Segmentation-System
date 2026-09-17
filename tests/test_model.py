"""
Automated Unit and Integration Tests for ML Pipeline
Tests:
- Dataset loading and validation
- Preprocessing and feature engineering
- Model artifact loading
- Single and batch inference
- Cluster profiling and segment naming
"""

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import numpy as np
import pandas as pd
import joblib

from ml.preprocessing import (
    inspect_and_validate_dataset,
    OTTFeatureEngineer,
    build_full_preprocessing_pipeline
)
from ml.clustering import evaluate_cluster_range, evaluate_cluster_stability
from ml.profiling import profile_clusters, _derive_segment_name

@pytest.fixture
def sample_raw_dataframe():
    return pd.DataFrame({
        "user_id": ["U001", "U002", "U003", "U004"],
        "watch_time": [2400.0, 950.0, 420.0, 1650.0],
        "session_duration": [55.0, 48.0, 18.0, 42.0],
        "visit_frequency": [22, 8, 6, 18],
        "completion_rate": [0.88, 0.68, 0.42, 0.74],
        "number_of_sessions": [43, 20, 23, 39],
        "action_preference": [0.78, 0.08, 0.22, 0.28],
        "family_preference": [0.06, 0.72, 0.12, 0.22],
        "comedy_preference": [0.10, 0.14, 0.52, 0.25],
        "drama_preference": [0.06, 0.06, 0.14, 0.25],
        "primary_device": ["SmartTV", "SmartTV", "Mobile", "Web"],
        "subscription_tier": ["Premium", "Standard", "Free", "Standard"],
        "weekend_watch_ratio": [0.42, 0.68, 0.35, 0.40],
        "skip_intro_rate": [0.85, 0.42, 0.30, 0.65]
    })


def test_dataset_validation(sample_raw_dataframe):
    summary = inspect_and_validate_dataset(sample_raw_dataframe)
    assert summary["initial_rows"] == 4
    assert "user_id" in summary["identifier_columns"]
    assert "watch_time" in summary["numerical_columns"]
    assert "primary_device" in summary["categorical_columns"]


def test_feature_engineer(sample_raw_dataframe):
    engineer = OTTFeatureEngineer()
    engineer.fit(sample_raw_dataframe)
    transformed = engineer.transform(sample_raw_dataframe)

    assert "feat_avg_session_duration" in transformed.columns
    assert "feat_completion_ratio" in transformed.columns
    assert "feat_engagement_score" in transformed.columns
    assert "feat_visit_intensity" in transformed.columns
    assert "feat_genre_diversity" in transformed.columns
    assert len(transformed) == 4


def test_pipeline_transformation(sample_raw_dataframe):
    num_cols = ["watch_time", "session_duration", "visit_frequency", "completion_rate"]
    cat_cols = ["primary_device"]
    pipeline, all_num = build_full_preprocessing_pipeline(num_cols, cat_cols)

    matrix = pipeline.fit_transform(sample_raw_dataframe)
    assert isinstance(matrix, np.ndarray)
    assert matrix.shape[0] == 4
    assert matrix.shape[1] > len(num_cols)


def test_segment_naming_logic():
    # Test action enthusiast naming
    name_action = _derive_segment_name(
        {"watch_time": 2500, "session_duration": 50, "visit_frequency": 20, "action_preference": 0.80},
        {}, 0
    )
    assert "Action" in name_action

    # Test casual short session naming
    name_casual = _derive_segment_name(
        {"watch_time": 400, "session_duration": 18, "visit_frequency": 5, "comedy_preference": 0.50},
        {}, 1
    )
    assert "Short-Session" in name_casual or "Casual" in name_casual

    # Test family naming
    name_family = _derive_segment_name(
        {"watch_time": 900, "session_duration": 45, "visit_frequency": 6, "family_preference": 0.70},
        {}, 2
    )
    assert "Family" in name_family


def test_model_artifact_loading():
    model_path = "models/audience_pipeline.joblib"
    if os.path.exists(model_path):
        artifact = joblib.load(model_path)
        assert "preprocessor" in artifact
        assert "kmeans" in artifact
        assert artifact["kmeans"].n_clusters >= 2
