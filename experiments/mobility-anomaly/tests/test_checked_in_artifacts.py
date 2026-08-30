import json
from pathlib import Path

from territorial_ml.benchmark import build_benchmark, normalized_json

CANONICAL_SEED = "territorial-score:agua-negra:mobility:v0.1"
REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "public" / "data" / "agua-negra-v0"


def test_checked_in_benchmark_artifacts_are_exact_generator_output():
    expected_mobility, expected_truth = build_benchmark(CANONICAL_SEED)
    mobility_path = DATA_DIR / "mobility.synthetic.json"
    truth_path = DATA_DIR / "anomaly-ground-truth.synthetic.json"

    assert mobility_path.read_text(encoding="utf-8") == normalized_json(expected_mobility) + "\n"
    assert truth_path.read_text(encoding="utf-8") == normalized_json(expected_truth) + "\n"

    assert json.loads(mobility_path.read_text(encoding="utf-8"))["seed"] == CANONICAL_SEED
    assert json.loads(truth_path.read_text(encoding="utf-8"))["seed"] == CANONICAL_SEED
