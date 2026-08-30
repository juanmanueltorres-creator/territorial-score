from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from territorial_ml.isolation_forest import detect_isolation_forest_candidates

DEFAULT_DATASET_ARTIFACT_REF = "public/data/agua-negra-v0/mobility.synthetic.json"


def load_records(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    records = payload.get("records") if isinstance(payload, dict) else None
    if not isinstance(records, list):
        raise ValueError("input benchmark must contain a records array")
    return records


def export_candidates(input_path: Path, output_path: Path, dataset_artifact_ref: str) -> None:
    candidates = detect_isolation_forest_candidates(
        load_records(input_path),
        dataset_artifact_ref=dataset_artifact_ref,
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(candidates, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Train deterministic Isolation Forest and export candidate artifact.")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--dataset-artifact-ref", default=DEFAULT_DATASET_ARTIFACT_REF)
    args = parser.parse_args()

    export_candidates(args.input, args.output, args.dataset_artifact_ref)


if __name__ == "__main__":
    main()
