/** Drafts built exclusively from user-supplied facts; not legal advice. */
type LegalMode =
  | "privacy-policy"
  | "cookie-policy"
  | "retention-policy"
  | "consent-notice"
  | "dpa";
type Section = { heading: string; field: string; prefix: string };
const sections: Record<LegalMode, Section[]> = {
  "privacy-policy": [
    {
      heading: "Personal data",
      field: "data",
      prefix: "We process the following personal data: ",
    },
    {
      heading: "Purposes and lawful bases",
      field: "purpose",
      prefix:
        "We process data for the following purposes and on these stated legal bases: ",
    },
    {
      heading: "Recipients and transfers",
      field: "sharing",
      prefix: "Data recipients and international transfer arrangements: ",
    },
    {
      heading: "Retention",
      field: "retention",
      prefix:
        "We retain data according to the following schedule or criteria: ",
    },
    {
      heading: "Rights and contact",
      field: "rights",
      prefix: "Subject to applicable law, the rights and request process are: ",
    },
  ],
  "cookie-policy": [
    {
      heading: "Cookies and purposes",
      field: "cookies",
      prefix:
        "Our cookies and similar technologies, their purposes, providers and durations are: ",
    },
    {
      heading: "Your choices",
      field: "choices",
      prefix: "You can manage or withdraw applicable consent as follows: ",
    },
    {
      heading: "Third parties",
      field: "sharing",
      prefix: "Third-party technologies and relevant policies: ",
    },
  ],
  "retention-policy": [
    { heading: "Scope", field: "data", prefix: "This policy applies to: " },
    {
      heading: "Retention schedule",
      field: "retention",
      prefix: "Retention periods and triggering events: ",
    },
    {
      heading: "Deletion and exceptions",
      field: "deletion",
      prefix: "Deletion procedures, backups, legal holds and exceptions: ",
    },
    {
      heading: "Responsibilities",
      field: "responsibilities",
      prefix: "The responsible owners and review process are: ",
    },
  ],
  "consent-notice": [
    {
      heading: "Purpose and data",
      field: "purpose",
      prefix: "We request your consent for: ",
    },
    {
      heading: "Recipients",
      field: "sharing",
      prefix: "The relevant recipients are: ",
    },
    {
      heading: "Choice and withdrawal",
      field: "choices",
      prefix: "You may make or change your choice as follows: ",
    },
    {
      heading: "Consequences",
      field: "consequences",
      prefix: "The consequences of declining or withdrawing consent are: ",
    },
  ],
  dpa: [
    {
      heading: "Parties",
      field: "parties",
      prefix: "The controller and processor are: ",
    },
    {
      heading: "Processing",
      field: "processing",
      prefix:
        "Subject matter, duration, purpose, data categories and data subjects: ",
    },
    {
      heading: "Instructions and confidentiality",
      field: "instructions",
      prefix: "The parties' instructions and confidentiality arrangements: ",
    },
    {
      heading: "Security and incidents",
      field: "security",
      prefix:
        "The agreed security measures and incident notification arrangements: ",
    },
    {
      heading: "Subprocessors and transfers",
      field: "sharing",
      prefix:
        "The agreed subprocessor authorization and international transfer arrangements: ",
    },
    {
      heading: "Assistance, audit and termination",
      field: "termination",
      prefix:
        "The agreed assistance, audit, return and deletion arrangements: ",
    },
  ],
};
const labels: Record<LegalMode, string> = {
  "privacy-policy": "Privacy policy",
  "cookie-policy": "Cookie policy",
  "retention-policy": "Data retention policy",
  "consent-notice": "Consent notice",
  dpa: "Data processing agreement",
};
export function legalDraft(mode: LegalMode, raw: string) {
  if (!raw || raw.length > 30000)
    throw new Error(
      "Enter a JSON object with the requested facts (maximum 30,000 characters).",
    );
  let data: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    data = value as Record<string, unknown>;
  } catch {
    throw new Error("Enter a valid JSON object.");
  }
  const read = (key: string) => {
    const value = data[key];
    if (typeof value !== "string" || !value.trim() || value.length > 3000)
      throw new Error(
        `Provide a non-empty ${key} string (up to 3,000 characters).`,
      );
    return value.trim();
  };
  const organization = read("organization"),
    contact = read("contact");
  const body = sections[mode]
    .map(
      ({ heading, field, prefix }) =>
        `${heading.toUpperCase()}\n${prefix}${read(field)}`,
    )
    .join("\n\n");
  return `${labels[mode].toUpperCase()} — DRAFT TEMPLATE\n\nLegal review required. This draft is not legal advice and is not automatically compliant. Check every statement and adapt it to actual practices and applicable law.\n\nOrganization: ${organization}\nContact: ${contact}\n\n${body}`;
}
