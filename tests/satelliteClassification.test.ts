import { describe, expect, it } from "vitest";
import { classifySurface } from "../src/satellite/classifySurface";

describe("classifySurface", () => {
  it("classifies snow-like spectral context first", () => {
    expect(classifySurface({ ndvi: 0.08, ndwi: -0.11, ndsi: 0.62 })).toBe("SNOW_LIKE");
  });

  it("classifies water-like context when snow rule does not match", () => {
    expect(classifySurface({ ndvi: 0.10, ndwi: 0.44, ndsi: 0.12 })).toBe("WATER_LIKE");
  });

  it("classifies vegetation from NDVI", () => {
    expect(classifySurface({ ndvi: 0.55, ndwi: 0.10, ndsi: 0.05 })).toBe("VEGETATION");
  });

  it("classifies bare-ground-like context only after higher-priority rules", () => {
    expect(classifySurface({ ndvi: 0.12, ndwi: -0.20, ndsi: 0.10 })).toBe("BARE_GROUND_LIKE");
  });

  it("returns unclassified when no deterministic rule matches", () => {
    expect(classifySurface({ ndvi: 0.25, ndwi: 0.35, ndsi: 0.45 })).toBe("UNCLASSIFIED");
  });

  it("uses explicit boundary thresholds deterministically", () => {
    expect(classifySurface({ ndvi: 0.19, ndwi: 0.60, ndsi: 0.40 })).toBe("SNOW_LIKE");
    expect(classifySurface({ ndvi: 0.20, ndwi: 0.30, ndsi: 0.39 })).toBe("WATER_LIKE");
    expect(classifySurface({ ndvi: 0.30, ndwi: -0.20, ndsi: 0.10 })).toBe("VEGETATION");
  });
});
