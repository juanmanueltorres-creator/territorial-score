export type IntroOverlayProps = {
  onExplore: () => void;
};

const capabilities = [
  {
    title: "Interactive corridor map",
    description: "Move through real places while the map, selected point and territorial context stay synchronized.",
  },
  {
    title: "Signals stay separate",
    description: "Relief, weather, satellite context, mobility, access and evidence are kept independent instead of being collapsed into one number.",
  },
  {
    title: "Satellite context",
    description: "Frozen imagery can be processed into reproducible spectral context without turning a satellite signal into road truth.",
  },
  {
    title: "Auditable experiments",
    description: "Simple rules and machine-learning candidates can be compared while remaining clearly separated from operational conclusions.",
  },
  {
    title: "Versioned evidence",
    description: "Datasets are frozen and validated so the same input can reproduce the same result later.",
  },
  {
    title: "Sources and limits",
    description: "Every signal keeps its provenance and limitations visible so you can see what is known, what is missing and how far the evidence goes.",
  },
] as const;

export function IntroOverlay({ onExplore }: IntroOverlayProps) {
  return (
    <div className="intro-overlay" role="presentation">
      <section
        className="intro-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-title"
        aria-describedby="intro-description"
      >
        <div className="intro-dialog__topline">
          <p className="eyebrow">TERRITORIAL SCORE</p>
          <span>RN150 · Agua Negra</span>
        </div>

        <div className="intro-dialog__hero">
          <div>
            <h2 id="intro-title">A territorial score, like a musical score.</h2>
            <p className="intro-dialog__lead">This is not a risk score.</p>
          </div>
          <p id="intro-description" className="intro-dialog__description">
            The system lines up different territorial signals along a real corridor and through time so you can understand what we know, what is missing and where each piece of evidence comes from.
          </p>
        </div>

        <p className="intro-dialog__principle">
          Each row is an independent signal. Together they describe context; they do not automatically produce a decision.
        </p>

        <div className="intro-capabilities" aria-label="What the system does">
          {capabilities.map((capability) => (
            <article className="intro-capability" key={capability.title}>
              <h3>{capability.title}</h3>
              <p>{capability.description}</p>
            </article>
          ))}
        </div>

        <div className="intro-dialog__footer">
          <p>Start with the corridor. Open technical provenance only when you need the detail behind a signal.</p>
          <button className="intro-primary-action" type="button" onClick={onExplore}>
            Explore the corridor
          </button>
        </div>
      </section>
    </div>
  );
}
