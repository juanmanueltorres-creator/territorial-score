import type { MobilityAnomalyCandidate } from "../../contracts/candidate";
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

function stateLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function containsTimestamp(candidate: MobilityAnomalyCandidate, timestamp: string): boolean {
  const selected = Date.parse(timestamp);
  const start = Date.parse(candidate.timeWindow.start);
  const end = Date.parse(candidate.timeWindow.end);

  return Number.isFinite(selected)
    && Number.isFinite(start)
    && Number.isFinite(end)
    && selected >= start
    && selected < end;
}

function uniqueFeatures(candidates: MobilityAnomalyCandidate[]): string[] {
  return [...new Set(candidates.flatMap((candidate) => candidate.supportingFeatures))].sort();
}

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
  const activeRuleCandidates = segment.ruleCandidates.filter((candidate) => containsTimestamp(candidate, frame.timestamp));
  const activeMlCandidates = segment.mlCandidates.filter((candidate) => containsTimestamp(candidate, frame.timestamp));
  const candidates = [...activeRuleCandidates, ...activeMlCandidates];

  const hasRule = activeRuleCandidates.length > 0;
  const hasMl = activeMlCandidates.length > 0;
  const comparisonState = hasRule && hasMl
    ? "BOTH"
    : hasRule
      ? "RULE CANDIDATE"
      : hasMl
        ? "ML CANDIDATE"
        : null;

  const ruleFeatures = new Set(uniqueFeatures(activeRuleCandidates));
  const sharedFeatures = uniqueFeatures(activeMlCandidates).filter((feature) => ruleFeatures.has(feature));
  const anomalyScore = activeMlCandidates.find((candidate) => candidate.anomalyScore !== undefined)?.anomalyScore;

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

      {comparisonState ? (
        <section className="candidate-comparison" data-testid="candidate-comparison" aria-label="Candidate comparison">
          <div className="candidate-card__topline">
            <strong>{comparisonState}</strong>
            <span>SYNTHETIC EXPERIMENT</span>
          </div>
          <p>rule candidate: {hasRule ? "yes" : "no"}</p>
          <p>ML candidate: {hasMl ? "yes" : "no"}</p>
          <p>shared supporting features: {sharedFeatures.join(", ") || "none"}</p>
          {anomalyScore === undefined ? null : <p>model anomaly score: {anomalyScore}</p>}
          <p className="candidate-warning">Anomaly candidate ≠ road defect. Requires contextual review.</p>
        </section>
      ) : null}

      {candidates.length > 0 ? (
        <details className="candidate-detail candidate-detail--collapsible" data-testid="candidate-technical-details">
          <summary>
            <span>Technical candidate details</span>
            <span className="candidate-detail__count">{candidates.length}</span>
          </summary>
          <div className="candidate-detail__body">
            {candidates.map((candidate) => (
              <article className="candidate-card" key={candidate.candidateId}>
                <div className="candidate-card__topline">
                  <strong>{candidate.detector} candidate detector</strong>
                  <span>{stateLabel(candidate.evidenceState)}</span>
                </div>
                <dl>
                  <div><dt>segment/time</dt><dd>{candidate.segmentId} · {candidate.timeWindow.start} → {candidate.timeWindow.end}</dd></div>
                  <div><dt>vehicles observed</dt><dd>{candidate.vehiclesObserved ?? "not declared"}</dd></div>
                  <div><dt>supporting features</dt><dd>{candidate.supportingFeatures.join(", ") || "none declared"}</dd></div>
                  {candidate.anomalyScore === undefined ? null : <div><dt>anomaly score</dt><dd>{candidate.anomalyScore}</dd></div>}
                  <div><dt>limitations</dt><dd>{candidate.limitations.join(" · ")}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </details>
      ) : null}

      <ProvenanceDetails
        segmentId={frame.segmentId}
        timestamp={frame.timestamp}
        sourceRefs={frame.sourceRefs}
        limitations={provenanceLimitations}
        satelliteArtifact={satelliteArtifact}
      />

      {comparisonState ? null : <p className="candidate-warning">Anomaly candidate ≠ road defect. Requires contextual review.</p>}
    </aside>
  );
}
