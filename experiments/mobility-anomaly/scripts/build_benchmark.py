from __future__ import annotations

import argparse
from pathlib import Path

from territorial_ml.benchmark import build_benchmark, normalized_json


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(normalized_json(payload) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build deterministic Territorial Score mobility benchmark artifacts.")
    parser.add_argument("--seed", required=True)
    parser.add_argument("--mobility-output", required=True, type=Path)
    parser.add_argument("--truth-output", required=True, type=Path)
    args = parser.parse_args()

    mobility, truth = build_benchmark(args.seed)
    write_json(args.mobility_output, mobility)
    write_json(args.truth_output, truth)


if __name__ == "__main__":
    main()
