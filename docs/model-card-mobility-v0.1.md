# Mobility Anomaly Detector V0.1 — Model Card

## Purpose

This experiment tests whether an unsupervised mobility anomaly detector adds useful candidate detection beyond a transparent rule baseline on the Territorial Score synthetic Agua Negra benchmark.

The output is a set of **anomaly candidates for contextual review**. It is not a road-condition classifier, risk score, confidence score, navigation system, or travel-safety recommendation.

## Intended use

- Compare a transparent mobility rule with an unsupervised Isolation Forest under the same synthetic benchmark.
- Surface unusual five-minute mobility feature windows for inspection alongside independent territorial context.
- Provide a reproducible ML artifact that conforms to the same public candidate contract used by rule-based detection.

## Out-of-scope use

- Inferring that a road is open, closed, safe, unsafe, passable, or defective.
- Recommending routes or travel decisions.
- Treating anomaly score as probability, confidence, severity, or operational risk.
- Training or validating a production model from the synthetic benchmark alone.
- Using weather, terrain, elevation, slope, access state, or road-condition labels as detector inputs in V0.1.

## Synthetic dataset

Dataset artifact: `public/data/agua-negra-v0/mobility.synthetic.json`

Ground-truth artifact: `public/data/agua-negra-v0/anomaly-ground-truth.synthetic.json`

The benchmark is deterministic and generated from the canonical seed:

`territorial-score:agua-negra:mobility:v0.1`

It contains 40 mobility observations across eight synthetic vehicles and five corridor nodes. Ground truth is physically separated from the detector input and contains four injected anomaly families:

1. repeated slowdown;
2. hard-braking cluster;
3. unexpected dwell;
4. controlled route deviation.

Ground-truth labels are used only after inference for evaluation.

## Features

The V0.1 feature vector is exactly:

- `median_speed`
- `speed_variance`
- `mean_acceleration`
- `acceleration_variance`
- `hard_brake_count`
- `stop_duration`
- `trajectory_deviation`
- `vehicles_observed`

Features are aggregated by `segment_id` and local five-minute time window.

Explicitly excluded from model input: weather, precipitation, elevation, slope, access state, and road condition.

## Algorithm / configuration

Implementation: `sklearn.ensemble.IsolationForest`

Runtime dependency: `scikit-learn==1.9.0`

Configuration:

```text
n_estimators = 200
contamination = auto
random_state = 42
```

Detector version: `0.1.0`

Model artifact reference emitted in candidates: `sklearn:IsolationForest:v0.1.0`

No hyperparameter is optimized against synthetic ground truth in V0.1.

## Training procedure

1. Read mobility observations only.
2. Aggregate the declared eight mobility features into five-minute segment windows.
3. Fit Isolation Forest on the resulting feature matrix without labels.
4. Use `fit_predict` to identify anomalous windows.
5. Export negative `decision_function` values as `anomalyScore` for ranking only.
6. Validate every output against the strict Python equivalent of the public `MobilityAnomalyCandidate` contract.
7. Sort candidates deterministically by `candidateId`.

The detector function has no ground-truth, label, or `y` parameter.

## Baseline

Transparent rule baseline:

```text
speed drop fraction = 0.25
minimum distinct vehicles = 3
local window = 5 minutes
```

The rule compares observations only with the median speed for the same segment. It does not consume weather, terrain, access, evidence, or ground-truth labels.

The checked-in baseline produced one candidate on `an-nodo-bajo`.

## Evaluation

Candidates are matched to synthetic ground truth **only during evaluation** using one-to-one matching on:

- identical segment; and
- positive time-window overlap.

Two candidates overlapping the same ground-truth event cannot both count as true positives.

| Detector | Precision | Recall | F1 | TP | FP | FN |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Transparent rule | 1.00 | 0.25 | 0.40 | 1 | 0 | 3 |
| Isolation Forest V0.1 | 0.50 | 0.50 | 0.50 | 2 | 2 | 2 |

### Does ML add useful detection?

**Yes, on this synthetic benchmark, but only as a candidate detector.** Isolation Forest raises recall from 0.25 to 0.50 and F1 from 0.40 to 0.50. It detects the hard-braking and unexpected-dwell anomaly regions that the speed-drop rule misses.

The gain is not free: the model emits two additional overlapping windows that count as false positives under one-to-one event matching. It also misses the repeated-slowdown and controlled-route-deviation ground-truth events. This result supports keeping ML as an independent candidate layer rather than replacing the transparent baseline.

## False positives

The two false positives are duplicate five-minute windows within already anomalous regions:

- a second `an-nodo-medio` window around the hard-braking event;
- a second `an-nodo-alto` window around the unexpected-dwell event.

This indicates that window-level Isolation Forest output requires temporal consolidation before event-level use.

## False negatives

Isolation Forest V0.1 does not match:

- the repeated-slowdown event on `an-nodo-bajo`;
- the controlled-route-deviation event on `an-paso-agua-negra`.

The rule baseline detects the repeated slowdown but misses the other three ground-truth families.

## Limitations

- Entire evaluation is synthetic; no claim of real-world generalization is justified.
- Only one deterministic benchmark seed is evaluated in V0.1.
- The number of aggregated windows is very small for ML validation.
- `contamination="auto"` is not calibrated to operational prevalence.
- `anomalyScore` is a model ranking value, not probability or confidence.
- Five-minute windowing can split one event into multiple candidates.
- The experiment does not infer cause. A mobility anomaly can arise from driver behavior, traffic, stopping, sensor effects, route geometry, operations, or other context.
- No candidate is evidence that a road defect exists.
- No candidate establishes road status or travel safety.

## Reproducibility

Canonical training/export command:

```bash
python experiments/mobility-anomaly/scripts/train_and_export.py \
  --input public/data/agua-negra-v0/mobility.synthetic.json \
  --output public/data/agua-negra-v0/candidates.ml.json
```

Canonical evaluation command:

```bash
python experiments/mobility-anomaly/scripts/evaluate_artifacts.py \
  --ground-truth public/data/agua-negra-v0/anomaly-ground-truth.synthetic.json \
  --rule-candidates public/data/agua-negra-v0/candidates.rule.json \
  --ml-candidates public/data/agua-negra-v0/candidates.ml.json
```

CI uses Python 3.12 and the experiment package pins `scikit-learn==1.9.0`. It runs the experiment tests, regenerates the checked-in synthetic artifacts, regenerates `candidates.ml.json`, compares generated artifacts byte-for-byte with the checked-in versions, and runs the shared rule-vs-ML evaluator.

## Artifact references

- Mobility benchmark: `public/data/agua-negra-v0/mobility.synthetic.json`
- Synthetic ground truth: `public/data/agua-negra-v0/anomaly-ground-truth.synthetic.json`
- Rule candidates: `public/data/agua-negra-v0/candidates.rule.json`
- Isolation Forest candidates: `public/data/agua-negra-v0/candidates.ml.json`
- Feature implementation: `experiments/mobility-anomaly/territorial_ml/features.py`
- Model implementation: `experiments/mobility-anomaly/territorial_ml/isolation_forest.py`
- Evaluation implementation: `experiments/mobility-anomaly/territorial_ml/evaluate.py`
- Training/export script: `experiments/mobility-anomaly/scripts/train_and_export.py`
- Evaluation script: `experiments/mobility-anomaly/scripts/evaluate_artifacts.py`
