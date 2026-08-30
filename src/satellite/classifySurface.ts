import type { SatelliteSurfaceClass, SpectralIndices } from "../contracts/satellite";

export const SATELLITE_RULE_VERSION = "0.1.0" as const;

export function classifySurface(indices: SpectralIndices): SatelliteSurfaceClass {
  if (indices.ndsi >= 0.40 && indices.ndvi < 0.20) return "SNOW_LIKE";
  if (indices.ndwi >= 0.30 && indices.ndsi < 0.40) return "WATER_LIKE";
  if (indices.ndvi >= 0.30) return "VEGETATION";
  if (indices.ndvi < 0.30 && indices.ndwi < 0.30 && indices.ndsi < 0.40) {
    return "BARE_GROUND_LIKE";
  }
  return "UNCLASSIFIED";
}
