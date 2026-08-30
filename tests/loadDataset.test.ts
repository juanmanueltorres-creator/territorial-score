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

describe("loadDataset", () => {
  it("loads every required artifact and returns a missing optional ML artifact as null", async () => {
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
    expect(seen.some((url) => url.endsWith("corridor.geojson"))).toBe(true);
    expect(seen.some((url) => url.endsWith("terrain.json"))).toBe(true);
    expect(seen.some((url) => url.endsWith("weather.json"))).toBe(true);
    expect(seen.some((url) => url.endsWith("access.json"))).toBe(true);
    expect(seen.some((url) => url.endsWith("evidence.json"))).toBe(true);
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
