"""
Independent Model Evaluator
Loads the trained pipeline artifact and raw dataset independently,
recomputes all unsupervised quality metrics directly on the data,
and returns measured evidence without trusting training metadata.
"""

import os
import sys
# Ensure repository root in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import json
import joblib
import argparse
import numpy as np
import pandas as pd
from typing import Dict, Any
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
from ml.clustering import evaluate_cluster_stability

def evaluate_model(
    model_path: str = "models/audience_pipeline.joblib",
    data_path: str = "data/viewers.csv",
    seed: int = 42
) -> Dict[str, Any]:
    """
    Independently evaluates the trained model pipeline on real data.
    """
    print(f"[Model Evaluator] Loading model pipeline from: {model_path}")
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found at {model_path}")
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset file not found at {data_path}")

    artifact = joblib.load(model_path)
    preprocessor = artifact["preprocessor"]
    kmeans = artifact["kmeans"]
    num_features = artifact["numerical_features"]
    cat_features = artifact["categorical_features"]
    n_clusters = int(kmeans.n_clusters)

    print(f"[Model Evaluator] Loading dataset from: {data_path}")
    df = pd.read_csv(data_path)
    if "user_id" in df.columns:
        df_clean = df.drop(columns=["user_id"])
    else:
        df_clean = df

    # Transform dataset through fitted preprocessing pipeline
    print(f"[Model Evaluator] Applying saved preprocessor to {len(df_clean)} records...")
    X_trans = preprocessor.transform(df_clean)

    # Re-predict cluster labels
    print(f"[Model Evaluator] Predicting cluster assignments for all samples...")
    cluster_labels = kmeans.predict(X_trans)

    # Calculate actual unsupervised clustering quality metrics
    print(f"[Model Evaluator] Computing real mathematical clustering metrics...")
    # Sample up to 5000 for silhouette to ensure fast, deterministic evaluation
    sample_size = min(5000, len(X_trans))
    sil = float(silhouette_score(X_trans, cluster_labels, sample_size=sample_size, random_state=seed))
    db = float(davies_bouldin_score(X_trans, cluster_labels))
    ch = float(calinski_harabasz_score(X_trans, cluster_labels))

    # Calculate exact inertia: sum of squared Euclidean distances to cluster centers
    centers = kmeans.cluster_centers_
    dists_sq = np.sum((X_trans - centers[cluster_labels]) ** 2)
    inertia = float(dists_sq)

    # Cluster sizes
    unique, counts = np.unique(cluster_labels, return_counts=True)
    cluster_distributions = {
        int(k): {
            "count": int(c),
            "percentage": round(float(c / len(cluster_labels)) * 100.0, 2)
        }
        for k, c in zip(unique, counts)
    }

    # Independent Cluster Stability
    print(f"[Model Evaluator] Evaluating cluster stability across 5 randomized seeds...")
    stability = evaluate_cluster_stability(X_trans, n_clusters, n_runs=5, base_seed=seed)

    results = {
        "algorithm": "KMeans",
        "n_clusters": n_clusters,
        "total_samples_evaluated": len(X_trans),
        "silhouette_score": round(sil, 4),
        "davies_bouldin_score": round(db, 4),
        "calinski_harabasz_score": round(ch, 2),
        "inertia": round(inertia, 2),
        "cluster_distribution": cluster_distributions,
        "stability": {
            "mean_adjusted_rand_index": stability["mean_adjusted_rand_index"],
            "stability_grade": stability["stability_grade"],
            "is_stable": stability["is_stable"]
        },
        "evaluation_timestamp": pd.Timestamp.utcnow().isoformat() + "Z"
    }

    print("\n----------------------------------------")
    print("INDEPENDENT MODEL EVALUATION RESULTS")
    print("----------------------------------------")
    print(f"Algorithm:               K-Means")
    print(f"Evaluated Clusters (K):  {results['n_clusters']}")
    print(f"Silhouette Score:        {results['silhouette_score']} (higher is better, [-1, 1])")
    print(f"Davies-Bouldin Index:    {results['davies_bouldin_score']} (lower is better, >= 0)")
    print(f"Calinski-Harabasz Score: {results['calinski_harabasz_score']} (higher is better)")
    print(f"Model Inertia:           {results['inertia']}")
    print(f"Cluster Stability ARI:   {results['stability']['mean_adjusted_rand_index']} ({results['stability']['stability_grade']})")
    print("----------------------------------------\n")

    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Independently evaluate OTT clustering model")
    parser.add_argument("--model", type=str, default="models/audience_pipeline.joblib")
    parser.add_argument("--data", type=str, default="data/viewers.csv")
    args = parser.parse_args()
    evaluate_model(args.model, args.data)
