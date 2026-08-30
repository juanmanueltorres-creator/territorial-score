# GeoPlatform adapter boundary

This document defines the future integration boundary between GeoPlatform and Territorial Score. It does **not** implement that integration.

## Boundary in one line

GeoPlatform may become a read-only source for versioned Territorial Score snapshots; it must not become a direct runtime dependency of the Territorial Score core.

```text
GeoPlatform source data
        ↓
read-only adapter / snapshot materialization
        ↓
Territorial Score dataset directory
(manifest + versioned artifacts)
        ↓
strict runtime validation
        ↓
TerritorialDataset
        ↓
core / UI
```

The existing `loadDataset()` boundary remains authoritative. The adapter ends before runtime validation.

## Responsibilities of a future adapter

A GeoPlatform adapter may:

- read explicitly selected GeoPlatform source artifacts or exported snapshots;
- project those inputs into the existing Territorial Score artifact shapes;
- preserve source references, timestamps, evidence state and declared limitations;
- materialize a versioned dataset directory with `manifest.json` and its referenced artifacts;
- calculate/check artifact hashes when that becomes part of the ingestion workflow;
- omit optional mobility, rule-candidate or ML-candidate artifacts when they are not available;
- fail closed when a required source cannot be mapped without inventing data.

The adapter must produce data that still has to pass the same strict Zod contracts used by static V0 datasets. Adapter output is never trusted merely because it came from GeoPlatform.

## Responsibilities it must not acquire

The adapter must not:

- write back to GeoPlatform;
- mutate GeoPlatform projects, layers, observations, users or permissions;
- create a bidirectional synchronization protocol;
- bypass `DatasetManifestSchema`, `TrackSchema`, candidate validation or corridor validation;
- import private credentials into the browser bundle;
- convert missing values into zero or inferred operational state;
- convert `PENDING` into open, closed, safe, unsafe or passable;
- convert modelled weather into observed road condition;
- infer route safety, transitability, authorization or road defects;
- expose synthetic ground truth as runtime territorial evidence;
- turn candidate anomaly scores into probability, confidence, severity or aggregate risk;
- couple Territorial Score core logic to GeoPlatform React components, API response internals or deployment URLs.

## Data contract

The target of the adapter is the existing dataset contract, not a new parallel domain model.

A materialized dataset must remain compatible with the V0 structure:

- manifest;
- corridor;
- required terrain track;
- required weather track;
- required access track;
- required evidence track;
- optional mobility track;
- optional rule candidates;
- optional ML candidates.

Core artifacts remain required because the current loader explicitly fails when required terrain, weather, access or evidence tracks are unavailable. Optional detector artifacts remain optional so ML can be removed without breaking Territorial Score.

## Provenance and semantics

The adapter must preserve the distinction between source lineage and operational meaning.

Examples:

- GeoPlatform cartographic route geometry remains cartographic context, not navigation geometry.
- A verified geographic reference remains a provenance statement, not access authorization.
- A modeled weather value remains `MODELLED` context.
- An unavailable frozen weather value remains missing/null rather than `0`.
- An unavailable official access state remains `PENDING`.
- Simulated mobility remains `SIMULATED`.
- ML candidates remain `SYNTHETIC_EXPERIMENT` unless a future separately specified contract explicitly changes the evidence regime.

No adapter mapping may silently strengthen an evidence state.

## Snapshot semantics

The preferred integration model is snapshot-based rather than live coupling.

A snapshot should have:

- an explicit dataset/schema version;
- a stable territory/corridor reference;
- `generatedAt` and `dataAsOf` timestamps with explicit timezone;
- versioned artifact paths constrained to the dataset root;
- source/lineage documentation sufficient to reproduce or audit the projection.

A future live refresh process, if ever added, should create a new validated snapshot rather than mutate the current typed dataset in place.

## Security boundary

Territorial Score V0 is a static/read-oriented client. A future adapter that needs authenticated GeoPlatform access should execute outside the browser and materialize only the approved snapshot artifacts.

Credentials, service-role tokens and private GeoPlatform responses must not be embedded into Territorial Score public assets or frontend environment variables.

## Failure behavior

The adapter must fail closed when:

- a required source is missing;
- a source cannot be mapped unambiguously;
- timestamps are missing or lack an explicit timezone;
- a path would escape the target dataset root;
- source semantics are weaker than the proposed target evidence state;
- validation of the materialized artifact fails.

The correct output in those cases is no accepted snapshot, not an inferred fallback value.

## V0 status

There is no GeoPlatform adapter implementation in V0.

V0 uses a small, documented projection of versioned GeoPlatform Agua Negra assets as source lineage. That relationship is documented in `docs/data-sources.md`; it is not a live API integration.

Any implementation of this adapter is post-V0 work and requires its own design/spec, tests and acceptance gate before it can change runtime behavior.
