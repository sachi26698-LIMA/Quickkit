"use client";
import { useState } from "react";
import Link from "next/link";
import { MailCheck, Send, TriangleAlert } from "lucide-react";
import { contactEmail, contactFormEndpoint } from "@/lib/site";

type Fields = { name: string; email: string; subject: string; message: string };
const initial: Fields = { name: "", email: "", subject: "", message: "" };

/** First-party contact submission with explicit consent and honest failure states. */
export default function ContactForm({
  fallbackEmail = contactEmail,
}: {
  fallbackEmail?: string | null;
} = {}) {
  const [fields, setFields] = useState(initial);
  const [errors, setErrors] = useState<Partial<Fields>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const channelOpen = Boolean(contactFormEndpoint || fallbackEmail);

  const set =
    (key: keyof Fields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFields({ ...fields, [key]: e.target.value });

  const validate = (): boolean => {
    const next: Partial<Fields> = {};
    if (!fields.name.trim()) next.name = "Please enter your name.";
    if (!fields.email.trim()) next.email = "Please enter your email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()))
      next.email = "That email doesn't look right — check it and try again.";
    if (!fields.subject.trim()) next.subject = "Please add a subject.";
    if (fields.message.trim().length < 10)
      next.message = "Tell us a little more (at least 10 characters).";
    setConsentError(!consent);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelOpen) return;
    if (!validate()) return;
    if (contactFormEndpoint) {
      setStatus("sending");
      setSubmitError("");
      try {
        const res = await fetch(contactFormEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ ...fields, consent }),
        });
        const result = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !result.ok)
          throw new Error(
            result.error ?? "The contact service did not accept the message.",
          );
        setStatus("sent");
        setFields(initial);
        setConsent(false);
      } catch (error) {
        setStatus("error");
        setSubmitError(
          error instanceof Error
            ? error.message
            : "The contact service could not be reached.",
        );
      }
      return;
    }
    const subject = encodeURIComponent(fields.subject.trim());
    const body = encodeURIComponent(
      `${fields.message.trim()}\n\n— ${fields.name.trim()} (${fields.email.trim()})`,
    );
    if (!fallbackEmail) return;
    window.location.href = `mailto:${fallbackEmail}?subject=${subject}&body=${body}`;
    setStatus("sent");
  };

  const field = (
    key: keyof Fields,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement>,
  ) => (
    <div className="form-field">
      <label htmlFor={`contact-${key}`}>{label}</label>
      <input
        id={`contact-${key}`}
        value={fields[key]}
        onChange={set(key)}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={errors[key] ? `contact-${key}-error` : undefined}
        disabled={!channelOpen}
        {...props}
      />
      {errors[key] ? (
        <p className="field-error" id={`contact-${key}-error`}>
          {errors[key]}
        </p>
      ) : null}
    </div>
  );

  if (!channelOpen) {
    return (
      <div className="contact-closed" role="note">
        <p>
          <strong>This form is not open yet.</strong> The address this site
          shipped with was a development placeholder, never confirmed as a
          monitored inbox, so it has been withdrawn rather than left to lose
          messages. The operator still needs to supply a verified contact
          address.
        </p>
        <p>
          Nothing you could type here would reach anyone today, so the fields
          are disabled rather than pretending otherwise. In the meantime, the{" "}
          <Link href="/faq">FAQ</Link>,{" "}
          <Link href="/file-handling">File Handling Policy</Link> and{" "}
          <Link href="/help">Help Center</Link> answer most questions about the
          tools and about how data is handled.
        </p>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate>
      {field("name", "Your name", {
        autoComplete: "name",
        placeholder: "Ada Lovelace",
        maxLength: 100,
        required: true,
      })}
      {field("email", "Email address", {
        type: "email",
        autoComplete: "email",
        placeholder: "you@example.com",
        maxLength: 254,
        required: true,
      })}
      {field("subject", "Subject", {
        placeholder: "How can we help?",
        maxLength: 150,
        required: true,
      })}
      <div className="form-field">
        <label htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          rows={6}
          required
          maxLength={5000}
          value={fields.message}
          onChange={set("message")}
          placeholder="Write your message…"
          aria-invalid={Boolean(errors.message)}
          aria-describedby={
            errors.message ? "contact-message-error" : undefined
          }
        />
        {errors.message ? (
          <p className="field-error" id="contact-message-error">
            {errors.message}
          </p>
        ) : null}
      </div>
      <div className="form-field contact-consent">
        <label htmlFor="contact-consent">
          <input
            id="contact-consent"
            type="checkbox"
            required
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            aria-invalid={consentError}
            aria-describedby={
              consentError ? "contact-consent-error" : undefined
            }
          />
          I agree QUICKKIT may store these details privately to respond to this
          message.
        </label>
        {consentError ? (
          <p className="field-error" id="contact-consent-error">
            Please agree to the storage notice before sending.
          </p>
        ) : null}
      </div>
      <button
        className="primary form-submit"
        type="submit"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending…" : "Send message"}{" "}
        <Send size={16} aria-hidden="true" />
      </button>
      <div aria-live="polite">
        {status === "sent" ? (
          <p className="form-status success">
            <MailCheck size={17} aria-hidden="true" />{" "}
            {contactFormEndpoint
              ? "Thanks — your message has been securely recorded for review. We’ll reply to the email address you provided."
              : "Your email app should open with the message ready to send. If nothing opened, write to us directly at " +
                fallbackEmail +
                "."}
          </p>
        ) : status === "error" ? (
          <p className="form-status error">
            <TriangleAlert size={17} aria-hidden="true" />{" "}
            {submitError || "The message was not sent."} Please email us
            directly at {fallbackEmail}.
          </p>
        ) : null}
      </div>
      {contactFormEndpoint ? (
        <p className="form-note">
          Your message is sent to QUICKKIT’s private submission service only
          after you check the consent box and press Send. Do not include
          passwords, private documents, or tool inputs.
        </p>
      ) : null}
    </form>
  );
}
