export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  /** Zero Trust team domain, for example "https://cannery.cloudflareaccess.com". */
  ACCESS_TEAM_DOMAIN: string;
  /** Comma separated Application Audience (AUD) tags of the Access apps that front this Worker. */
  ACCESS_AUD: string;
  /** Comma separated emails allowed into the owner dashboard. */
  ADMIN_EMAILS: string;
  /** Local development only. Set in .dev.vars, never in wrangler.jsonc. */
  ENVIRONMENT?: string;
  DEV_AUTH_EMAIL?: string;
}

export function csv(value: string | undefined): string[] {
  return (value || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}
