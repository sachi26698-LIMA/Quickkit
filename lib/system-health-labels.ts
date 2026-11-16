import type { SystemHealthReport } from "@/lib/system-health";

export type HealthTone = "good" | "warn" | "neutral" | "error";
export type HealthLabel = { value: string; tone: HealthTone; detail: string };
export type SystemHealthLabels = {
  rls: HealthLabel;
  smtp: HealthLabel;
  sitemap: HealthLabel;
  analytics: HealthLabel;
  errorMonitoring: HealthLabel;
};

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

const listed = (names: string[]) =>
  names.length > 3
    ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`
    : names.join(", ");

/**
 * Turns the server's probe results into the wording shown in the Admin panels.
 *
 * Green is used only for something a probe confirmed (or, for SMTP, a dated
 * owner confirmation, which the wording says). When the report is missing, for
 * example from a server that has not been updated yet, every row says the
 * check did not run rather than implying a pass.
 */
export function describeSystemHealth(
  report: SystemHealthReport | null | undefined,
  legacy: {
    sitemapOriginConfigured?: boolean;
    analyticsCredentialsPresent?: boolean;
    errorMonitoringConfigured?: boolean;
  } = {},
): SystemHealthLabels {
  if (!report)
    return {
      rls: {
        value: "Verification required",
        tone: "warn",
        detail:
          "The database check has not run; verify RLS policies in Supabase.",
      },
      smtp: {
        value: "External · unverified",
        tone: "neutral",
        detail: "Managed externally in Supabase Auth; not probed by app.",
      },
      sitemap: {
        value: "Owner verification required",
        tone: "warn",
        detail: legacy.sitemapOriginConfigured
          ? "Origin set; the sitemap check has not run."
          : "SITE_URL origin not configured in this environment.",
      },
      analytics: {
        value: legacy.analyticsCredentialsPresent
          ? "Read-only query required"
          : "Not configured",
        tone: legacy.analyticsCredentialsPresent ? "warn" : "neutral",
        detail: legacy.analyticsCredentialsPresent
          ? "Env credentials detected; the counter check has not run."
          : "No verified first-party analytics database configured.",
      },
      errorMonitoring: {
        value: legacy.errorMonitoringConfigured
          ? "Configured (opt-in)"
          : "Not configured",
        tone: legacy.errorMonitoringConfigured ? "good" : "neutral",
        detail: legacy.errorMonitoringConfigured
          ? "Sanitized error boundary hook is enabled."
          : "Opt-in error boundary hook ready; nothing is collected.",
      },
    };

  const { rls, smtp, sitemap, analytics, error_monitoring: errors } = report;

  const rlsLabel: HealthLabel =
    rls.status === "verified"
      ? {
          value: `Verified · ${plural(rls.tables, "table")}`,
          tone: "good",
          detail:
            "Database check: RLS is on for every QUICKKIT table; no signed-out access.",
        }
      : rls.status === "issues"
        ? {
            value: "Needs attention",
            tone: "error",
            detail: [
              rls.unprotected.length
                ? `Row level security is off on ${listed(rls.unprotected)}.`
                : "",
              rls.anon_readable.length
                ? `Signed-out browsers hold table access on ${listed(rls.anon_readable)}.`
                : "",
            ]
              .filter(Boolean)
              .join(" "),
          }
        : {
            value: "Check unavailable",
            tone: "warn",
            detail:
              "This check needs the system health migration; until then verify policies in Supabase.",
          };

  const signup =
    smtp.signup_disabled === true
      ? ", signup closed"
      : smtp.signup_disabled === false
        ? ", signup open"
        : "";
  const signIn =
    smtp.email_sign_in === true
      ? "email sign-in on"
      : "email sign-in state not reported";
  const smtpLabel: HealthLabel = !smtp.auth_reachable
    ? {
        value: "Auth settings unreachable",
        tone: "warn",
        detail:
          "Supabase Auth did not answer the settings check, so email sign-in could not be confirmed.",
      }
    : smtp.email_sign_in === false
      ? {
          value: "Email sign-in is off",
          tone: "warn",
          detail: `Supabase Auth reports the email provider is disabled${signup}.`,
        }
      : smtp.verified_on
        ? {
            value: `Confirmed · ${smtp.verified_on}`,
            tone: "good",
            detail: `Custom SMTP confirmed in Supabase on ${smtp.verified_on}; ${signIn}${signup}.`,
          }
        : {
            value: "External · unverified",
            tone: "neutral",
            detail: `Auth check: ${signIn}${signup}. Confirm SMTP in Supabase, then set AUTH_SMTP_VERIFIED_ON.`,
          };

  const sitemapLabel: HealthLabel =
    sitemap.status === "not-configured"
      ? {
          value: "Origin not set",
          tone: "warn",
          detail: "SITE_URL origin not configured in this environment.",
        }
      : sitemap.status === "unreachable"
        ? {
            value: "Unreachable",
            tone: "error",
            detail:
              "The server could not fetch sitemap.xml from the configured site origin.",
          }
        : sitemap.status === "invalid"
          ? {
              value: "Sitemap invalid",
              tone: "error",
              detail:
                "sitemap.xml answered, but it is not a sitemap or lists no pages.",
            }
          : sitemap.robots === "blocks"
            ? {
                value: "Reachable · crawling blocked",
                tone: "warn",
                detail: `sitemap.xml lists ${plural(sitemap.urls, "URL")}, but robots.txt blocks every crawler until LAUNCH_APPROVED is true in production.`,
              }
            : sitemap.robots === "unreachable"
              ? {
                  value: "robots.txt unreachable",
                  tone: "warn",
                  detail: `sitemap.xml lists ${plural(sitemap.urls, "URL")}, but robots.txt could not be fetched.`,
                }
              : {
                  value: `Reachable · ${plural(sitemap.urls, "URL")}`,
                  tone: "good",
                  detail: `sitemap.xml and robots.txt fetched from the public site; crawling allowed${
                    sitemap.robots_lists_sitemap ? ", sitemap listed" : ""
                  }.`,
                };

  const store = analytics.backend === "libsql" ? "libSQL" : "Supabase";
  const analyticsLabel: HealthLabel = analytics.ready
    ? {
        value: `Connected · ${plural(analytics.visitors, "visitor")}`,
        tone: "good",
        detail: `Opt-in visitor counter in ${store}; ${analytics.online} online, counting since ${day(analytics.since)}.`,
      }
    : analytics.backend
      ? {
          value: "Database not ready",
          tone: "warn",
          detail:
            analytics.backend === "supabase"
              ? "The visitor counter could not be read; apply the system health migration in Supabase."
              : "The configured libSQL database did not answer.",
        }
      : {
          value: "Not configured",
          tone: "neutral",
          detail: "No verified first-party analytics database configured.",
        };

  const errorLabel: HealthLabel = errors.configured
    ? errors.errors_24h === 0
      ? {
          value: "Connected · no errors in 24h",
          tone: "good",
          detail: `Scrubbed error events stored in Supabase; ${errors.errors_7d} in the last 7 days.`,
        }
      : {
          value: `${plural(errors.errors_24h, "error")} in 24h`,
          tone: "warn",
          detail: `${errors.errors_7d} in the last 7 days, latest ${day(errors.last_error_at)}; listed under Security.`,
        }
    : errors.enabled
      ? {
          value: "Store not ready",
          tone: "warn",
          detail:
            "Monitoring is switched on but the error table did not answer; apply the system health migration.",
        }
      : errors.store_ready
        ? {
            value: "Off · ready to enable",
            tone: "neutral",
            detail:
              "Nothing is collected until ERROR_MONITORING_ENABLED=true is set.",
          }
        : {
            value: "Not configured",
            tone: "neutral",
            detail: "Opt-in error boundary hook ready; nothing is collected.",
          };

  return {
    rls: rlsLabel,
    smtp: smtpLabel,
    sitemap: sitemapLabel,
    analytics: analyticsLabel,
    errorMonitoring: errorLabel,
  };
}
