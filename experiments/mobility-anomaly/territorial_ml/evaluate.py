from __future__ import annotations

from collections.abc import Iterable, Mapping
from datetime import datetime
from typing import Any, TypedDict


class EvaluationMetrics(TypedDict):
    precision: float
    recall: float
    f1: float
    false_positives: int
    false_negatives: int
    true_positives: int


def _metrics(true_positives: int, false_positives: int, false_negatives: int) -> EvaluationMetrics:
    precision_denominator = true_positives + false_positives
    recall_denominator = true_positives + false_negatives
    precision = true_positives / precision_denominator if precision_denominator else 0.0
    recall = true_positives / recall_denominator if recall_denominator else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0

    return {
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "false_positives": false_positives,
        "false_negatives": false_negatives,
        "true_positives": true_positives,
    }


def evaluate_candidate_ids(
    predicted_ids: Iterable[str],
    ground_truth_ids: Iterable[str],
) -> EvaluationMetrics:
    predicted = set(predicted_ids)
    ground_truth = set(ground_truth_ids)

    if any(not isinstance(value, str) or not value.strip() for value in predicted | ground_truth):
        raise ValueError("candidate ids must be non-empty strings")

    return _metrics(
        true_positives=len(predicted & ground_truth),
        false_positives=len(predicted - ground_truth),
        false_negatives=len(ground_truth - predicted),
    )


def _parse_timestamp(value: Any, field: str) -> datetime:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} must be a non-empty timestamp")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{field} must be valid ISO-8601") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError(f"{field} must include an explicit timezone")
    return parsed


def _overlap_seconds(start_a: datetime, end_a: datetime, start_b: datetime, end_b: datetime) -> float:
    return max(0.0, (min(end_a, end_b) - max(start_a, start_b)).total_seconds())


def evaluate_candidate_windows(
    candidates: Iterable[Mapping[str, Any]],
    ground_truth_windows: Iterable[Mapping[str, Any]],
) -> EvaluationMetrics:
    truth = sorted(
        list(ground_truth_windows),
        key=lambda window: str(window.get("anomaly_id", "")),
    )
    unmatched_truth = set(range(len(truth)))
    true_positives = 0
    false_positives = 0

    for candidate in sorted(candidates, key=lambda item: str(item.get("candidateId", ""))):
        candidate_id = candidate.get("candidateId")
        segment_id = candidate.get("segmentId")
        time_window = candidate.get("timeWindow")
        if not isinstance(candidate_id, str) or not candidate_id.strip():
            raise ValueError("candidateId must be a non-empty string")
        if not isinstance(segment_id, str) or not segment_id.strip():
            raise ValueError("segmentId must be a non-empty string")
        if not isinstance(time_window, Mapping):
            raise ValueError("timeWindow must be an object")

        candidate_start = _parse_timestamp(time_window.get("start"), "timeWindow.start")
        candidate_end = _parse_timestamp(time_window.get("end"), "timeWindow.end")
        if candidate_end <= candidate_start:
            raise ValueError("candidate timeWindow.end must be after start")

        eligible: list[tuple[float, str, int]] = []
        for index in unmatched_truth:
            window = truth[index]
            if window.get("segment_id") != segment_id:
                continue
            truth_start = _parse_timestamp(window.get("start"), "ground_truth.start")
            truth_end = _parse_timestamp(window.get("end"), "ground_truth.end")
            overlap = _overlap_seconds(candidate_start, candidate_end, truth_start, truth_end)
            if overlap > 0:
                eligible.append((overlap, str(window.get("anomaly_id", "")), index))

        if not eligible:
            false_positives += 1
            continue

        _, _, matched_index = max(eligible, key=lambda item: (item[0], item[1]))
        unmatched_truth.remove(matched_index)
        true_positives += 1

    return _metrics(
        true_positives=true_positives,
        false_positives=false_positives,
        false_negatives=len(unmatched_truth),
    )
