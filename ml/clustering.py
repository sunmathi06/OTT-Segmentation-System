"""
K-Means Clustering, Automatic K Selection, and Cluster Stability Evaluation
for OTT Audience Intelligence Service.
"""

import numpy as np
from typing import Dict, Any, List, Tuple
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score, adjusted_rand_score

def evaluate_cluster_range(
    X: np.ndarray,
    k_min: int = 2,
    k_max: int = 8,
    random_state: int = 42,
    selection_method: str = "silhouette"
) -> Dict[str, Any]:
    """
    Evaluates a candidate range of K clusters and records:
    - Inertia (Sum of squared distances)
    - Silhouette Score (Separation & Cohesion)
    - Davies-Bouldin Index (Lower is better)
    - Calinski-Harabasz Score (Higher is better)
    Selects optimal K using the specified method.
    """
    if len(X) < k_max:
        k_max = max(2, len(X) - 1)
        k_min = min(2, k_max)

    candidates = []
    best_k = k_min
    best_score = -1.0

    for k in range(k_min, k_max + 1):
        kmeans = KMeans(
            n_clusters=k,
            init="k-means++",
            n_init=10,
            max_iter=300,
            random_state=random_state
        )
        labels = kmeans.fit_predict(X)

        inertia = float(kmeans.inertia_)
        # Silhouette requires at least 2 distinct clusters and > 1 sample per cluster
        if len(set(labels)) > 1:
            sil = float(silhouette_score(X, labels, sample_size=min(5000, len(X)), random_state=random_state))
            db = float(davies_bouldin_score(X, labels))
            ch = float(calinski_harabasz_score(X, labels))
        else:
            sil, db, ch = 0.0, 999.0, 0.0

        record = {
            "k": k,
            "inertia": round(inertia, 2),
            "silhouette_score": round(sil, 4),
            "davies_bouldin_score": round(db, 4),
            "calinski_harabasz_score": round(ch, 2)
        }
        candidates.append(record)

        # Selection logic
        if selection_method == "silhouette":
            if sil > best_score:
                best_score = sil
                best_k = k
        elif selection_method == "composite":
            # Composite normalized score: higher sil, lower db, higher ch
            # We'll normalize after collecting all
            pass

    if selection_method == "composite" and candidates:
        sils = [c["silhouette_score"] for c in candidates]
        dbs = [c["davies_bouldin_score"] for c in candidates]
        chs = [c["calinski_harabasz_score"] for c in candidates]

        norm_sil = (np.array(sils) - min(sils)) / max(max(sils) - min(sils), 1e-6)
        norm_db = 1.0 - ((np.array(dbs) - min(dbs)) / max(max(dbs) - min(dbs), 1e-6))
        norm_ch = (np.array(chs) - min(chs)) / max(max(chs) - min(chs), 1e-6)

        composite_scores = 0.5 * norm_sil + 0.3 * norm_db + 0.2 * norm_ch
        best_idx = int(np.argmax(composite_scores))
        best_k = candidates[best_idx]["k"]

    return {
        "candidate_evaluations": candidates,
        "selected_k": best_k,
        "selection_method": selection_method
    }


def evaluate_cluster_stability(
    X: np.ndarray,
    k: int,
    n_runs: int = 5,
    base_seed: int = 42
) -> Dict[str, Any]:
    """
    Evaluates cluster stability by training K-Means across distinct random seeds
    and computing pairwise Adjusted Rand Index (ARI).
    Values near 1.0 indicate highly stable, reproducible cluster partitions.
    """
    runs_labels = []
    seeds = [base_seed + i * 17 for i in range(n_runs)]

    for seed in seeds:
        km = KMeans(n_clusters=k, init="k-means++", n_init=10, random_state=seed)
        labels = km.fit_predict(X)
        runs_labels.append(labels)

    pairwise_ari = []
    for i in range(n_runs):
        for j in range(i + 1, n_runs):
            ari = adjusted_rand_score(runs_labels[i], runs_labels[j])
            pairwise_ari.append(float(ari))

    mean_ari = float(np.mean(pairwise_ari)) if pairwise_ari else 1.0
    stability_grade = (
        "High" if mean_ari >= 0.75
        else "Moderate" if mean_ari >= 0.50
        else "Low"
    )

    return {
        "k": k,
        "n_runs": n_runs,
        "pairwise_ari": [round(s, 4) for s in pairwise_ari],
        "mean_adjusted_rand_index": round(mean_ari, 4),
        "stability_grade": stability_grade,
        "is_stable": bool(mean_ari >= 0.60)
    }
