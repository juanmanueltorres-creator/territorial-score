// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../src/app/App";
import { MobilityAnomalyCandidateSchema } from "../src/contracts/candidate";
import { DatasetManifestSchema } from "../src/contracts/manifest";
import { TrackSchema } from "../src/contracts/track";
import type { TerritorialDataset } from "../src/data/loadDataset";
import type { MapPanelProps } from "../src/features/map/MapPanel";

const ts = "2026-08-30T12:00:00-03:00";

function experimentDataset(): TerritorialDataset {
  const manifest = DatasetManifestSchema.parse({
    schemaVersion: "0.1",
    datasetId: "agua-negra-v0",
    title: "Detection experiment fixture",
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
    limitations: ["fixture"],
    samples: [{ segmentId: "seg-a", distanceM: 1000, value: 2100 }],
  });

  const weather = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "weather",
    kind: "WEATHER",
    evidenceState: "MODELLED",
    unit: "state",
    sourceRef: "fixture:weather",
    limitations: ["fixture"],
    samples: [{ segmentId: "seg-a", distanceM: 1000, timestamp: ts, value: null }],
  });

  const access = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "access",
    kind: "ACCESS",
    evidenceState: "PENDING",
    unit: "state",
    sourceRef: "fixture:access",
    limitations: ["fixture"],
    samples: [],
  });

  const evidence = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "evidence",
    kind: "EVIDENCE",
    evidenceState: "DERIVED",
    unit: "state",
    sourceRef: "fixture:evidence",
    limitations: ["fixture"],
    samples: [{ segmentId: "seg-a", distanceM: 1000, value: "versioned reference" }],
  });

  const ruleCandidate = MobilityAnomalyCandidateSchema.parse({
    schemaVersion: "0.1",
    candidateId: "rule-seg-a",
    segmentId: "seg-a",
    timeWindow: { start: ts, end: "2026-08-30T12:05:00-03:00" },
    detector: "RULE",
    detectorVersion: "0.1",
    supportingFeatures: ["median_speed"],
    vehiclesObserved: 4,
    datasetArtifactRef: "fixture:mobility",
    limitations: ["synthetic benchmark"],
    evidenceState: "SYNTHETIC_EXPERIMENT",
  });

  const mlCandidate = MobilityAnomalyCandidateSchema.parse({
    schemaVersion: "0.1",
    candidateId: "iforest-seg-a",
    segmentId: "seg-a",
    timeWindow: { start: ts, end: "2026-08-30T12:05:00-03:00" },
    detector: "ISOLATION_FOREST",
    detectorVersion: "0.1.0",
    anomalyScore: 0.31,
    supportingFeatures: ["stop_duration"],
    vehiclesObserved: 3,
    modelArtifactRef: "sklearn:IsolationForest:v0.1.0",
    datasetArtifactRef: "fixture:mobility",
    limitations: ["synthetic benchmark"],
    evidenceState: "SYNTHETIC_EXPERIMENT",
  });

  return {
    manifest,
    corridor: {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: { route: "RN 150" },
        geometry: { type: "LineString", coordinates: [[-69.2, -30.3], [-69.8, -30.2]] },
      }],
    },
    tracks: { terrain, weather, access, evidence, mobility: null },
    satelliteContext: null,
    ruleCandidates: [ruleCandidate],
    mlCandidates: [mlCandidate],
  };
}

const MapProbe: ComponentType<MapPanelProps> = () => <output>map</output>;

beforeEach(() => {
  sessionStorage.setItem("territorial-score:intro-dismissed:v0.2", "1");
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe("separated detection experiment", () => {
  it("explains the deterministic synthetic benchmark outside the territorial score", () => {
    render(<App dataset={experimentDataset()} MapComponent={MapProbe} />);

    expect(screen.getByRole("heading", { name: /Detection experiment/i })).toBeInTheDocument();
    expect(screen.getByText(/synthetic mobility data/i)).toBeInTheDocument();
    expect(screen.getByText(/Simple rule/i)).toBeInTheDocument();
    expect(screen.getByText(/Isolation Forest/i)).toBeInTheDocument();
    expect(screen.getByText(/Anomaly candidate ≠ road defect/i)).toBeInTheDocument();
    expect(screen.queryByText(/ground truth/i)).not.toBeInTheDocument();
  });
});
