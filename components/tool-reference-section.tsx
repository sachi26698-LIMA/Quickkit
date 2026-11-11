import type { ToolSeoEntry } from "@/lib/tool-seo-content";

export default function ToolReferenceSection({
  slug,
  entry,
}: {
  slug: string;
  entry: Pick<
    ToolSeoEntry,
    | "referenceHeading"
    | "referenceIntro"
    | "specsTitle"
    | "specs"
    | "examplesTitle"
    | "examples"
    | "privacyNote"
  >;
}) {
  return (
    <section
      className="workspace advanced-workspace"
      aria-labelledby={`${slug}-reference-heading`}
    >
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">SPECIFICATIONS &amp; EXAMPLES</span>
          <h2 id={`${slug}-reference-heading`}>{entry.referenceHeading}</h2>
          <p>{entry.referenceIntro}</p>
        </div>
      </div>
      <div className="advanced-options">
        <div className="advanced-item">
          <h3>{entry.specsTitle}</h3>
          <ul>
            {entry.specs.map((spec) => (
              <li key={spec.label}>
                <strong>{spec.label}:</strong> {spec.detail}
              </li>
            ))}
          </ul>
        </div>
        <div className="advanced-item">
          <h3>{entry.examplesTitle}</h3>
          <ul>
            {entry.examples.map((example) => (
              <li key={example.scenario}>
                <strong>{example.scenario}:</strong> {example.input} &rarr;{" "}
                <strong>{example.output}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {entry.privacyNote ? (
        <p className="calculator-disclaimer">{entry.privacyNote}</p>
      ) : null}
    </section>
  );
}
