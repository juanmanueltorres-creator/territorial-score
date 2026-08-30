from __future__ import annotations

import math
from datetime import datetime
from typing import Any, Literal, TypedDict

AnomalyFamily = Literal[
    "repeated_slowdown",
    "hard_braking_cluster",
    "unexpected_dwell",
    "controlled_route_deviation",
]


class MobilityRecord(TypedDict):
    observation_id: str
    vehicle_id: str
    segment_id: str
    timestamp: str
    distance_m: float
    speed_kmh: float
    acceleration_mps2: float
    dwell_seconds: float
    lateral_offset_m: float


class GroundTruthWindow(TypedDict):
    anomaly_id: str
    family: AnomalyFamily
    segment_id: str
    start: str
    end: str
    affected_vehicle_ids: list[str]


_REQUIRED_CANDIDATE_KEYS = {
    "schemaVersion",
    "candidateId",
    "segmentId",
    "timeWindow",
    "detector",
    "detectorVersion",
    "supportingFeatures",
    "vehiclesObserved",
    "datasetArtifactRef",
    "limitations",
    "evidenceState",
}
_OPTIONAL_CANDIDATE_KEYS = {"anomalyScore", "modelArtifactRef"}
_ALLOWED_DETECTORS = {"RULE", "ISOLATION_FOREST"}


def _non_empty_string(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be a non-empty string")
    return value


def _offset_timestamp(value: Any, field: str) -> datetime:
    text = _non_empty_string(value, field)
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{field} must be valid ISO-8601") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError(f"{field} must include an explicit timezone")
    return parsed


def _non_empty_string_list(value: Any, field: str) -> list[str]:
    if not isinstance(value, list) or not value:
        raise ValueError(f"{field} must be a non-empty list")
    for item in value:
        _non_empty_string(item, field)
    return value


def validate_mobility_anomaly_candidate(candidate: Any) -> dict[str, Any]:
    if not isinstance(candidate, dict):
        raise ValueError("candidate must be an object")

    keys = set(candidate)
    missing = _REQUIRED_CANDIDATE_KEYS - keys
    unknown = keys - _REQUIRED_CANDIDATE_KEYS - _OPTIONAL_CANDIDATE_KEYS
    if missing:
        raise ValueError(f"candidate missing required field(s): {', '.join(sorted(missing))}")
    if unknown:
        raise ValueError(f"candidate has undeclared field(s): {', '.join(sorted(unknown))}")

    if candidate["schemaVersion"] != "0.1":
        raise ValueError("schemaVersion must be 0.1")
    _non_empty_string(candidate["candidateId"], "candidateId")
    _non_empty_string(candidate["segmentId"], "segmentId")

    time_window = candidate["timeWindow"]
    if not isinstance(time_window, dict) or set(time_window) != {"start", "end"}:
        raise ValueError("timeWindow must contain exactly start and end")
    start = _offset_timestamp(time_window["start"], "timeWindow.start")
    end = _offset_timestamp(time_window["end"], "timeWindow.end")
    if end <= start:
        raise ValueError("timeWindow.end must be after timeWindow.start")

    if candidate["detector"] not in _ALLOWED_DETECTORS:
        raise ValueError("detector must be RULE or ISOLATION_FOREST")
    _non_empty_string(candidate["detectorVersion"], "detectorVersion")

    if "anomalyScore" in candidate:
        score = candidate["anomalyScore"]
        if isinstance(score, bool) or not isinstance(score, (int, float)) or not math.isfinite(float(score)):
            raise ValueError("anomalyScore must be finite")

    _non_empty_string_list(candidate["supportingFeatures"], "supportingFeatures")
    vehicles = candidate["vehiclesObserved"]
    if isinstance(vehicles, bool) or not isinstance(vehicles, int) or vehicles < 1:
        raise ValueError("vehiclesObserved must be an integer >= 1")

    if "modelArtifactRef" in candidate:
        _non_empty_string(candidate["modelArtifactRef"], "modelArtifactRef")
    _non_empty_string(candidate["datasetArtifactRef"], "datasetArtifactRef")
    _non_empty_string_list(candidate["limitations"], "limitations")

    if candidate["evidenceState"] != "SYNTHETIC_EXPERIMENT":
        raise ValueError("evidenceState must be SYNTHETIC_EXPERIMENT")

    return candidate
