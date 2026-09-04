import { describe, expect, it } from "vitest";
import { MobilityAnomalyCandidateSchema } from "../src/contracts/candidate";
import { DatasetManifestSchema } from "../src/contracts/manifest";
import { SatelliteContextArtifactSchema } from "../src/contracts/satellite";
import { TrackSchema } from "../src/contracts/track";
import { alignTracks } from "../src/core/alignTracks";
import { selectContext } from "../src/core/selectContext";
import type { TerritorialDataset } from "../src/data/loadDataset";

const ts = "2026-08-30T12:00:00-03:00";

function datasetFixture(): TerritorialDataset {
  const manifest = DatasetManifestSchema.parse({
    schemaVersion: "0.2",
    datasetId: "agua-negra-v0.2",
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
      satelliteContext: {
        path: "satellite-context.json",
        kind: "SATELLITE_CONTEXT",
        required: true,
      },
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

  const satelliteContext = SatelliteContextArtifactSchema.parse({
    schemaVersion: "0.2",
    artifactId: "fixture:satellite-context",
    source: {
      provider: "Sentinel-2",
      processingSystem: "Google Earth Engine",
      sourceRef: "fixture:sentinel-scene",
    },
    scene: {
      sceneId: "COPERNICUS/S2_SR_HARMONIZED/FIXTURE",
      acquiredAt: ts,
      cloudPercentage: 8,
    },
    processing: {
      processorVersion: "0.1.0",
      ruleVersion: "0.1.0",
      indexDefinitionsVersion: "0.1.0",
    },
    segments: [
      {
        segmentId: "seg-a",
        availability: "AVAILABLE",
        evidenceState: "DERIVED",
        surfaceClass: "SNOW_LIKE",
        indices: { ndvi: 0.08, ndwi: -0.11, ndsi: 0.62 },
        previewRef: "satellite-preview.svg",
        limitations: ["satellite limitation"],
      },
    ],
    limitations: ["frozen satellite fixture"],
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
    satelliteContext,
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
    expect(context.availableTracks).toEqual(["terrain", "weather", "satellite", "access", "evidence"]);
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
    expect(context.limitations).toContain("satellite limitation");
    expect("riskScore" in context).toBe(false);
  });

  it("keeps an explicit MISSING satellite record in missingTracks while preserving its limitation", () => {
    const dataset = datasetFixture();
    dataset.satelliteContext = SatelliteContextArtifactSchema.parse({
      ...dataset.satelliteContext,
      segments: [
        {
          segmentId: "seg-a",
          availability: "MISSING",
          evidenceState: null,
          surfaceClass: null,
          indices: null,
          previewRef: null,
          reason: "EXCESSIVE_CLOUD",
          limitations: ["cloud cover prevents a defensible spectral classification"],
        },
      ],
    });

    const context = selectContext(alignTracks(dataset), { segmentId: "seg-a", timestamp: ts });

    expect(context.availableTracks).not.toContain("satellite");
    expect(context.missingTracks).toContain("satellite");
    expect(context.limitations).toContain("cloud cover prevents a defensible spectral classification");
  });

  it("fails closed when the requested segment does not exist", () => {
    const aligned = alignTracks(datasetFixture());

    expect(() => selectContext(aligned, { segmentId: "missing", timestamp: ts })).toThrow();
  });
});
