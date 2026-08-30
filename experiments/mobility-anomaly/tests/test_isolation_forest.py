from inspect import signature

from territorial_ml.contracts import validate_mobility_anomaly_candidate
from territorial_ml.features import aggregate_features
from territorial_ml.isolation_forest import (
    ISOLATION_FOREST_CONFIG,
    detect_isolation_forest_candidates,
)


def mobility_records():
    rows = []
    for segment_index, segment_id in enumerate(("segment-a", "segment-b", "segment-c")):
        for minute in range(6):
            speed = 50.0 - segment_index * 2.0
            acceleration = 0.1
            dwell = 4.0
            offset = 0.5
            if segment_id == "segment-b" and minute < 4:
                speed = 12.0
                acceleration = -3.5
            if segment_id == "segment-c" and minute == 1:
                dwell = 420.0
                offset = 18.0
            rows.append(
                {
                    "observation_id": f"obs-{segment_index}-{minute}",
                    "vehicle_id": f"truck-{minute + 1}",
                    "segment_id": segment_id,
                    "timestamp": f"2026-08-30T09:{segment_index * 10 + minute:02d}:00-03:00",
                    "distance_m": float(segment_index * 1000),
                    "speed_kmh": speed,
                    "acceleration_mps2": acceleration,
                    "dwell_seconds": dwell,
                    "lateral_offset_m": offset,
                }
            )
    return rows


def test_isolation_forest_configuration_is_explicit_and_deterministic():
    assert ISOLATION_FOREST_CONFIG["random_state"] == 42
    assert ISOLATION_FOREST_CONFIG["contamination"] == "auto"
    assert ISOLATION_FOREST_CONFIG["n_estimators"] == 200


def test_fixed_random_state_produces_deterministic_candidate_ordering_and_strict_contracts():
    records = mobility_records()

    first = detect_isolation_forest_candidates(
        records,
        dataset_artifact_ref="public/data/agua-negra-v0/mobility.synthetic.json",
    )
    second = detect_isolation_forest_candidates(
        records,
        dataset_artifact_ref="public/data/agua-negra-v0/mobility.synthetic.json",
    )

    assert first == second
    assert [candidate["candidateId"] for candidate in first] == sorted(
        candidate["candidateId"] for candidate in first
    )
    assert first

    for candidate in first:
        validate_mobility_anomaly_candidate(candidate)
        assert candidate["detector"] == "ISOLATION_FOREST"
        assert candidate["evidenceState"] == "SYNTHETIC_EXPERIMENT"
        assert "anomalyScore" in candidate
        assert "risk" not in candidate
        assert "risk_score" not in candidate
        assert "confidence" not in candidate
        assert "road_defect" not in candidate


def test_training_api_has_no_ground_truth_or_label_input():
    parameters = signature(detect_isolation_forest_candidates).parameters
    names = set(parameters)

    assert "ground_truth" not in names
    assert "ground_truth_labels" not in names
    assert "labels" not in names
    assert "y" not in names

    # Feature aggregation itself also consumes only mobility observations.
    feature_rows = aggregate_features(mobility_records())
    assert feature_rows
