import { z } from "zod";
import {
  MobilityAnomalyCandidateSchema,
  type MobilityAnomalyCandidate,
} from "../contracts/candidate";
import {
  DatasetManifestSchema,
  type DatasetArtifactRef,
  type DatasetManifest,
} from "../contracts/manifest";
import {
  SatelliteContextArtifactSchema,
  type SatelliteContextArtifact,
} from "../contracts/satellite";
import { TrackSchema, type Track } from "../contracts/track";

const CoordinateSchema = z.tuple([z.number().finite(), z.number().finite()]);

const CorridorSchema = z
  .object({
    type: z.literal("FeatureCollection"),
    metadata: z.unknown().optional(),
    features: z
      .array(
        z
          .object({
            type: z.literal("Feature"),
            properties: z.record(z.string(), z.unknown()),
            geometry: z
              .object({
                type: z.literal("LineString"),
                coordinates: z.array(CoordinateSchema).min(2),
              })
              .strict(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type Corridor = z.infer<typeof CorridorSchema>;

export type TerritorialDataset = {
  manifest: DatasetManifest;
  corridor: Corridor;
  tracks: {
    terrain: Track;
    weather: Track;
    access: Track;
    evidence: Track;
    mobility: Track | null;
  };
  satelliteContext: SatelliteContextArtifact | null;
  ruleCandidates: MobilityAnomalyCandidate[] | null;
  mlCandidates: MobilityAnomalyCandidate[] | null;
};

function joinArtifactUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${path}`;
}

async function fetchJson(
  url: string,
  fetchImpl: typeof fetch,
  allowMissing: boolean,
): Promise<unknown | null> {
  const response = await fetchImpl(url, { headers: { Accept: "application/json" } });

  if (!response.ok) {
    if (allowMissing && response.status === 404) return null;
    throw new Error(`dataset_artifact_fetch_failed:${response.status}:${url}`);
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new Error(`dataset_artifact_invalid_json:${url}`);
  }
}

async function loadTrack(
  baseUrl: string,
  ref: DatasetArtifactRef,
  fetchImpl: typeof fetch,
): Promise<Track | null> {
  const payload = await fetchJson(joinArtifactUrl(baseUrl, ref.path), fetchImpl, !ref.required);
  if (payload === null) return null;
  return TrackSchema.parse(payload);
}

async function loadCandidates(
  baseUrl: string,
  ref: DatasetArtifactRef | undefined,
  fetchImpl: typeof fetch,
): Promise<MobilityAnomalyCandidate[] | null> {
  if (!ref) return null;

  const payload = await fetchJson(joinArtifactUrl(baseUrl, ref.path), fetchImpl, !ref.required);
  if (payload === null) return null;

  return z.array(MobilityAnomalyCandidateSchema).parse(payload);
}

function requireCoreArtifact(ref: DatasetArtifactRef, name: string): DatasetArtifactRef {
  if (!ref.required) {
    throw new Error(`dataset_core_artifact_must_be_required:${name}`);
  }
  return ref;
}

async function loadSatelliteContext(
  baseUrl: string,
  manifest: DatasetManifest,
  fetchImpl: typeof fetch,
): Promise<SatelliteContextArtifact | null> {
  if (manifest.schemaVersion !== "0.2") return null;

  const ref = requireCoreArtifact(manifest.artifacts.satelliteContext, "satelliteContext");
  const payload = await fetchJson(joinArtifactUrl(baseUrl, ref.path), fetchImpl, false);
  return SatelliteContextArtifactSchema.parse(payload);
}

export async function loadDataset(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TerritorialDataset> {
  const manifestPayload = await fetchJson(joinArtifactUrl(baseUrl, "manifest.json"), fetchImpl, false);
  const manifest = DatasetManifestSchema.parse(manifestPayload);

  const corridorRef = requireCoreArtifact(manifest.artifacts.corridor, "corridor");
  const terrainRef = requireCoreArtifact(manifest.artifacts.terrain, "terrain");
  const weatherRef = requireCoreArtifact(manifest.artifacts.weather, "weather");
  const accessRef = requireCoreArtifact(manifest.artifacts.access, "access");
  const evidenceRef = requireCoreArtifact(manifest.artifacts.evidence, "evidence");

  const [
    corridorPayload,
    terrain,
    weather,
    access,
    evidence,
    mobility,
    satelliteContext,
    ruleCandidates,
    mlCandidates,
  ] = await Promise.all([
    fetchJson(joinArtifactUrl(baseUrl, corridorRef.path), fetchImpl, false),
    loadTrack(baseUrl, terrainRef, fetchImpl),
    loadTrack(baseUrl, weatherRef, fetchImpl),
    loadTrack(baseUrl, accessRef, fetchImpl),
    loadTrack(baseUrl, evidenceRef, fetchImpl),
    manifest.artifacts.mobility
      ? loadTrack(baseUrl, manifest.artifacts.mobility, fetchImpl)
      : Promise.resolve(null),
    loadSatelliteContext(baseUrl, manifest, fetchImpl),
    loadCandidates(baseUrl, manifest.artifacts.ruleCandidates, fetchImpl),
    loadCandidates(baseUrl, manifest.artifacts.mlCandidates, fetchImpl),
  ]);

  if (!terrain || !weather || !access || !evidence) {
    throw new Error("dataset_required_track_missing");
  }

  return {
    manifest,
    corridor: CorridorSchema.parse(corridorPayload),
    tracks: { terrain, weather, access, evidence, mobility },
    satelliteContext,
    ruleCandidates,
    mlCandidates,
  };
}
