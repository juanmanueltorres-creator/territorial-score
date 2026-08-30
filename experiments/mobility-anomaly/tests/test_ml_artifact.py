import json
from pathlib import Path

from territorial_ml.contracts import validate_mobility_anomaly_candidate
from territorial_ml.isolation_forest import detect_isolation_forest_candidates


REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "public" / "data" / "agua-negra-v0"
DATASET_ARTIFACT_REF = "public/data/agua-negra-v0/mobility.synthetic.json"


def test_checked_in_ml_candidates_match_detector_output_and_manifest():
    mobility = json.loads((DATA_DIR / "mobility.synthetic.json").read_text(encoding="utf-8"))
    expected = detect_isolation_forest_candidates(
        mobility["records"],
        dataset_artifact_ref=DATASET_ARTIFACT_REF,
    )

    actual = json.loads((DATA_DIR / "candidates.ml.json").read_text(encoding="utf-8"))
    assert actual == expected
    assert actual
    for candidate in actual:
        validate_mobility_anomaly_candidate(candidate)
        assert candidate["detector"] == "ISOLATION_FOREST"

    manifest = json.loads((DATA_DIR / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["artifacts"]["mlCandidates"] == {
        "path": "candidates.ml.json",
        "kind": "ML_CANDIDATES",
        "required": False,
    }
