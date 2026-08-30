import {
  MobilityAnomalyCandidateSchema,
  type MobilityAnomalyCandidate,
} from "../contracts/candidate";

export type MobilityObservation = {
  observationId: string;
  vehicleId: string;
  segmentId: string;
  timestamp: string;
  distanceM: number;
  speedKmh: number;
  accelerationMps2: number;
  dwellSeconds: number;
  lateralOffsetM: number;
};

export type RuleDetectorConfig = {
  speedDropFraction: number;
  minimumVehicles: number;
  windowMinutes: number;
};

export const DEFAULT_RULE_DETECTOR_CONFIG: RuleDetectorConfig = {
  speedDropFraction: 0.25,
  minimumVehicles: 3,
  windowMinutes: 5,
};

const DETECTOR_VERSION = "0.1.0";
const DATASET_ARTIFACT_REF = "public/data/agua-negra-v0/mobility.synthetic.json";

function median(values: number[]): number {
  if (values.length === 0) throw new Error("median requires at least one value");
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle]!;
  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function validateConfig(config: RuleDetectorConfig): void {
  if (!(config.speedDropFraction > 0 && config.speedDropFraction < 1)) {
    throw new Error("speedDropFraction must be between 0 and 1");
  }
  if (!Number.isInteger(config.minimumVehicles) || config.minimumVehicles < 1) {
    throw new Error("minimumVehicles must be a positive integer");
  }
  if (!Number.isFinite(config.windowMinutes) || config.windowMinutes <= 0) {
    throw new Error("windowMinutes must be positive");
  }
}

function validateObservations(observations: MobilityObservation[]): void {
  for (const observation of observations) {
    if (!observation.observationId || !observation.vehicleId || !observation.segmentId) {
      throw new Error("mobility observation identifiers must be non-empty");
    }
    if (Number.isNaN(Date.parse(observation.timestamp))) {
      throw new Error("mobility observation timestamp must be valid");
    }
    for (const value of [
      observation.distanceM,
      observation.speedKmh,
      observation.accelerationMps2,
      observation.dwellSeconds,
      observation.lateralOffsetM,
    ]) {
      if (!Number.isFinite(value)) throw new Error("mobility observation numbers must be finite");
    }
    if (observation.speedKmh < 0 || observation.dwellSeconds < 0 || observation.distanceM < 0) {
      throw new Error("mobility distance, speed and dwell values must be non-negative");
    }
  }
}

function addMinutes(timestamp: string, minutes: number): string {
  return new Date(Date.parse(timestamp) + minutes * 60_000).toISOString();
}

function candidateId(segmentId: string, start: string): string {
  return `rule:${segmentId}:${start}`;
}

function detectSegmentCandidate(
  observations: MobilityObservation[],
  config: RuleDetectorConfig,
): MobilityAnomalyCandidate | null {
  if (observations.length < config.minimumVehicles) return null;

  const localMedian = median(observations.map((observation) => observation.speedKmh));
  const threshold = localMedian * (1 - config.speedDropFraction);
  const lowSpeed = observations
    .filter((observation) => observation.speedKmh < threshold)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp) || a.vehicleId.localeCompare(b.vehicleId));

  const windowMs = config.windowMinutes * 60_000;
  for (let startIndex = 0; startIndex < lowSpeed.length; startIndex += 1) {
    const startObservation = lowSpeed[startIndex]!;
    const startMs = Date.parse(startObservation.timestamp);
    const inWindow = lowSpeed.filter((observation) => {
      const timestampMs = Date.parse(observation.timestamp);
      return timestampMs >= startMs && timestampMs <= startMs + windowMs;
    });
    const vehicleIds = [...new Set(inWindow.map((observation) => observation.vehicleId))];
    if (vehicleIds.length < config.minimumVehicles) continue;

    return MobilityAnomalyCandidateSchema.parse({
      schemaVersion: "0.1",
      candidateId: candidateId(startObservation.segmentId, startObservation.timestamp),
      segmentId: startObservation.segmentId,
      timeWindow: {
        start: startObservation.timestamp,
        end: addMinutes(startObservation.timestamp, config.windowMinutes),
      },
      detector: "RULE",
      detectorVersion: DETECTOR_VERSION,
      supportingFeatures: [
        `segment_median_speed_kmh=${localMedian.toFixed(3)}`,
        `speed_drop_threshold_kmh=${threshold.toFixed(3)}`,
        `speed_drop_fraction=${config.speedDropFraction.toFixed(3)}`,
      ],
      vehiclesObserved: vehicleIds.length,
      datasetArtifactRef: DATASET_ARTIFACT_REF,
      limitations: [
        "Transparent baseline compares observations against the median speed of the same segment.",
        "Candidate timing is based only on the configured local observation window.",
        "Anomaly candidate is not a road defect or a travel-safety determination.",
      ],
      evidenceState: "SYNTHETIC_EXPERIMENT",
    });
  }

  return null;
}

export function detectRuleCandidates(
  mobility: MobilityObservation[],
  config: RuleDetectorConfig,
): MobilityAnomalyCandidate[] {
  validateConfig(config);
  validateObservations(mobility);

  const bySegment = new Map<string, MobilityObservation[]>();
  for (const observation of mobility) {
    const segment = bySegment.get(observation.segmentId) ?? [];
    segment.push(observation);
    bySegment.set(observation.segmentId, segment);
  }

  return [...bySegment.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, observations]) => detectSegmentCandidate(observations, config))
    .filter((candidate): candidate is MobilityAnomalyCandidate => candidate !== null)
    .sort((a, b) => a.segmentId.localeCompare(b.segmentId) || a.timeWindow.start.localeCompare(b.timeWindow.start));
}
