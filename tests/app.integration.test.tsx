// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";
import { App } from "../src/app/App";
import { MobilityAnomalyCandidateSchema } from "../src/contracts/candidate";
import { DatasetManifestSchema } from "../src/contracts/manifest";
import { TrackSchema } from "../src/contracts/track";
import type { TerritorialDataset } from "../src/data/loadDataset";
import type { MapPanelProps } from "../src/features/map/MapPanel";

const ts = "2026-08-30T12:00:00-03:00";

function fixtureDataset(): TerritorialDataset {
  const manifest = DatasetManifestSchema.parse({
    schemaVersion: "0.1",
    datasetId: "agua-negra-v0",
    title: "UI fixture",
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
      { segmentId: "seg-a", distanceM: 1000, value: 2100 },
      { segmentId: "seg-b", distanceM: 2000, value: 2200 },
    ],
  });

  const weather = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "weather",
    kind: "WEATHER",
    evidenceState: "MODELLED",
    unit: "km_h",
    sourceRef: "fixture:weather",
    limitations: ["modelled context"],
    samples: [
      { segmentId: "seg-a", distanceM: 1000, timestamp: ts, value: null },
      { segmentId: "seg-b", distanceM: 2000, timestamp: ts, value: 24 },
    ],
  });

  const mobility = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "mobility",
    kind: "MOBILITY",
    evidenceState: "SIMULATED",
    unit: "km_h",
    sourceRef: "fixture:mobility",
    limitations: ["simulated mobility"],
    samples: [
      { segmentId: "seg-a", distanceM: 1000, timestamp: ts, value: 40 },
      { segmentId: "seg-b", distanceM: 2000, timestamp: ts, value: 27 },
    ],
  });

  const access = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "access",
    kind: "ACCESS",
    evidenceState: "PENDING",
    unit: "state",
    sourceRef: "fixture:access",
    limitations: ["no authoritative access status frozen"],
    samples: [],
  });

  const evidence = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "evidence",
    kind: "EVIDENCE",
    evidenceState: "DERIVED",
    unit: "state",
    sourceRef: "fixture:evidence",
    limitations: ["reference status only"],
    samples: [
      { segmentId: "seg-a", distanceM: 1000, value: "reference-a" },
      { segmentId: "seg-b", distanceM: 2000, value: "reference-b" },
    ],
  });

  const ruleCandidate = MobilityAnomalyCandidateSchema.parse({
    schemaVersion: "0.1",
    candidateId: "rule-seg-b",
    segmentId: "seg-b",
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
          properties: { route: "RN 150" },
          geometry: {
            type: "LineString",
            coordinates: [[-69.2, -30.3], [-69.5, -30.25], [-69.8, -30.2]],
          },
        },
      ],
    },
    tracks: { terrain, weather, mobility, access, evidence },
    ruleCandidates: [ruleCandidate],
    mlCandidates: null,
  };
}

const MapProbe: ComponentType<MapPanelProps> = ({ selectedSegmentId }) => (
  <output data-testid="map-selection">{selectedSegmentId}</output>
);

describe("Territorial Score UI", () => {
  it("synchronizes score selection, context detail and map selection", () => {
    render(<App dataset={fixtureDataset()} MapComponent={MapProbe} />);

    expect(screen.getByTestId("map-selection")).toHaveTextContent("seg-a");
    expect(screen.getByTestId("context-segment")).toHaveTextContent("seg-a");

    fireEvent.click(screen.getByRole("button", { name: /rule candidate.*seg-b/i }));

    expect(screen.getByTestId("map-selection")).toHaveTextContent("seg-b");
    expect(screen.getByTestId("context-segment")).toHaveTextContent("seg-b");
  });

  it("renders PENDING access explicitly and never invents OPEN or zero", () => {
    render(<App dataset={fixtureDataset()} MapComponent={MapProbe} />);

    const accessRow = screen.getByTestId("track-access");
    expect(within(accessRow).getByText("PENDING")).toBeInTheDocument();
    expect(within(accessRow).queryByText("OPEN")).not.toBeInTheDocument();
    expect(within(accessRow).queryByText(/^0$/)).not.toBeInTheDocument();
  });

  it("hides the ML candidate row when no ML artifact exists", () => {
    render(<App dataset={fixtureDataset()} MapComponent={MapProbe} />);

    expect(screen.queryByTestId("track-ml-candidate")).not.toBeInTheDocument();
  });

  it("renders null weather as MISSING rather than numeric zero", () => {
    render(<App dataset={fixtureDataset()} MapComponent={MapProbe} />);

    const weatherRow = screen.getByTestId("track-weather");
    expect(within(weatherRow).getByText("MISSING")).toBeInTheDocument();
    expect(within(weatherRow).queryByText(/^0$/)).not.toBeInTheDocument();
  });
});
