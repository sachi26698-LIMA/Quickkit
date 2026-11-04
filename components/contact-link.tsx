import Link from "next/link";
import OwnerPlaceholder from "@/components/owner-placeholder";
import { contactEmail, type ContactChannel } from "@/lib/site";

/**
 * Renders a verified contact address as a mailto link, or — while the operator
 * has not supplied and confirmed a real, monitored inbox — a clearly marked
 * placeholder instead.
 *
 * This exists because the repository shipped with a demo address
 * (`hello@quickkit.in`) that was never confirmed as deliverable. Printing it as
 * if it worked would send a visitor's message into a void; publishing nothing
 * at all would leave the policy pages unable to say how to reach anyone. The
 * placeholder is the honest middle.
 *
 * `channel` only changes the wording of the placeholder so a privacy reader is
 * told which inbox is missing, not just that one is.
 */
const channelWording: Record<ContactChannel, string> = {
  general: "a verified public contact address",
  support: "a verified support address",
  privacy: "a verified privacy-request inbox",
  security: "a verified security-report inbox",
  copyright: "a verified copyright/DMCA contact",
  business: "a verified business/licensing address",
};

export default function ContactLink({
  channel = "general",
  subject,
  children,
}: {
  channel?: ContactChannel;
  /** Optional subject line, appended as a mailto parameter when verified. */
  subject?: string;
  /** Custom link text; defaults to the address itself. */
  children?: React.ReactNode;
}) {
  if (contactEmail) {
    const href = subject
      ? `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}`
      : `mailto:${contactEmail}`;
    return (
      <a href={href} data-contact-channel={channel}>
        {children ?? contactEmail}
      </a>
    );
  }
  return <OwnerPlaceholder what={channelWording[channel]} />;
}

/**
 * A sentence-level prompt that points at the contact page, used where a page
 * would otherwise end with "email us at <address>".
 */
export function ContactPrompt({
  channel = "general",
}: {
  channel?: ContactChannel;
}) {
  return (
    <>
      the <Link href="/contact">contact page</Link>
      {contactEmail ? null : (
        <>
          {" "}
          (the operator has not yet supplied{" "}
          <OwnerPlaceholder what={channelWording[channel]} />)
        </>
      )}
    </>
  );
}

export { channelWording };
