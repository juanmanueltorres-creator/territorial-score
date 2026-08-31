// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../src/app/App";
import { DatasetManifestSchema } from "../src/contracts/manifest";
import { SatelliteContextArtifactSchema } from "../src/contracts/satellite";
import { TrackSchema } from "../src/contracts/track";
import type { TerritorialDataset } from "../src/data/loadDataset";
import type { MapPanelProps } from "../src/features/map/MapPanel";

const ts = "2026-08-30T12:00:00-03:00";
const rawTerrainRef = "github:Geo_Platform@raw-provenance-sha:agua-negra-profile";
const rawSatelliteRef = "gee:COPERNICUS/S2_SR_HARMONIZED/RAW_SCENE_REF";

function publicDataset(): TerritorialDataset {
  const manifest = DatasetManifestSchema.parse({
    schemaVersion: "0.2",
    datasetId: "agua-negra-v0.2",
    title: "RN150 / Agua Negra · Territorial Score V0.2",
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
      satelliteContext: { path: "satellite-context.json", kind: "SATELLITE_CONTEXT", required: true },
    },
  });

  const terrain = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "terrain",
    kind: "TERRAIN",
    evidenceState: "DERIVED",
    unit: "m",
    sourceRef: rawTerrainRef,
    limitations: ["Elevation is derived from a digital elevation model."],
    samples: [{ segmentId: "an-nodo-alto", distanceM: 66626, value: 4048 }],
  });

  const weather = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "weather",
    kind: "WEATHER",
    evidenceState: "MODELLED",
    unit: "state",
    sourceRef: "open-meteo:modelled-weather-capability",
    limitations: ["No frozen weather snapshot is stored for this dataset version."],
    samples: [{ segmentId: "an-nodo-alto", distanceM: 66626, timestamp: ts, value: null }],
  });

  const access = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "access",
    kind: "ACCESS",
    evidenceState: "PENDING",
    unit: "state",
    sourceRef: "access:pending",
    limitations: ["No authoritative access-status snapshot is frozen for this dataset version."],
    samples: [],
  });

  const evidence = TrackSchema.parse({
    schemaVersion: "0.1",
    trackId: "evidence",
    kind: "EVIDENCE",
    evidenceState: "DERIVED",
    unit: "state",
    sourceRef: "evidence:agua-negra-lineage",
    limitations: ["Reference lineage does not establish current road condition."],
    samples: [{ segmentId: "an-nodo-alto", distanceM: 66626, value: "versioned reference" }],
  });

  const satelliteContext = SatelliteContextArtifactSchema.parse({
    schemaVersion: "0.2",
    artifactId: "agua-negra-satellite-fixture",
    source: {
      provider: "Sentinel-2",
      processingSystem: "Google Earth Engine",
      sourceRef: rawSatelliteRef,
    },
    scene: {
      sceneId: "COPERNICUS/S2_SR_HARMONIZED/RAW_SCENE_REF",
      acquiredAt: ts,
      cloudPercentage: 7.5,
    },
    processing: {
      processorVersion: "0.1.0",
      ruleVersion: "0.1.0",
      indexDefinitionsVersion: "0.1.0",
    },
    segments: [
      {
        segmentId: "an-nodo-alto",
        availability: "AVAILABLE",
        evidenceState: "DERIVED",
        surfaceClass: "SNOW_LIKE",
        indices: { ndvi: 0.08, ndwi: -0.11, ndsi: 0.62 },
        previewRef: "satellite-preview.svg",
        limitations: ["Spectral context only; it does not establish road condition."],
      },
    ],
    limitations: ["Satellite interpretation is contextual evidence, not an access or safety assessment."],
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
    satelliteContext,
    ruleCandidates: null,
    mlCandidates: null,
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

describe("human-readable selected place context", () => {
  it("explains Nodo Alto before exposing raw technical provenance", () => {
    render(<App dataset={publicDataset()} MapComponent={MapProbe} />);

    expect(screen.getByText("Nodo Alto")).toBeInTheDocument();
    expect(screen.getByText(/km 66\.6/i)).toBeInTheDocument();
    expect(screen.getByText(/4,048 m/i)).toBeInTheDocument();
    expect(screen.getByText(/No frozen weather snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/No real operational vehicle telemetry/i)).toBeInTheDocument();
    expect(screen.getByText(/Real access status not verified/i)).toBeInTheDocument();
    expect(screen.getByText(/Snow-like surface/i)).toBeInTheDocument();
    expect(screen.getByText(/Spectral context only/i)).toBeInTheDocument();

    expect(screen.queryByText(rawTerrainRef)).not.toBeInTheDocument();
    expect(screen.queryByText(rawSatelliteRef)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/Technical provenance/i));

    expect(screen.getByText(rawTerrainRef)).toBeInTheDocument();
    expect(screen.getByText(rawSatelliteRef)).toBeInTheDocument();
  });
});
