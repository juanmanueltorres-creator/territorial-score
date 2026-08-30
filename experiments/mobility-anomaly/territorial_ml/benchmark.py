from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np

from .contracts import AnomalyFamily, GroundTruthWindow, MobilityRecord

GENERATOR_VERSION = "0.1.0"
ARTIFACT_TIMESTAMP = "2026-08-30T09:00:00-03:00"
ANOMALY_FAMILIES: tuple[AnomalyFamily, ...] = (
    "repeated_slowdown",
    "hard_braking_cluster",
    "unexpected_dwell",
    "controlled_route_deviation",
)

SEGMENTS: tuple[tuple[str, float], ...] = (
    ("an-las-flores", 0.0),
    ("an-nodo-bajo", 17846.0),
    ("an-nodo-medio", 40154.0),
    ("an-nodo-alto", 66626.0),
    ("an-paso-agua-negra", 88934.0),
)
VEHICLES: tuple[str, ...] = tuple(f"truck-{index:02d}" for index in range(1, 9))


def normalized_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _rng_for_seed(seed: str) -> np.random.Generator:
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    integer_seed = int.from_bytes(digest[:8], "big", signed=False)
    return np.random.default_rng(integer_seed)


def _iso(moment: datetime) -> str:
    return moment.isoformat(timespec="seconds")


def _truth_windows(base: datetime) -> list[GroundTruthWindow]:
    declarations: tuple[tuple[AnomalyFamily, str, int, tuple[str, ...]], ...] = (
        ("repeated_slowdown", "an-nodo-bajo", 20, ("truck-01", "truck-02", "truck-03", "truck-04")),
        ("hard_braking_cluster", "an-nodo-medio", 40, ("truck-03", "truck-04", "truck-05", "truck-06")),
        ("unexpected_dwell", "an-nodo-alto", 60, ("truck-02", "truck-07")),
        ("controlled_route_deviation", "an-paso-agua-negra", 80, ("truck-05", "truck-08")),
    )

    windows: list[GroundTruthWindow] = []
    for index, (family, segment_id, minute_offset, vehicle_ids) in enumerate(declarations, start=1):
        start = base + timedelta(minutes=minute_offset)
        end = start + timedelta(minutes=15)
        windows.append(
            {
                "anomaly_id": f"anom-{index:02d}",
                "family": family,
                "segment_id": segment_id,
                "start": _iso(start),
                "end": _iso(end),
                "affected_vehicle_ids": list(vehicle_ids),
            }
        )
    return windows


def _is_affected(window: GroundTruthWindow, segment_id: str, vehicle_id: str) -> bool:
    return window["segment_id"] == segment_id and vehicle_id in window["affected_vehicle_ids"]


def build_benchmark(seed: str) -> tuple[dict[str, Any], dict[str, Any]]:
    if not seed.strip():
        raise ValueError("seed must be non-empty")

    rng = _rng_for_seed(seed)
    local_tz = timezone(timedelta(hours=-3))
    base = datetime(2026, 8, 30, 9, 0, 0, tzinfo=local_tz)
    truth_windows = _truth_windows(base)
    truth_by_family = {window["family"]: window for window in truth_windows}

    records: list[MobilityRecord] = []
    for segment_index, (segment_id, distance_m) in enumerate(SEGMENTS):
        base_speed = 56.0 - segment_index * 4.5
        for vehicle_index, vehicle_id in enumerate(VEHICLES):
            timestamp = base + timedelta(minutes=segment_index * 20 + vehicle_index)
            speed = max(5.0, base_speed + float(rng.normal(0.0, 2.4)))
            acceleration = float(rng.normal(0.0, 0.25))
            dwell_seconds = max(0.0, float(rng.normal(8.0, 4.0)))
            lateral_offset = abs(float(rng.normal(0.8, 0.45)))

            if _is_affected(truth_by_family["repeated_slowdown"], segment_id, vehicle_id):
                speed *= 0.55
            if _is_affected(truth_by_family["hard_braking_cluster"], segment_id, vehicle_id):
                speed *= 0.72
                acceleration = -3.5 + float(rng.normal(0.0, 0.18))
            if _is_affected(truth_by_family["unexpected_dwell"], segment_id, vehicle_id):
                speed = max(0.0, speed * 0.08)
                dwell_seconds = 420.0 + abs(float(rng.normal(0.0, 18.0)))
            if _is_affected(truth_by_family["controlled_route_deviation"], segment_id, vehicle_id):
                lateral_offset = 18.0 + abs(float(rng.normal(0.0, 1.8)))

            records.append(
                {
                    "observation_id": f"obs-{segment_index:02d}-{vehicle_index + 1:02d}",
                    "vehicle_id": vehicle_id,
                    "segment_id": segment_id,
                    "timestamp": _iso(timestamp),
                    "distance_m": round(distance_m, 3),
                    "speed_kmh": round(speed, 3),
                    "acceleration_mps2": round(acceleration, 3),
                    "dwell_seconds": round(dwell_seconds, 3),
                    "lateral_offset_m": round(lateral_offset, 3),
                }
            )

    mobility = {
        "schema_version": "0.1",
        "artifact_kind": "SYNTHETIC ANOMALY BENCHMARK",
        "dataset_id": "agua-negra-v0",
        "seed": seed,
        "generator_version": GENERATOR_VERSION,
        "generated_at": ARTIFACT_TIMESTAMP,
        "evidence_state": "SIMULATED",
        "records": records,
        "limitations": [
            "Synthetic observations are for detector benchmarking only.",
            "Records do not describe real vehicles, traffic, road condition or travel safety.",
            "Injected anomaly labels are intentionally excluded from model input records.",
        ],
    }
    truth = {
        "schema_version": "0.1",
        "artifact_kind": "SYNTHETIC ANOMALY GROUND TRUTH",
        "dataset_id": "agua-negra-v0",
        "seed": seed,
        "generator_version": GENERATOR_VERSION,
        "generated_at": ARTIFACT_TIMESTAMP,
        "evidence_state": "SYNTHETIC_EXPERIMENT",
        "windows": truth_windows,
        "limitations": [
            "Ground truth exists only because anomalies were deliberately injected into synthetic data.",
            "Ground truth is evaluation metadata and must not be used as a model input feature.",
        ],
    }
    return mobility, truth
