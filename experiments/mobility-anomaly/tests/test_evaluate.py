import pytest

from territorial_ml.evaluate import evaluate_candidate_ids, evaluate_candidate_windows


def test_evaluate_candidate_ids_reports_common_detection_metrics():
    metrics = evaluate_candidate_ids(
        predicted_ids={"anom-01", "anom-02"},
        ground_truth_ids={"anom-02", "anom-03"},
    )

    assert metrics == {
        "precision": 0.5,
        "recall": 0.5,
        "f1": 0.5,
        "false_positives": 1,
        "false_negatives": 1,
        "true_positives": 1,
    }
    assert "accuracy" not in metrics


def test_evaluate_candidate_ids_handles_empty_denominators_without_nan():
    metrics = evaluate_candidate_ids(predicted_ids=set(), ground_truth_ids=set())

    assert metrics["precision"] == 0.0
    assert metrics["recall"] == 0.0
    assert metrics["f1"] == 0.0
    assert metrics["false_positives"] == 0
    assert metrics["false_negatives"] == 0
    assert metrics["true_positives"] == 0


def test_window_evaluation_matches_segment_and_time_overlap_one_to_one():
    candidates = [
        {
            "candidateId": "pred-1",
            "segmentId": "segment-a",
            "timeWindow": {
                "start": "2026-08-30T09:01:00-03:00",
                "end": "2026-08-30T09:04:00-03:00",
            },
        },
        {
            "candidateId": "pred-2",
            "segmentId": "segment-a",
            "timeWindow": {
                "start": "2026-08-30T09:02:00-03:00",
                "end": "2026-08-30T09:03:00-03:00",
            },
        },
        {
            "candidateId": "pred-3",
            "segmentId": "segment-c",
            "timeWindow": {
                "start": "2026-08-30T09:11:00-03:00",
                "end": "2026-08-30T09:14:00-03:00",
            },
        },
    ]
    truth = [
        {
            "anomaly_id": "anom-01",
            "segment_id": "segment-a",
            "start": "2026-08-30T09:00:00-03:00",
            "end": "2026-08-30T09:05:00-03:00",
        },
        {
            "anomaly_id": "anom-02",
            "segment_id": "segment-b",
            "start": "2026-08-30T09:10:00-03:00",
            "end": "2026-08-30T09:15:00-03:00",
        },
    ]

    metrics = evaluate_candidate_windows(candidates, truth)

    assert metrics["true_positives"] == 1
    assert metrics["false_positives"] == 2
    assert metrics["false_negatives"] == 1
    assert metrics["precision"] == pytest.approx(1 / 3)
    assert metrics["recall"] == pytest.approx(0.5)
    assert metrics["f1"] == pytest.approx(0.4)
    assert "accuracy" not in metrics
