from territorial_ml.evaluate import evaluate_candidate_ids


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
