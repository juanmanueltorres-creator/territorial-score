// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../src/app/App";
import { MobilityAnomalyCandidateSchema, type MobilityAnomalyCandidate } from "../src/contracts/candidate";
import { DatasetManifestSchema } from "../src/contracts/manifest";
import { TrackSchema } from "../src/contracts/track";
import type { TerritorialDataset } from "../src/data/loadDataset";
import type { MapPanelProps } from "../src/features/map/MapPanel";

const ts = "2026-08-30T12:00:00-03:00";
const candidateTs = "2026-08-30T12:10:00-03:00";
const candidateEnd = "2026-08-30T12:15:00-03:00";

afterEach(cleanup);

type FixtureOptions = {
  includeMl?: boolean;
  mlOnRuleWindow?: boolean;
  secondMlOnSameSegment?: boolean;
};

function fixtureDataset(options: FixtureOptions = {}): TerritorialDataset {
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
    timeWindow: { start: candidateTs, end: candidateEnd },
    detector: "RULE",
    detectorVersion: "0.1",
    supportingFeatures: ["median_speed", "vehicles_observed"],
    vehiclesObserved: 4,
    datasetArtifactRef: "fixture:mobility",
    limitations: ["synthetic candidate"],
    evidenceState: "SYNTHETIC_EXPERIMENT",
  });

  const mlCandidates: MobilityAnomalyCandidate[] | null = options.includeMl
    ? [
        MobilityAnomalyCandidateSchema.parse({
          schemaVersion: "0.1",
          candidateId: "iforest-seg-a",
          segmentId: "seg-a",
          timeWindow: { start: ts, end: "2026-08-30T12:05:00-03:00" },
          detector: "ISOLATION_FOREST",
          detectorVersion: "0.1.0",
          anomalyScore: 0.31,
          supportingFeatures: ["stop_duration", "vehicles_observed"],
          vehiclesObserved: 3,
          modelArtifactRef: "sklearn:IsolationForest:v0.1.0",
          datasetArtifactRef: "fixture:mobility",
          limitations: ["synthetic ML candidate"],
          evidenceState: "SYNTHETIC_EXPERIMENT",
        }),
        ...(options.secondMlOnSameSegment
          ? [
              MobilityAnomalyCandidateSchema.parse({
                schemaVersion: "0.1",
                candidateId: "iforest-seg-a-later",
                segmentId: "seg-a",
                timeWindow: {
                  start: "2026-08-30T12:20:00-03:00",
                  end: "2026-08-30T12:25:00-03:00",
                },
                detector: "ISOLATION_FOREST",
                detectorVersion: "0.1.0",
                anomalyScore: 0.29,
                supportingFeatures: ["trajectory_deviation", "vehicles_observed"],
                vehiclesObserved: 3,
                modelArtifactRef: "sklearn:IsolationForest:v0.1.0",
                datasetArtifactRef: "fixture:mobility",
                limitations: ["synthetic ML candidate"],
                evidenceState: "SYNTHETIC_EXPERIMENT",
              }),
            ]
          : []),
        ...(options.mlOnRuleWindow
          ? [
              MobilityAnomalyCandidateSchema.parse({
                schemaVersion: "0.1",
                candidateId: "iforest-seg-b",
                segmentId: "seg-b",
                timeWindow: { start: candidateTs, end: candidateEnd },
                detector: "ISOLATION_FOREST",
                detectorVersion: "0.1.0",
                anomalyScore: 0.42,
                supportingFeatures: ["median_speed", "hard_brake_count"],
                vehiclesObserved: 4,
                modelArtifactRef: "sklearn:IsolationForest:v0.1.0",
                datasetArtifactRef: "fixture:mobility",
                limitations: ["synthetic ML candidate"],
                evidenceState: "SYNTHETIC_EXPERIMENT",
              }),
            ]
          : []),
      ]
    : null;

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
    mlCandidates,
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
    expect(within(accessRow).getAllByText("PENDING").length).toBeGreaterThan(0);
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

  it("shows a compact evidence-state legend above the tracks", () => {
    render(<App dataset={fixtureDataset({ includeMl: true })} MapComponent={MapProbe} />);

    const legend = screen.getByTestId("score-legend");
    expect(legend).toHaveTextContent("DERIVED");
    expect(legend).toHaveTextContent("MODELLED");
    expect(legend).toHaveTextContent("PENDING");
    expect(legend).toHaveTextContent("MISSING");
    expect(legend).toHaveTextContent("SYNTHETIC");
  });

  it("shows RULE CANDIDATE with explicit evidence state and disclaimer", () => {
    render(<App dataset={fixtureDataset()} MapComponent={MapProbe} />);
    fireEvent.click(screen.getByRole("button", { name: /rule candidate.*seg-b/i }));

    const comparison = screen.getByTestId("candidate-comparison");
    expect(within(comparison).getByText("RULE CANDIDATE")).toBeInTheDocument();
    expect(within(comparison).getByText(/rule candidate: yes/i)).toBeInTheDocument();
    expect(within(comparison).getByText(/ML candidate: no/i)).toBeInTheDocument();
    expect(within(comparison).getByText("SYNTHETIC EXPERIMENT")).toBeInTheDocument();
    expect(screen.getByText("Anomaly candidate ≠ road defect. Requires contextual review.")).toBeInTheDocument();
  });

  it("keeps technical candidate details collapsed by default", () => {
    render(<App dataset={fixtureDataset()} MapComponent={MapProbe} />);
    fireEvent.click(screen.getByRole("button", { name: /rule candidate.*seg-b/i }));

    const details = screen.getByTestId("candidate-technical-details");
    expect(details).not.toHaveAttribute("open");
    expect(within(details).getByText(/RULE candidate detector/i)).toBeInTheDocument();
  });

  it("shows ML CANDIDATE when only the unsupervised detector is active", () => {
    render(<App dataset={fixtureDataset({ includeMl: true })} MapComponent={MapProbe} />);

    const comparison = screen.getByTestId("candidate-comparison");
    expect(within(comparison).getByText("ML CANDIDATE")).toBeInTheDocument();
    expect(within(comparison).getByText(/rule candidate: no/i)).toBeInTheDocument();
    expect(within(comparison).getByText(/ML candidate: yes/i)).toBeInTheDocument();
    expect(within(comparison).getByText(/model anomaly score/i)).toHaveTextContent("0.31");
  });

  it("keeps exactly one ML candidate selected by segment and time window", () => {
    render(<App dataset={fixtureDataset({ includeMl: true, secondMlOnSameSegment: true })} MapComponent={MapProbe} />);

    const candidates = screen.getAllByRole("button", { name: /ml candidate.*seg-a/i });
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toHaveAttribute("data-selected", "true");
    expect(candidates[1]).toHaveAttribute("data-selected", "false");
  });

  it("resets candidate timestamp to dataAsOf when selecting a territorial track", () => {
    render(<App dataset={fixtureDataset()} MapComponent={MapProbe} />);

    fireEvent.click(screen.getByRole("button", { name: /rule candidate.*seg-b/i }));
    expect(screen.getByTestId("context-timestamp")).toHaveTextContent(candidateTs);

    fireEvent.click(screen.getByRole("button", { name: /terrain seg-a/i }));
    expect(screen.getByTestId("context-timestamp")).toHaveTextContent(ts);
  });

  it("shows BOTH only for overlapping rule and ML windows and selects candidate time", () => {
    render(<App dataset={fixtureDataset({ includeMl: true, mlOnRuleWindow: true })} MapComponent={MapProbe} />);
    fireEvent.click(screen.getByRole("button", { name: /rule candidate.*seg-b/i }));

    expect(screen.getByTestId("context-timestamp")).toHaveTextContent(candidateTs);
    const comparison = screen.getByTestId("candidate-comparison");
    expect(within(comparison).getByText("BOTH")).toBeInTheDocument();
    expect(within(comparison).getByText(/rule candidate: yes/i)).toBeInTheDocument();
    expect(within(comparison).getByText(/ML candidate: yes/i)).toBeInTheDocument();
    expect(within(comparison).getByText(/shared supporting features/i)).toHaveTextContent("median_speed");
    expect(within(comparison).getByText(/model anomaly score/i)).toHaveTextContent("0.42");
    expect(screen.queryByText(/ground truth/i)).not.toBeInTheDocument();
  });
});
