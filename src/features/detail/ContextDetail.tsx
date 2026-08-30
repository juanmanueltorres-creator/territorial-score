import type { AlignedSegment } from "../../core/alignTracks";
import type { ContextFrame } from "../../core/selectContext";

type ContextDetailProps = {
  frame: ContextFrame;
  segment: AlignedSegment;
};

function stateLabel(value: string): string {
  return value.replaceAll("_", " ");
}

export function ContextDetail({ frame, segment }: ContextDetailProps) {
  const candidates = [...segment.ruleCandidates, ...segment.mlCandidates];

  return (
    <aside className="panel detail-panel" aria-labelledby="detail-title">
      <header className="panel__header">
        <div>
          <p className="eyebrow">CONTEXT FRAME</p>
          <h2 id="detail-title" data-testid="context-segment">{frame.segmentId}</h2>
        </div>
        <span className="panel__meta">{frame.timestamp}</span>
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

      <p className="candidate-warning">Anomaly candidate ≠ road defect. Requires contextual review.</p>
    </aside>
  );
}
