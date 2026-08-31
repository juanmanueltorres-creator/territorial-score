// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../src/app/App";
import { DatasetManifestSchema } from "../src/contracts/manifest";
import { TrackSchema } from "../src/contracts/track";
import type { TerritorialDataset } from "../src/data/loadDataset";
import type { MapPanelProps } from "../src/features/map/MapPanel";

const ts = "2026-08-30T12:00:00-03:00";
const introKey = "territorial-score:intro-dismissed:v0.2";

function onboardingDataset(): TerritorialDataset {
  const manifest = DatasetManifestSchema.parse({
    schemaVersion: "0.1",
    datasetId: "agua-negra-v0",
    title: "Onboarding fixture",
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
    samples: [{ segmentId: "an-las-flores", distanceM: 0, value: 1887 }],
  });

  const weather = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "weather",
    kind: "WEATHER",
    evidenceState: "MODELLED",
    unit: "state",
    sourceRef: "fixture:weather",
    limitations: ["no frozen weather snapshot"],
    samples: [{ segmentId: "an-las-flores", distanceM: 0, timestamp: ts, value: null }],
  });

  const access = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "access",
    kind: "ACCESS",
    evidenceState: "PENDING",
    unit: "state",
    sourceRef: "fixture:access",
    limitations: ["access not verified"],
    samples: [],
  });

  const evidence = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "evidence",
    kind: "EVIDENCE",
    evidenceState: "DERIVED",
    unit: "state",
    sourceRef: "fixture:evidence",
    limitations: ["reference only"],
    samples: [{ segmentId: "an-las-flores", distanceM: 0, value: "reference" }],
  });

  return {
    manifest,
    corridor: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { route: "RN 150" },
          geometry: { type: "LineString", coordinates: [[-69.2, -30.3], [-69.8, -30.2]] },
        },
      ],
    },
    tracks: { terrain, weather, access, evidence, mobility: null },
    satelliteContext: null,
    ruleCandidates: null,
    mlCandidates: null,
  };
}

const MapProbe: ComponentType<MapPanelProps> = () => <output>map</output>;

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe("Territorial Score public onboarding", () => {
  it("explains the system once per session and can be reopened", () => {
    render(<App dataset={onboardingDataset()} MapComponent={MapProbe} />);

    expect(screen.getByText(/A territorial score, like a musical score/i)).toBeInTheDocument();
    expect(screen.getByText(/This is not a risk score/i)).toBeInTheDocument();
    expect(screen.getByText(/Each row is an independent signal/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Explore the corridor/i }));

    expect(sessionStorage.getItem(introKey)).toBe("1");
    expect(screen.queryByText(/Each row is an independent signal/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /What is this/i }));
    expect(screen.getByText(/Each row is an independent signal/i)).toBeInTheDocument();
  });
});
