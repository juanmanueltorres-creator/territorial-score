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

export const DatasetArtifactKindSchema = z.enum([
  "CORRIDOR",
  "TERRAIN",
  "WEATHER",
  "ACCESS",
  "EVIDENCE",
  "MOBILITY",
  "ANOMALY_GROUND_TRUTH",
  "RULE_CANDIDATES",
  "ML_CANDIDATES",
]);

export const DatasetArtifactRefSchema = z
  .object({
    path: safeRelativePath,
    kind: DatasetArtifactKindSchema,
    required: z.boolean(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  })
  .strict();

const DatasetArtifactsSchema = z
  .object({
    corridor: DatasetArtifactRefSchema,
    terrain: DatasetArtifactRefSchema,
    weather: DatasetArtifactRefSchema,
    access: DatasetArtifactRefSchema,
    evidence: DatasetArtifactRefSchema,
    mobility: DatasetArtifactRefSchema.optional(),
    anomalyGroundTruth: DatasetArtifactRefSchema.optional(),
    ruleCandidates: DatasetArtifactRefSchema.optional(),
    mlCandidates: DatasetArtifactRefSchema.optional(),
  })
  .strict();

export const DatasetManifestSchema = z
  .object({
    schemaVersion: z.literal("0.1"),
    datasetId: z.literal("agua-negra-v0"),
    title: nonEmptyString,
    territoryRef: nonEmptyString,
    corridorRef: nonEmptyString,
    generatedAt: offsetAwareTimestamp,
    dataAsOf: offsetAwareTimestamp,
    artifacts: DatasetArtifactsSchema,
  })
  .strict();

export type DatasetArtifactRef = z.infer<typeof DatasetArtifactRefSchema>;
export type DatasetManifest = z.infer<typeof DatasetManifestSchema>;
