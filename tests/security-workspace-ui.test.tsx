// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import SecurityWorkspace from "../components/tools/security/workspace";

afterEach(cleanup);
describe("security workspace", () => {
  it("redacts exact matches, clears stale output, and resets", async () => {
    render(<SecurityWorkspace mode="redact" example="Alice lives here" />);
    fireEvent.click(screen.getByRole("button", { name: "Load example" }));
    fireEvent.change(screen.getByLabelText(/Exact phrase/), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Process locally" }));
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Result") as HTMLTextAreaElement).value,
      ).toBe("[REDACTED] lives here"),
    );
    fireEvent.change(screen.getByLabelText(/Exact phrase/), {
      target: { value: "here" },
    });
    expect((screen.getByLabelText("Result") as HTMLTextAreaElement).value).toBe(
      "",
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(
      (screen.getByLabelText("Text to redact") as HTMLTextAreaElement).value,
    ).toBe("");
  });
  it("renders validation errors and legal-review warnings", async () => {
    render(<SecurityWorkspace mode="privacy-policy" example="{}" />);
    expect(screen.getByText(/not legal advice/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Load example" }));
    fireEvent.click(screen.getByRole("button", { name: "Process locally" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("organization"),
    );
  });
  it("does not claim site access when reviewing pasted headers", async () => {
    render(
      <SecurityWorkspace
        mode="response-headers"
        example="Content-Security-Policy: default-src 'self'"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Load example" }));
    fireEvent.click(screen.getByRole("button", { name: "Process locally" }));
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Result") as HTMLTextAreaElement).value,
      ).toContain("no site was contacted"),
    );
  });
});

describe("security workspace mode coverage", () => {
  it.each([
    ["policy", "Password policy draft"],
    ["csp-generate", "Content-Security-Policy"],
    ["permissions-policy", "Permissions-Policy"],
    ["referrer-policy", "Referrer-Policy"],
    ["gdpr", "GDPR REVIEW CHECKLIST"],
    ["tracking-guide", "Tracking protection checklist"],
    ["fingerprint-guide", "Browser fingerprinting"],
    ["privacy-checklist", "Browser privacy checklist"],
    ["third-party-cookies", "Third-party cookies"],
  ] as const)("produces an actual result for %s", async (mode, expected) => {
    render(<SecurityWorkspace mode={mode} example="" />);
    fireEvent.click(screen.getByRole("button", { name: "Process locally" }));
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Result") as HTMLTextAreaElement).value,
      ).toContain(expected),
    );
  });

  it.each([
    ["csp-analyze", "default-src 'self'", "default-src is present"],
    ["cookies", "Set-Cookie: example=sample; Secure", "Secure present"],
    ["hsts", "max-age=0", "disables HSTS"],
    ["frame", "DENY", "blocks framing"],
    ["robots", "User-agent: *\nDisallow: /secret", "not access control"],
    ["spf", "v=spf1 -all", "All mechanism"],
    ["dkim", "v=DKIM1; p=example", "Public key tag"],
    ["dmarc", "v=DMARC1; p=none", "Monitoring"],
    ["bearer", "test-token", "Authorization: Bearer test-token"],
    ["api-key", "test_key_123", "Format matches"],
    ["detect", "test@example.com", "Potential email addresses: 1"],
    ["mask", "test@example.com", "[EMAIL]"],
  ] as const)("processes %s example", async (mode, example, expected) => {
    render(<SecurityWorkspace mode={mode} example={example} />);
    fireEvent.click(screen.getByRole("button", { name: "Load example" }));
    fireEvent.click(screen.getByRole("button", { name: "Process locally" }));
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Result") as HTMLTextAreaElement).value,
      ).toContain(expected),
    );
  });
});

