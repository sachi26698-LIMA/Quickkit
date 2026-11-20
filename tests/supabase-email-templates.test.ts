import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd(), "supabase/email-templates");
const manifest = JSON.parse(
  readFileSync(resolve(root, "template-map.json"), "utf8"),
) as Record<
  string,
  { file: string; subjectKey: string; supabaseRequiredVariables: string[] }
>;
const subjects = JSON.parse(
  readFileSync(resolve(root, "subjects.json"), "utf8"),
) as Record<string, string>;
const sample = (key: string) => {
  if (key === ".ConfirmationURL")
    return "https://oevjmxcoyibkonousdoh.supabase.co/auth/v1/verify?token=isolated-fixture&type=magiclink&redirect_to=https%3A%2F%2Fquickkit.live%2Fauth%2Fcallback";
  if (key === ".Token") return "12345678";
  if (key === ".NewEmail") return "new-address@example.test";
  throw new Error(`Unexpected template variable ${key}`);
};
const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const render = (html: string) =>
  html.replace(/\{\{\s*(\.[A-Za-z]+)\s*\}\}/g, (_match, key: string) =>
    escapeHtml(sample(key)),
  );

describe("QUICKKIT Supabase Auth email templates", () => {
  it("maps all six Auth message types to exact required Supabase variables and subjects", () => {
    expect(Object.keys(manifest).sort()).toEqual([
      "confirmation",
      "email_change",
      "invite",
      "magic_link",
      "reauthentication",
      "recovery",
    ]);
    const combined = Object.values(manifest)
      .map((entry) => readFileSync(resolve(root, entry.file), "utf8"))
      .join("\\n");
    for (const color of [
      "#3b1b4f",
      "#2a1239",
      "#d6598f",
      "#b93a73",
      "#ff6b6b",
      "#c93a3a",
    ])
      expect(combined).toContain(color);
    for (const [type, entry] of Object.entries(manifest)) {
      const html = readFileSync(resolve(root, entry.file), "utf8");
      expect(subjects[entry.subjectKey]).toBeTruthy();
      for (const variable of entry.supabaseRequiredVariables)
        expect(html).toContain(`{{ ${variable} }}`);
      expect(html).toContain("Handy tools. Zero hassle.");
      expect(html).toContain("QUICKKIT");
      expect(html).toMatch(/name="viewport"/);
      expect(html).toMatch(/max-width:\s*600px/);
      expect(html).toMatch(/<h1\b/);
      expect(html).toContain("type");
      expect(type).toBeTruthy();
    }
  });

  it("renders all templates with safe example values and retains Supabase-issued secure URLs", () => {
    for (const entry of Object.values(manifest)) {
      const source = readFileSync(resolve(root, entry.file), "utf8");
      const html = render(source);
      expect(html).not.toMatch(/\{\{\s*\.[A-Za-z]+\s*\}\}/);
      expect(html).not.toMatch(/href="javascript:/i);
      expect(html).not.toMatch(/href="http:\/\//i);
      if (entry.supabaseRequiredVariables.includes(".ConfirmationURL")) {
        expect(html).toContain(
          "https://oevjmxcoyibkonousdoh.supabase.co/auth/v1/verify?",
        );
        expect(
          html.match(
            /href="https:\/\/oevjmxcoyibkonousdoh\.supabase\.co\/auth\/v1\/verify\?/g,
          )?.length,
        ).toBeGreaterThanOrEqual(2);
        expect(html).toContain("&amp;type=magiclink");
      }
    }
  });

  it("HTML-escapes OTP and email placeholders and contains no live secrets or contact/social links", () => {
    const malicious = escapeHtml('<img src=x onerror="alert(1)">');
    expect(malicious).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    for (const entry of Object.values(manifest)) {
      const html = readFileSync(resolve(root, entry.file), "utf8");
      expect(html).not.toMatch(
        /https?:\/\/(?:www\.)?(?:instagram|facebook|x|youtube|github|linkedin)\.com/i,
      );
      expect(html).not.toMatch(
        /(?:smtp_pass|service_role|api[_ -]?key|password\s*[:=])/i,
      );
      expect(html).not.toContain("@quickkit.in");
    }
  });

  it("documents disabled signup and checks owner-only authorization and local redirect guards", () => {
    const docs = readFileSync(resolve(root, "README.md"), "utf8");
    expect(docs).toContain("`disable_signup=true`");
    expect(docs).toContain("No test email was sent");
    expect(docs).toContain("SMTP");
    expect(docs).toContain(
      "Password-change, email-change, and MFA factor enroll/unenroll security notifications are enabled.",
    );
    expect(docs).toContain(
      "Invalid/expired links should fail safely at Supabase and never redirect off-site.",
    );
    const auth = readFileSync(
      resolve(process.cwd(), "lib/supabase/admin-auth.ts"),
      "utf8",
    );
    const callback = readFileSync(
      resolve(process.cwd(), "app/auth/callback/route.ts"),
      "utf8",
    );
    expect(auth).toContain("QUICKKIT_ADMIN_EMAILS");
    expect(callback).toContain("isAllowedAdminEmail(data.user.email)");
    expect(callback).toContain('signOut({ scope: "local" })');
    expect(callback).toMatch(/next.*admin|admin.*next/s);
  });
});
