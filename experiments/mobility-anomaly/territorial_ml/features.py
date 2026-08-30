from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable, Mapping, Sequence
from datetime import datetime, timedelta
from statistics import median
from typing import Any

import numpy as np

from .contracts import MobilityRecord

FEATURE_NAMES = (
    "median_speed",
    "speed_variance",
    "mean_acceleration",
    "acceleration_variance",
    "hard_brake_count",
    "stop_duration",
    "trajectory_deviation",
    "vehicles_observed",
)

_METADATA_KEYS = {"segment_id", "window_start", "window_end"}
_HARD_BRAKE_THRESHOLD_MPS2 = -3.0
_WINDOW_MINUTES = 5


def _parse_timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("mobility timestamp must include an explicit timezone")
    return parsed


def _window_start(timestamp: datetime) -> datetime:
    minute = timestamp.minute - (timestamp.minute % _WINDOW_MINUTES)
    return timestamp.replace(minute=minute, second=0, microsecond=0)


def _iso(value: datetime) -> str:
    return value.isoformat(timespec="seconds")


def aggregate_features(records: Iterable[MobilityRecord]) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, datetime], list[MobilityRecord]] = defaultdict(list)

    for record in records:
        segment_id = str(record["segment_id"]).strip()
        if not segment_id:
            raise ValueError("segment_id must be non-empty")
        timestamp = _parse_timestamp(str(record["timestamp"]))
        grouped[(segment_id, _window_start(timestamp))].append(record)

    rows: list[dict[str, Any]] = []
    for (segment_id, start), group in sorted(grouped.items(), key=lambda item: (item[0][0], item[0][1])):
        speeds = np.asarray([float(record["speed_kmh"]) for record in group], dtype=float)
        accelerations = np.asarray([float(record["acceleration_mps2"]) for record in group], dtype=float)
        dwell = np.asarray([float(record["dwell_seconds"]) for record in group], dtype=float)
        offsets = np.asarray([abs(float(record["lateral_offset_m"])) for record in group], dtype=float)
        vehicles = {str(record["vehicle_id"]) for record in group}

        rows.append(
            {
                "segment_id": segment_id,
                "window_start": _iso(start),
                "window_end": _iso(start + timedelta(minutes=_WINDOW_MINUTES)),
                "median_speed": float(median(speeds.tolist())),
                "speed_variance": float(np.var(speeds)),
                "mean_acceleration": float(np.mean(accelerations)),
                "acceleration_variance": float(np.var(accelerations)),
                "hard_brake_count": int(np.sum(accelerations <= _HARD_BRAKE_THRESHOLD_MPS2)),
                "stop_duration": float(np.sum(dwell)),
                "trajectory_deviation": float(np.max(offsets)),
                "vehicles_observed": len(vehicles),
            }
        )

    return rows


def feature_matrix(rows: Sequence[Mapping[str, Any]]) -> np.ndarray:
    for row in rows:
        unknown = set(row) - _METADATA_KEYS - set(FEATURE_NAMES)
        if unknown:
            raise ValueError(f"undeclared feature(s): {', '.join(sorted(unknown))}")
        missing = set(FEATURE_NAMES) - set(row)
        if missing:
            raise ValueError(f"missing declared feature(s): {', '.join(sorted(missing))}")

    if not rows:
        return np.empty((0, len(FEATURE_NAMES)), dtype=float)

    return np.asarray([[float(row[name]) for name in FEATURE_NAMES] for row in rows], dtype=float)
