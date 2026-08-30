import { describe, expect, it } from "vitest";
import { MobilityAnomalyCandidateSchema } from "../src/contracts/candidate";
import { DatasetManifestSchema } from "../src/contracts/manifest";
import { TrackSchema } from "../src/contracts/track";

const ts = "2026-08-30T12:00:00-03:00";

const weatherTrack = () => ({
  schemaVersion: "0.1",
  trackId: "weather",
  kind: "WEATHER",
  evidenceState: "MODELLED",
  unit: "km_h",
  sourceRef: "open-meteo-snapshot-v0",
  limitations: ["modelled context, not a station observation"],
  samples: [{ segmentId: "an-001", distanceM: 1000, timestamp: ts, value: 32 }],
});

const mobilityTrack = () => ({
  schemaVersion: "0.1",
  trackId: "mobility",
  kind: "MOBILITY",
  evidenceState: "SIMULATED",
  unit: "km_h",
  sourceRef: "mobility-synthetic-v0",
  limitations: ["simulated mobility, not observed fleet telemetry"],
  samples: [{ segmentId: "an-001", distanceM: 1000, timestamp: ts, value: 28 }],
});

const candidate = () => ({
  schemaVersion: "0.1",
  candidateId: "cand-1",
  segmentId: "an-001",
  timeWindow: {
    start: "2026-08-30T12:00:00-03:00",
    end: "2026-08-30T12:05:00-03:00",
  },
  detector: "RULE",
  detectorVersion: "0.1",
  supportingFeatures: ["median_speed"],
  vehiclesObserved: 4,
  datasetArtifactRef: "mobility-synth-v0",
  limitations: ["synthetic benchmark"],
  evidenceState: "SYNTHETIC_EXPERIMENT",
});

const manifest = () => ({
  schemaVersion: "0.1",
  datasetId: "agua-negra-v0",
  title: "Agua Negra V0",
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

describe("TrackSchema", () => {
  it("accepts a valid MODELLED weather track", () => {
    expect(TrackSchema.parse(weatherTrack()).trackId).toBe("weather");
  });

  it("rejects WEATHER as OBSERVED in V0", () => {
    expect(() => TrackSchema.parse({ ...weatherTrack(), evidenceState: "OBSERVED" })).toThrow();
  });

  it("accepts a valid SIMULATED mobility track", () => {
    expect(TrackSchema.parse(mobilityTrack()).trackId).toBe("mobility");
  });

  it("rejects MOBILITY as OBSERVED in V0", () => {
    expect(() => TrackSchema.parse({ ...mobilityTrack(), evidenceState: "OBSERVED" })).toThrow();
  });

  it("rejects timestamps without timezone", () => {
    const track = weatherTrack();
    track.samples[0] = { ...track.samples[0]!, timestamp: "2026-08-30T12:00:00" };
    expect(() => TrackSchema.parse(track)).toThrow();
  });

  it("rejects negative distanceM", () => {
    const track = weatherTrack();
    track.samples[0] = { ...track.samples[0]!, distanceM: -1 };
    expect(() => TrackSchema.parse(track)).toThrow();
  });

  it("rejects NaN and Infinity sample numbers", () => {
    for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const track = weatherTrack();
      track.samples[0] = { ...track.samples[0]!, value: invalid };
      expect(() => TrackSchema.parse(track)).toThrow();
    }
  });

  it("rejects riskScore as an undeclared operational field", () => {
    expect(() => TrackSchema.parse({ ...weatherTrack(), riskScore: 82 })).toThrow();
  });

  it("rejects a MODELLED track without limitations", () => {
    const { limitations: _removed, ...track } = weatherTrack();
    expect(() => TrackSchema.parse(track)).toThrow();
  });

  it("allows PENDING tracks with empty samples", () => {
    const pending = {
      ...weatherTrack(),
      kind: "ACCESS",
      evidenceState: "PENDING",
      unit: "state",
      samples: [],
    };
    expect(TrackSchema.parse(pending).samples).toEqual([]);
  });

  it("rejects non-PENDING tracks with empty samples", () => {
    expect(() => TrackSchema.parse({ ...weatherTrack(), samples: [] })).toThrow();
  });
});

describe("MobilityAnomalyCandidateSchema", () => {
  it("rejects road_defect as an undeclared operational claim", () => {
    expect(() => MobilityAnomalyCandidateSchema.parse({ ...candidate(), road_defect: true })).toThrow();
  });

  it("rejects a candidate whose end is not after start", () => {
    const value = candidate();
    value.timeWindow.end = value.timeWindow.start;
    expect(() => MobilityAnomalyCandidateSchema.parse(value)).toThrow();
  });

  it("rejects vehiclesObserved equal to zero", () => {
    expect(() => MobilityAnomalyCandidateSchema.parse({ ...candidate(), vehiclesObserved: 0 })).toThrow();
  });
});

describe("DatasetManifestSchema", () => {
  it("rejects path traversal outside the dataset root", () => {
    const value = manifest();
    value.artifacts.corridor.path = "../secret.json";
    expect(() => DatasetManifestSchema.parse(value)).toThrow();
  });

  it("rejects remote URLs as artifact paths", () => {
    const value = manifest();
    value.artifacts.corridor.path = "https://example.com/corridor.geojson";
    expect(() => DatasetManifestSchema.parse(value)).toThrow();
  });
});
