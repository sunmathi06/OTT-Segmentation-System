"""
Data Ingestion, Validation, Feature Engineering, and Transformation Pipeline
for OTT Audience Intelligence & Behavioral Segmentation Service.
"""

import numpy as np
import pandas as pd
from typing import Tuple, List, Dict, Any, Optional
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer

# Known identifier patterns that must NEVER be used as features
IDENTIFIER_PATTERNS = {"user_id", "id", "viewer_id", "account_id", "uuid", "guid", "email", "name", "username"}

# Standard expected behavioral and genre columns with flexible fallback matching
BEHAVIORAL_CANDIDATES = [
    "watch_time", "watch_time_minutes", "total_watch_time",
    "session_duration", "average_session_duration", "avg_session_length",
    "visit_frequency", "frequency_of_visits", "visit_count",
    "completion_rate", "completion_ratio",
    "number_of_sessions", "session_count", "total_sessions",
    "action_preference", "family_preference", "comedy_preference", "drama_preference",
    "weekend_watch_ratio", "skip_intro_rate"
]

CATEGORICAL_CANDIDATES = [
    "primary_device", "device_type", "device",
    "subscription_tier", "tier", "plan", "membership_type"
]


class OTTFeatureEngineer(BaseEstimator, TransformerMixin):
    """
    Custom Scikit-Learn transformer to engineer behavioral OTT features:
    - average_session_duration
    - completion_ratio
    - engagement_score
    - visit_intensity
    - genre_diversity (Shannon entropy of genre preferences)
    """
    def __init__(self):
        self.feature_names_in_ = []
        self.engineered_feature_names_ = [
            "feat_avg_session_duration",
            "feat_completion_ratio",
            "feat_engagement_score",
            "feat_visit_intensity",
            "feat_genre_diversity"
        ]

    def fit(self, X, y=None):
        if isinstance(X, pd.DataFrame):
            self.feature_names_in_ = list(X.columns)
        return self

    def transform(self, X):
        # Convert to DataFrame if NumPy array
        if not isinstance(X, pd.DataFrame):
            df = pd.DataFrame(X, columns=self.feature_names_in_ if self.feature_names_in_ else None)
        else:
            df = X.copy()

        # Extract or derive key base variables with robust fallbacks
        watch_time = self._get_col_or_default(df, ["watch_time", "total_watch_time"], default=600.0)
        sessions = self._get_col_or_default(df, ["number_of_sessions", "total_sessions"], default=15.0)
        session_duration = self._get_col_or_default(df, ["session_duration", "avg_session_length"], default=40.0)
        visit_freq = self._get_col_or_default(df, ["visit_frequency", "visit_count"], default=10.0)
        completion_rate = self._get_col_or_default(df, ["completion_rate", "completion_ratio"], default=0.70)

        # 1. average_session_duration (mins)
        # Avoid division by zero
        safe_sessions = np.where(sessions > 0, sessions, 1.0)
        avg_session_dur = np.where(df.get("watch_time") is not None, watch_time / safe_sessions, session_duration)
        avg_session_dur = np.clip(avg_session_dur, 1.0, 360.0)

        # 2. completion_ratio (0.0 to 1.0)
        comp_ratio = np.clip(completion_rate, 0.0, 1.0)

        # 3. engagement_score: Normalized composite engagement metric [0, 1]
        norm_visit = np.clip(visit_freq / 30.0, 0.0, 1.0)
        norm_watch = np.clip(watch_time / 3600.0, 0.0, 1.0)
        engagement_score = (0.40 * norm_visit) + (0.35 * comp_ratio) + (0.25 * norm_watch)

        # 4. visit_intensity: Visits per 7-day week
        visit_intensity = np.clip(visit_freq / 4.3, 0.0, 7.0)

        # 5. genre_diversity: Shannon entropy of genre distribution
        genre_cols = [c for c in ["action_preference", "family_preference", "comedy_preference", "drama_preference"] if c in df.columns]
        if genre_cols:
            genre_matrix = np.clip(df[genre_cols].fillna(0.0).values, 1e-6, 1.0)
            # normalize row-wise
            row_sums = genre_matrix.sum(axis=1, keepdims=True)
            row_sums[row_sums == 0] = 1.0
            probs = genre_matrix / row_sums
            # Entropy = -sum(p * log(p)) / log(num_genres)
            entropy = -np.sum(probs * np.log(probs), axis=1) / np.log(max(len(genre_cols), 2))
            genre_diversity = np.clip(entropy, 0.0, 1.0)
        else:
            genre_diversity = np.full(len(df), 0.5)

        engineered_df = pd.DataFrame({
            "feat_avg_session_duration": avg_session_dur,
            "feat_completion_ratio": comp_ratio,
            "feat_engagement_score": engagement_score,
            "feat_visit_intensity": visit_intensity,
            "feat_genre_diversity": genre_diversity
        }, index=df.index)

        return pd.concat([df, engineered_df], axis=1)

    def _get_col_or_default(self, df: pd.DataFrame, candidate_names: List[str], default: float) -> np.ndarray:
        for name in candidate_names:
            if name in df.columns:
                return pd.to_numeric(df[name], errors="coerce").fillna(default).values
        return np.full(len(df), default)


