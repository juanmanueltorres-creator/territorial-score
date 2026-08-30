import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  DEFAULT_RULE_DETECTOR_CONFIG,
  detectRuleCandidates,
  type MobilityObservation,
} from "../src/core/ruleDetector";

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

type SyntheticArtifact = { records: SyntheticRecord[] };

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

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!inputPath || !outputPath) {
    throw new Error("usage: build-rule-candidates <mobility.synthetic.json> <candidates.rule.json>");
  }

  const raw = JSON.parse(await readFile(resolve(inputPath), "utf8")) as SyntheticArtifact;
  const candidates = detectRuleCandidates(raw.records.map(adapt), DEFAULT_RULE_DETECTOR_CONFIG);
  await writeFile(resolve(outputPath), `${JSON.stringify(candidates, null, 2)}\n`, "utf8");
}

await main();
