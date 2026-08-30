import type { MobilityAnomalyCandidate } from "../../contracts/candidate";
import type { AlignedSegment } from "../../core/alignTracks";
import type { ContextFrame } from "../../core/selectContext";

type ContextDetailProps = {
  frame: ContextFrame;
  segment: AlignedSegment;
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

export function ContextDetail({ frame, segment }: ContextDetailProps) {
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

  return (
    <aside className="panel detail-panel" aria-labelledby="detail-title">
      <header className="panel__header">
        <div>
          <p className="eyebrow">CONTEXT FRAME</p>
          <h2 id="detail-title" data-testid="context-segment">{frame.segmentId}</h2>
        </div>
        <span className="panel__meta" data-testid="context-timestamp">{frame.timestamp}</span>
      </header>

      <div className="detail-grid">
        {(["terrain", "weather", "mobility", "access", "evidence"] as const).map((key) => {
          const slice = segment[key];
          return (
            <div className="detail-item" key={key}>
              <span className="detail-item__label">{key}</span>
              <strong>{slice ? stateLabel(slice.evidenceState) : "MISSING"}</strong>
            </div>
          );
        })}
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
        <div className="candidate-detail">
          <h3>Candidate review</h3>
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
      ) : null}

      <div className="detail-section">
        <h3>Sources</h3>
        {frame.sourceRefs.length > 0 ? <ul>{frame.sourceRefs.map((source) => <li key={source}>{source}</li>)}</ul> : <p>No source for this slice.</p>}
      </div>

      <div className="detail-section">
        <h3>Limitations</h3>
        {frame.limitations.length > 0 ? <ul>{frame.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul> : <p>No additional limitations declared.</p>}
      </div>

      {comparisonState ? null : <p className="candidate-warning">Anomaly candidate ≠ road defect. Requires contextual review.</p>}
    </aside>
  );
}