def inspect_and_validate_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Validates dataset format, identifies columns, handles duplicates,
    and returns a clean dictionary of metadata and sanitized features.
    """
    if df.empty:
        raise ValueError("Provided dataset is empty. Please supply a valid tabular dataset.")

    validation_summary = {
        "initial_rows": len(df),
        "initial_columns": list(df.columns),
        "missing_values": df.isnull().sum().to_dict(),
        "duplicate_rows": int(df.duplicated().sum()),
        "identifier_columns": [],
        "numerical_columns": [],
        "categorical_columns": [],
        "warnings": []
    }

    # Identify and flag identifier columns
    for col in df.columns:
        col_lower = col.lower().strip()
        if col_lower in IDENTIFIER_PATTERNS or col_lower.endswith("_id") or col_lower.startswith("id_"):
            validation_summary["identifier_columns"].append(col)
        elif pd.api.types.is_numeric_dtype(df[col]):
            validation_summary["numerical_columns"].append(col)
        else:
            # Check unique cardinality
            if df[col].nunique() < 50:
                validation_summary["categorical_columns"].append(col)
            else:
                validation_summary["identifier_columns"].append(col)
                validation_summary["warnings"].append(f"Column '{col}' has high cardinality text; treated as identifier.")

    if not validation_summary["numerical_columns"]:
        raise ValueError("Dataset does not contain any valid numerical behavioral features.")

    return validation_summary


def build_full_preprocessing_pipeline(numerical_features: List[str], categorical_features: List[str]) -> Tuple[Pipeline, List[str]]:
    """
    Builds an end-to-end ColumnTransformer & Pipeline:
    1. Feature Engineering step
    2. Numerical Imputation + Standard Scaling
    3. Categorical Imputation + OneHotEncoding
    Returns: (pipeline, processed_feature_names)
    """
    engineered_features = [
        "feat_avg_session_duration",
        "feat_completion_ratio",
        "feat_engagement_score",
        "feat_visit_intensity",
        "feat_genre_diversity"
    ]
    all_numerical = list(numerical_features) + engineered_features

    num_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ])

    transformers = [
        ("num", num_pipeline, all_numerical)
    ]

    if categorical_features:
        cat_pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
        ])
        transformers.append(("cat", cat_pipeline, categorical_features))

    preprocessor = ColumnTransformer(
        transformers=transformers,
        remainder="drop"
    )

    full_pipeline = Pipeline([
        ("engineer", OTTFeatureEngineer()),
        ("preprocess", preprocessor)
    ])

    return full_pipeline, all_numerical
