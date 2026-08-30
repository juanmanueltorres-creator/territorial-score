import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

const OffsetAwareTimestampSchema = z.string().refine(
  (value) => {
    const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
    return hasTimezone && !Number.isNaN(Date.parse(value));
  },
  { message: "timestamp must be valid ISO-8601 with explicit timezone" },
);

export const TrackKindSchema = z.enum([
  "TERRAIN",
  "WEATHER",
  "MOBILITY",
  "ACCESS",
  "EVIDENCE",
  "ML_CANDIDATE",
]);

export const EvidenceStateSchema = z.enum([
  "OBSERVED",
  "MODELLED",
  "DERIVED",
  "SIMULATED",
  "PENDING",
  "SYNTHETIC_EXPERIMENT",
]);

export const TrackSampleSchema = z
  .object({
    segmentId: nonEmptyString,
    distanceM: z.number().finite().min(0),
    timestamp: OffsetAwareTimestampSchema.optional(),
    value: z.union([z.number().finite(), z.string(), z.boolean(), z.null()]),
  })
  .strict();

export const TrackSchema = z
  .object({
    schemaVersion: z.literal("0.1"),
    trackId: nonEmptyString,
    kind: TrackKindSchema,
    evidenceState: EvidenceStateSchema,
    unit: nonEmptyString,
    sourceRef: nonEmptyString,
    limitations: z.array(nonEmptyString).min(1),
    samples: z.array(TrackSampleSchema),
  })
  .strict()
  .superRefine((track, ctx) => {
    if (track.evidenceState !== "PENDING" && track.samples.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["samples"],
        message: "non-PENDING tracks require at least one sample",
      });
    }

    if (track.kind === "WEATHER" && track.evidenceState !== "MODELLED") {
      ctx.addIssue({
        code: "custom",
        path: ["evidenceState"],
        message: "WEATHER tracks must be MODELLED in V0",
      });
    }

    if (track.kind === "MOBILITY" && track.evidenceState !== "SIMULATED") {
      ctx.addIssue({
        code: "custom",
        path: ["evidenceState"],
        message: "MOBILITY tracks must be SIMULATED in V0",
      });
    }

    if (track.kind === "ML_CANDIDATE" && track.evidenceState !== "SYNTHETIC_EXPERIMENT") {
      ctx.addIssue({
        code: "custom",
        path: ["evidenceState"],
        message: "ML_CANDIDATE tracks must be SYNTHETIC_EXPERIMENT in V0",
      });
    }
  });

export type TrackSample = z.infer<typeof TrackSampleSchema>;
export type Track = z.infer<typeof TrackSchema>;
