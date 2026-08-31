import { describe, expect, it } from "vitest";
import {
  AGUA_NEGRA_LOCATIONS,
  getAguaNegraLocation,
} from "../src/domain/aguaNegraLocations";

describe("Agua Negra public node metadata", () => {
  it("keeps the five canonical public labels, distances and elevations stable", () => {
    expect(Object.keys(AGUA_NEGRA_LOCATIONS)).toHaveLength(5);
    expect(getAguaNegraLocation("an-las-flores")).toEqual({
      label: "Las Flores",
      distanceKm: 0,
      elevationM: 1887,
    });
    expect(getAguaNegraLocation("an-nodo-alto")).toEqual({
      label: "Nodo Alto",
      distanceKm: 66.6,
      elevationM: 4048,
    });
    expect(getAguaNegraLocation("an-paso-agua-negra")).toEqual({
      label: "Paso Agua Negra",
      distanceKm: 88.9,
      elevationM: 4760,
    });
  });

  it("returns null for generic or unknown segment ids instead of inventing labels", () => {
    expect(getAguaNegraLocation("seg-a")).toBeNull();
    expect(getAguaNegraLocation("unknown")).toBeNull();
  });
});
