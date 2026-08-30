from __future__ import annotations

import argparse
import json
from pathlib import Path

from territorial_ml.evaluate import evaluate_candidate_windows


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate rule and ML candidates against synthetic ground truth.")
    parser.add_argument("--ground-truth", required=True, type=Path)
    parser.add_argument("--rule-candidates", required=True, type=Path)
    parser.add_argument("--ml-candidates", required=True, type=Path)
    args = parser.parse_args()

    truth_payload = read_json(args.ground_truth)
    truth = truth_payload.get("windows") if isinstance(truth_payload, dict) else None
    if not isinstance(truth, list):
        raise ValueError("ground truth artifact must contain a windows array")

    result = {
        "rule": evaluate_candidate_windows(read_json(args.rule_candidates), truth),
        "isolation_forest": evaluate_candidate_windows(read_json(args.ml_candidates), truth),
    }
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
