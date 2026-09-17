# OTT Audience Intelligence & Behavioral Segmentation Service

A complete, lightweight, production-style machine learning web service discovering natural audience behavioral clusters from raw streaming telemetry without relying on manually assigned labels.

---

## 1. Executive Problem Statement & Solution

Streaming platforms generate high-velocity viewer signals (watch duration, completion rates, session length, visit cadence, and genre affinity). Raw metrics alone cannot directly inform real-time content ranking, banner personalization, or notification cadence.

This service implements an **unsupervised machine learning pipeline (K-Means clustering with automated K selection and Scikit-Learn preprocessing)** that segments viewers into behavioral archetypes, such as:
* **Highly Engaged Action Viewers**
* **Occasional Family-Content Viewers**
* **Short-Session Casual Comedy Viewers**
* **Frequent Multi-Genre Viewers**
* **Highly Active Completion-Oriented Viewers**

---

## 2. Architecture & Components

```
├── app/
│   ├── main.py                  # FastAPI application with REST endpoints
│   ├── schemas.py               # Pydantic data contracts & validation
│   ├── config.py                # Environment configurations
│   └── model_service.py         # Thread-safe model artifact loader & inference
├── ml/
│   ├── generate_data.py         # Realistic OTT streaming telemetry generator (5,000 samples)
│   ├── preprocessing.py         # Custom feature engineering + ColumnTransformer pipeline
│   ├── clustering.py            # K-Means clustering, K range search (2-8), & ARI stability
│   ├── profiling.py             # Logic-based automated segment naming & profiling
│   └── train.py                 # Full reproducible training pipeline
├── evaluation/
│   ├── evaluate_model.py        # Independent model quality evaluator (Silhouette, DB, CH, Inertia)
│   ├── evaluate_api.py          # Independent REST API latency & throughput benchmark
│   ├── generate_report.py       # Full evaluation runner producing HTML & JSON reports
│   ├── results.json             # Machine-readable evaluation output
│   └── report.html              # Standalone visual HTML evaluation report
├── tests/
│   ├── test_model.py            # Unit tests for preprocessing, pipeline, and artifacts
│   └── test_api.py              # Integration tests for FastAPI endpoints & validation
├── models/                      # Trained pipeline artifacts (.joblib, metadata, profiles, PCA)
├── frontend/                    # Standalone static HTML/CSS/JS frontend for Nginx deployment
├── src/                         # React + Tailwind live interactive analytics dashboard
├── Dockerfile                   # Multi-stage production container definition
└── docker-compose.yml           # Multi-service orchestration (API, Evaluation, Frontend)
```

---

## 3. Machine Learning Specifications

* **Algorithm**: K-Means Clustering (`scikit-learn`)
* **Feature Engineering**:
  * Engagement Score: `(watch_time / 60) * completion_rate * visit_frequency`
  * Average Session Duration: `watch_time / number_of_sessions`
  * Genre Diversity: Entropy across Action, Family, Comedy, and Drama affinities
  * Visit Intensity: `visit_frequency / (number_of_sessions + 1)`
* **Feature Preprocessing**: `StandardScaler` on numerical features, `OneHotEncoder(handle_unknown='ignore')` on categorical attributes (`primary_device`, `subscription_tier`).
* **Unsupervised Cluster Quality (Measured on 5,000 records)**:
  * **Silhouette Score**: `0.400`
  * **Davies-Bouldin Index**: `1.007` (well-separated clusters)
  * **Calinski-Harabasz Score**: `3,263`
  * **Model Inertia**: `24,167`
  * **Cluster Stability (ARI across 5 seeds)**: `1.000` (High Stability)

---

## 4. REST API Specification

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness and model initialization probe (`status`, `model_loaded`) |
| `GET` | `/info` | Model metadata, feature schema, cluster count, and quality metrics |
| `GET` | `/segments` | Discovered audience segments with population size and proportions |
| `GET` | `/segments/{id}` | Detailed segment breakdown, feature averages, and personalization actions |
| `POST` | `/predict` | Classifies single viewer parameters into segment without retraining |
| `POST` | `/predict/batch` | High-throughput batch classification for multiple viewer records |
| `GET` | `/pca` | 2D PCA coordinates and centroids for cluster visualization |
| `GET` | `/docs` | Interactive Swagger UI API documentation |

### Predict Request Example:
```json
{
  "watch_time": 2450.0,
  "session_duration": 58.0,
  "visit_frequency": 22,
  "completion_rate": 0.91,
  "action_preference": 0.82,
  "family_preference": 0.05,
  "comedy_preference": 0.08,
  "drama_preference": 0.05,
  "primary_device": "SmartTV",
  "subscription_tier": "Premium"
}
```

### Predict Response Example:
```json
{
  "cluster_id": 0,
  "segment_name": "Highly Engaged Action Viewers",
  "confidence": null,
  "similarity_indicator": {
    "type": "distance_to_centroid",
    "normalized_similarity": 0.3969,
    "distance": 2.772,
    "disclaimer": "K-Means is an unsupervised geometric clustering algorithm. This score measures inverse Euclidean proximity to the cluster centroid, not a calibrated probability."
  },
  "dominant_characteristics": [
    "High Action Preference (0.77)",
    "High Visit Frequency (21.64)",
    "High Skip Intro Rate (0.85)"
  ]
}
```

---

## 5. Running and Testing

### Run Training Pipeline:
```bash
python3 ml/train.py
```

### Run Independent Evaluation Suite:
```bash
python3 evaluation/generate_report.py
```

### Run Automated Tests (14 Tests):
```bash
pytest -v tests/
```

### Run Multi-Container Deployment via Docker Compose:
```bash
docker compose up --build
```
