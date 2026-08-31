# Territorial Score

> **A territorial score — as in a musical score, not a risk score.**

Territorial Score aligns independent signals along a real corridor so you can see **what changes from place to place, what is known, what is missing, and where each value came from**.

Each row is one signal. Together they describe context; they do not automatically produce a decision.

**Live demo:** https://territorial-score.vercel.app/

**Current production release:** V0.1 · Agua Negra corridor demo

---

## What you can explore

The current public demo uses **RN150 / Corredor de Agua Negra, San Juan, Argentina** as a versioned territorial case.

It aligns context by place and time across independent tracks such as:

- **relief** — elevation and terrain context;
- **weather** — modelled environmental context when a usable frozen value exists;
- **mobility** — movement context, kept separate from territorial evidence;
- **access** — explicit known / pending / missing state rather than guessed status;
- **evidence** — provenance and limitations for the value being shown.

The map, score matrix and detail panel stay synchronized around the selected corridor segment and time context.

```text
RELIEF   ───────────────►
WEATHER  ───────────────►
MOBILITY ───────────────►   space + time
ACCESS   ───────────────►
EVIDENCE ───────────────►

        Agua Negra corridor
```

---

## How to read the score

`Score` means **partitura**: several independent tracks aligned over the same corridor.

It does **not** mean a global safety, risk or suitability score.

A useful way to read it is:

```text
one row = one signal
one column = one place / corridor context
all rows together = context for review
```

No row gains authority from being displayed next to another one.

A terrain value does not validate access. A weather model does not establish road condition. A mobility anomaly does not become a road defect.

---

## Evidence, not conclusions

Territorial Score keeps several integrity rules visible in the product and data contracts:

```text
signal != conclusion
correlation != causality
missing != zero
modelled != observed
simulation != operation
anomaly candidate != road defect
PENDING != open / closed / safe
```

Missing data remains missing instead of being converted to `0`, `safe`, `open` or another convenient value.

The goal is not to hide uncertainty. It is to make uncertainty inspectable.

---

## Detection experiment

V0.1 also contains a **separate synthetic mobility experiment** that compares two anomaly-candidate approaches:

- a transparent deterministic rule baseline;
- an optional Isolation Forest experiment.

The UI can distinguish:

- `RULE CANDIDATE`;
- `ML CANDIDATE`;
- `BOTH`.

Both detectors produce the same auditable candidate contract and are evaluated against deterministic synthetic ground truth offline.

This experiment is intentionally separated from territorial evidence:

> **Anomaly candidate ≠ road defect. Requires contextual review.**

Model scores are not probabilities, confidence values, safety scores or operational risk values.

See [`docs/model-card-mobility-v0.1.md`](docs/model-card-mobility-v0.1.md) for the experiment, metrics and limitations.

---

## How it works

```text
versioned territorial sources
            ↓
strict artifact validation
            ↓
space / time alignment
            ↓
independent territorial tracks
            ↓
context selection
            ↓
MapLibre map + score matrix + detail view
```

The runtime boundary is fail-closed: static artifacts are validated before they become typed application data.

The checked-in Agua Negra dataset preserves source lineage, explicit missing states and reproducible experiment artifacts.

---

## Stack

`React 19` · `TypeScript` · `MapLibre GL` · `Zod` · `Vite` · `Vitest`

The mobility benchmark and Isolation Forest experiment use a separate reproducible Python workflow.

---

## Run locally

Requires **Node.js 22+**.

```bash
npm install
npm test
npm run build
npm run dev
```

The repository also verifies checked-in rule candidates and the separate synthetic ML benchmark in CI.

---

## Sources and documentation

- [`docs/data-sources.md`](docs/data-sources.md) — Agua Negra data lineage and evidence boundaries.
- [`docs/specs/v0.md`](docs/specs/v0.md) — canonical V0 semantics and integrity rules.
- [`docs/model-card-mobility-v0.1.md`](docs/model-card-mobility-v0.1.md) — Isolation Forest experiment and benchmark.
- [`docs/v0-acceptance.md`](docs/v0-acceptance.md) — acceptance and verification gate.
- [`docs/geoplatform-adapter-boundary.md`](docs/geoplatform-adapter-boundary.md) — future read-only integration boundary.

---

## Current status

### Production — V0.1

The deployed V0.1 focuses on the Agua Negra corridor, synchronized territorial tracks, explicit evidence states and the separate rule-vs-ML mobility experiment.

### In development — V0.2

V0.2 is being developed in a separate draft PR and is **not part of the current production release yet**.

Its approved direction focuses on public understanding and deterministic satellite context, including clearer place-level explanations, stronger separation between evidence and experiments, and a frozen satellite-context artifact instead of mutable runtime evidence.

Until that work is accepted and merged, V0.1 remains the canonical public model.

---

## What it is not

Territorial Score is not:

- live telemetry;
- current road status;
- navigation;
- mine dispatch;
- a safety system;
- a real road-defect detector;
- an access-authorization system;
- a global risk score.

The project is a small decision-support research and visualization lab for making **context, evidence boundaries and uncertainty visible**.

## License

Repository-authored software is released under the [MIT License](LICENSE).