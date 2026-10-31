// A configured origin is not evidence of legal/domain approval. This gate is opt-in.
export const indexingEnabled = Boolean(
  process.env.SITE_URL &&
  process.env.LAUNCH_APPROVED === "true" &&
  (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production"),
);
