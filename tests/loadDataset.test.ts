import { describe, expect, it } from "vitest";
import { loadDataset } from "../src/data/loadDataset";

const timestamp = "2026-08-30T12:00:00-03:00";

const track = (kind: "TERRAIN" | "WEATHER" | "ACCESS" | "EVIDENCE", evidenceState: "DERIVED" | "MODELLED" | "PENDING") => ({
  schemaVersion: "0.1",
  trackId: kind.toLowerCase(),
  kind,
  evidenceState,
  unit: kind === "TERRAIN" ? "m" : kind === "WEATHER" ? "km_h" : "state",
  sourceRef: `fixture:${kind.toLowerCase()}`,
  limitations: ["fixture only"],
  samples:
    evidenceState === "PENDING"
      ? []
      : [{ segmentId: "an-001", distanceM: 1000, timestamp, value: kind === "TERRAIN" ? 2500 : 20 }],
});

const manifest = {
  schemaVersion: "0.1",
  datasetId: "agua-negra-v0",
  title: "Agua Negra fixture",
  territoryRef: "admin:AR:1:J",
  corridorRef: "corridor:agua-negra-v1",
  generatedAt: timestamp,
  dataAsOf: timestamp,
  artifacts: {
    corridor: { path: "corridor.geojson", kind: "CORRIDOR", required: true },
    terrain: { path: "terrain.json", kind: "TERRAIN", required: true },
    weather: { path: "weather.json", kind: "WEATHER", required: true },
    access: { path: "access.json", kind: "ACCESS", required: true },
    evidence: { path: "evidence.json", kind: "EVIDENCE", required: true },
    mlCandidates: { path: "candidates.ml.json", kind: "ML_CANDIDATES", required: false },
  },
};

const manifestV02 = {
  ...manifest,
  schemaVersion: "0.2",
  datasetId: "agua-negra-v0.2",
  title: "Agua Negra V0.2 fixture",
  artifacts: {
    ...manifest.artifacts,
    satelliteContext: {
      path: "satellite-context.json",
      kind: "SATELLITE_CONTEXT",
      required: true,
    },
  },
};

const satelliteContext = {
  schemaVersion: "0.2",
  artifactId: "fixture-satellite-context",
  source: {
    provider: "Sentinel-2",
    processingSystem: "Google Earth Engine",
    sourceRef: "fixture:sentinel-source",
  },
  scene: {
    sceneId: "S2B_FIXTURE_20260830",
    acquiredAt: timestamp,
    cloudPercentage: 12.5,
  },
  processing: {
    processorVersion: "0.1.0",
    ruleVersion: "0.1.0",
    indexDefinitionsVersion: "0.1.0",
  },
  segments: [
    {
      segmentId: "an-001",
      availability: "AVAILABLE",
      evidenceState: "DERIVED",
      surfaceClass: "SNOW_LIKE",
      indices: { ndvi: 0.08, ndwi: -0.11, ndsi: 0.62 },
      previewRef: "satellite-preview.svg",
      limitations: ["spectral context only"],
    },
  ],
  limitations: ["fixture only"],
};

const corridor = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { route: "RN 150" },
      geometry: { type: "LineString", coordinates: [[-69.2, -30.3], [-69.8, -30.2]] },
    },
  ],
};

type FixtureMap = Record<string, unknown>;

function fixtureFetch(fixtures: FixtureMap): typeof fetch {
  return async (input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const key = url.split("/").pop() ?? "";
    if (!(key in fixtures)) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(fixtures[key]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

function validFixtures(): FixtureMap {
  return {
    "manifest.json": manifest,
    "corridor.geojson": corridor,
    "terrain.json": track("TERRAIN", "DERIVED"),
    "weather.json": track("WEATHER", "MODELLED"),
    "access.json": track("ACCESS", "PENDING"),
    "evidence.json": track("EVIDENCE", "DERIVED"),
  };
}

function validFixturesV02(): FixtureMap {
  return {
    ...validFixtures(),
    "manifest.json": manifestV02,
    "satellite-context.json": satelliteContext,
  };
}

describe("loadDataset", () => {
  it("loads V0.1 through the existing boundary and exposes no satellite context", async () => {
    const seen: string[] = [];
    const baseFetch = fixtureFetch(validFixtures());
    const fetchImpl: typeof fetch = async (input, init) => {
      seen.push(String(input));
      return baseFetch(input, init);
    };

    const dataset = await loadDataset("/data/agua-negra-v0", fetchImpl);

    expect(dataset.tracks.terrain.kind).toBe("TERRAIN");
    expect(dataset.tracks.weather.evidenceState).toBe("MODELLED");
    expect(dataset.tracks.access.evidenceState).toBe("PENDING");
    expect(dataset.mlCandidates).toBeNull();
    expect(dataset.satelliteContext).toBeNull();
    expect(seen.some((url) => url.endsWith("corridor.geojson"))).toBe(true);
    expect(seen.some((url) => url.endsWith("terrain.json"))).toBe(true);
    expect(seen.some((url) => url.endsWith("weather.json"))).toBe(true);
    expect(seen.some((url) => url.endsWith("access.json"))).toBe(true);
    expect(seen.some((url) => url.endsWith("evidence.json"))).toBe(true);
    expect(seen.some((url) => url.endsWith("satellite-context.json"))).toBe(false);
  });

  it("loads the required V0.2 satellite context through strict runtime validation", async () => {
    const dataset = await loadDataset("/data/agua-negra-v0.2", fixtureFetch(validFixturesV02()));

    expect(dataset.manifest.schemaVersion).toBe("0.2");
    expect(dataset.satelliteContext?.segments[0]).toMatchObject({
      segmentId: "an-001",
      availability: "AVAILABLE",
      surfaceClass: "SNOW_LIKE",
      evidenceState: "DERIVED",
    });
  });

  it("fails closed when the required V0.2 satellite artifact is missing", async () => {
    const fixtures = validFixturesV02();
    delete fixtures["satellite-context.json"];

    await expect(loadDataset("/data/agua-negra-v0.2", fixtureFetch(fixtures)))
      .rejects.toThrow("dataset_artifact_fetch_failed");
  });

  it("fails closed when a required artifact is missing", async () => {
    const fixtures = validFixtures();
    delete fixtures["terrain.json"];

    await expect(loadDataset("/data/agua-negra-v0", fixtureFetch(fixtures))).rejects.toThrow();
  });

  it("rejects the whole dataset when a required track is malformed", async () => {
    const fixtures = validFixtures();
    fixtures["weather.json"] = { ...track("WEATHER", "MODELLED"), riskScore: 91 };

    await expect(loadDataset("/data/agua-negra-v0", fixtureFetch(fixtures))).rejects.toThrow();
  });

  it("rejects malformed optional candidates when the optional file exists", async () => {
    const fixtures = validFixtures();
    fixtures["candidates.ml.json"] = [{ roadDefect: true }];

    await expect(loadDataset("/data/agua-negra-v0", fixtureFetch(fixtures))).rejects.toThrow();
  });
});
