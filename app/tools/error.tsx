"use client";

import { AlertTriangle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";

export default function ToolError({ reset }: { reset: () => void }) {
  return (
    <section className="container flex max-w-2xl flex-col items-center py-20 text-center">
      <IconTile tone="peach" size="lg">
        <AlertTriangle strokeWidth={1.8} />
      </IconTile>
      <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
        A small snag.
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted sm:text-base">
        This tool could not load. Your inputs have not been uploaded. Try again,
        or head back to the toolkit.
      </p>
      <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
        <Button size="lg" onClick={() => reset()}>
          Try again
        </Button>
        <ButtonLink href="/tools" variant="secondary" size="lg">
          Back to tools
        </ButtonLink>
      </div>
    </section>
  );
}
