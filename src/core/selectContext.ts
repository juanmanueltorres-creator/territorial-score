import type { AlignedSegment, AlignedTrackSlice } from "./alignTracks";

export type ContextTrackName = "terrain" | "weather" | "satellite" | "mobility" | "access" | "evidence";

export type ContextContradiction = {
  track: ContextTrackName;
  values: Array<string | number | boolean | null>;
};

export type ContextFrame = {
  segmentId: string;
  timestamp: string;
  availableTracks: ContextTrackName[];
  missingTracks: ContextTrackName[];
  contradictions: ContextContradiction[];
  candidateRefs: string[];
  sourceRefs: string[];
  limitations: string[];
};

const trackOrder: ContextTrackName[] = [
  "terrain",
  "weather",
  "satellite",
  "mobility",
  "access",
  "evidence",
];

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function evidenceContradictions(slice: AlignedTrackSlice | null): ContextContradiction[] {
  if (!slice) return [];

  const values = unique(slice.samples.map((sample) => sample.value));
  if (values.length <= 1) return [];

  return [{ track: "evidence", values }];
}

export function selectContext(
  aligned: AlignedSegment[],
  selection: { segmentId: string; timestamp: string },
): ContextFrame {
  const segment = aligned.find((candidate) => candidate.segmentId === selection.segmentId);
  if (!segment) {
    throw new Error(`context_segment_not_found:${selection.segmentId}`);
  }

  const availableTracks: ContextTrackName[] = [];
  const missingTracks: ContextTrackName[] = [];
  const sourceRefs: string[] = [];
  const limitations: string[] = [];

  for (const trackName of trackOrder) {
    if (trackName === "satellite") {
      if (!segment.satellite) {
        missingTracks.push(trackName);
        continue;
      }

      limitations.push(...segment.satellite.limitations);
      if (segment.satellite.availability === "AVAILABLE") {
        availableTracks.push(trackName);
      } else {
        missingTracks.push(trackName);
      }
      continue;
    }

    const slice = segment[trackName];
    if (slice) {
      availableTracks.push(trackName);
      sourceRefs.push(slice.sourceRef);
      limitations.push(...slice.limitations);
    } else {
      missingTracks.push(trackName);
    }
  }

  return {
    segmentId: segment.segmentId,
    timestamp: selection.timestamp,
    availableTracks,
    missingTracks,
    contradictions: evidenceContradictions(segment.evidence),
    candidateRefs: [
      ...segment.ruleCandidates.map((candidate) => candidate.candidateId),
      ...segment.mlCandidates.map((candidate) => candidate.candidateId),
    ],
    sourceRefs: unique(sourceRefs),
    limitations: unique(limitations),
  };
}
