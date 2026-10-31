import { cn } from "@/lib/utils";

/**
 * Consistent section header: optional eyebrow, heading, supporting copy and an
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
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center sm:text-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow ? (
          <span className="eyebrow">
            <span aria-hidden="true" className="h-px w-7 bg-brand-300" />
            {eyebrow}
          </span>
        ) : null}
        <h2 id={id} className="t-h2 mt-3">
          {title}
        </h2>
        {description ? (
          <p className="t-lead mt-3 max-w-xl text-[0.9375rem] sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
