"""
Automated Integration Tests for FastAPI REST Endpoints
Tests:
- GET /health
- GET /info
- GET /segments
- GET /segments/{cluster_id}
- POST /predict
- POST /predict/batch
- Error handling (404 for nonexistent segment, 422 for negative values and invalid ranges)
"""

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "model_loaded" in data


def test_info_endpoint(client):
    response = client.get("/info")
    assert response.status_code == 200
    data = response.json()
    assert data["algorithm"] == "KMeans"
    assert data["n_clusters"] >= 2
    assert "features" in data
    assert "metrics" in data


def test_segments_list_endpoint(client):
    response = client.get("/segments")
    assert response.status_code == 200
    data = response.json()
    assert "segments" in data
    assert len(data["segments"]) >= 2
    for seg in data["segments"]:
        assert "cluster_id" in seg
        assert "segment_name" in seg
        assert "user_count" in seg
        assert "percentage" in seg


def test_segment_detail_endpoint(client):
    response = client.get("/segments/0")
    assert response.status_code == 200
    data = response.json()
    assert data["cluster_id"] == 0
    assert "segment_name" in data
    assert "average_feature_values" in data
    assert "dominant_characteristics" in data


def test_segment_detail_not_found(client):
    response = client.get("/segments/99999")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data


def test_predict_endpoint_valid(client):
    payload = {
        "watch_time": 2400.0,
        "session_duration": 55.0,
        "visit_frequency": 22,
        "completion_rate": 0.90,
        "action_preference": 0.80,
        "family_preference": 0.05,
        "comedy_preference": 0.08,
        "drama_preference": 0.07,
        "primary_device": "SmartTV",
        "subscription_tier": "Premium"
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "cluster_id" in data
    assert "segment_name" in data
    assert data["confidence"] is None  # K-Means confidence must remain null
    assert "similarity_indicator" in data
    assert data["similarity_indicator"]["normalized_similarity"] >= 0.0


def test_predict_validation_error_negative(client):
    payload = {
        "watch_time": -100.0,  # Negative values are prohibited
        "session_duration": 50.0,
        "visit_frequency": 10,
        "completion_rate": 0.80
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422


def test_predict_validation_error_out_of_range_completion(client):
    payload = {
        "watch_time": 500.0,
        "session_duration": 40.0,
        "visit_frequency": 10,
        "completion_rate": 1.80  # Must be <= 1.0
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422


def test_predict_batch_endpoint(client):
    payload = {
        "viewers": [
            {
                "user_reference": "U001",
                "watch_time": 2400.0,
                "session_duration": 55.0,
                "visit_frequency": 22,
                "completion_rate": 0.90,
                "action_preference": 0.80
            },
            {
                "user_reference": "U002",
                "watch_time": 400.0,
                "session_duration": 18.0,
                "visit_frequency": 5,
                "completion_rate": 0.40,
                "comedy_preference": 0.60
            }
        ]
    }
    response = client.post("/predict/batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 2
    assert len(data["results"]) == 2
    assert data["results"][0]["user_reference"] == "U001"
    assert data["results"][1]["user_reference"] == "U002"
