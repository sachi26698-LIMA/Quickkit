"use client";
import Link from "next/link";
export default function ToolError({ reset }: { reset: () => void }) {
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
        <Link className="secondary" href="/#tools">
          Back to tools
        </Link>
      </div>
    </section>
  );
}
