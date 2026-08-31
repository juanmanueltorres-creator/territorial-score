import type { SatelliteContextArtifact } from "../../contracts/satellite";
import type { AlignedSegment, AlignedTrackSlice } from "../../core/alignTracks";
import type { ContextFrame } from "../../core/selectContext";
import { getAguaNegraLocation } from "../../domain/aguaNegraLocations";
import { DomainCard } from "./DomainCard";
import { ProvenanceDetails } from "./ProvenanceDetails";
import { SatelliteCard } from "./SatelliteCard";

type ContextDetailProps = {
  frame: ContextFrame;
  segment: AlignedSegment;
  satelliteArtifact: SatelliteContextArtifact | null;
  datasetId: string;
};

function firstConcreteValue(slice: AlignedTrackSlice | null): string | number | boolean | null {
  if (!slice) return null;
  return slice.samples.find((sample) => sample.value !== null)?.value ?? null;
}

function displayTrackValue(slice: AlignedTrackSlice | null): string | null {
  const value = firstConcreteValue(slice);
  if (value === null) return null;
  const unit = slice?.unit && slice.unit !== "state" ? ` ${slice.unit.replaceAll("_", "/")}` : "";
  return `${String(value)}${unit}`;
}

export function ContextDetail({
  frame,
  segment,
  satelliteArtifact,
  datasetId,
}: ContextDetailProps) {
  const location = getAguaNegraLocation(frame.segmentId);
  const locationLabel = location?.label ?? frame.segmentId;
  const reliefValue = location
    ? `${location.elevationM.toLocaleString("en-US")} m`
    : displayTrackValue(segment.terrain) ?? "No elevation value";

  const weatherValue = displayTrackValue(segment.weather);
  const mobilityValue = displayTrackValue(segment.mobility);
  const accessValue = displayTrackValue(segment.access);
  const evidenceValue = displayTrackValue(segment.evidence);

  const previewSrc = segment.satellite?.availability === "AVAILABLE"
    ? `/data/${datasetId}/${segment.satellite.previewRef}`
    : null;

  const provenanceLimitations = [
    ...new Set([
      ...frame.limitations,
      ...(satelliteArtifact?.limitations ?? []),
    ]),
  ];

  return (
    <aside className="panel detail-panel" aria-labelledby="detail-title">
      <header className="panel__header detail-panel__header">
        <div>
          <p className="eyebrow">WHAT WE KNOW HERE</p>
          <h2 id="detail-title" data-testid="context-segment">{locationLabel}</h2>
          {location ? <p className="detail-location-meta">RN150 · Agua Negra · km {location.distanceKm.toFixed(1)}</p> : null}
        </div>
        <span className="panel__meta" data-testid="context-timestamp">{frame.timestamp}</span>
      </header>

      <div className="domain-card-grid">
        <DomainCard
          title="RELIEF"
          value={reliefValue}
          explanation="Elevation along the corridor, derived from a digital elevation model."
          sourceLabel="digital elevation model"
          evidenceState={segment.terrain?.evidenceState ?? null}
        />

        <DomainCard
          title="WEATHER"
          value={weatherValue ?? "No frozen weather snapshot"}
          explanation={weatherValue
            ? "A weather value is present for this selected slice."
            : "A modelled weather capability exists, but this dataset version does not freeze a historical observation for this point."}
          sourceLabel="modelled weather source"
          evidenceState={segment.weather?.evidenceState ?? null}
        />

        <SatelliteCard
          satellite={segment.satellite}
          artifact={satelliteArtifact}
          previewSrc={previewSrc}
          locationLabel={locationLabel}
        />

        <DomainCard
          title="MOBILITY"
          value={segment.mobility
            ? segment.mobility.evidenceState === "SIMULATED"
              ? "Simulated movement context"
              : mobilityValue ?? "Movement context available"
            : "No real operational vehicle telemetry"}
          explanation={segment.mobility
            ? "Movement evidence is kept separate from territorial condition and access status."
            : "No real vehicle observations are frozen here. Synthetic detector experiments are presented separately."}
          sourceLabel={segment.mobility ? "movement dataset" : "no operational telemetry"}
          evidenceState={segment.mobility?.evidenceState ?? null}
        />

        <DomainCard
          title="ACCESS"
          value={segment.access?.evidenceState === "PENDING"
            ? "Real access status not verified"
            : accessValue ?? "No verified access status"}
          explanation="This view does not infer open, closed or safe from nearby signals. An authoritative frozen source is required."
          sourceLabel="access evidence boundary"
          evidenceState={segment.access?.evidenceState ?? null}
        />

        <DomainCard
          title="EVIDENCE"
          value={evidenceValue ?? "No reference evidence for this point"}
          explanation="Versioned reference evidence provides lineage and context; it is not an operational conclusion."
          sourceLabel="versioned reference evidence"
          evidenceState={segment.evidence?.evidenceState ?? null}
        />
      </div>

      <ProvenanceDetails
        segmentId={frame.segmentId}
        timestamp={frame.timestamp}
        sourceRefs={frame.sourceRefs}
        limitations={provenanceLimitations}
        satelliteArtifact={satelliteArtifact}
      />
    </aside>
  );
}
