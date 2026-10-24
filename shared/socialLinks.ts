// Turns what people naturally type into a full link:
//   @the45workshop          -> https://instagram.com/the45workshop   (Instagram field)
//   instagram.com/the45     -> https://instagram.com/the45
//   the45workshop.com       -> https://the45workshop.com             (Website field)
//   @shopname               -> https://tiktok.com/@shopname          (TikTok field)
// Anything that is already a full link is kept as is. Blank stays blank.

export type LinkKind = "website" | "instagram" | "facebook" | "tiktok";

const HOSTS: Record<Exclude<LinkKind, "website">, string> = { instagram: "instagram.com", facebook: "facebook.com", tiktok: "tiktok.com" };
const HANDLE = /^@?([A-Za-z0-9._-]{1,60})$/;

export function normalizeLink(kind: LinkKind, raw: string | null | undefined): string {
  const value = (raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (kind === "website") return /^[^\s/]+\.[^\s]+$/.test(value) ? `https://${value.replace(/^\/+/, "")}` : value;
  const host = HOSTS[kind];
  // "instagram.com/name", "www.facebook.com/name", or "fb.com/name" without https://
  if (/^(www\.|m\.)?([a-z0-9-]+\.)?(instagram\.com|facebook\.com|fb\.com|tiktok\.com)\//i.test(value)) return `https://${value}`;
  const handle = value.match(HANDLE)?.[1];
  if (!handle) return value;
  return kind === "tiktok" ? `https://${host}/@${handle}` : `https://${host}/${handle}`;
}

/** Shows a stored link the way people know it: "@the45workshop" for social accounts. */
export function displayHandle(kind: LinkKind, url: string | null | undefined): string {
  if (!url) return "";
  if (kind === "website") return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  try {
    const path = new URL(url).pathname.replace(/^\/+|\/+$/g, "");
    const name = path.split("/")[0]?.replace(/^@/, "");
    return name ? `@${name}` : url;
  } catch { return url; }
}
