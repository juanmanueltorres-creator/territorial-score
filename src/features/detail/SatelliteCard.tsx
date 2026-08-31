import type { SatelliteContextArtifact, SatelliteSegment } from "../../contracts/satellite";

const surfaceLabels = {
  SNOW_LIKE: "Snow-like surface",
  WATER_LIKE: "Water-like surface",
  VEGETATION: "Vegetation",
  BARE_GROUND_LIKE: "Bare-ground-like surface",
  UNCLASSIFIED: "Unclassified surface",
} as const;

const missingReasonLabels = {
  EXCESSIVE_CLOUD: "Cloud cover prevents a defensible spectral classification",
  MISSING_COVERAGE: "The frozen scene does not provide usable coverage here",
  INVALID_INDICES: "The spectral indices are not valid enough to classify this point",
  PROCESSING_FAILURE: "The frozen source could not be processed for this point",
  NO_QUALIFYING_SCENE: "No qualifying frozen scene is available for this point",
} as const;

export type SatelliteCardProps = {
  satellite: SatelliteSegment | null;
  artifact: SatelliteContextArtifact | null;
  previewSrc: string | null;
  locationLabel: string;
};

export function SatelliteCard({ satellite, artifact, previewSrc, locationLabel }: SatelliteCardProps) {
  if (!satellite) {
    return (
      <article className="domain-card satellite-card">
        <div className="domain-card__topline">
          <span className="domain-card__title">SATELLITE</span>
        </div>
        <strong className="domain-card__value">No frozen satellite context</strong>
        <p className="domain-card__explanation">This dataset does not contain a satellite record for this point.</p>
        <span className="domain-card__source">Source: no frozen scene</span>
      </article>
    );
  }

  if (satellite.availability === "MISSING") {
    return (
      <article className="domain-card satellite-card">
        <div className="domain-card__topline">
          <span className="domain-card__title">SATELLITE</span>
          <span className="domain-card__state">MISSING</span>
        </div>
        <strong className="domain-card__value">No usable satellite context</strong>
        <p className="domain-card__explanation">{missingReasonLabels[satellite.reason]}</p>
        <p className="satellite-card__boundary">Missing satellite evidence does not mean clear conditions.</p>
        <span className="domain-card__source">Source: {artifact ? "Sentinel-2 frozen scene" : "frozen satellite source"}</span>
      </article>
    );
  }

  return (
    <article className="domain-card satellite-card">
      <div className="domain-card__topline">
        <span className="domain-card__title">SATELLITE</span>
        <span className="domain-card__state">{satellite.evidenceState}</span>
      </div>
      <strong className="domain-card__value">{surfaceLabels[satellite.surfaceClass]}</strong>
      <p className="domain-card__explanation">
        Frozen Sentinel-2 spectral context for this point{artifact ? `, acquired ${artifact.scene.acquiredAt}` : ""}.
      </p>
      <dl className="satellite-card__indices" aria-label="Spectral indices">
        <div><dt>NDSI</dt><dd>{satellite.indices.ndsi.toFixed(2)}</dd></div>
        <div><dt>NDVI</dt><dd>{satellite.indices.ndvi.toFixed(2)}</dd></div>
        <div><dt>NDWI</dt><dd>{satellite.indices.ndwi.toFixed(2)}</dd></div>
      </dl>
      <p className="satellite-card__boundary">
        Spectral context only. It does not establish road condition, road opening, road closure or transitability.
      </p>
      {previewSrc ? <img className="satellite-card__preview" src={previewSrc} alt={`Frozen satellite preview for ${locationLabel}`} /> : null}
      <span className="domain-card__source">Source: Sentinel-2 frozen scene</span>
    </article>
  );
}
