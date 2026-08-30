import type { AlignedSegment, AlignedTrackSlice } from "../../core/alignTracks";

export type ScoreTrackKey = "terrain" | "weather" | "mobility" | "access" | "evidence";

type TrackRowProps = {
  label: string;
  trackKey: ScoreTrackKey;
  segments: AlignedSegment[];
  selectedSegmentId: string;
  onSelectSegment: (segmentId: string) => void;
};

function formatValue(slice: AlignedTrackSlice | null): string {
  if (!slice) return "MISSING";
  if (slice.evidenceState === "PENDING") return "PENDING";

  const first = slice.samples[0];
  if (!first || first.value === null) return "MISSING";
  if (typeof first.value === "boolean") return first.value ? "TRUE" : "FALSE";
  return String(first.value);
}

export function TrackRow({
  label,
  trackKey,
  segments,
  selectedSegmentId,
  onSelectSegment,
}: TrackRowProps) {
  return (
    <div className="score-row" data-testid={`track-${trackKey}`}>
      <div className="score-row__label">{label}</div>
      <div className="score-row__cells">
        {segments.map((segment) => {
          const slice = segment[trackKey];
          const value = formatValue(slice);
          return (
            <button
              className="score-cell"
              data-selected={segment.segmentId === selectedSegmentId ? "true" : "false"}
              key={segment.segmentId}
              onClick={() => onSelectSegment(segment.segmentId)}
              type="button"
              aria-label={`${label} ${segment.segmentId}: ${value}`}
            >
              <span className="score-cell__value">{value}</span>
              {slice && slice.evidenceState !== "PENDING" ? (
                <span className="score-cell__state">{slice.evidenceState.replaceAll("_", " ")}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
