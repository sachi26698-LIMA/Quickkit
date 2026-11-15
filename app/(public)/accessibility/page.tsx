import Link from "next/link";
import LegalPageShell from "@/components/legal-page-shell";
import { pageMetadata } from "@/lib/seo";
import {
  LEGAL_LAST_UPDATED,
  LEGAL_LAST_UPDATED_ISO,
  legalPageByHref,
} from "@/lib/legal";
import ContactLink from "@/components/contact-link";

export const metadata = pageMetadata(
  "Accessibility Statement — Keyboard & Contrast",
  legalPageByHref("/accessibility")!.description,
  "/accessibility",
);

export default function AccessibilityPage() {
  return (
    <LegalPageShell
      href="/accessibility"
      title="Accessibility Statement"
      intro="QUICKKIT aims to be usable by keyboard, by screen reader and at 200% zoom. This statement records what is implemented, how it is tested, and what still falls short."
      lastUpdated={LEGAL_LAST_UPDATED}
      lastUpdatedIso={LEGAL_LAST_UPDATED_ISO}
    >
      <h2 id="commitment">1. Our commitment</h2>
      <p>
        A utility site is only useful if everyone can reach the utility.
        QUICKKIT is built to work without a mouse, to expose its structure to
        assistive technology, to keep text legible at any size, and to respect
        reduced-motion preferences. Accessibility is treated as part of the
        definition of &ldquo;done&rdquo; for a tool, not as a later polish pass.
      </p>
      <p>
        This statement is deliberately conservative: it describes what the code
        actually does and what has been tested, and it lists known gaps. It does
        not claim full conformance with any standard on this page&rsquo;s word
        alone — see <a href="#standards">section 12</a>.
      </p>

      <h2 id="keyboard">2. Keyboard navigation</h2>
      <ul>
        <li>
          A <strong>skip link</strong> is the first focusable element on every
          page; it jumps straight to <code>#main</code>.
        </li>
        <li>
          Every interactive control — navigation, dropdown, tool cards, file
          pickers, sliders, tabs, accordions and download buttons — is reachable
          and operable with Tab, Shift+Tab, Enter, Space and the arrow keys
          where the widget expects them.
        </li>
        <li>
          The mobile navigation menu traps nothing and closes on Escape, moving
          focus back to the menu button.
        </li>
        <li>
          Tool workspaces are wrapped in a fieldset that is disabled until the
          page has hydrated, so a keyboard user cannot tab into a control that
          does not yet work.
        </li>
        <li>
          Focus order follows the visual order of the page; no positive{" "}
          <code>tabindex</code> values are used.
        </li>
      </ul>

      <h2 id="screen-readers">3. Screen readers and semantics</h2>
      <ul>
        <li>
          One <code>h1</code> per page, with a descending heading hierarchy that
          matches the content outline.
        </li>
        <li>
          Landmarks: <code>header</code>, <code>nav</code> with accessible
          names, <code>main</code>, <code>footer</code>, <code>article</code>{" "}
          for policy text and <code>aside</code> for the table of contents.
        </li>
        <li>
          Icon-only buttons carry <code>aria-label</code>; decorative icons are{" "}
          <code>aria-hidden</code>.
        </li>
        <li>
          Status changes — a conversion finishing, a copy succeeding, an error
          appearing — are announced through <code>aria-live</code> regions
          rather than by changing colour alone.
        </li>
        <li>
          Progress indicators expose a determinate value where one exists, so
          &ldquo;60%&rdquo; is spoken as a value rather than as a spinner.
        </li>
        <li>
          The current page is marked with{" "}
          <code>aria-current=&quot;page&quot;</code> in navigation and
          breadcrumbs.
        </li>
      </ul>

      <h2 id="contrast">4. Colour and contrast</h2>
      <p>
        Text and interface colours are derived from the QUICKKIT palette with
        the text-bearing variants deepened until they meet WCAG 2.2 AA contrast
        (4.5:1 for body text, 3:1 for large text and non-text interface
        boundaries). Brand hues are used for fills, gradients and graphical
        accents where contrast rules do not apply to them.
      </p>
      <p>
        Colour is never the only carrier of meaning: selected states also change
        weight or add an icon, and validation errors pair colour with an icon
        and text.
      </p>

      <h2 id="focus">5. Focus visibility</h2>
      <p>
        Every focusable element shows a high-contrast focus ring (a 3px outline
        with an offset) on <code>:focus-visible</code>, including links,
        buttons, inputs, selects, textareas and <code>summary</code> elements.
        Focus is never removed without a replacement.
      </p>

      <h2 id="forms">6. Forms and error messages</h2>
      <ul>
        <li>Every input has a programmatically associated visible label.</li>
        <li>
          Validation errors are tied to their field with{" "}
          <code>aria-describedby</code>, and invalid fields set{" "}
          <code>aria-invalid</code>.
        </li>
        <li>
          Error messages explain what to do (&ldquo;That email doesn&rsquo;t
          look right — check it and try again&rdquo;) rather than only what is
          wrong.
        </li>
        <li>
          Fields use <code>autocomplete</code> tokens and appropriate input
          types where relevant.
        </li>
        <li>
          The contact form can complete without a mouse and does not time out.
        </li>
      </ul>

      <h2 id="responsive">7. Responsive and zoomed layouts</h2>
      <p>
        Layouts are checked for horizontal overflow at 320, 360, 375, 390, 430,
        768, 1024, 1366 and 1440 pixels. Reflow works to 320 CSS pixels without
        loss of content or function, and text can be enlarged to 200% without
        clipping. Body text is sized in a scalable way, and touch targets are at
        least 44 pixels in the primary paths.
      </p>

      <h2 id="motion">8. Motion and animation</h2>
      <p>
        Scroll-reveal and hover transitions are disabled when the operating
        system reports <code>prefers-reduced-motion: reduce</code>, and smooth
        scrolling is switched off in that mode too. No content depends on
        animation to become visible, and nothing flashes.
      </p>

      <h2 id="testing">9. How this is tested</h2>
      <ul>
        <li>
          An automated <strong>axe-core</strong> audit runs in Chromium against
          every audited route with the WCAG 2.0/2.1/2.2 A and AA rule sets, in
          the end-to-end suite; violations fail the build.
        </li>
        <li>
          A separate overflow sweep loads each route at nine viewport widths.
        </li>
        <li>
          Keyboard flows (skip link, mobile menu with Escape and focus return,
          tool controls) are covered by browser tests.
        </li>
        <li>
          Heading presence, unique <code>h1</code>, meta descriptions and link
          resolution are asserted automatically.
        </li>
      </ul>
      <p>
        Automated checks catch structural problems and miss human ones. There
        has been no formal audit by a human accessibility specialist, and no
        paid conformance certification has been obtained.
      </p>

      <h2 id="limitations">10. Known limitations</h2>
      <p>We would rather list these than let you discover them:</p>
      <ul>
        <li>
          <strong>Drag-and-drop ordering</strong> in the PDF and image queues is
          pointer-first. Keyboard users can reorder with the provided move
          buttons, but the drag interaction itself is not keyboard-operable.
        </li>
        <li>
          <strong>Image cropping</strong> relies on a visual canvas and pointer
          dragging. It has numeric fields for position and size as an
          alternative, but the visual workflow is inherently hard to use without
          sight.
        </li>
        <li>
          <strong>Colour-dependent QR design controls</strong> show a live
          preview that screen reader users cannot evaluate; the scannability
          check speaks a verdict but cannot convey appearance.
        </li>
        <li>
          <strong>Large batch workspaces</strong> with many rows can be verbose
          for a screen reader; per-item summaries help but are not perfect.
        </li>
        <li>
          <strong>Screen reader testing</strong> has not been performed with
          every combination of browser and assistive technology. NVDA with
          Firefox, JAWS with Chrome and VoiceOver with Safari can behave
          differently.
        </li>
        <li>
          <strong>WebKit and Firefox</strong> are covered by the browser-test
          configuration for core flows, but not every tool has been exercised in
          every engine.
        </li>
        <li>
          <strong>PDF output</strong> produced by the tools is not remediated:
          generated PDFs are not tagged, and their reading order is whatever the
          layout implies. Conversion cannot make an inaccessible source
          accessible.
        </li>
      </ul>

      <h2 id="feedback">11. Accessibility feedback</h2>
      <p>
        If something is unusable for you, that is a bug with priority. Use the{" "}
        <Link href="/contact">contact page</Link> (or email <ContactLink />)
        with the subject line &ldquo;Accessibility&rdquo;, and tell us the page,
        what you were trying to do, and the assistive technology you use. You do
        not need to describe your disability or provide medical information —
        just what blocked you. We aim to acknowledge within five working days
        and to say whether and when a fix is planned.
      </p>
      <p>
        A named accessibility contact and a formal response target are still
        operator decisions; until they are published, the address above is the
        route. See the <Link href="/contact">contact page</Link> for other
        channels.
      </p>

      <h2 id="standards">12. Standards and status</h2>
      <p>
        The target is <strong>WCAG 2.2 Level AA</strong> for the site&rsquo;s
        own interface. Automated axe checks with the WCAG 2.0, 2.1 and 2.2 A/AA
        rule sets currently report no violations on the audited routes, and the
        manual review notes above describe the areas automation cannot judge.
      </p>
      <p>
        QUICKKIT does <strong>not</strong> claim a certified conformance level,
        does not claim compliance with any accessibility statute or regulation
        (such as the ADA, the European Accessibility Act, Section 508 or the
        RPwD Act), and has not been audited by a third party. Whether any of
        those obligations apply to the operator is a legal question the operator
        must resolve.
      </p>
      <p className="legal-review-flag">
        <strong>Outstanding:</strong> an independent accessibility review has
        not been carried out, and which accessibility laws apply to the operator
        is a legal question rather than a claim made here. Barriers can be
        reported through the <Link href="/contact">contact page</Link>, and the
        commitments above are what responses will be measured against. Related:{" "}
        <Link href="/disclaimer">Disclaimer</Link>,{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPageShell>
  );
}
