export default function PageHero({
  eyebrow,
  title,
  titleAccent,
  lede,
}: {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  lede: string;
}) {
  return (
    <header className="page-hero">
      <span className="eyebrow">{eyebrow}</span>
      <h1>
        {title}
        {titleAccent ? (
          <>
            {" "}
            <span>{titleAccent}</span>
          </>
        ) : null}
      </h1>
      <p>{lede}</p>
    </header>
  );
}
