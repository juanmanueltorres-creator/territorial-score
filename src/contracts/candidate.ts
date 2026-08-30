import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);
const offsetAwareTimestamp = z.string().refine(
  (value) => /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && !Number.isNaN(Date.parse(value)),
  { message: "timestamp must be valid ISO-8601 with explicit timezone" },
);

export const DetectorKindSchema = z.enum(["RULE", "ISOLATION_FOREST"]);

const TimeWindowSchema = z
  .object({
    start: offsetAwareTimestamp,
    end: offsetAwareTimestamp,
  })
  .strict();

export const MobilityAnomalyCandidateSchema = z
  .object({
    schemaVersion: z.literal("0.1"),
    candidateId: nonEmptyString,
    segmentId: nonEmptyString,
    timeWindow: TimeWindowSchema,
    detector: DetectorKindSchema,
    detectorVersion: nonEmptyString,
    anomalyScore: z.number().finite().optional(),
    supportingFeatures: z.array(nonEmptyString).min(1),
    vehiclesObserved: z.number().int().min(1),
    modelArtifactRef: nonEmptyString.optional(),
    datasetArtifactRef: nonEmptyString,
    limitations: z.array(nonEmptyString).min(1),
    evidenceState: z.literal("SYNTHETIC_EXPERIMENT"),
  })
  .strict()
  .superRefine((candidate, ctx) => {
    if (Date.parse(candidate.timeWindow.end) <= Date.parse(candidate.timeWindow.start)) {
      ctx.addIssue({
        code: "custom",
        path: ["timeWindow", "end"],
        message: "timeWindow.end must be after timeWindow.start",
      });
    }
  });

export type MobilityAnomalyCandidate = z.infer<typeof MobilityAnomalyCandidateSchema>;
