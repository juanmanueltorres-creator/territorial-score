import type { MobilityAnomalyCandidate } from "../../contracts/candidate";
import type { AlignedSegment } from "../../core/alignTracks";
import { TrackRow } from "./TrackRow";

type ScorePanelProps = {
  segments: AlignedSegment[];
  selectedSegmentId: string;
  onSelectSegment: (segmentId: string) => void;
  onSelectCandidate: (candidate: MobilityAnomalyCandidate) => void;
  showMl: boolean;
};

export function ScorePanel({
  segments,
  selectedSegmentId,
  onSelectSegment,
  onSelectCandidate,
  showMl,
}: ScorePanelProps) {
  const ruleCandidates = segments.flatMap((segment) => segment.ruleCandidates);
  const mlCandidates = segments.flatMap((segment) => segment.mlCandidates);

  return (
    <section className="panel score-panel" aria-labelledby="score-title">
      <header className="panel__header">
        <div>
          <p className="eyebrow">SPATIOTEMPORAL SCORE</p>
          <h2 id="score-title">Territorial tracks</h2>
        </div>
        <span className="panel__meta">{segments.length} segments</span>
      </header>

      <div className="score-grid" role="group" aria-label="Territorial tracks">
        <TrackRow label="TERRAIN" trackKey="terrain" segments={segments} selectedSegmentId={selectedSegmentId} onSelectSegment={onSelectSegment} />
        <TrackRow label="WEATHER" trackKey="weather" segments={segments} selectedSegmentId={selectedSegmentId} onSelectSegment={onSelectSegment} />
        <TrackRow label="MOBILITY" trackKey="mobility" segments={segments} selectedSegmentId={selectedSegmentId} onSelectSegment={onSelectSegment} />
        <TrackRow label="ACCESS" trackKey="access" segments={segments} selectedSegmentId={selectedSegmentId} onSelectSegment={onSelectSegment} />
        <TrackRow label="EVIDENCE" trackKey="evidence" segments={segments} selectedSegmentId={selectedSegmentId} onSelectSegment={onSelectSegment} />

        {ruleCandidates.length > 0 ? (
          <div className="score-row" data-testid="track-rule-candidate">
            <div className="score-row__label">RULE CANDIDATE</div>
            <div className="candidate-strip">
              {ruleCandidates.map((candidate) => (
                <button
                  key={candidate.candidateId}
                  className="candidate-chip"
                  data-selected={candidate.segmentId === selectedSegmentId ? "true" : "false"}
                  onClick={() => onSelectCandidate(candidate)}
                  type="button"
                  aria-label={`rule candidate ${candidate.candidateId} ${candidate.segmentId}`}
                >
                  {candidate.segmentId}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {showMl ? (
          <div className="score-row" data-testid="track-ml-candidate">
            <div className="score-row__label">ML CANDIDATE</div>
            <div className="candidate-strip">
              {mlCandidates.length > 0 ? mlCandidates.map((candidate) => (
                <button
                  key={candidate.candidateId}
                  className="candidate-chip"
                  data-selected={candidate.segmentId === selectedSegmentId ? "true" : "false"}
                  onClick={() => onSelectCandidate(candidate)}
                  type="button"
                  aria-label={`ml candidate ${candidate.candidateId} ${candidate.segmentId}`}
                >
                  {candidate.segmentId}
                </button>
              )) : <span className="score-empty">NO CANDIDATES</span>}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
