"""
Training Pipeline for OTT Audience Intelligence & Behavioral Segmentation Service.
Loads raw dataset, validates schema, trains unsupervised K-Means clustering,
profiles segments, and persists pipeline, metadata, and cluster profiles.
"""

import os
import sys
# Ensure repository root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import json
import argparse
import datetime
import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score

from ml.preprocessing import (
    inspect_and_validate_dataset,
    build_full_preprocessing_pipeline
)
from ml.clustering import evaluate_cluster_range, evaluate_cluster_stability
from ml.profiling import profile_clusters

def run_training_pipeline(
    data_path: str = "data/viewers.csv",
    output_dir: str = "models",
    k_min: int = 2,
    k_max: int = 8,
    fixed_k: int = None,
    random_seed: int = 42,
    k_selection_method: str = "silhouette"
):
    print(f"=== Starting OTT Audience Intelligence Training Pipeline ===")
    print(f"Dataset path: {data_path}")
    print(f"Output directory: {output_dir}")

    if not os.path.exists(data_path):
        # Auto-generate demo dataset if missing
        print(f"Warning: {data_path} not found. Automatically generating synthetic demonstration dataset...")
        from ml.generate_data import generate_ott_dataset
        generate_ott_dataset(output_path=data_path)

    # 1. Ingestion
    df = pd.read_csv(data_path)
    print(f"1. Ingestion complete: Loaded {len(df)} rows and {len(df.columns)} columns.")

    # 2. Validation & Column Identification
    validation_summary = inspect_and_validate_dataset(df)
    num_cols = validation_summary["numerical_columns"]
    cat_cols = validation_summary["categorical_columns"]
    id_cols = validation_summary["identifier_columns"]

    print(f"2. Validation complete:")
    print(f"   - Identified numerical features: {num_cols}")
    print(f"   - Identified categorical features: {cat_cols}")
    print(f"   - Excluded identifier columns: {id_cols}")
    print(f"   - Detected duplicate rows: {validation_summary['duplicate_rows']}")

    # Handle duplicates if any
    if validation_summary["duplicate_rows"] > 0:
        df = df.drop_duplicates().reset_index(drop=True)

    # 3. Build & Fit Preprocessing Pipeline
    prep_pipeline, all_numerical = build_full_preprocessing_pipeline(num_cols, cat_cols)
    # Fit-transform features
    X_processed = prep_pipeline.fit_transform(df)
    print(f"3. Feature engineering & preprocessing complete. Processed matrix shape: {X_processed.shape}")

    # 4. Cluster Selection
    if fixed_k is not None and fixed_k >= 2:
        selected_k = fixed_k
        k_eval_results = {"candidate_evaluations": [], "selected_k": selected_k, "selection_method": "manual"}
        print(f"4. Using manually specified K = {selected_k}")
    else:
        print(f"4. Evaluating candidate K values from {k_min} to {k_max}...")
        k_eval_results = evaluate_cluster_range(
            X_processed,
            k_min=k_min,
            k_max=k_max,
            random_state=random_seed,
            selection_method=k_selection_method
        )
        selected_k = k_eval_results["selected_k"]
        print(f"   Selected optimal K: {selected_k} (method: {k_selection_method})")
        for cand in k_eval_results["candidate_evaluations"]:
            marker = " -> SELECTED" if cand["k"] == selected_k else ""
            print(f"   K={cand['k']} | Inertia: {cand['inertia']:>10.1f} | Sil: {cand['silhouette_score']:.4f} | DB: {cand['davies_bouldin_score']:.4f} | CH: {cand['calinski_harabasz_score']:.1f}{marker}")

    # 5. Final K-Means Model Training
    kmeans = KMeans(
        n_clusters=selected_k,
        init="k-means++",
        n_init=15,
        max_iter=300,
        random_state=random_seed
    )
    cluster_labels = kmeans.fit_predict(X_processed)
    print(f"5. Final K-Means model trained with {selected_k} clusters.")

    # 6. Model Evaluation Metrics Calculation on Real Data
    sil_score = float(silhouette_score(X_processed, cluster_labels, sample_size=min(5000, len(X_processed)), random_state=random_seed))
    db_score = float(davies_bouldin_score(X_processed, cluster_labels))
    ch_score = float(calinski_harabasz_score(X_processed, cluster_labels))
    inertia = float(kmeans.inertia_)

    print(f"6. Real Evaluation Metrics:")
    print(f"   - Silhouette Score: {sil_score:.4f}")
    print(f"   - Davies-Bouldin Index: {db_score:.4f}")
    print(f"   - Calinski-Harabasz Score: {ch_score:.2f}")
    print(f"   - Inertia: {inertia:.2f}")

    # 7. Cluster Stability Assessment
    stability_report = evaluate_cluster_stability(X_processed, selected_k, n_runs=5, base_seed=random_seed)
    print(f"7. Cluster Stability: Mean ARI = {stability_report['mean_adjusted_rand_index']} ({stability_report['stability_grade']})")

    # 8. Cluster Profiling & Dynamic Segment Naming
    profiles = profile_clusters(df, cluster_labels, num_cols, cat_cols)
    print(f"8. Discovered Segments:")
    for seg in profiles["segments"]:
        print(f"   [Cluster {seg['cluster_id']}] {seg['segment_name']} -> {seg['user_count']} users ({seg['percentage']}%)")

    # 9. Compute 2D PCA Projection for Visual Dashboard Demonstration
    pca = PCA(n_components=2, random_state=random_seed)
    coords_2d = pca.fit_transform(X_processed)
    centroids_2d = pca.transform(kmeans.cluster_centers_)

    # Sample up to 600 points for crisp, lightweight frontend rendering
    sample_indices = np.random.choice(len(df), size=min(600, len(df)), replace=False)
    pca_data = {
        "points": [
            {
                "x": round(float(coords_2d[idx, 0]), 3),
                "y": round(float(coords_2d[idx, 1]), 3),
                "cluster_id": int(cluster_labels[idx]),
                "user_id": str(df.iloc[idx].get("user_id", f"USR_{idx}"))
            }
            for idx in sample_indices
        ],
        "centroids": [
            {
                "cluster_id": int(c_idx),
                "x": round(float(centroids_2d[c_idx, 0]), 3),
                "y": round(float(centroids_2d[c_idx, 1]), 3),
                "segment_name": profiles["segments"][c_idx]["segment_name"]
            }
            for c_idx in range(selected_k)
        ],
        "variance_explained": [round(float(v), 4) for v in pca.explained_variance_ratio_]
    }

    # 10. Persist Model, Metadata, and Profiles
    os.makedirs(output_dir, exist_ok=True)

    # Save end-to-end bundle: (preprocessing pipeline, kmeans model)
    pipeline_artifact = {
        "preprocessor": prep_pipeline,
        "kmeans": kmeans,
        "pca": pca,
        "numerical_features": num_cols,
        "categorical_features": cat_cols,
        "selected_k": selected_k
    }
    pipeline_path = os.path.join(output_dir, "audience_pipeline.joblib")
    joblib.dump(pipeline_artifact, pipeline_path)

    metadata = {
        "algorithm": "KMeans",
        "n_clusters": int(selected_k),
        "features": {
            "raw_numerical": num_cols,
            "raw_categorical": cat_cols,
            "engineered": [
                "feat_avg_session_duration",
                "feat_completion_ratio",
                "feat_engagement_score",
                "feat_visit_intensity",
                "feat_genre_diversity"
            ]
        },
        "training_timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "dataset_rows": int(len(df)),
        "dataset_columns": list(df.columns),
        "model_version": "1.0.0",
        "metrics": {
            "silhouette_score": round(sil_score, 4),
            "davies_bouldin_score": round(db_score, 4),
            "calinski_harabasz_score": round(ch_score, 2),
            "inertia": round(inertia, 2),
            "stability_mean_ari": stability_report["mean_adjusted_rand_index"],
            "stability_grade": stability_report["stability_grade"]
        },
        "k_selection": k_eval_results,
        "pca_variance_explained": pca_data["variance_explained"]
    }

    metadata_path = os.path.join(output_dir, "metadata.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    profiles_path = os.path.join(output_dir, "cluster_profiles.json")
    with open(profiles_path, "w") as f:
        json.dump(profiles, f, indent=2)

    pca_path = os.path.join(output_dir, "pca_projection.json")
    with open(pca_path, "w") as f:
        json.dump(pca_data, f, indent=2)

    print(f"10. Artifacts successfully saved to {output_dir}:")
    print(f"    - {pipeline_path}")
    print(f"    - {metadata_path}")
    print(f"    - {profiles_path}")
    print(f"    - {pca_path}")
    print("=== Training Pipeline Completed Successfully ===")

    return {
        "metadata": metadata,
        "profiles": profiles
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train OTT Audience Clustering Model")
    parser.add_argument("--data", type=str, default="data/viewers.csv", help="Path to input tabular dataset")
    parser.add_argument("--output-dir", type=str, default="models", help="Output directory for model artifacts")
    parser.add_argument("--k-min", type=int, default=2, help="Minimum K to evaluate")
    parser.add_argument("--k-max", type=int, default=8, help="Maximum K to evaluate")
    parser.add_argument("--k", type=int, default=None, help="Force a specific K cluster count")
    parser.add_argument("--method", type=str, default="silhouette", choices=["silhouette", "composite"], help="K selection method")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    run_training_pipeline(
        data_path=args.data,
        output_dir=args.output_dir,
        k_min=args.k_min,
        k_max=args.k_max,
        fixed_k=args.k,
        random_seed=args.seed,
        k_selection_method=args.method
    )
