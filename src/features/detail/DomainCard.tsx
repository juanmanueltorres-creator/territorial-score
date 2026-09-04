export type DomainCardProps = {
  title: string;
  value: string;
  explanation: string;
  sourceLabel: string;
  evidenceState?: string | null;
};

export function DomainCard({
  title,
  value,
  explanation,
  sourceLabel,
  evidenceState,
}: DomainCardProps) {
  return (
    <article className="domain-card">
      <div className="domain-card__topline">
        <span className="domain-card__title">{title}</span>
        {evidenceState ? <span className="domain-card__state">{evidenceState.replaceAll("_", " ")}</span> : null}
      </div>
      <strong className="domain-card__value">{value}</strong>
      <p className="domain-card__explanation">{explanation}</p>
      <span className="domain-card__source">Source: {sourceLabel}</span>
    </article>
  );
}