describe("advanced workspace controls", () => {
  it("generates CSP using selected settings and clears stale result on edit", async () => {
    render(<SecurityWorkspace mode="csp-generate" example="" />);
    fireEvent.change(screen.getByLabelText("Framing"), {
      target: { value: "self" },
    });
    fireEvent.click(screen.getByLabelText("Allow data: images"));
    fireEvent.change(
      screen.getByLabelText(/Additional HTTPS connection origin/),
      { target: { value: "https://api.example.com" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Process locally" }));
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Result") as HTMLTextAreaElement).value,
      ).toContain("frame-ancestors 'self'"),
    );
    expect(
      (screen.getByLabelText("Result") as HTMLTextAreaElement).value,
    ).toContain("https://api.example.com");
    fireEvent.change(screen.getByLabelText("Framing"), {
      target: { value: "none" },
    });
    expect((screen.getByLabelText("Result") as HTMLTextAreaElement).value).toBe(
      "",
    );
  });
  it("allows selecting verification without confusing it with decoding", async () => {
    render(<SecurityWorkspace mode="jwt-decode" example="" />);
    fireEvent.click(
      screen.getByLabelText(/Verify signature with a supplied key/),
    );
    expect(screen.getByLabelText(/Shared secret/).getAttribute("type")).toBe(
      "password",
    );
    fireEvent.change(screen.getByLabelText("Expected algorithm"), {
      target: { value: "RS256" },
    });
    expect(screen.getByLabelText(/Public RSA JWK/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Process locally" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("signed compact"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(
      (
        screen.getByLabelText(
          /Verify signature with a supplied key/,
        ) as HTMLInputElement
      ).checked,
    ).toBe(false);
  });
  it("switches security.txt generator to static review", async () => {
    render(<SecurityWorkspace mode="security-txt" example="" />);
    fireEvent.click(screen.getByLabelText(/Review pasted security.txt/));
    fireEvent.change(screen.getByLabelText("Input"), {
      target: {
        value:
          "Contact: mailto:security@example.com\nExpires: 2000-01-01T00:00:00Z",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Process locally" }));
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Result") as HTMLTextAreaElement).value,
      ).toContain("Expires is in the past"),
    );
  });
});

describe("password upgrades", () => {
  it("checks policy length locally without returning the password", async () => {
    render(<SecurityWorkspace mode="policy" example="" />);
    fireEvent.change(screen.getByLabelText(/Optional password/), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Process locally" }));
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Result") as HTMLTextAreaElement).value,
      ).toContain("does not meet"),
    );
    expect(
      (screen.getByLabelText("Result") as HTMLTextAreaElement).value,
    ).not.toContain("short");
  });
  it("generates a configurable batch of passphrases", async () => {
    render(<SecurityWorkspace mode="passphrase" example="" />);
    fireEvent.change(screen.getByLabelText(/Number of passphrases/), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Process locally" }));
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Result") as HTMLTextAreaElement).value.split(
          "\n",
        ),
      ).toHaveLength(3),
    );
  });
});

it("rejects private keys in the certificate inspector", async () => {
  render(<SecurityWorkspace mode="certificate-inspect" example="" />);
  expect(screen.getByText(/does not contact the server/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText(/Public PEM certificate/), {
    target: {
      value: "-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Process locally" }));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "Do not paste private keys",
    ),
  );
  expect((screen.getByLabelText("Result") as HTMLTextAreaElement).value).toBe(
    "",
  );
});

it("exposes HMAC validation, key masking, and reset", async () => {
  render(<SecurityWorkspace mode="hmac" example="message" />);
  expect(screen.getByLabelText(/Secret key/).getAttribute("type")).toBe(
    "password",
  );
  fireEvent.click(screen.getByLabelText(/Verify an existing/));
  expect(screen.getByLabelText(/Expected tag/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(screen.queryByLabelText(/Expected tag/)).toBeNull();
});

it("configures and clears optional password policy composition checks", async () => {
  render(<SecurityWorkspace mode="policy" example="" />);
  fireEvent.click(screen.getByLabelText("Require decimal digit"));
  fireEvent.change(screen.getByLabelText(/Optional password/), {
    target: { value: "LongerPasswordWithNoDigits" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Process locally" }));
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Result") as HTMLTextAreaElement).value,
    ).toContain("Missing selected requirements: decimal digit"),
  );
  expect(
    (screen.getByLabelText("Result") as HTMLTextAreaElement).value,
  ).not.toContain("LongerPasswordWithNoDigits");
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(
    (screen.getByLabelText("Require decimal digit") as HTMLInputElement)
      .checked,
  ).toBe(false);
});
