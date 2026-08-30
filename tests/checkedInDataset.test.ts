import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { loadDataset } from "../src/data/loadDataset";

const datasetRoot = new URL("../public/data/agua-negra-v0/", import.meta.url);

const fileFetch: typeof fetch = async (input) => {
  const filename = String(input).split("/").pop() ?? "";
  try {
    const content = await readFile(new URL(filename, datasetRoot), "utf8");
    return new Response(content, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
};

describe("checked-in Agua Negra V0 dataset", () => {
  it("loads through the same fail-closed runtime boundary as application data", async () => {
    const dataset = await loadDataset("/data/agua-negra-v0", fileFetch);

    expect(dataset.manifest.datasetId).toBe("agua-negra-v0");
    expect(dataset.corridor.features).toHaveLength(1);
    expect(dataset.tracks.terrain.samples).toHaveLength(5);
    expect(dataset.tracks.weather.samples.map((sample) => sample.value)).toEqual([
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(dataset.tracks.access.evidenceState).toBe("PENDING");
    expect(dataset.tracks.access.samples).toEqual([]);
    expect(dataset.tracks.evidence.samples).toHaveLength(5);
    expect(dataset.tracks.mobility).toBeNull();
    expect(dataset.ruleCandidates).toHaveLength(1);
    expect(dataset.ruleCandidates?.[0]).toMatchObject({
      detector: "RULE",
      segmentId: "an-nodo-bajo",
      vehiclesObserved: 4,
      evidenceState: "SYNTHETIC_EXPERIMENT",
    });
    expect(dataset.mlCandidates?.length).toBeGreaterThan(0);
    expect(dataset.mlCandidates?.every((candidate) =>
      candidate.detector === "ISOLATION_FOREST" && candidate.evidenceState === "SYNTHETIC_EXPERIMENT"
    )).toBe(true);
  });
});
