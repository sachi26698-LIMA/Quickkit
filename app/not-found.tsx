import { Compass, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";

export default function NotFound() {
  return (
    <div
      style={{
        background:
          "radial-gradient(50% 45% at 50% 0%, rgba(230,220,255,0.7), transparent 70%)",
      }}
    >
      <section className="container flex max-w-2xl flex-col items-center py-20 text-center sm:py-24">
        <IconTile tone="brand" size="lg">
          <Compass strokeWidth={1.8} />
        </IconTile>
        <Badge className="mt-6">404 · Not found</Badge>
        <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">
          This one isn’t in the kit.
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted sm:text-base">
          The page you were looking for has moved or never existed. Head back to
          the toolkit and pick a tool.
        </p>
        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
          <ButtonLink href="/" size="lg">
            <Home className="size-4" aria-hidden="true" />
            Back to QUICKKIT
          </ButtonLink>
          <ButtonLink href="/tools" variant="secondary" size="lg">
            Browse all tools
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
