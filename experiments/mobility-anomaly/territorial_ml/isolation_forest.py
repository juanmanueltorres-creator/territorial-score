from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from sklearn.ensemble import IsolationForest

from .contracts import MobilityRecord, validate_mobility_anomaly_candidate
from .features import FEATURE_NAMES, aggregate_features, feature_matrix

ISOLATION_FOREST_CONFIG = {
    "n_estimators": 200,
    "contamination": "auto",
    "random_state": 42,
}

_DETECTOR_VERSION = "0.1.0"
_MODEL_ARTIFACT_REF = "sklearn:IsolationForest:v0.1.0"


def _format_feature(name: str, value: Any) -> str:
    if name in {"hard_brake_count", "vehicles_observed"}:
        return f"{name}={int(value)}"
    return f"{name}={float(value):.6f}"


def detect_isolation_forest_candidates(
    mobility: Iterable[MobilityRecord],
    *,
    dataset_artifact_ref: str,
) -> list[dict[str, Any]]:
    rows = aggregate_features(mobility)
    if len(rows) < 2:
        return []

    matrix = feature_matrix(rows)
    model = IsolationForest(**ISOLATION_FOREST_CONFIG)
    labels = model.fit_predict(matrix)
    anomaly_scores = -model.decision_function(matrix)

    candidates: list[dict[str, Any]] = []
    for row, label, score in zip(rows, labels, anomaly_scores, strict=True):
        if int(label) != -1:
            continue

        candidate = {
            "schemaVersion": "0.1",
            "candidateId": f"iforest:{row['segment_id']}:{row['window_start']}",
            "segmentId": row["segment_id"],
            "timeWindow": {
                "start": row["window_start"],
                "end": row["window_end"],
            },
            "detector": "ISOLATION_FOREST",
            "detectorVersion": _DETECTOR_VERSION,
            "anomalyScore": round(float(score), 9),
            "supportingFeatures": [
                _format_feature(name, row[name]) for name in FEATURE_NAMES
            ],
            "vehiclesObserved": int(row["vehicles_observed"]),
            "modelArtifactRef": _MODEL_ARTIFACT_REF,
            "datasetArtifactRef": dataset_artifact_ref,
            "limitations": [
                "Unsupervised Isolation Forest ranks unusual five-minute mobility feature windows only.",
                "The model is trained without synthetic ground-truth labels and is not tuned against them.",
                "Anomaly candidate is not a road defect, road status, confidence score, risk score, or travel-safety determination.",
            ],
            "evidenceState": "SYNTHETIC_EXPERIMENT",
        }
        validate_mobility_anomaly_candidate(candidate)
        candidates.append(candidate)

    return sorted(candidates, key=lambda candidate: candidate["candidateId"])
