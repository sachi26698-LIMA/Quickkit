import { Clock, Mail, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import ContactForm from "@/components/contact-form";
import PageHero from "@/components/page-hero";
import { contactEmail } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Contact Us — say hello to QUICKKIT",
  "Get in touch with the QUICKKIT team: email us or send a message with the contact form. We read every note.",
  "/contact",
);

export default function ContactPage() {
  return (
    <div className="home inner-page">
      <div className="container">
        <PageHero
          eyebrow="WE’D LOVE TO HEAR FROM YOU"
          title="Contact"
          titleAccent="Us"
          lede="Questions, feedback, a tool you’d love to see, or a bug to report? Send us a message — we read every one."
        />
        <div className="contact-layout">
          <aside className="contact-cards" aria-label="Ways to reach us">
            <a className="contact-card" href={`mailto:${contactEmail}`}>
              <span className="why-icon">
                <Mail size={24} aria-hidden="true" />
              </span>
              <h2>Email us</h2>
              <p>{contactEmail}</p>
              <span className="contact-card-cta">Open your email app →</span>
            </a>
            <div className="contact-card">
              <span className="why-icon">
                <Clock size={24} aria-hidden="true" />
              </span>
              <h2>Response time</h2>
              <p>
                We usually reply within 2–3 working days. For everyday
                questions, the Help Center may already have your answer.
              </p>
            </div>
            <div className="contact-card">
              <span className="why-icon">
                <MessageCircleQuestion size={24} aria-hidden="true" />
              </span>
              <h2>Before you write</h2>
              <p>
                Tool questions are often covered in{" "}
                <a href="/help#faq">Help &amp; FAQ</a> — worth a quick look.
              </p>
            </div>
            <p className="contact-privacy-note">
              <ShieldCheck size={16} aria-hidden="true" /> Please don’t send
              passwords, private documents or other sensitive files — QUICKKIT
              tools never need them sent anywhere.
            </p>
          </aside>
          <section className="contact-form-panel" aria-labelledby="form-title">
            <h2 id="form-title">Send a message</h2>
            <ContactForm />
          </section>
        </div>
      </div>
    </div>
  );
}
