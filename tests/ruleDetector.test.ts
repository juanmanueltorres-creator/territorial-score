import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULE_DETECTOR_CONFIG,
  detectRuleCandidates,
  type MobilityObservation,
} from "../src/core/ruleDetector";

const start = "2026-08-30T09:20:00-03:00";

function observations(lowVehicleCount: number): MobilityObservation[] {
  const speeds = [52, 51, 50, 49, 48, 47].map((speed, index) =>
    index < lowVehicleCount ? 25 : speed,
  );

  return speeds.map((speedKmh, index) => ({
    observationId: `obs-${index + 1}`,
    vehicleId: `truck-${index + 1}`,
    segmentId: "an-nodo-bajo",
    timestamp: `2026-08-30T09:2${index}:00-03:00`,
    distanceM: 17846,
    speedKmh,
    accelerationMps2: 0,
    dwellSeconds: 0,
    lateralOffsetM: 0.5,
  }));
}

describe("rule detector baseline", () => {
  it("keeps the canonical baseline parameters explicit", () => {
    expect(DEFAULT_RULE_DETECTOR_CONFIG).toEqual({
      speedDropFraction: 0.25,
      minimumVehicles: 3,
      windowMinutes: 5,
    });
  });

  it("does not trigger when only two vehicles are affected", () => {
    expect(detectRuleCandidates(observations(2), DEFAULT_RULE_DETECTOR_CONFIG)).toEqual([]);
  });

  it("triggers when three vehicles exceed a 25% median speed drop inside the window", () => {
    const candidates = detectRuleCandidates(observations(3), DEFAULT_RULE_DETECTOR_CONFIG);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.segmentId).toBe("an-nodo-bajo");
    expect(candidates[0]?.vehiclesObserved).toBe(3);
    expect(candidates[0]?.timeWindow.start).toBe(start);
  });

  it("emits an auditable RULE candidate with supporting features and limitations", () => {
    const candidate = detectRuleCandidates(observations(3), DEFAULT_RULE_DETECTOR_CONFIG)[0];

    expect(candidate?.detector).toBe("RULE");
    expect(candidate?.evidenceState).toBe("SYNTHETIC_EXPERIMENT");
    expect(candidate?.supportingFeatures.length).toBeGreaterThan(0);
    expect(candidate?.limitations.length).toBeGreaterThan(0);

    const serialized = JSON.stringify(candidate);
    expect(serialized).not.toContain("riskScore");
    expect(serialized).not.toContain("roadDefect");
    expect(serialized).not.toContain("safeToTravel");
  });
});
