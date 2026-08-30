from __future__ import annotations

from collections.abc import Iterable
from typing import TypedDict


class EvaluationMetrics(TypedDict):
    precision: float
    recall: float
    f1: float
    false_positives: int
    false_negatives: int
    true_positives: int


def evaluate_candidate_ids(
    predicted_ids: Iterable[str],
    ground_truth_ids: Iterable[str],
) -> EvaluationMetrics:
    predicted = set(predicted_ids)
    ground_truth = set(ground_truth_ids)

    if any(not isinstance(value, str) or not value.strip() for value in predicted | ground_truth):
        raise ValueError("candidate ids must be non-empty strings")

    true_positives = len(predicted & ground_truth)
    false_positives = len(predicted - ground_truth)
    false_negatives = len(ground_truth - predicted)

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
