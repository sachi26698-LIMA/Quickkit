"use client";
import { useState } from "react";
import Link from "next/link";
import { MailCheck, Send, TriangleAlert } from "lucide-react";
import { contactEmail, contactFormEndpoint } from "@/lib/site";

type Fields = { name: string; email: string; subject: string; message: string };
const initial: Fields = { name: "", email: "", subject: "", message: "" };

/**
 * Contact form with inline validation.
 * - If CONTACT_FORM_ENDPOINT is configured (lib/site.ts), POSTs JSON there.
 * - Otherwise, *if and only if* a verified public address exists, opens the
 *   visitor's email app via mailto: with the message pre-filled — no data
 *   touches a server.
 * - With neither configured (the current state: the demo address was withdrawn)
 *   the form is disabled and explains why, rather than composing a mailto: to
 *   an address that may not exist. Losing a visitor's message silently is worse
 *   than telling them the channel is not open yet.
 */
export default function ContactForm() {
  const [fields, setFields] = useState(initial);
  const [errors, setErrors] = useState<Partial<Fields>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  const channelOpen = Boolean(contactFormEndpoint || contactEmail);

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
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelOpen) return;
    if (!validate()) return;
    if (contactFormEndpoint) {
      setStatus("sending");
      try {
        const res = await fetch(contactFormEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(fields),
        });
        if (!res.ok) throw new Error("send failed");
        setStatus("sent");
        setFields(initial);
      } catch {
        setStatus("error");
      }
      return;
    }
    const subject = encodeURIComponent(fields.subject.trim());
    const body = encodeURIComponent(
      `${fields.message.trim()}\n\n— ${fields.name.trim()} (${fields.email.trim()})`,
    );
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
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
      })}
      {field("email", "Email address", {
        type: "email",
        autoComplete: "email",
        placeholder: "you@example.com",
      })}
      {field("subject", "Subject", { placeholder: "How can we help?" })}
      <div className="form-field">
        <label htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          rows={6}
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
              ? "Thanks — your message is on its way. We'll reply as soon as we can."
              : "Your email app should open with the message ready to send. If nothing opened, write to us directly at " +
                contactEmail +
                "."}
          </p>
        ) : status === "error" ? (
          <p className="form-status error">
            <TriangleAlert size={17} aria-hidden="true" /> Something went wrong
            sending that. Please email us directly at {contactEmail}.
          </p>
        ) : null}
      </div>
      {!contactFormEndpoint ? (
        <p className="form-note">
          This form opens your email app — nothing is sent to a server.
        </p>
      ) : null}
    </form>
  );
}
