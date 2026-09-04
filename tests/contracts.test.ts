import { describe, expect, it } from "vitest";
import { MobilityAnomalyCandidateSchema } from "../src/contracts/candidate";
import { DatasetManifestSchema } from "../src/contracts/manifest";
import {
  SatelliteContextArtifactSchema,
  SatelliteSegmentSchema,
  SatelliteSourceSnapshotSchema,
} from "../src/contracts/satellite";
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

const availableSatelliteSegment = () => ({
  segmentId: "an-nodo-alto",
  availability: "AVAILABLE",
  evidenceState: "DERIVED",
  surfaceClass: "SNOW_LIKE",
  indices: { ndvi: 0.08, ndwi: -0.11, ndsi: 0.62 },
  previewRef: "satellite-preview.svg",
  limitations: ["spectral context only"],
});

const satelliteSourceSnapshot = () => ({
  schemaVersion: "0.2",
  snapshotId: "agua-negra-sentinel-v0.2",
  source: {
    provider: "Sentinel-2",
    processingSystem: "Google Earth Engine",
    sourceRef: "fixture:sentinel-source",
  },
  scene: {
    sceneId: "S2B_FIXTURE_20260830",
    acquiredAt: ts,
    cloudPercentage: 12.5,
  },
  preview: {
    mimeType: "image/jpeg",
    base64: "YWJjZA==",
  },
  segments: [
    {
      segmentId: "an-nodo-alto",
      availability: "AVAILABLE",
      indices: { ndvi: 0.08, ndwi: -0.11, ndsi: 0.62 },
      limitations: ["fixture spectral context"],
    },
  ],
  limitations: ["fixture only"],
});

const satelliteContextArtifact = () => ({
  schemaVersion: "0.2",
  artifactId: "agua-negra-satellite-context-v0.2",
  source: {
    provider: "Sentinel-2",
    processingSystem: "Google Earth Engine",
    sourceRef: "fixture:sentinel-source",
  },
  scene: {
    sceneId: "S2B_FIXTURE_20260830",
    acquiredAt: ts,
    cloudPercentage: 12.5,
  },
  processing: {
    processorVersion: "0.1.0",
    ruleVersion: "0.1.0",
    indexDefinitionsVersion: "0.1.0",
  },
  segments: [availableSatelliteSegment()],
  limitations: ["spectral context only"],
});

const manifestV02 = () => ({
  ...manifest(),
  schemaVersion: "0.2",
  datasetId: "agua-negra-v0.2",
  title: "Agua Negra V0.2",
  artifacts: {
    ...manifest().artifacts,
    satelliteContext: {
      path: "satellite-context.json",
      kind: "SATELLITE_CONTEXT",
      required: true,
    },
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

describe("Satellite contracts", () => {
  it("accepts an AVAILABLE satellite segment with finite indices", () => {
    expect(SatelliteSegmentSchema.parse(availableSatelliteSegment()).surfaceClass).toBe("SNOW_LIKE");
  });

  it("rejects operational road claims as unknown fields", () => {
    expect(() => SatelliteSegmentSchema.parse({ ...availableSatelliteSegment(), roadClosed: true })).toThrow();
  });

  it("rejects a MISSING segment that still claims a surface class", () => {
    expect(() => SatelliteSegmentSchema.parse({
      segmentId: "an-nodo-alto",
      availability: "MISSING",
      evidenceState: null,
      surfaceClass: "SNOW_LIKE",
      indices: null,
      previewRef: null,
      reason: "EXCESSIVE_CLOUD",
      limitations: ["no usable observation"],
    })).toThrow();
  });

  it("rejects non-finite AVAILABLE indices", () => {
    const value = availableSatelliteSegment();
    value.indices.ndsi = Number.NaN;
    expect(() => SatelliteSegmentSchema.parse(value)).toThrow();
  });

  it("accepts a strict frozen source snapshot", () => {
    expect(SatelliteSourceSnapshotSchema.parse(satelliteSourceSnapshot()).scene.sceneId)
      .toBe("S2B_FIXTURE_20260830");
  });

  it("rejects source timestamps without timezone", () => {
    const value = satelliteSourceSnapshot();
    value.scene.acquiredAt = "2026-08-30T12:00:00";
    expect(() => SatelliteSourceSnapshotSchema.parse(value)).toThrow();
  });

  it("rejects cloud percentage outside 0..100", () => {
    const value = satelliteSourceSnapshot();
    value.scene.cloudPercentage = 101;
    expect(() => SatelliteSourceSnapshotSchema.parse(value)).toThrow();
  });

  it("accepts the derived V0.2 context artifact", () => {
    expect(SatelliteContextArtifactSchema.parse(satelliteContextArtifact()).processing.ruleVersion)
      .toBe("0.1.0");
  });
});

describe("DatasetManifestSchema", () => {
  it("keeps accepting the immutable V0.1 manifest", () => {
    expect(DatasetManifestSchema.parse(manifest()).schemaVersion).toBe("0.1");
  });

  it("accepts a V0.2 manifest with required satellite context", () => {
    expect(DatasetManifestSchema.parse(manifestV02()).datasetId).toBe("agua-negra-v0.2");
  });

  it("rejects V0.2 satellite context when marked optional", () => {
    const value = manifestV02();
    value.artifacts.satelliteContext.required = false;
    expect(() => DatasetManifestSchema.parse(value)).toThrow();
  });

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
