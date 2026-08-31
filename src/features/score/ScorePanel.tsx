import type { AlignedSegment } from "../../core/alignTracks";
import { getAguaNegraLocation } from "../../domain/aguaNegraLocations";
import { TrackRow } from "./TrackRow";

type ScorePanelProps = {
  segments: AlignedSegment[];
  selectedSegmentId: string;
  onSelectSegment: (segmentId: string) => void;
};

export function ScorePanel({
  segments,
  selectedSegmentId,
  onSelectSegment,
}: ScorePanelProps) {
  return (
    <section className="panel score-panel" aria-labelledby="score-title">
      <header className="panel__header">
        <div>
          <p className="eyebrow">THE TERRITORIAL SCORE</p>
          <h2 id="score-title">Territorial tracks</h2>
          <p className="score-panel__intro">Read each row independently, then compare how the signals change along the corridor.</p>
        </div>
        <span className="panel__meta">{segments.length} places</span>
      </header>

      <div className="score-legend" data-testid="score-legend" aria-label="Evidence state legend">
        <span className="legend-chip legend-chip--derived">DERIVED</span>
        <span className="legend-chip legend-chip--modelled">MODELLED</span>
        <span className="legend-chip legend-chip--pending">PENDING</span>
        <span className="legend-chip legend-chip--missing">MISSING</span>
        <span className="legend-chip legend-chip--synthetic">SYNTHETIC</span>
      </div>

      <div className="score-grid" role="group" aria-label="Territorial tracks">
        <div className="score-row score-column-header" aria-label="Corridor places">
          <div className="score-row__label">PLACE</div>
          <div className="score-row__cells">
            {segments.map((segment) => {
              const location = getAguaNegraLocation(segment.segmentId);
              const distanceKm = location?.distanceKm ?? segment.distanceStartM / 1000;
              return (
                <div className="score-column-heading" key={segment.segmentId}>
                  <strong>{location?.label ?? segment.segmentId}</strong>
                  <span>km {distanceKm.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <TrackRow
          label="RELIEF"
          help="Elevation along the corridor. A terrain value does not establish road condition."
          trackKey="terrain"
          segments={segments}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={onSelectSegment}
        />
        <TrackRow
          label="WEATHER"
          help="Frozen or modelled weather context when available. Missing weather is not clear weather."
          trackKey="weather"
          segments={segments}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={onSelectSegment}
        />
        <TrackRow
          label="SATELLITE"
          help="Spectral context from a frozen Sentinel-2 scene. A satellite signal is not a road-status observation."
          trackKey="satellite"
          segments={segments}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={onSelectSegment}
        />
        <TrackRow
          label="MOBILITY"
          help="Real movement observations when available. Synthetic detector data is kept outside this territorial score."
          trackKey="mobility"
          segments={segments}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={onSelectSegment}
        />
        <TrackRow
          label="ACCESS"
          help="Verified access evidence only. PENDING or missing information never means open, closed or safe."
          trackKey="access"
          segments={segments}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={onSelectSegment}
        />
        <TrackRow
          label="EVIDENCE"
          help="Versioned references and provenance supporting the selected territorial context."
          trackKey="evidence"
          segments={segments}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={onSelectSegment}
        />
      </div>
    </section>
  );
}
