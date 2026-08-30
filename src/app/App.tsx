import { useMemo, useState, type ComponentType } from "react";
import type { MobilityAnomalyCandidate } from "../contracts/candidate";
import { alignTracks } from "../core/alignTracks";
import { selectContext } from "../core/selectContext";
import type { TerritorialDataset } from "../data/loadDataset";
import { ContextDetail } from "../features/detail/ContextDetail";
import type { MapPanelProps } from "../features/map/MapPanel";
import { ScorePanel } from "../features/score/ScorePanel";
import "./app.css";

export type AppProps = {
  dataset: TerritorialDataset;
  MapComponent: ComponentType<MapPanelProps>;
};

export function App({ dataset, MapComponent }: AppProps) {
  const segments = useMemo(() => alignTracks(dataset), [dataset]);
  const firstSegmentId = segments[0]?.segmentId;
  const [selectedSegmentId, setSelectedSegmentId] = useState(firstSegmentId ?? "");
  const [selectedTimestamp, setSelectedTimestamp] = useState(dataset.manifest.dataAsOf);

  if (!firstSegmentId) {
    return <main className="app-shell"><section className="fatal-state">No aligned corridor segments are available.</section></main>;
  }

  const selectedId = segments.some((segment) => segment.segmentId === selectedSegmentId)
    ? selectedSegmentId
    : firstSegmentId;
  const selectedSegment = segments.find((segment) => segment.segmentId === selectedId) ?? segments[0]!;
  const frame = selectContext(segments, {
    segmentId: selectedId,
    timestamp: selectedTimestamp,
  });

  const handleSelectCandidate = (candidate: MobilityAnomalyCandidate) => {
    setSelectedSegmentId(candidate.segmentId);
    setSelectedTimestamp(candidate.timeWindow.start);
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">EVIDENCE-FIRST TERRITORIAL CONTEXT</p>
          <h1>Territorial Score</h1>
          <p className="app-subtitle">{dataset.manifest.title}</p>
        </div>
        <div className="dataset-stamp">
          <span>DATA AS OF</span>
          <strong>{dataset.manifest.dataAsOf}</strong>
        </div>
      </header>

      <div className="workspace-grid">
        <MapComponent corridor={dataset.corridor} segments={segments} selectedSegmentId={selectedId} />
        <ContextDetail frame={frame} segment={selectedSegment} />
      </div>

      <ScorePanel
        segments={segments}
        selectedSegmentId={selectedId}
        onSelectSegment={setSelectedSegmentId}
        onSelectCandidate={handleSelectCandidate}
        showMl={dataset.mlCandidates !== null}
      />

      <footer className="app-footer">
        Context is evidence, not an operational authorization. Missing data remains missing; PENDING is never coerced into a safe/open state.
      </footer>
    </main>
  );
}
