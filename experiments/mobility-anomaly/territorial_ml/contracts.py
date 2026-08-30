from __future__ import annotations

from typing import Literal, TypedDict

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
