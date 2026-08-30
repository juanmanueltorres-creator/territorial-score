import { describe, expect, it } from "vitest";
import {
  buildSatelliteContext,
  buildSatellitePreviewSvg,
} from "../scripts/build-satellite-context";
import { SatelliteSourceSnapshotSchema } from "../src/contracts/satellite";

const timestamp = "2026-08-30T12:00:00-03:00";

function sourceFixture() {
  return SatelliteSourceSnapshotSchema.parse({
    schemaVersion: "0.2",
    snapshotId: "agua-negra-sentinel-v0.2",
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
    preview: {
      mimeType: "image/jpeg",
      base64: "YWJjZA==",
    },
    segments: [
      {
        segmentId: "seg-b",
        availability: "AVAILABLE",
        indices: { ndvi: 0.08, ndwi: -0.11, ndsi: 0.62 },
        limitations: ["spectral context only"],
      },
      {
        segmentId: "seg-a",
        availability: "MISSING",
        indices: null,
        reason: "EXCESSIVE_CLOUD",
        limitations: ["cloud obscures the source observation"],
      },
    ],
    limitations: ["frozen fixture, not field observation"],
  });
}

describe("buildSatelliteContext", () => {
  it("sorts segments and derives only AVAILABLE records", () => {
    const artifact = buildSatelliteContext(sourceFixture());

    expect(artifact.artifactId).toBe("agua-negra-sentinel-v0.2:context");
    expect(artifact.processing).toEqual({
      processorVersion: "0.1.0",
      ruleVersion: "0.1.0",
      indexDefinitionsVersion: "0.1.0",
    });
    expect(artifact.segments.map((segment) => segment.segmentId)).toEqual(["seg-a", "seg-b"]);
    expect(artifact.segments[0]).toEqual({
      segmentId: "seg-a",
      availability: "MISSING",
      evidenceState: null,
      surfaceClass: null,
      indices: null,
      previewRef: null,
      reason: "EXCESSIVE_CLOUD",
      limitations: ["cloud obscures the source observation"],
    });
    expect(artifact.segments[1]).toMatchObject({
      segmentId: "seg-b",
      availability: "AVAILABLE",
      evidenceState: "DERIVED",
      surfaceClass: "SNOW_LIKE",
      previewRef: "satellite-preview.svg",
    });
  });

  it("does not mutate the frozen source snapshot", () => {
    const source = sourceFixture();
    const originalOrder = source.segments.map((segment) => segment.segmentId);

    buildSatelliteContext(source);

    expect(source.segments.map((segment) => segment.segmentId)).toEqual(originalOrder);
  });
});

describe("buildSatellitePreviewSvg", () => {
  it("embeds the frozen JPEG locally and contains no mutable remote URL", () => {
    const svg = buildSatellitePreviewSvg(sourceFixture());

    expect(svg).toContain('href="data:image/jpeg;base64,YWJjZA=="');
    expect(svg).not.toContain("http://");
    expect(svg).not.toContain("https://");
    expect(svg.endsWith("\n")).toBe(true);
  });
});
