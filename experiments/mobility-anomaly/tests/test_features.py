import pytest

from territorial_ml.features import FEATURE_NAMES, aggregate_features, feature_matrix


ALLOWED_FEATURES = (
    "median_speed",
    "speed_variance",
    "mean_acceleration",
    "acceleration_variance",
    "hard_brake_count",
    "stop_duration",
    "trajectory_deviation",
    "vehicles_observed",
)

FORBIDDEN_FEATURES = {
    "weather",
    "precipitation",
    "elevation",
    "slope",
    "access_state",
    "road_condition",
}


def mobility_record(
    observation_id: str,
    vehicle_id: str,
    timestamp: str,
    speed_kmh: float,
    acceleration_mps2: float,
    dwell_seconds: float,
    lateral_offset_m: float,
):
    return {
        "observation_id": observation_id,
        "vehicle_id": vehicle_id,
        "segment_id": "segment-a",
        "timestamp": timestamp,
        "distance_m": 1000.0,
        "speed_kmh": speed_kmh,
        "acceleration_mps2": acceleration_mps2,
        "dwell_seconds": dwell_seconds,
        "lateral_offset_m": lateral_offset_m,
    }


def test_feature_vector_is_exactly_the_v0_declared_mobility_features():
    assert FEATURE_NAMES == ALLOWED_FEATURES
    assert FORBIDDEN_FEATURES.isdisjoint(FEATURE_NAMES)


def test_aggregate_features_uses_segment_and_five_minute_windows_only():
    rows = aggregate_features(
        [
            mobility_record("obs-1", "truck-1", "2026-08-30T09:01:00-03:00", 40.0, -3.2, 10.0, 1.0),
            mobility_record("obs-2", "truck-2", "2026-08-30T09:04:00-03:00", 20.0, -0.2, 20.0, 5.0),
            mobility_record("obs-3", "truck-3", "2026-08-30T09:06:00-03:00", 60.0, 0.4, 5.0, 2.0),
        ]
    )

    assert len(rows) == 2
    first = rows[0]
    assert first["segment_id"] == "segment-a"
    assert first["window_start"] == "2026-08-30T09:00:00-03:00"
    assert first["window_end"] == "2026-08-30T09:05:00-03:00"
    assert first["median_speed"] == 30.0
    assert first["speed_variance"] == 100.0
    assert first["mean_acceleration"] == pytest.approx(-1.7)
    assert first["acceleration_variance"] == pytest.approx(2.25)
    assert first["hard_brake_count"] == 1
    assert first["stop_duration"] == 30.0
    assert first["trajectory_deviation"] == 5.0
    assert first["vehicles_observed"] == 2


def test_feature_matrix_rejects_any_undeclared_feature():
    row = {
        "segment_id": "segment-a",
        "window_start": "2026-08-30T09:00:00-03:00",
        "window_end": "2026-08-30T09:05:00-03:00",
        **{name: 1.0 for name in ALLOWED_FEATURES},
        "weather": 1.0,
    }

    with pytest.raises(ValueError, match="undeclared feature"):
        feature_matrix([row])
