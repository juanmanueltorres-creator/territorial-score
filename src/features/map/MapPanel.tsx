import { useEffect, useMemo, useRef } from "react";
import maplibregl, {
  type GeoJSONSource,
  type GeoJSONSourceSpecification,
  type Map as MapLibreMap,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { AlignedSegment } from "../../core/alignTracks";
import type { Corridor } from "../../data/loadDataset";

export type MapPanelProps = {
  corridor: Corridor;
  segments: AlignedSegment[];
  selectedSegmentId: string;
};

function selectedFeature(corridor: Corridor, segments: AlignedSegment[], selectedSegmentId: string) {
  const coordinates = corridor.features[0]?.geometry.coordinates ?? [];
  const foundIndex = segments.findIndex((segment) => segment.segmentId === selectedSegmentId);
  const selectedIndex = foundIndex < 0 ? 0 : foundIndex;
  const maxSegmentIndex = Math.max(segments.length - 1, 1);
  const coordinateIndex = Math.round((selectedIndex / maxSegmentIndex) * Math.max(coordinates.length - 1, 0));
  const startIndex = Math.min(coordinateIndex, Math.max(coordinates.length - 2, 0));
  const endIndex = Math.min(startIndex + 1, Math.max(coordinates.length - 1, 0));
  const start = coordinates[startIndex];
  const end = coordinates[endIndex];

  return {
    type: "FeatureCollection" as const,
    features: start && end ? [{
      type: "Feature" as const,
      properties: { segmentId: selectedSegmentId },
      geometry: { type: "LineString" as const, coordinates: [start, end] },
    }] : [],
  };
}

function boundsForCorridor(corridor: Corridor): maplibregl.LngLatBounds | null {
  const coordinates = corridor.features.flatMap((feature) => feature.geometry.coordinates);
  const first = coordinates[0];
  if (!first) return null;

  const bounds = new maplibregl.LngLatBounds(first, first);
  for (const coordinate of coordinates.slice(1)) bounds.extend(coordinate);
  return bounds;
}

export function MapPanel({ corridor, segments, selectedSegmentId }: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const selected = useMemo(
    () => selectedFeature(corridor, segments, selectedSegmentId),
    [corridor, segments, selectedSegmentId],
  );
  const bounds = useMemo(() => boundsForCorridor(corridor), [corridor]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialSelected = selectedFeature(corridor, segments, selectedSegmentId);
    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [-69.55, -30.3],
      zoom: 8,
      attributionControl: { compact: true },
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    map.on("load", () => {
      map.addSource("corridor", {
        type: "geojson",
        data: corridor as GeoJSONSourceSpecification["data"],
      });
      map.addSource("selected-segment", {
        type: "geojson",
        data: initialSelected as GeoJSONSourceSpecification["data"],
      });
      map.addLayer({
        id: "corridor-line",
        type: "line",
        source: "corridor",
        paint: { "line-color": "#b7c1c8", "line-width": 4, "line-opacity": 0.72 },
      });
      map.addLayer({
        id: "selected-segment-line",
        type: "line",
        source: "selected-segment",
        paint: { "line-color": "#38e8c6", "line-width": 7, "line-opacity": 0.95 },
      });
      if (bounds) map.fitBounds(bounds, { padding: 42, duration: 0 });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [bounds, corridor, segments]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource("selected-segment") as GeoJSONSource | undefined;
    source?.setData(selected as GeoJSONSourceSpecification["data"]);
  }, [selected]);

  const reset = () => {
    if (bounds && mapRef.current) mapRef.current.fitBounds(bounds, { padding: 42, duration: 250 });
  };

  return (
    <section className="panel map-panel" aria-labelledby="map-title">
      <header className="panel__header map-panel__header">
        <div>
          <p className="eyebrow">CORRIDOR</p>
          <h2 id="map-title">RN 150 · Agua Negra</h2>
        </div>
        <button className="ghost-button" onClick={reset} type="button">Reset extent</button>
      </header>
      <div className="map-canvas" ref={containerRef} data-selected-segment={selectedSegmentId} />
      <p className="map-note">Selected geometry is a cartographic context highlight only. It does not indicate road status or navigation safety.</p>
    </section>
  );
}
