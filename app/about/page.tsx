import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "About — small tasks, thoughtfully solved",
  "Learn why QUICKKIT keeps everyday browser utilities simple, local and accessible without accounts or tracking analytics.",
  "/about",
);
export default function Page() {
  return (
    <article className="container prose">
      <span className="eyebrow">A LITTLE HELP GOES A LONG WAY</span>
      <h1>
        Useful tools.
        <br />
        <span>Less busywork.</span>
      </h1>
      <p>
        QUICKKIT is a small collection of browser utilities for the tasks that
        interrupt your day: counting words, fixing text case, checking JSON,
        making a password, sharing a QR code, resizing an image and lightening a
        file.
      </p>
      <h2>Simple on purpose</h2>
      <p>
        No account, setup wizard or installation stands between you and these
        seven tools. Each workspace focuses on one job, with clear inputs,
        results and instructions.
      </p>
      <h2>Local where it matters</h2>
      <p>
        Tool inputs are processed in your browser. QUICKKIT does not upload your
        text, passwords, QR content or images. Fonts and application code are
        served with the site; no remote QR or compression service is used.
        Standard hosting requests still occur when you visit a page. Read our{" "}
        <Link href="/privacy">privacy policy</Link> for the distinction.
      </p>
      <h2>Honest about the limits</h2>
      <p>
        Reading time is an estimate, casing varies by language, JSON uses
        JavaScript number precision and image output depends on browser support.
        We describe these limits beside the tools rather than hiding them.
      </p>
      <h2>Free, without the detours</h2>
      <p>
        All seven current tools are free to use. There are no ads, paid plans or
        payment forms in this release. Future monetization, if introduced, will
        need a separate privacy and usability review.
      </p>
      <p>
        <Link href="/#tools">Explore the toolkit →</Link>
      </p>
    </article>
  );
}
