import { useMemo, useState, type ComponentType } from "react";
import type { MobilityAnomalyCandidate } from "../contracts/candidate";
import { alignTracks } from "../core/alignTracks";
import { selectContext } from "../core/selectContext";
import type { TerritorialDataset } from "../data/loadDataset";
import { ContextDetail } from "../features/detail/ContextDetail";
import type { MapPanelProps } from "../features/map/MapPanel";
import { IntroOverlay } from "../features/onboarding/IntroOverlay";
import { ScorePanel } from "../features/score/ScorePanel";
import "./app.css";

export type AppProps = {
  dataset: TerritorialDataset;
  MapComponent: ComponentType<MapPanelProps>;
};

const INTRO_STORAGE_KEY = "territorial-score:intro-dismissed:v0.2";

function introWasDismissedThisSession(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.sessionStorage.getItem(INTRO_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberIntroDismissal(): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
  } catch {
    // Storage can be unavailable in privacy-restricted contexts; the UI still remains usable.
  }
}

export function App({ dataset, MapComponent }: AppProps) {
  const segments = useMemo(() => alignTracks(dataset), [dataset]);
  const firstSegmentId = segments[0]?.segmentId;
  const [selectedSegmentId, setSelectedSegmentId] = useState(firstSegmentId ?? "");
  const [selectedTimestamp, setSelectedTimestamp] = useState(dataset.manifest.dataAsOf);
  const [showIntro, setShowIntro] = useState(() => !introWasDismissedThisSession());

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

  const handleSelectSegment = (segmentId: string) => {
    setSelectedSegmentId(segmentId);
    setSelectedTimestamp(dataset.manifest.dataAsOf);
  };

  const handleSelectCandidate = (candidate: MobilityAnomalyCandidate) => {
    setSelectedSegmentId(candidate.segmentId);
    setSelectedTimestamp(candidate.timeWindow.start);
  };

  const handleExplore = () => {
    rememberIntroDismissal();
    setShowIntro(false);
  };

  return (
    <main className="app-shell">
      {showIntro ? <IntroOverlay onExplore={handleExplore} /> : null}

      <header className="app-header">
        <div>
          <p className="eyebrow">EVIDENCE-FIRST TERRITORIAL CONTEXT</p>
          <h1>Territorial Score</h1>
          <p className="app-subtitle">{dataset.manifest.title}</p>
        </div>
        <div className="app-header__meta">
          <button className="intro-reopen-button" type="button" onClick={() => setShowIntro(true)}>
            What is this?
          </button>
          <div className="dataset-stamp">
            <span>DATA AS OF</span>
            <strong>{dataset.manifest.dataAsOf}</strong>
          </div>
        </div>
      </header>

      <div className="workspace-grid">
        <MapComponent corridor={dataset.corridor} segments={segments} selectedSegmentId={selectedId} />
        <ContextDetail frame={frame} segment={selectedSegment} />
      </div>

      <ScorePanel
        segments={segments}
        selectedSegmentId={selectedId}
        selectedTimestamp={selectedTimestamp}
        onSelectSegment={handleSelectSegment}
        onSelectCandidate={handleSelectCandidate}
        showMl={dataset.mlCandidates !== null}
      />

      <footer className="app-footer">
        Context is evidence, not an operational authorization. Missing data remains missing; PENDING is never coerced into a safe/open state.
      </footer>
    </main>
  );
}
