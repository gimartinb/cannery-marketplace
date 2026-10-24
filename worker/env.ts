export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  /** Workers AI (free daily allowance), for the maker description helper. */
  AI: Ai;
  /** Zero Trust team domain, for example "https://cannery.cloudflareaccess.com". */
  ACCESS_TEAM_DOMAIN: string;
  /** Comma separated Application Audience (AUD) tags of the Access apps that front this Worker. */
  ACCESS_AUD: string;
  /** Comma separated emails allowed into the owner dashboard. */
  ADMIN_EMAILS: string;
  /**
   * Phase 2 only (not used yet): a Square access token for connecting gift boxes and
   * corporate invoices to Square. Add it with `wrangler secret put SQUARE_ACCESS_TOKEN`,
   * never in code, chat, or the dashboard's text fields.
   */
  SQUARE_ACCESS_TOKEN?: string;
  /** Local development only. Set in .dev.vars, never in wrangler.jsonc. */
  ENVIRONMENT?: string;
  DEV_AUTH_EMAIL?: string;
}

export function csv(value: string | undefined): string[] {
  return (value || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}
