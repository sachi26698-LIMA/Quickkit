import Link from "next/link";
import LegalPageShell, {
  OwnerPlaceholder,
} from "@/components/legal-page-shell";
import { pageMetadata } from "@/lib/seo";
import {
  LEGAL_LAST_UPDATED,
  LEGAL_LAST_UPDATED_ISO,
  legalPageByHref,
} from "@/lib/legal";
import ContactLink from "@/components/contact-link";
import { ownerDetail } from "@/lib/site";

export const metadata = pageMetadata(
  "Terms and Conditions — using QUICKKIT",
  legalPageByHref("/terms")!.description,
  "/terms",
);

export default function TermsPage() {
  const jurisdiction = ownerDetail("jurisdiction");
  const legalName = ownerDetail("legalName");

  return (
    <LegalPageShell
      href="/terms"
      title="Terms and Conditions"
      intro="These terms set out the basis on which you may use QUICKKIT. They describe the software as it exists today — free, browser-based, no account required."
      lastUpdated={LEGAL_LAST_UPDATED}
      lastUpdatedIso={LEGAL_LAST_UPDATED_ISO}
    >
      <h2 id="acceptance">1. Acceptance of these terms</h2>
      <p>
        By opening or using QUICKKIT you agree to these Terms and Conditions and
        to our <Link href="/privacy">Privacy Policy</Link>,{" "}
        <Link href="/cookies">Cookie Policy</Link> and{" "}
        <Link href="/disclaimer">Disclaimer</Link>. If you do not agree with
        them, please stop using the site. If you use QUICKKIT on behalf of an
        organisation, you confirm you have authority to accept these terms for
        that organisation.
      </p>
      <p>
        These terms apply to the website and to every tool published on it. They
        do not create any partnership, employment or agency relationship between
        you and the operator.
      </p>

      <h2 id="the-service">2. What QUICKKIT provides</h2>
      <p>
        QUICKKIT is a collection of free utilities that run in your web browser:
        PDF tools, image tools, QR code generation, text and developer
        utilities, security and privacy helpers, and calculators. There is no
        installation, no subscription and no payment step in the current
        release.
      </p>
      <p>
        The software executes on your device. We do not operate a server-side
        copy of your files, and the operator does not receive your inputs. That
        is an architectural statement about where the code runs, not a promise
        that the site is available in every circumstance — see{" "}
        <a href="#availability">service availability</a>.
      </p>

      <h2 id="accounts">3. No accounts or registration</h2>
      <p>
        QUICKKIT has no user accounts, no login and no profile. Nothing on the
        site requires you to identify yourself. The only persistent state is
        kept in your own browser — the saved-tools list, design presets and
        optional local conversion history — and it is described in the{" "}
        <Link href="/cookies">Cookie Policy</Link>. Because there is no account,
        there is nothing to terminate for a breach of these terms; we may
        instead block or restrict access as described in{" "}
        <a href="#prohibited">prohibited activities</a>.
      </p>

      <h2 id="acceptable-use">4. Acceptable use</h2>
      <p>
        You may use QUICKKIT for personal, educational and commercial work, free
        of charge, provided you follow these terms and the law that applies to
        you. You are responsible for deciding whether a particular use is lawful
        in your jurisdiction and in the jurisdiction where your output will be
        used or published.
      </p>
      <ul>
        <li>
          Process only content you own or are authorised to handle. This
          includes documents you do not own but have permission to work with.
        </li>
        <li>
          Only open a password-protected PDF in the PDF tools if you are
          entitled to access that document. The tools cannot check this, and
          supplying a password is a statement by you that you may.
        </li>
        <li>
          Check where a QR code points before you print it, publish it or hand
          it to someone else.
        </li>
        <li>
          Follow your employer&rsquo;s or institution&rsquo;s rules when you
          process documents belonging to them.
        </li>
      </ul>

      <h2 id="user-responsibilities">5. Your responsibilities</h2>
      <ul>
        <li>
          <strong>Verify important outputs.</strong> Conversions, compressions
          and calculations can be approximate. Review the result before relying
          on it and keep the original file. The{" "}
          <Link href="/disclaimer">Disclaimer</Link> lists the specific limits
          of each class of tool.
        </li>
        <li>
          <strong>Keep your own backups.</strong> QUICKKIT is not storage. A
          refresh, a closed tab or a cleared browser profile removes anything
          that was only in memory.
        </li>
        <li>
          <strong>Protect your device.</strong> Because processing happens
          locally, the security of the result depends partly on the security of
          the device and browser you use. Avoid handling sensitive documents on
          shared or untrusted devices.
        </li>
        <li>
          <strong>Keep credentials safe.</strong> Generated passwords and
          passphrases are shown in the page and are not stored by us. Copy them
          somewhere safe before you navigate away.
        </li>
      </ul>

      <h2 id="prohibited">6. Prohibited activities</h2>
      <p>You must not use QUICKKIT to:</p>
      <ul>
        <li>
          break any applicable law, or infringe anyone&rsquo;s copyright,
          trade-secret, privacy or other rights;
        </li>
        <li>
          create, alter or distribute material that is fraudulent, defamatory,
          harassing, or that sexualises or endangers minors;
        </li>
        <li>
          forge documents, signatures, identity papers, certificates or
          financial records, or alter a document in a way intended to deceive;
        </li>
        <li>
          impersonate a person or organisation, including by producing a QR code
          that imitates a trusted brand&rsquo;s destination;
        </li>
        <li>
          gain unauthorised access to a document, account, system or network, or
          attempt to defeat the password prompt of a file you are not entitled
          to open;
        </li>
        <li>
          probe, scan or attack the site, its hosting provider or another
          user&rsquo;s browser, or interfere with the availability of the
          service (see <Link href="/security">Security Policy</Link> for how to
          report a vulnerability responsibly);
        </li>
        <li>
          scrape or republish the site automatically in a way that imposes an
          unreasonable load, or circumvent technical measures intended to
          protect the service;
        </li>
        <li>
          redistribute QUICKKIT&rsquo;s branding or content in a way that
          suggests endorsement, partnership or authorship that does not exist —
          see <Link href="/intellectual-property">Intellectual Property</Link>.
        </li>
      </ul>
      <p>
        We may restrict or block access where we have reasonable grounds to
        believe a use falls into the list above. Because the tools run on your
        device, our practical ability to do so is limited — these terms remain
        binding even where a technical block is not possible.
      </p>

      <h2 id="your-content">7. Your content</h2>
      <p>
        You keep every right you already hold in the files, text and other
        material you process with QUICKKIT, and in the outputs the tools produce
        for you. We claim no licence over them, because we never receive them.
        There is no upload step to grant a licence through.
      </p>
      <p>
        You are solely responsible for the content you process and for what you
        do with the results — including any obligation to obtain consent from,
        or give notice to, the people whose data appears in a document you
        convert or share. See the{" "}
        <Link href="/file-handling">File Handling Policy</Link> for what each
        tool does with the bytes you give it.
      </p>

      <h2 id="ip">8. Intellectual property</h2>
      <p>
        The QUICKKIT name, wordmark, logo, interface design, illustrations and
        written content are owned by the operator or its licensors and are
        protected by copyright and trademark law. Your rights to use them are
        limited to viewing the site and using the tools as intended. Open-source
        components are used under their own licences. Full detail, including
        what you may quote and what needs written permission, is in the{" "}
        <Link href="/intellectual-property">Intellectual Property Policy</Link>{" "}
        and <Link href="/copyright">Copyright and DMCA Policy</Link>.
      </p>

      <h2 id="third-party">9. Third-party services and links</h2>
      <p>
        QUICKKIT links out to third-party destinations, such as the social
        profiles in the footer. Those sites are not under our control: once you
        follow a link, their terms and privacy practices apply, not ours, and we
        are not responsible for their content or availability.
      </p>
      <p>
        Tool processing itself uses no third-party service. The browser
        libraries that do the work — PDF parsing, PDF writing, image encoding,
        QR generation, document generation, and the self-hosted OCR engine — are
        bundled with the site rather than called over the network, and they are
        listed with their licences in the{" "}
        <Link href="/intellectual-property#open-source">
          Intellectual Property Policy
        </Link>
        . If a future feature ever needs a remote API, that change will be
        documented in the <Link href="/privacy">Privacy Policy</Link> first and
        will be clearly labelled in the tool itself.
      </p>

      <h2 id="availability">10. Service availability</h2>
      <p>
        QUICKKIT is provided free of charge and on an &ldquo;as available&rdquo;
        basis. We do not guarantee that the site, any individual tool or any
        particular feature will be available at a given time, continue to be
        offered, or remain free. Tools may be added, changed, deprecated or
        removed. During development, categories marked &ldquo;Coming soon&rdquo;
        are not yet functional and are shown for orientation only.
      </p>
      <p>
        Availability also depends on factors outside our control: your browser
        and operating system version, the memory and CPU available on your
        device, browser support for the file formats involved, and your network
        connection to the site itself.
      </p>

      <h2 id="limitations">11. Feature limitations</h2>
      <p>
        Each tool documents its own limits next to the controls, and the{" "}
        <Link href="/disclaimer">Disclaimer</Link> summarises them. In short:
        results are computed locally with the precision and format support your
        browser provides; PDF operations may not preserve every advanced feature
        of a source document (such as digitally signed states, embedded scripts,
        layers or tagged-reading order); image conversions may change quality,
        colour profiles and metadata; and text recognition is statistical and
        can misread characters.
      </p>
      <p>
        Outputs are provided as a convenience. Where a result matters — a legal
        filing, a financial statement, a medical document, a press-ready image —
        treat QUICKKIT output as a draft that still needs review.
      </p>

      <h2 id="liability">12. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by applicable law, QUICKKIT and its
        operator are not liable for indirect, incidental, special, consequential
        or punitive damages, or for loss of data, profits, goodwill or
        opportunity, arising from your use of the site, from any output produced
        by the tools, or from the unavailability of the service.
      </p>
      <p>
        Because the tools are free, our total aggregate liability for any claim
        relating to the service is limited to the greater of (a) the amount you
        paid us for the specific use giving rise to the claim, which is zero, or
        (b) the minimum amount required by applicable law where a limitation to
        zero would be unenforceable.
      </p>
      <p>
        Nothing in these terms excludes or limits liability for fraud, for
        wilful misconduct, for death or personal injury caused by negligence, or
        for any other liability that cannot lawfully be excluded. If you are a
        consumer, you keep the statutory rights your local law gives you, and
        nothing here overrides them.
      </p>
      <p className="legal-review-flag">
        <strong>Needs legal review before publication.</strong> The wording
        above is a good-faith plain-language draft. The enforceability of
        liability caps, the treatment of consumer rights and the required
        disclosures differ substantially between jurisdictions and must be
        confirmed by a qualified lawyer
        {jurisdiction
          ? ` for ${jurisdiction}`
          : " for the operator's jurisdiction"}
        .
      </p>

      <h2 id="changes">13. Changes to the service and these terms</h2>
      <p>
        We may update these terms when the software, the law or the
        operator&rsquo;s arrangements change. The current version always lives
        on this page with the date shown at the top. Material changes — a new
        category of data processing, a paid tier, an account system — will be
        described on the relevant policy page before they take effect.
      </p>
      <p>
        Continuing to use QUICKKIT after a change means you accept the updated
        terms. If you do not, stop using the site. We keep no record of prior
        acceptance because there is no account to attach it to; the revision
        history belongs with the source repository.
      </p>

      <h2 id="law">14. Governing law and dispute resolution</h2>
      <p>
        These terms are governed by the laws of{" "}
        {jurisdiction ? (
          <strong>{jurisdiction}</strong>
        ) : (
          <OwnerPlaceholder what="the governing jurisdiction" />
        )}
        , without regard to conflict-of-law rules. The courts of that
        jurisdiction have exclusive jurisdiction over any dispute, except that
        either party may seek relief in any court of competent jurisdiction to
        protect its intellectual property or to prevent misuse.
      </p>
      <p>
        Before starting formal proceedings, please contact us through the{" "}
        <Link href="/contact">contact page</Link> (or email <ContactLink />) and
        give us a reasonable opportunity to resolve the issue informally. This
        costs nothing and resolves most questions. Statutory consumer rights to
        bring a claim in your local courts are unaffected.
      </p>
      <p className="legal-review-flag">
        <strong>Needs legal review before publication.</strong> The governing
        law, the forum clause and any mandatory consumer-protection carve-outs
        must be chosen and confirmed by the operator with local counsel. No
        jurisdiction has been assumed.
      </p>

      <h2 id="contact">15. Contact</h2>
      <p>
        Questions about these terms: use the{" "}
        <Link href="/contact">contact page</Link>, or email <ContactLink />. For
        how data is handled see the <Link href="/privacy">Privacy Policy</Link>{" "}
        and <Link href="/file-handling">File Handling Policy</Link>; for
        security reports see the <Link href="/security">Security Policy</Link>.
      </p>
      <p>
        Operator:{" "}
        {legalName ? (
          <strong>{legalName}</strong>
        ) : (
          <OwnerPlaceholder what="the operator's legal name and business form" />
        )}
      </p>
    </LegalPageShell>
  );
}
