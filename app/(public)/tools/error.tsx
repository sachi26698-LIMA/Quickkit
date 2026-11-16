"use client";
import Link from "next/link";
import { useEffect } from "react";
import { reportClientError } from "@/lib/monitoring/client-report";
export default function ToolError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Type of error and page only. The message can quote what was typed into
    // the tool, so it is not sent.
    reportClientError(error, "tools", { includeMessage: false });
  }, [error]);
  return (
    <section className="container empty">
      <h1>A small snag.</h1>
      <p>
        This tool could not load. Your inputs have not been uploaded. Try again
        or return to the toolkit.
      </p>
      <div className="action-row" style={{ justifyContent: "center" }}>
        <button className="primary" onClick={reset}>
          Try again
        </button>
        <Link className="secondary" href="/tools">
          Back to tools
        </Link>
      </div>
    </section>
  );
}
