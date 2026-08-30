# territorial-score

Territorial Score is an evidence-first spatiotemporal context lab for aligning independent terrain, weather, mobility, access and evidence tracks along real-world corridors. Its V0 uses sourced/reconstructed Agua Negra geography plus a clearly synthetic mobility benchmark to compare an auditable rule detector with an optional unsupervised ML experiment.

## Live demo

**Production:** https://territorial-score.vercel.app/

Current production milestone: **V0.1 — demo polish**.

## V0 comparison

The mobility experiment keeps a transparent rule baseline and Isolation Forest as independent candidate detectors. Both produce the same auditable candidate contract and are presented as context for review, never as operational authority.

The normal UI can distinguish:

- `RULE CANDIDATE`
- `ML CANDIDATE`
- `BOTH`

Candidate comparison is spatiotemporal: detector outputs are compared for the selected corridor segment and time window. Synthetic ground truth exists only for offline evaluation and is not rendered as observed truth in the application.

Every candidate remains explicitly labelled `SYNTHETIC EXPERIMENT` and carries the boundary:

> Anomaly candidate ≠ road defect. Requires contextual review.

## Documentation

- [`docs/specs/v0.md`](docs/specs/v0.md) — canonical V0 semantics and integrity rules.
- [`docs/data-sources.md`](docs/data-sources.md) — Agua Negra source lineage and evidence boundaries.
- [`docs/model-card-mobility-v0.1.md`](docs/model-card-mobility-v0.1.md) — deterministic Isolation Forest experiment, baseline metrics, limitations and reproducibility.
- [`docs/v0-acceptance.md`](docs/v0-acceptance.md) — V0 acceptance checklist and canonical CI verification gate.
- [`docs/geoplatform-adapter-boundary.md`](docs/geoplatform-adapter-boundary.md) — future read-only GeoPlatform snapshot boundary; no live integration is implemented in V0.

## What it is not

Territorial Score V0 is:

- not live telemetry;
- not road status;
- not navigation;
- not mine dispatch;
- not a safety system;
- not a real defect detector;
- not a global risk score.

Missing data remains missing. `PENDING` is never coerced into open, safe or zero, and model anomaly scores are not probabilities, confidence scores or operational risk values.
