import type { MobilityAnomalyCandidate } from "../contracts/candidate";
import type { SatelliteSegment } from "../contracts/satellite";
import type { Track, TrackSample } from "../contracts/track";
import type { TerritorialDataset } from "../data/loadDataset";

export type AlignedTrackSlice = {
  trackId: string;
  evidenceState: Track["evidenceState"];
  unit: string;
  sourceRef: string;
  limitations: string[];
  samples: TrackSample[];
};

export type AlignedSegment = {
  segmentId: string;
  distanceStartM: number;
  distanceEndM: number;
  terrain: AlignedTrackSlice | null;
  weather: AlignedTrackSlice | null;
  satellite: SatelliteSegment | null;
  mobility: AlignedTrackSlice | null;
  access: AlignedTrackSlice | null;
  evidence: AlignedTrackSlice | null;
  ruleCandidates: MobilityAnomalyCandidate[];
  mlCandidates: MobilityAnomalyCandidate[];
};

function compareSamples(a: TrackSample, b: TrackSample): number {
  const byDistance = a.distanceM - b.distanceM;
  if (byDistance !== 0) return byDistance;

  const aTime = a.timestamp ?? "";
  const bTime = b.timestamp ?? "";
  const byTime = aTime.localeCompare(bTime);
  if (byTime !== 0) return byTime;

  return JSON.stringify(a.value).localeCompare(JSON.stringify(b.value));
}

function sliceTrack(track: Track | null, segmentId: string): AlignedTrackSlice | null {
  if (!track) return null;

  const samples = track.samples
    .filter((sample) => sample.segmentId === segmentId)
    .map((sample) => ({ ...sample }))
    .sort(compareSamples);

  if (samples.length === 0 && !(track.evidenceState === "PENDING" && track.samples.length === 0)) {
    return null;
  }

  return {
    trackId: track.trackId,
    evidenceState: track.evidenceState,
    unit: track.unit,
    sourceRef: track.sourceRef,
    limitations: [...track.limitations],
    samples,
  };
}

function satelliteForSegment(
  dataset: TerritorialDataset,
  segmentId: string,
): SatelliteSegment | null {
  const satellite = dataset.satelliteContext?.segments.find(
    (candidate) => candidate.segmentId === segmentId,
  );
  if (!satellite) return null;

  if (satellite.availability === "AVAILABLE") {
    return {
      ...satellite,
      indices: { ...satellite.indices },
      limitations: [...satellite.limitations],
    };
  }

  return {
    ...satellite,
    limitations: [...satellite.limitations],
  };
}

function candidatesForSegment(
  candidates: MobilityAnomalyCandidate[] | null,
  segmentId: string,
): MobilityAnomalyCandidate[] {
  if (!candidates) return [];
  return candidates
    .filter((candidate) => candidate.segmentId === segmentId)
    .map((candidate) => ({
      ...candidate,
      timeWindow: { ...candidate.timeWindow },
      supportingFeatures: [...candidate.supportingFeatures],
      limitations: [...candidate.limitations],
    }))
    .sort((a, b) => a.candidateId.localeCompare(b.candidateId));
}

export function alignTracks(dataset: TerritorialDataset): AlignedSegment[] {
  const tracks = [
    dataset.tracks.terrain,
    dataset.tracks.weather,
    dataset.tracks.mobility,
    dataset.tracks.access,
    dataset.tracks.evidence,
  ].filter((track): track is Track => track !== null);

  const distancesBySegment = new Map<string, number[]>();

  for (const track of tracks) {
    for (const sample of track.samples) {
      const distances = distancesBySegment.get(sample.segmentId) ?? [];
      distances.push(sample.distanceM);
      distancesBySegment.set(sample.segmentId, distances);
    }
  }

  const segments = [...distancesBySegment.entries()].map(([segmentId, distances]) => ({
    segmentId,
    distanceStartM: Math.min(...distances),
    distanceEndM: Math.max(...distances),
  }));

  segments.sort(
    (a, b) =>
      a.distanceStartM - b.distanceStartM ||
      a.distanceEndM - b.distanceEndM ||
      a.segmentId.localeCompare(b.segmentId),
  );

  return segments.map(({ segmentId, distanceStartM, distanceEndM }) => ({
    segmentId,
    distanceStartM,
    distanceEndM,
    terrain: sliceTrack(dataset.tracks.terrain, segmentId),
    weather: sliceTrack(dataset.tracks.weather, segmentId),
    satellite: satelliteForSegment(dataset, segmentId),
    mobility: sliceTrack(dataset.tracks.mobility, segmentId),
    access: sliceTrack(dataset.tracks.access, segmentId),
    evidence: sliceTrack(dataset.tracks.evidence, segmentId),
    ruleCandidates: candidatesForSegment(dataset.ruleCandidates, segmentId),
    mlCandidates: candidatesForSegment(dataset.mlCandidates, segmentId),
  }));
}
