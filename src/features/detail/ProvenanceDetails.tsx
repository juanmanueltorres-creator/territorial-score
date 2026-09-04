import { useState } from "react";
import type { SatelliteContextArtifact } from "../../contracts/satellite";

export type ProvenanceDetailsProps = {
  segmentId: string;
  timestamp: string;
  sourceRefs: string[];
  limitations: string[];
  satelliteArtifact: SatelliteContextArtifact | null;
};

export function ProvenanceDetails({
  segmentId,
  timestamp,
  sourceRefs,
  limitations,
  satelliteArtifact,
}: ProvenanceDetailsProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="provenance-disclosure">
      <button
        className="provenance-disclosure__toggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Technical provenance
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>

      {open ? (
        <div className="provenance-disclosure__body">
          <dl>
            <div><dt>Internal segment ID</dt><dd>{segmentId}</dd></div>
            <div><dt>Selected timestamp</dt><dd>{timestamp}</dd></div>
            {satelliteArtifact ? (
              <>
                <div><dt>Satellite source ref</dt><dd>{satelliteArtifact.source.sourceRef}</dd></div>
                <div><dt>Scene ID</dt><dd>{satelliteArtifact.scene.sceneId}</dd></div>
                <div><dt>Scene acquired</dt><dd>{satelliteArtifact.scene.acquiredAt}</dd></div>
                <div><dt>Scene cloud</dt><dd>{satelliteArtifact.scene.cloudPercentage}%</dd></div>
                <div><dt>Satellite processor</dt><dd>{satelliteArtifact.processing.processorVersion}</dd></div>
                <div><dt>Classification rule</dt><dd>{satelliteArtifact.processing.ruleVersion}</dd></div>
              </>
            ) : null}
          </dl>

          <div className="provenance-disclosure__section">
            <h3>Raw source references</h3>
            {sourceRefs.length > 0 ? <ul>{sourceRefs.map((source) => <li key={source}>{source}</li>)}</ul> : <p>No raw source references for this slice.</p>}
          </div>

          <div className="provenance-disclosure__section">
            <h3>Declared limitations</h3>
            {limitations.length > 0 ? <ul>{limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul> : <p>No additional limitations declared.</p>}
          </div>
        </div>
      ) : null}
    </section>
  );
}
