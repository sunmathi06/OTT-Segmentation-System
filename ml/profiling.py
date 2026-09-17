"""
Cluster Profiling, Statistical Aggregation, and Automatic Segment Naming
for OTT Audience Intelligence Service.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List

def profile_clusters(
    df_raw: pd.DataFrame,
    cluster_labels: np.ndarray,
    numerical_features: List[str],
    categorical_features: List[str]
) -> Dict[str, Any]:
    """
    Computes statistical summaries for each cluster and derives human-readable
    meaningful segment names and dominant behavioral characteristics.
    """
    df = df_raw.copy()
    df["cluster"] = cluster_labels
    total_users = len(df)
    unique_clusters = sorted(list(set(cluster_labels)))

    overall_means = df[numerical_features].mean().to_dict()
    overall_stds = df[numerical_features].std().replace(0, 1.0).to_dict()

    segments = []

    for c_id in unique_clusters:
        c_df = df[df["cluster"] == c_id]
        count = len(c_df)
        pct = round((count / total_users) * 100.0, 2)

        # Average numerical metrics
        means = {}
        for num_col in numerical_features:
            val = float(c_df[num_col].mean())
            means[num_col] = round(val, 2)

        # Categorical distributions
        cat_dist = {}
        for cat_col in categorical_features:
            if cat_col in c_df.columns:
                top_vals = c_df[cat_col].value_counts(normalize=True).head(3).to_dict()
                cat_dist[cat_col] = {k: round(float(v) * 100, 1) for k, v in top_vals.items()}

        # Identify dominant behavioral traits compared to population
        dominant_traits = []
        traits_scores = []

        # Compare key metrics against population
        for col in numerical_features:
            pop_m = overall_means[col]
            pop_s = overall_stds[col]
            c_m = means[col]
            z_score = (c_m - pop_m) / pop_s
            traits_scores.append((col, z_score, c_m))

        # Sort by absolute deviation from mean
        traits_scores.sort(key=lambda x: abs(x[1]), reverse=True)

        for col, z, val in traits_scores[:5]:
            friendly_col = col.replace("_", " ").title()
            if z > 0.4:
                dominant_traits.append(f"High {friendly_col} ({val:g})")
            elif z < -0.4:
                dominant_traits.append(f"Lower {friendly_col} ({val:g})")
            else:
                dominant_traits.append(f"Moderate {friendly_col} ({val:g})")

        # Derive human-readable segment name
        segment_name = _derive_segment_name(means, cat_dist, c_id)

        segments.append({
            "cluster_id": int(c_id),
            "segment_name": segment_name,
            "user_count": int(count),
            "percentage": float(pct),
            "average_metrics": means,
            "categorical_distribution": cat_dist,
            "dominant_characteristics": dominant_traits,
            "behavioral_summary": {
                "watch_time_level": _categorize_level(means.get("watch_time", 0), [500, 1800]),
                "session_duration_level": _categorize_level(means.get("session_duration", 0), [30, 60]),
                "visit_frequency_level": _categorize_level(means.get("visit_frequency", 0), [8, 18]),
                "completion_rate_level": _categorize_level(means.get("completion_rate", 0), [0.55, 0.85]),
            }
        })

    # Sort segments by cluster_id
    segments.sort(key=lambda s: s["cluster_id"])

    return {
        "total_users": total_users,
        "n_clusters": len(segments),
        "segments": segments,
        "population_means": {k: round(float(v), 2) for k, v in overall_means.items()}
    }


def _derive_segment_name(means: Dict[str, float], cat_dist: Dict[str, Any], cluster_id: int) -> str:
    """
    Derives meaningful names based on actual observable cluster stats.
    Fallbacks safely to Audience Segment {cluster_id + 1} if ambiguous.
    """
    watch_time = means.get("watch_time", 0)
    session_duration = means.get("session_duration", 0)
    visit_freq = means.get("visit_frequency", 0)
    completion = means.get("completion_rate", 0)
    action_pref = means.get("action_preference", 0)
    family_pref = means.get("family_preference", 0)
    comedy_pref = means.get("comedy_preference", 0)
    drama_pref = means.get("drama_preference", 0)

    # 1. Action Enthusiast
    if action_pref >= 0.50 or (action_pref >= 0.40 and watch_time >= 1800):
        if watch_time >= 2000 and visit_freq >= 15:
            return "Highly Engaged Action Viewers"
        return "Action & Thriller Viewers"

    # 2. Family Viewers
    if family_pref >= 0.45 or (family_pref >= 0.35 and means.get("weekend_watch_ratio", 0) >= 0.55):
        if visit_freq < 12:
            return "Occasional Family Viewers"
        return "Family & Kids Viewers"

    # 3. Short-Session Casual
    if session_duration <= 28 or (watch_time <= 700 and visit_freq <= 10):
        if comedy_pref >= 0.35:
            return "Short-Session Casual Comedy Viewers"
        return "Short-Session Casual Viewers"

    # 4. Completionist / Binge Viewers
    if completion >= 0.88 and session_duration >= 55:
        if watch_time >= 2500:
            return "Highly Active Completion-Oriented Viewers"
        return "Binge Completionist Viewers"

    # 5. Multi-Genre Explorers
    genre_vals = [action_pref, family_pref, comedy_pref, drama_pref]
    if len(genre_vals) > 0 and max(genre_vals) - min(genre_vals) <= 0.20:
        return "Frequent Multi-Genre Viewers"

    # 6. Drama & Narrative
    if drama_pref >= 0.40:
        return "Narrative Drama Enthusiasts"

    # Safe fallback with observable dominance
    highest_genre = max([
        ("Action", action_pref),
        ("Family", family_pref),
        ("Comedy", comedy_pref),
        ("Drama", drama_pref)
    ], key=lambda x: x[1])

    if highest_genre[1] > 0.35:
        return f"{highest_genre[0]}-Oriented Audience Segment"

    return f"Audience Segment {cluster_id + 1}"


def _categorize_level(val: float, thresholds: List[float]) -> str:
    if val < thresholds[0]:
        return "Low"
    elif val < thresholds[1]:
        return "Moderate"
    return "High"
