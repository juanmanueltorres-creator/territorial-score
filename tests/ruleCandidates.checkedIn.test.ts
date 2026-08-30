import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { describe, expect, it } from "vitest";
import { MobilityAnomalyCandidateSchema } from "../src/contracts/candidate";
import { DatasetManifestSchema } from "../src/contracts/manifest";
import {
  DEFAULT_RULE_DETECTOR_CONFIG,
  detectRuleCandidates,
  type MobilityObservation,
} from "../src/core/ruleDetector";

const dataDir = resolve(process.cwd(), "public/data/agua-negra-v0");

type SyntheticRecord = {
  observation_id: string;
  vehicle_id: string;
  segment_id: string;
  timestamp: string;
  distance_m: number;
  speed_kmh: number;
  acceleration_mps2: number;
  dwell_seconds: number;
  lateral_offset_m: number;
};

function adapt(record: SyntheticRecord): MobilityObservation {
  return {
    observationId: record.observation_id,
    vehicleId: record.vehicle_id,
    segmentId: record.segment_id,
    timestamp: record.timestamp,
    distanceM: record.distance_m,
    speedKmh: record.speed_kmh,
    accelerationMps2: record.acceleration_mps2,
    dwellSeconds: record.dwell_seconds,
    lateralOffsetM: record.lateral_offset_m,
  };
}

describe("checked-in rule candidate artifact", () => {
  it("matches the transparent detector output and is declared in the manifest", async () => {
    const mobilityRaw = JSON.parse(await readFile(resolve(dataDir, "mobility.synthetic.json"), "utf8")) as {
      records: SyntheticRecord[];
    };
    const expected = detectRuleCandidates(mobilityRaw.records.map(adapt), DEFAULT_RULE_DETECTOR_CONFIG);

    const actualRaw: unknown = JSON.parse(await readFile(resolve(dataDir, "candidates.rule.json"), "utf8"));
    const actual = z.array(MobilityAnomalyCandidateSchema).parse(actualRaw);
    expect(actual).toEqual(expected);

    const manifestRaw: unknown = JSON.parse(await readFile(resolve(dataDir, "manifest.json"), "utf8"));
    const manifest = DatasetManifestSchema.parse(manifestRaw);
    expect(manifest.artifacts.ruleCandidates).toEqual({
      path: "candidates.rule.json",
      kind: "RULE_CANDIDATES",
      required: true,
    });
  });
});
