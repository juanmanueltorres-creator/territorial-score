import { describe, expect, it } from "vitest";
import { DatasetManifestSchema } from "../src/contracts/manifest";
import { TrackSchema } from "../src/contracts/track";
import { alignTracks } from "../src/core/alignTracks";
import type { TerritorialDataset } from "../src/data/loadDataset";

const ts = "2026-08-30T12:00:00-03:00";

function datasetFixture(): TerritorialDataset {
  const manifest = DatasetManifestSchema.parse({
    schemaVersion: "0.1",
    datasetId: "agua-negra-v0",
    title: "alignment fixture",
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
    limitations: ["terrain fixture"],
    samples: [
      { segmentId: "seg-b", distanceM: 2000, value: 2200 },
      { segmentId: "seg-a", distanceM: 1000, value: 2100 },
    ],
  });

  const weather = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "weather",
    kind: "WEATHER",
    evidenceState: "MODELLED",
    unit: "km_h",
    sourceRef: "fixture:weather",
    limitations: ["weather fixture"],
    samples: [
      { segmentId: "seg-a", distanceM: 1000, timestamp: "2026-08-30T12:10:00-03:00", value: 24 },
      { segmentId: "seg-a", distanceM: 1000, timestamp: "2026-08-30T12:00:00-03:00", value: null },
    ],
  });

  const access = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "access",
    kind: "ACCESS",
    evidenceState: "PENDING",
    unit: "state",
    sourceRef: "fixture:access",
    limitations: ["pending fixture"],
    samples: [],
  });

  const evidence = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "evidence",
    kind: "EVIDENCE",
    evidenceState: "DERIVED",
    unit: "state",
    sourceRef: "fixture:evidence",
    limitations: ["evidence fixture"],
    samples: [
      { segmentId: "seg-a", distanceM: 1000, value: "reference-a" },
      { segmentId: "seg-a", distanceM: 1000, value: "reference-b" },
      { segmentId: "seg-b", distanceM: 2000, value: "reference-c" },
    ],
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
    ruleCandidates: null,
    mlCandidates: null,
  };
}

describe("alignTracks", () => {
  it("sorts segments by distance and samples by distance then timestamp without mutating input", () => {
    const dataset = datasetFixture();
    const originalTerrainOrder = dataset.tracks.terrain.samples.map((sample) => sample.segmentId);

    const aligned = alignTracks(dataset);

    expect(aligned.map((segment) => segment.segmentId)).toEqual(["seg-a", "seg-b"]);
    expect(aligned[0]!.weather?.samples.map((sample) => sample.timestamp)).toEqual([
      "2026-08-30T12:00:00-03:00",
      "2026-08-30T12:10:00-03:00",
    ]);
    expect(dataset.tracks.terrain.samples.map((sample) => sample.segmentId)).toEqual(originalTerrainOrder);
  });

  it("preserves null model values and represents a missing segment track as null, never zero", () => {
    const aligned = alignTracks(datasetFixture());

    expect(aligned[0]!.weather?.samples[0]!.value).toBeNull();
    expect(aligned[1]!.weather).toBeNull();
  });

  it("preserves all conflicting evidence records", () => {
    const aligned = alignTracks(datasetFixture());

    expect(aligned[0]!.evidence?.samples.map((sample) => sample.value)).toEqual([
      "reference-a",
      "reference-b",
    ]);
  });

  it("propagates a global PENDING access track without inventing samples", () => {
    const aligned = alignTracks(datasetFixture());

    expect(aligned[0]!.access?.evidenceState).toBe("PENDING");
    expect(aligned[0]!.access?.samples).toEqual([]);
    expect(aligned[1]!.access?.evidenceState).toBe("PENDING");
  });
});
