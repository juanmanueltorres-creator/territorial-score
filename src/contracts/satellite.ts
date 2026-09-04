import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

const offsetAwareTimestamp = z.string().refine(
  (value) => /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && !Number.isNaN(Date.parse(value)),
  { message: "timestamp must be valid ISO-8601 with explicit timezone" },
);

const safeRelativePath = z.string().trim().min(1).refine(
  (value) => {
    if (/^[A-Za-z]:[\\/]/.test(value)) return false;
    if (value.startsWith("/") || value.startsWith("\\")) return false;
    if (/^(?:https?|file):\/\//i.test(value)) return false;
    if (value.includes("\\")) return false;
    return !value.split("/").includes("..");
  },
  { message: "artifact path must stay inside the dataset root" },
);

const base64String = z
  .string()
  .trim()
  .min(4)
  .regex(
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
    "preview must be valid base64",
  );

export const SatelliteSurfaceClassSchema = z.enum([
  "SNOW_LIKE",
  "WATER_LIKE",
  "VEGETATION",
  "BARE_GROUND_LIKE",
  "UNCLASSIFIED",
]);

export const SatelliteMissingReasonSchema = z.enum([
  "EXCESSIVE_CLOUD",
  "MISSING_COVERAGE",
  "INVALID_INDICES",
  "PROCESSING_FAILURE",
  "NO_QUALIFYING_SCENE",
]);

export const SpectralIndicesSchema = z
  .object({
    ndvi: z.number().finite(),
    ndwi: z.number().finite(),
    ndsi: z.number().finite(),
  })
  .strict();

const SourceMetadataSchema = z
  .object({
    provider: z.literal("Sentinel-2"),
    processingSystem: z.literal("Google Earth Engine"),
    sourceRef: nonEmptyString,
  })
  .strict();

const SceneMetadataSchema = z
  .object({
    sceneId: nonEmptyString,
    acquiredAt: offsetAwareTimestamp,
    cloudPercentage: z.number().finite().min(0).max(100),
  })
  .strict();

const AvailableSatelliteSourceSegmentSchema = z
  .object({
    segmentId: nonEmptyString,
    availability: z.literal("AVAILABLE"),
    indices: SpectralIndicesSchema,
    limitations: z.array(nonEmptyString).min(1),
  })
  .strict();

const MissingSatelliteSourceSegmentSchema = z
  .object({
    segmentId: nonEmptyString,
    availability: z.literal("MISSING"),
    indices: z.null(),
    reason: SatelliteMissingReasonSchema,
    limitations: z.array(nonEmptyString).min(1),
  })
  .strict();

export const SatelliteSourceSegmentSchema = z.discriminatedUnion("availability", [
  AvailableSatelliteSourceSegmentSchema,
  MissingSatelliteSourceSegmentSchema,
]);

const AvailableSatelliteSegmentSchema = z
  .object({
    segmentId: nonEmptyString,
    availability: z.literal("AVAILABLE"),
    evidenceState: z.literal("DERIVED"),
    surfaceClass: SatelliteSurfaceClassSchema,
    indices: SpectralIndicesSchema,
    previewRef: safeRelativePath,
    limitations: z.array(nonEmptyString).min(1),
  })
  .strict();

const MissingSatelliteSegmentSchema = z
  .object({
    segmentId: nonEmptyString,
    availability: z.literal("MISSING"),
    evidenceState: z.null(),
    surfaceClass: z.null(),
    indices: z.null(),
    previewRef: z.null(),
    reason: SatelliteMissingReasonSchema,
    limitations: z.array(nonEmptyString).min(1),
  })
  .strict();

export const SatelliteSegmentSchema = z.discriminatedUnion("availability", [
  AvailableSatelliteSegmentSchema,
  MissingSatelliteSegmentSchema,
]);

export const SatelliteSourceSnapshotSchema = z
  .object({
    schemaVersion: z.literal("0.2"),
    snapshotId: nonEmptyString,
    source: SourceMetadataSchema,
    scene: SceneMetadataSchema,
    preview: z
      .object({
        mimeType: z.literal("image/jpeg"),
        base64: base64String,
      })
      .strict(),
    segments: z.array(SatelliteSourceSegmentSchema).min(1),
    limitations: z.array(nonEmptyString).min(1),
  })
  .strict();

export const SatelliteContextArtifactSchema = z
  .object({
    schemaVersion: z.literal("0.2"),
    artifactId: nonEmptyString,
    source: SourceMetadataSchema,
    scene: SceneMetadataSchema,
    processing: z
      .object({
        processorVersion: z.literal("0.1.0"),
        ruleVersion: z.literal("0.1.0"),
        indexDefinitionsVersion: z.literal("0.1.0"),
      })
      .strict(),
    segments: z.array(SatelliteSegmentSchema).min(1),
    limitations: z.array(nonEmptyString).min(1),
  })
  .strict();

export type SatelliteSurfaceClass = z.infer<typeof SatelliteSurfaceClassSchema>;
export type SatelliteMissingReason = z.infer<typeof SatelliteMissingReasonSchema>;
export type SpectralIndices = z.infer<typeof SpectralIndicesSchema>;
export type SatelliteSourceSegment = z.infer<typeof SatelliteSourceSegmentSchema>;
export type SatelliteSegment = z.infer<typeof SatelliteSegmentSchema>;
export type SatelliteSourceSnapshot = z.infer<typeof SatelliteSourceSnapshotSchema>;
export type SatelliteContextArtifact = z.infer<typeof SatelliteContextArtifactSchema>;
