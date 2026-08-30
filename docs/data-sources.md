# Agua Negra V0 data sources

Territorial Score V0 intentionally uses a small, versioned projection of existing GeoPlatform corridor context. It does **not** publish a live road-status product.

## Corridor

Source repository: `juanmanueltorres-creator/Geo_Platform`

Canonical asset: `web/public/data/san_juan_premium/rn150_agua_negra_corridor.geojson`

Source blob: `1696efe33caf04e7055a1aa233fb969d7e32d759`

The canonical corridor was derived from Instituto Geografico Nacional / Direccion Nacional de Vialidad route inventory data, filtered to RN 150 and chained topologically from Las Flores toward the international limit. GeoPlatform documents the geometry as cartographic inventory, not survey-grade and not a statement of transitability.

`corridor.geojson` in this repository is a five-node **overview reconstruction** using the versioned marker coordinates below. It is intentionally smaller than the canonical 397-vertex corridor and must not be used as navigation geometry.

## Terrain

Canonical source: `web/public/data/san_juan_premium/rn150_agua_negra_profile.json`

Source blob: `2da761659d48c2ebd965e01be2e0ee879a88c5a6`

GeoPlatform profile metadata:

- generated: `2026-07-31T20:23:32Z`;
- provider: Open-Meteo Elevation API / Copernicus DEM;
- resolution: 90 m DEM;
- method: 300 equidistant samples along the unsimplified RN 150 source geometry;
- distance: 88.934 km;
- elevation range: 1887–4760 m.

Territorial Score V0 projects only the five canonical nodes into `terrain.json`. This is enough to validate the multitrack architecture while retaining an explicit reference to the full profile.

## Corridor nodes / evidence

Canonical source: `web/public/data/san_juan_premium/rn150_agua_negra_markers.geojson`

Source blob: `836698e3e1eac4720176ee453404edd1cacd9027`

Nodes used:

| Node | Distance | Elevation | Reference state |
| --- | ---: | ---: | --- |
| Las Flores | 0.000 km | 1887 m | `verified_official_reference` |
| Nodo bajo | 17.846 km | 2409 m | `derived_on_route` |
| Nodo medio | 40.154 km | 3118 m | `derived_on_route` |
| Nodo alto | 66.626 km | 4048 m | `derived_on_route` |
| Paso Internacional Agua Negra | 88.934 km | 4760 m | `verified_official_reference` |

These states describe cartographic provenance only. They do not describe road condition, border status, transitability or safety.

## Access

Canonical context: `web/public/data/san_juan_premium/metadata.json`

Source blob: `176e3caacd6800c382b39063dea77d4e9e4e20e5`

GeoPlatform explicitly states that the route inventory does not report live condition or authorization to circulate. Therefore Territorial Score V0 publishes the access track as `PENDING` with no samples.

`PENDING` must never be interpreted as open, closed, safe or unsafe.

## Weather

GeoPlatform's premium-sector application exposes weather through a runtime `SectorSourceState` whose nodes are explicitly `model_kind: "model"`. The static corridor asset folder does not contain a frozen weather response.

Territorial Score V0 therefore keeps the five weather-node positions but stores `value: null` for the wind-speed track. This is deliberate:

- `null` means a frozen modeled value is unavailable in this dataset;
- `null` is not `0 km/h`;
- no runtime response was copied and presented as a historical observation;
- modeled weather would remain context, not observed road condition.

A later version can add a frozen, timestamped Open-Meteo snapshot as a new versioned artifact without changing the V0 semantics.

## Snapshot lineage

`manifest.json` uses `dataAsOf = 2026-07-31T20:23:32Z`, the generation time shared by the canonical GeoPlatform corridor/profile assets used here.

The Territorial Score dataset itself was assembled on `2026-08-30`.

## Integrity boundary

```text
cartographic geometry != road condition
modelled weather != observation
missing weather != zero
verified reference != access authorization
PENDING != open/closed
```
