// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MobilityAnomalyCandidateSchema } from "../src/contracts/candidate";
import type { AlignedSegment, AlignedTrackSlice } from "../src/core/alignTracks";
import { ScorePanel } from "../src/features/score/ScorePanel";

const ts = "2026-08-30T12:00:00-03:00";

afterEach(cleanup);

function terrain(segmentId: string, distanceM: number, elevationM: number): AlignedTrackSlice {
  return {
    trackId: "terrain",
    evidenceState: "DERIVED",
    unit: "m",
    sourceRef: "fixture:terrain",
    limitations: ["fixture"],
    samples: [{ segmentId, distanceM, value: elevationM }],
  };
}

function evidence(segmentId: string, distanceM: number): AlignedTrackSlice {
  return {
    trackId: "evidence",
    evidenceState: "DERIVED",
    unit: "state",
    sourceRef: "fixture:evidence",
    limitations: ["fixture"],
    samples: [{ segmentId, distanceM, value: "Versioned reference" }],
  };
}

function segments(): AlignedSegment[] {
  const definitions = [
    ["an-las-flores", 0, 1887, "BARE_GROUND_LIKE"],
    ["an-nodo-bajo", 17846, 2409, "BARE_GROUND_LIKE"],
    ["an-nodo-medio", 40154, 3118, "UNCLASSIFIED"],
    ["an-nodo-alto", 66626, 4048, "SNOW_LIKE"],
    ["an-paso-agua-negra", 88934, 4760, "SNOW_LIKE"],
  ] as const;

  const ruleCandidate = MobilityAnomalyCandidateSchema.parse({
    schemaVersion: "0.1",
    candidateId: "rule-node-alto",
    segmentId: "an-nodo-alto",
    timeWindow: { start: ts, end: "2026-08-30T12:05:00-03:00" },
    detector: "RULE",
    detectorVersion: "0.1",
    supportingFeatures: ["median_speed"],
    vehiclesObserved: 4,
    datasetArtifactRef: "fixture:mobility",
    limitations: ["synthetic"],
    evidenceState: "SYNTHETIC_EXPERIMENT",
  });

  const mlCandidate = MobilityAnomalyCandidateSchema.parse({
    schemaVersion: "0.1",
    candidateId: "ml-node-alto",
    segmentId: "an-nodo-alto",
    timeWindow: { start: ts, end: "2026-08-30T12:05:00-03:00" },
    detector: "ISOLATION_FOREST",
    detectorVersion: "0.1.0",
    anomalyScore: 0.42,
    supportingFeatures: ["hard_brake_count"],
    vehiclesObserved: 4,
    modelArtifactRef: "sklearn:IsolationForest:v0.1.0",
    datasetArtifactRef: "fixture:mobility",
    limitations: ["synthetic"],
    evidenceState: "SYNTHETIC_EXPERIMENT",
  });

  return definitions.map(([segmentId, distanceM, elevationM, surfaceClass]) => ({
    segmentId,
    distanceStartM: distanceM,
    distanceEndM: distanceM,
    terrain: terrain(segmentId, distanceM, elevationM),
    weather: null,
    satellite: {
      segmentId,
      availability: "AVAILABLE" as const,
      evidenceState: "DERIVED" as const,
      surfaceClass,
      indices: { ndvi: 0.08, ndwi: -0.11, ndsi: surfaceClass === "SNOW_LIKE" ? 0.62 : 0.12 },
      previewRef: "satellite-preview.svg",
      limitations: ["spectral context only"],
    },
    mobility: null,
    access: {
      trackId: "access",
      evidenceState: "PENDING" as const,
      unit: "state",
      sourceRef: "fixture:access",
      limitations: ["pending"],
      samples: [],
    },
    evidence: evidence(segmentId, distanceM),
    ruleCandidates: segmentId === "an-nodo-alto" ? [ruleCandidate] : [],
    mlCandidates: segmentId === "an-nodo-alto" ? [mlCandidate] : [],
  }));
}

describe("human-readable Territorial Score matrix", () => {
  it("uses six territorial rows, public node headers and units while keeping detector candidates outside the matrix", () => {
    render(
      <ScorePanel
        segments={segments()}
        selectedSegmentId="an-nodo-alto"
        onSelectSegment={() => undefined}
      />,
    );

    const score = screen.getByRole("region", { name: /Territorial tracks/i });
    expect(within(score).getByText("RELIEF")).toBeInTheDocument();
    expect(within(score).getByText("SATELLITE")).toBeInTheDocument();
    expect(within(score).getByText("Las Flores")).toBeInTheDocument();
    expect(within(score).getByText("Nodo Alto")).toBeInTheDocument();
    expect(within(score).getByText("4,048 m")).toBeInTheDocument();
    expect(within(score).getAllByText("No frozen data")).toHaveLength(5);
    expect(within(score).getAllByText("No real telemetry")).toHaveLength(5);
    expect(within(score).getAllByText("Not verified")).toHaveLength(5);
    expect(within(score).queryByText("RULE CANDIDATE")).not.toBeInTheDocument();
    expect(within(score).queryByText("ML CANDIDATE")).not.toBeInTheDocument();
  });
});
