import json

import pytest

from territorial_ml.benchmark import ANOMALY_FAMILIES, build_benchmark, normalized_json

CANONICAL_SEED = "territorial-score:agua-negra:mobility:v0.1"
FORBIDDEN_OPERATIONAL_FIELDS = {"road_defect", "safe_to_travel", "risk_score"}


def all_keys(value):
    if isinstance(value, dict):
        keys = set(value)
        for nested in value.values():
            keys.update(all_keys(nested))
        return keys
    if isinstance(value, list):
        keys = set()
        for nested in value:
            keys.update(all_keys(nested))
        return keys
    return set()


def test_same_seed_is_byte_equivalent_after_normalization():
    first_mobility, first_truth = build_benchmark(CANONICAL_SEED)
    second_mobility, second_truth = build_benchmark(CANONICAL_SEED)

    assert normalized_json(first_mobility) == normalized_json(second_mobility)
    assert normalized_json(first_truth) == normalized_json(second_truth)


def test_different_seed_changes_generated_mobility():
    first_mobility, _ = build_benchmark(CANONICAL_SEED)
    second_mobility, _ = build_benchmark(f"{CANONICAL_SEED}:alternate")

    assert normalized_json(first_mobility) != normalized_json(second_mobility)


def test_ground_truth_contains_exactly_the_declared_anomaly_families():
    _, truth = build_benchmark(CANONICAL_SEED)

    families = [window["family"] for window in truth["windows"]]
    assert families == list(ANOMALY_FAMILIES)
    assert len(truth["windows"]) == 4
    assert all(window["start"] < window["end"] for window in truth["windows"])


def test_ground_truth_is_separate_from_model_input_features():
    mobility, truth = build_benchmark(CANONICAL_SEED)
    serialized_records = json.dumps(mobility["records"], sort_keys=True)

    for family in ANOMALY_FAMILIES:
        assert family not in serialized_records
    assert "windows" not in mobility
    assert truth["windows"]


def test_artifacts_declare_synthetic_benchmark_seed_and_version():
    mobility, truth = build_benchmark(CANONICAL_SEED)

    assert mobility["artifact_kind"] == "SYNTHETIC ANOMALY BENCHMARK"
    assert mobility["evidence_state"] == "SIMULATED"
    assert mobility["seed"] == CANONICAL_SEED
    assert mobility["generator_version"] == "0.1.0"
    assert truth["artifact_kind"] == "SYNTHETIC ANOMALY GROUND TRUTH"
    assert truth["seed"] == CANONICAL_SEED
    assert truth["generator_version"] == "0.1.0"


def test_no_operational_claim_fields_are_emitted():
    mobility, truth = build_benchmark(CANONICAL_SEED)

    assert all_keys(mobility).isdisjoint(FORBIDDEN_OPERATIONAL_FIELDS)
    assert all_keys(truth).isdisjoint(FORBIDDEN_OPERATIONAL_FIELDS)


def test_records_are_feature_only_and_numeric_where_expected():
    mobility, _ = build_benchmark(CANONICAL_SEED)
    assert mobility["records"]

    required = {
        "observation_id",
        "vehicle_id",
        "segment_id",
        "timestamp",
        "distance_m",
        "speed_kmh",
        "acceleration_mps2",
        "dwell_seconds",
        "lateral_offset_m",
    }
    for record in mobility["records"]:
        assert set(record) == required
        assert record["speed_kmh"] >= 0
        assert record["dwell_seconds"] >= 0
