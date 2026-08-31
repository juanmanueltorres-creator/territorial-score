import type { SatelliteSegment } from "../../contracts/satellite";
import type { AlignedSegment, AlignedTrackSlice } from "../../core/alignTracks";

export type ScoreTrackKey = "terrain" | "weather" | "satellite" | "mobility" | "access" | "evidence";

type TrackRowProps = {
  label: string;
  help: string;
  trackKey: ScoreTrackKey;
  segments: AlignedSegment[];
  selectedSegmentId: string;
  onSelectSegment: (segmentId: string) => void;
};

type CellPresentation = {
  value: string;
  state: string;
};

const satelliteSurfaceLabels = {
  SNOW_LIKE: "Snow-like",
  WATER_LIKE: "Water-like",
  VEGETATION: "Vegetation",
  BARE_GROUND_LIKE: "Bare-ground-like",
  UNCLASSIFIED: "Unclassified",
} as const;

function firstValue(slice: AlignedTrackSlice | null): string | number | boolean | null {
  if (!slice) return null;
  const sample = slice.samples.find((candidate) => candidate.value !== null);
  return sample?.value ?? null;
}

function humanizeEvidence(value: string | number | boolean): string {
  if (typeof value !== "string") return String(value);

  const knownLabels: Record<string, string> = {
    verified_official_reference: "Official reference",
    derived_on_route: "Route-derived reference",
    reference: "Versioned reference",
  };

  const known = knownLabels[value.toLowerCase()];
  if (known) return known;

  const cleaned = value.replaceAll("_", " ").trim();
  if (!cleaned) return "Reference available";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function satellitePresentation(satellite: SatelliteSegment | null): CellPresentation {
  if (!satellite) {
    return { value: "No frozen scene", state: "MISSING" };
  }

  if (satellite.availability === "MISSING") {
    return { value: "No usable scene", state: "MISSING" };
  }

  return {
    value: satelliteSurfaceLabels[satellite.surfaceClass],
    state: satellite.evidenceState,
  };
}

function trackPresentation(segment: AlignedSegment, trackKey: ScoreTrackKey): CellPresentation {
  if (trackKey === "satellite") {
    return satellitePresentation(segment.satellite);
  }

  const slice = segment[trackKey];
  const value = firstValue(slice);

  if (trackKey === "terrain") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { value: "No elevation data", state: slice?.evidenceState ?? "MISSING" };
    }
    return {
      value: `${value.toLocaleString("en-US")} m`,
      state: slice?.evidenceState ?? "MISSING",
    };
  }

  if (trackKey === "weather") {
    if (value === null) {
      return { value: "No frozen data", state: slice?.evidenceState ?? "MISSING" };
    }
    return {
      value: `${String(value)}${slice?.unit && slice.unit !== "state" ? ` ${slice.unit.replaceAll("_", "/")}` : ""}`,
      state: slice?.evidenceState ?? "MISSING",
    };
  }

  if (trackKey === "mobility") {
    if (!slice || value === null) {
      return { value: "No real telemetry", state: slice?.evidenceState ?? "MISSING" };
    }
    if (slice.evidenceState === "SIMULATED") {
      return { value: "Simulated context", state: "SIMULATED" };
    }
    return {
      value: `${String(value)}${slice.unit && slice.unit !== "state" ? ` ${slice.unit.replaceAll("_", "/")}` : ""}`,
      state: slice.evidenceState,
    };
  }

  if (trackKey === "access") {
    if (!slice || slice.evidenceState === "PENDING" || value === null) {
      return { value: "Not verified", state: slice?.evidenceState ?? "MISSING" };
    }
    return { value: String(value), state: slice.evidenceState };
  }

  if (value === null) {
    return { value: "No reference", state: slice?.evidenceState ?? "MISSING" };
  }

  return {
    value: humanizeEvidence(value),
    state: slice?.evidenceState ?? "MISSING",
  };
}

export function TrackRow({
  label,
  help,
  trackKey,
  segments,
  selectedSegmentId,
  onSelectSegment,
}: TrackRowProps) {
  return (
    <div className="score-row" data-testid={`track-${trackKey}`}>
      <div className="score-row__label">
        <span>{label}</span>
        <span className="score-help" aria-label={`What ${label} means`} title={help}>?</span>
      </div>
      <div className="score-row__cells">
        {segments.map((segment) => {
          const presentation = trackPresentation(segment, trackKey);
          return (
            <button
              className="score-cell"
              data-selected={segment.segmentId === selectedSegmentId ? "true" : "false"}
              key={segment.segmentId}
              onClick={() => onSelectSegment(segment.segmentId)}
              type="button"
              aria-label={`${trackKey.toUpperCase()} ${segment.segmentId}: ${presentation.value}`}
            >
              <span className="score-cell__value">{presentation.value}</span>
              <span className="score-cell__state">{presentation.state.replaceAll("_", " ")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
