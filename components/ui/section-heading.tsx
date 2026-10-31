import { cn } from "@/lib/utils";

/**
 * Consistent section header: optional eyebrow, an h2, supporting copy and an
 * optional action aligned to the end of the row.
 */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
  align = "start",
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  align?: "start" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center sm:text-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow ? (
          <span className="eyebrow">
            <span aria-hidden="true" className="h-px w-6 bg-brand-300" />
            {eyebrow}
          </span>
        ) : null}
        <h2
          id={id}
          className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-ink sm:text-3xl"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-2.5 text-[15px] leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
