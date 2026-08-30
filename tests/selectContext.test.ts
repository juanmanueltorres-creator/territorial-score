import { describe, expect, it } from "vitest";
import { MobilityAnomalyCandidateSchema } from "../src/contracts/candidate";
import { DatasetManifestSchema } from "../src/contracts/manifest";
import { TrackSchema } from "../src/contracts/track";
import { alignTracks } from "../src/core/alignTracks";
import { selectContext } from "../src/core/selectContext";
import type { TerritorialDataset } from "../src/data/loadDataset";

const ts = "2026-08-30T12:00:00-03:00";

function datasetFixture(): TerritorialDataset {
  const manifest = DatasetManifestSchema.parse({
    schemaVersion: "0.1",
    datasetId: "agua-negra-v0",
    title: "context fixture",
    territoryRef: "admin:AR:1:J",
    corridorRef: "corridor:agua-negra-v1",
    generatedAt: ts,
    dataAsOf: ts,
    artifacts: {
      corridor: { path: "corridor.geojson", kind: "CORRIDOR", required: true },
      terrain: { path: "terrain.json", kind: "TERRAIN", required: true },
      weather: { path: "weather.json", kind: "WEATHER", required: true },
      access: { path: "access.json", kind: "ACCESS", required: true },
      evidence: { path: "evidence.json", kind: "EVIDENCE", required: true },
    },
  });

  const terrain = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "terrain",
    kind: "TERRAIN",
    evidenceState: "DERIVED",
    unit: "m",
    sourceRef: "fixture:terrain",
    limitations: ["terrain limitation"],
    samples: [{ segmentId: "seg-a", distanceM: 1000, value: 2100 }],
  });

  const weather = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "weather",
    kind: "WEATHER",
    evidenceState: "MODELLED",
    unit: "km_h",
    sourceRef: "fixture:weather",
    limitations: ["weather limitation"],
    samples: [{ segmentId: "seg-a", distanceM: 1000, timestamp: ts, value: null }],
  });

  const access = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "access",
    kind: "ACCESS",
    evidenceState: "PENDING",
    unit: "state",
    sourceRef: "fixture:access",
    limitations: ["access pending"],
    samples: [],
  });

  const evidence = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "evidence",
    kind: "EVIDENCE",
    evidenceState: "DERIVED",
    unit: "state",
    sourceRef: "fixture:evidence",
    limitations: ["evidence limitation"],
    samples: [
      { segmentId: "seg-a", distanceM: 1000, value: "reference-a" },
      { segmentId: "seg-a", distanceM: 1000, value: "reference-b" },
    ],
  });

  const candidate = MobilityAnomalyCandidateSchema.parse({
    schemaVersion: "0.1",
    candidateId: "rule-cand-a",
    segmentId: "seg-a",
    timeWindow: { start: ts, end: "2026-08-30T12:05:00-03:00" },
    detector: "RULE",
    detectorVersion: "0.1",
    supportingFeatures: ["median_speed"],
    vehiclesObserved: 4,
    datasetArtifactRef: "fixture:mobility",
    limitations: ["synthetic candidate"],
    evidenceState: "SYNTHETIC_EXPERIMENT",
  });

  return {
    manifest,
    corridor: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [[-69.2, -30.3], [-69.8, -30.2]] },
        },
      ],
    },
    tracks: { terrain, weather, access, evidence, mobility: null },
    satelliteContext: null,
    ruleCandidates: [candidate],
    mlCandidates: null,
  };
}

describe("selectContext", () => {
  it("reports available, missing, contradictions, candidates, provenance and limitations without synthesizing a score", () => {
    const aligned = alignTracks(datasetFixture());
    const context = selectContext(aligned, { segmentId: "seg-a", timestamp: ts });

    expect(context.segmentId).toBe("seg-a");
    expect(context.timestamp).toBe(ts);
    expect(context.availableTracks).toEqual(["terrain", "weather", "access", "evidence"]);
    expect(context.missingTracks).toEqual(["mobility"]);
    expect(context.contradictions).toEqual([
      { track: "evidence", values: ["reference-a", "reference-b"] },
    ]);
    expect(context.candidateRefs).toEqual(["rule-cand-a"]);
    expect(context.sourceRefs).toEqual([
      "fixture:terrain",
      "fixture:weather",
      "fixture:access",
      "fixture:evidence",
    ]);
    expect(context.limitations).toContain("access pending");
    expect("riskScore" in context).toBe(false);
  });

  it("fails closed when the requested segment does not exist", () => {
    const aligned = alignTracks(datasetFixture());

    expect(() => selectContext(aligned, { segmentId: "missing", timestamp: ts })).toThrow();
  });
});
