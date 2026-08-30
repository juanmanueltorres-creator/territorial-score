import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  SatelliteContextArtifactSchema,
  SatelliteSourceSnapshotSchema,
  type SatelliteContextArtifact,
  type SatelliteSegment,
  type SatelliteSourceSnapshot,
} from "../src/contracts/satellite";
import { classifySurface, SATELLITE_RULE_VERSION } from "../src/satellite/classifySurface";

const PROCESSOR_VERSION = "0.1.0" as const;
const INDEX_DEFINITIONS_VERSION = "0.1.0" as const;
const PREVIEW_REF = "satellite-preview.svg" as const;

export function buildSatelliteContext(
  source: SatelliteSourceSnapshot,
): SatelliteContextArtifact {
  const segments: SatelliteSegment[] = source.segments
    .map((segment): SatelliteSegment => {
      if (segment.availability === "MISSING") {
        return {
          segmentId: segment.segmentId,
          availability: "MISSING",
          evidenceState: null,
          surfaceClass: null,
          indices: null,
          previewRef: null,
          reason: segment.reason,
          limitations: [...segment.limitations],
        };
      }

      return {
        segmentId: segment.segmentId,
        availability: "AVAILABLE",
        evidenceState: "DERIVED",
        surfaceClass: classifySurface(segment.indices),
        indices: { ...segment.indices },
        previewRef: PREVIEW_REF,
        limitations: [...segment.limitations],
      };
    })
    .sort((a, b) => a.segmentId.localeCompare(b.segmentId));

  return SatelliteContextArtifactSchema.parse({
    schemaVersion: "0.2",
    artifactId: `${source.snapshotId}:context`,
    source: { ...source.source },
    scene: { ...source.scene },
    processing: {
      processorVersion: PROCESSOR_VERSION,
      ruleVersion: SATELLITE_RULE_VERSION,
      indexDefinitionsVersion: INDEX_DEFINITIONS_VERSION,
    },
    segments,
    limitations: [...source.limitations],
  });
}

export function buildSatellitePreviewSvg(source: SatelliteSourceSnapshot): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 576"><image width="1024" height="576" href="data:image/jpeg;base64,${source.preview.base64}" /></svg>\n`;
}

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  const contextOutputPath = process.argv[3];
  const previewOutputPath = process.argv[4];

  if (!inputPath || !contextOutputPath || !previewOutputPath) {
    throw new Error(
      "usage: build-satellite-context <satellite-source.snapshot.json> <satellite-context.json> <satellite-preview.svg>",
    );
  }

  const sourcePayload = JSON.parse(await readFile(resolve(inputPath), "utf8")) as unknown;
  const source = SatelliteSourceSnapshotSchema.parse(sourcePayload);
  const context = buildSatelliteContext(source);
  const preview = buildSatellitePreviewSvg(source);

  await Promise.all([
    writeFile(resolve(contextOutputPath), `${JSON.stringify(context, null, 2)}\n`, "utf8"),
    writeFile(resolve(previewOutputPath), preview, "utf8"),
  ]);
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  await main();
}
