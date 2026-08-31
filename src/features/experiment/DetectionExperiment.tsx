import type { MobilityAnomalyCandidate } from "../../contracts/candidate";
import { getAguaNegraLocation } from "../../domain/aguaNegraLocations";

type DetectionExperimentProps = {
  ruleCandidates: MobilityAnomalyCandidate[] | null;
  mlCandidates: MobilityAnomalyCandidate[] | null;
  selectedSegmentId: string;
  selectedTimestamp: string;
  onSelectCandidate: (candidate: MobilityAnomalyCandidate) => void;
};

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

function isCandidateSelected(
  candidate: MobilityAnomalyCandidate,
  selectedSegmentId: string,
  selectedTimestamp: string,
): boolean {
  return candidate.segmentId === selectedSegmentId && containsTimestamp(candidate, selectedTimestamp);
}

function uniqueFeatures(candidates: MobilityAnomalyCandidate[]): string[] {
  return [...new Set(candidates.flatMap((candidate) => candidate.supportingFeatures))].sort();
}

function stateLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function detectorLabel(candidate: MobilityAnomalyCandidate): string {
  return candidate.detector === "RULE" ? "Simple rule" : "Isolation Forest";
}

export function DetectionExperiment({
  ruleCandidates,
  mlCandidates,
  selectedSegmentId,
  selectedTimestamp,
  onSelectCandidate,
}: DetectionExperimentProps) {
  const rules = ruleCandidates ?? [];
  const ml = mlCandidates ?? [];
  const hasExperiment = ruleCandidates !== null || mlCandidates !== null;

  if (!hasExperiment) return null;

  const activeRuleCandidates = rules.filter(
    (candidate) => candidate.segmentId === selectedSegmentId && containsTimestamp(candidate, selectedTimestamp),
  );
  const activeMlCandidates = ml.filter(
    (candidate) => candidate.segmentId === selectedSegmentId && containsTimestamp(candidate, selectedTimestamp),
  );
  const activeCandidates = [...activeRuleCandidates, ...activeMlCandidates];

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
    <section className="panel detection-experiment" aria-labelledby="detection-experiment-title">
      <header className="panel__header detection-experiment__header">
        <div>
          <p className="eyebrow">SEPARATE SYNTHETIC BENCHMARK</p>
          <h2 id="detection-experiment-title">Detection experiment</h2>
          <p className="detection-experiment__intro">
            This is a deterministic experiment on synthetic mobility data. It is not territorial evidence and it does not report real road condition.
          </p>
        </div>
        <span className="panel__meta">V0.1 frozen benchmark</span>
      </header>

      <div className="experiment-metrics" aria-label="Frozen detector metrics">
        <article className="experiment-metric-card">
          <strong>Simple rule</strong>
          <span>precision 1.00 · recall 0.25 · F1 0.40</span>
          <p>Conservative slowdown rule. It found one benchmark event without false positives in this synthetic fixture.</p>
        </article>
        <article className="experiment-metric-card">
          <strong>Isolation Forest</strong>
          <span>precision 0.50 · recall 0.50 · F1 0.50</span>
          <p>Unsupervised mobility-only detector. It added candidate coverage and also produced duplicate false-positive windows.</p>
        </article>
      </div>

      <div className="experiment-candidate-controls" aria-label="Synthetic candidate selection controls">
        {rules.length > 0 ? (
          <div className="experiment-candidate-group" data-testid="track-rule-candidate">
            <span className="experiment-candidate-group__label">Simple rule candidates</span>
            <div className="candidate-strip">
              {rules.map((candidate) => (
                <button
                  key={candidate.candidateId}
                  className="candidate-chip"
                  data-selected={isCandidateSelected(candidate, selectedSegmentId, selectedTimestamp) ? "true" : "false"}
                  onClick={() => onSelectCandidate(candidate)}
                  type="button"
                  aria-label={`rule candidate ${candidate.candidateId} ${candidate.segmentId}`}
                >
                  {getAguaNegraLocation(candidate.segmentId)?.label ?? candidate.segmentId}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {mlCandidates !== null ? (
          <div className="experiment-candidate-group" data-testid="track-ml-candidate">
            <span className="experiment-candidate-group__label">Isolation Forest candidates</span>
            <div className="candidate-strip">
              {ml.length > 0 ? ml.map((candidate) => (
                <button
                  key={candidate.candidateId}
                  className="candidate-chip"
                  data-selected={isCandidateSelected(candidate, selectedSegmentId, selectedTimestamp) ? "true" : "false"}
                  onClick={() => onSelectCandidate(candidate)}
                  type="button"
                  aria-label={`ml candidate ${candidate.candidateId} ${candidate.segmentId}`}
                >
                  {getAguaNegraLocation(candidate.segmentId)?.label ?? candidate.segmentId}
                </button>
              )) : <span className="score-empty">NO CANDIDATES</span>}
            </div>
          </div>
        ) : null}
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
          {anomalyScore === undefined ? null : <p>model anomaly score (ranking value): {anomalyScore}</p>}
        </section>
      ) : null}

      {activeCandidates.length > 0 ? (
        <details className="candidate-detail candidate-detail--collapsible" data-testid="candidate-technical-details">
          <summary>
            <span>Technical candidate details</span>
            <span className="candidate-detail__count">{activeCandidates.length}</span>
          </summary>
          <div className="candidate-detail__body">
            {activeCandidates.map((candidate) => (
              <article className="candidate-card" key={candidate.candidateId}>
                <div className="candidate-card__topline">
                  <strong>{candidate.detector} candidate detector · {detectorLabel(candidate)}</strong>
                  <span>{stateLabel(candidate.evidenceState)}</span>
                </div>
                <dl>
                  <div><dt>segment/time</dt><dd>{candidate.segmentId} · {candidate.timeWindow.start} → {candidate.timeWindow.end}</dd></div>
                  <div><dt>vehicles observed</dt><dd>{candidate.vehiclesObserved ?? "not declared"}</dd></div>
                  <div><dt>supporting features</dt><dd>{candidate.supportingFeatures.join(", ") || "none declared"}</dd></div>
                  {candidate.anomalyScore === undefined ? null : <div><dt>model ranking value</dt><dd>{candidate.anomalyScore}</dd></div>}
                  <div><dt>limitations</dt><dd>{candidate.limitations.join(" · ")}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </details>
      ) : null}

      <p className="candidate-warning">Anomaly candidate ≠ road defect. Requires contextual review.</p>
    </section>
  );
}
