export const AGUA_NEGRA_LOCATIONS = {
  "an-las-flores": { label: "Las Flores", distanceKm: 0, elevationM: 1887 },
  "an-nodo-bajo": { label: "Nodo Bajo", distanceKm: 17.8, elevationM: 2409 },
  "an-nodo-medio": { label: "Nodo Medio", distanceKm: 40.2, elevationM: 3118 },
  "an-nodo-alto": { label: "Nodo Alto", distanceKm: 66.6, elevationM: 4048 },
  "an-paso-agua-negra": { label: "Paso Agua Negra", distanceKm: 88.9, elevationM: 4760 },
} as const;

export type AguaNegraLocationId = keyof typeof AGUA_NEGRA_LOCATIONS;
export type AguaNegraLocation = (typeof AGUA_NEGRA_LOCATIONS)[AguaNegraLocationId];

export function getAguaNegraLocation(segmentId: string): AguaNegraLocation | null {
  if (!Object.prototype.hasOwnProperty.call(AGUA_NEGRA_LOCATIONS, segmentId)) {
    return null;
  }

  return AGUA_NEGRA_LOCATIONS[segmentId as AguaNegraLocationId];
}
