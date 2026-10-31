import { and, asc, eq } from "drizzle-orm";
import { openingHoursForSearch, parseStoreHours } from "../shared/storeHours";
import { redirectFor } from "./listingAddress";
import { publishedSiteText } from "./siteText";
import { vendorProfiles } from "../drizzle/schema";
import { createDb, getSiteSetting, listSiteImages, type Database } from "./db";
import type { Env } from "./env";
import { SITE_URL } from "../shared/site";

// Search and social sharing tags are written into the HTML at the edge, so
// crawlers and link previews (which often do not run JavaScript) see the right
// title, description, canonical link, image, and structured data for each page.

export { SITE_URL };
export const SITE_NAME = "The Cannery Marketplace";
const PRODUCTION_HOSTS = new Set(["cannerymarket.com", "www.cannerymarket.com"]);
const DEFAULT_SOCIAL_IMAGE = "/images/cannery-interior.jpg";
const DEFAULT_HERO_IMAGE = "/images/cannery-pottery-hero.jpg";

export function isProductionHost(hostname: string) { return PRODUCTION_HOSTS.has(hostname.toLowerCase()); }

type StaticRoute = { title: string; description: string; index: boolean; changefreq?: "weekly" | "monthly"; priority?: number };

/** Every page the React app serves. Titles match the pages' own PageMeta. */
export const STATIC_ROUTES: Record<string, StaticRoute> = {
  "/": { title: "Local makers and artisan goods in Gilroy", description: "Discover local makers, artisan products, and the stories behind the work at The Cannery Marketplace in downtown Gilroy, California.", index: true, changefreq: "weekly", priority: 1 },
  "/vendors": { title: "Local maker directory in Gilroy", description: "Meet local makers and artisans at The Cannery Marketplace in Gilroy. Search maker profiles, discover their products, and read the stories behind the work.", index: true, changefreq: "weekly", priority: 0.9 },
  "/about": { title: "About our Gilroy artisan marketplace", description: "Learn how The Cannery Marketplace gives Gilroy makers and artisans a welcoming place to share handcrafted work with the community.", index: true, changefreq: "monthly", priority: 0.7 },
  "/become-a-vendor": { title: "Become a maker at The Cannery Marketplace", description: "Apply to become a vendor at The Cannery Marketplace in Gilroy and follow a simple onboarding process for local makers and artisans.", index: true, changefreq: "monthly", priority: 0.8 },
  "/apply": { title: "Maker application", description: "Apply to become a maker at The Cannery Marketplace. Our team reviews every application from Gilroy area makers and artisans.", index: true, changefreq: "monthly", priority: 0.8 },
  "/contact": { title: "Contact and visit The Cannery Marketplace in Gilroy", description: "Contact The Cannery Marketplace or visit us at 7488 Monterey Road in downtown Gilroy, California.", index: true, changefreq: "monthly", priority: 0.7 },
  "/reviews": { title: "Shopper reviews of Gilroy makers", description: "Read what shoppers say about The Cannery Marketplace and its local makers and artisans in Gilroy, California, and share your own review.", index: true, changefreq: "weekly", priority: 0.7 },
  "/gifts": { title: "Gift boxes from local Gilroy makers", description: "Shop gift boxes featuring handcrafted goods from makers at The Cannery Marketplace in Gilroy, California.", index: true, changefreq: "monthly", priority: 0.6 },
  "/request-a-quote": { title: "Request a corporate order quote", description: "Request custom pricing for corporate and bulk orders from The Cannery Marketplace.", index: false },
  "/admin": { title: "Owner portal", description: "Private owner access for The Cannery Marketplace.", index: false },
  "/maker-portal": { title: "Maker sign in", description: "Secure maker profile access for The Cannery Marketplace.", index: false },
};

const BUSINESS_BASE = {
  "@type": "LocalBusiness",
  "@id": `${SITE_URL}/#marketplace`,
  name: SITE_NAME,
  description: "A Gilroy marketplace where shoppers discover local makers, artisan products, and the stories behind the work.",
  url: `${SITE_URL}/`,
  telephone: "+1-408-337-1620",
  email: "thecannerymarketplace@gmail.com",
  priceRange: "$$",
  address: { "@type": "PostalAddress", streetAddress: "7488 Monterey Road", addressLocality: "Gilroy", addressRegion: "CA", postalCode: "95020", addressCountry: "US" },
  geo: { "@type": "GeoCoordinates", latitude: 37.0079724, longitude: -121.568909 },
  hasMap: "https://www.google.com/maps/search/?api=1&query=7488+Monterey+Road+Gilroy+CA+95020",
};

export type PageMeta = {
  status: number;
  title: string;
  description: string;
  canonical: string;
  image: string;
  imageAlt: string;
  index: boolean;
  type: "website" | "profile";
  jsonLd: object[];
  preloadImage?: string;
};

const absolute = (value: string) => (/^https?:\/\//i.test(value) ? value : `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`);
const fullTitle = (title: string) => (title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`);
const clip = (text: string, max = 158) => { const clean = text.replace(/\s+/g, " ").trim(); return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`; };
const breadcrumbs = (items: Array<[string, string]>) => ({ "@type": "BreadcrumbList", itemListElement: items.map(([name, path], index) => ({ "@type": "ListItem", position: index + 1, name, item: `${SITE_URL}${path}` })) });

/** Works out the tags for a page path, or a 404 for paths and makers that do not exist. */
export async function resolvePage(db: Database, pathname: string): Promise<PageMeta> {
  // Hours come from the Store hours tab, so search engines see the same hours (and holidays) as visitors.
  const storeHours = parseStoreHours(await getSiteSetting(db, "store_hours", ""));
  const BUSINESS = { ...BUSINESS_BASE, openingHoursSpecification: openingHoursForSearch(storeHours) };
  const images = new Map((await listSiteImages(db)).map((row) => [row.id, row]));
  const socialImage = images.get("social-sharing")?.url || DEFAULT_SOCIAL_IMAGE;
  const base = { image: socialImage, imageAlt: `${SITE_NAME} in Gilroy, California`, type: "website" as const };

  const vendorMatch = pathname.match(/^\/vendors\/([a-z0-9-]{1,160})$/);
  if (vendorMatch) {
    const vendor = (await db.select().from(vendorProfiles).where(and(eq(vendorProfiles.slug, vendorMatch[1]), eq(vendorProfiles.active, true))).limit(1))[0];
    if (vendor) {
      const path = `/vendors/${vendor.slug}`;
      const sameAs = [vendor.websiteUrl, vendor.instagramUrl, vendor.facebookUrl, vendor.tiktokUrl].filter(Boolean) as string[];
      let gallery: string[] = [];
      try { gallery = JSON.parse(vendor.galleryImageUrls || "[]"); } catch { gallery = []; }
      const image = vendor.coverImageUrl || socialImage;
      return {
        ...base, status: 200, type: "profile",
        title: `${vendor.name}, ${vendor.category} maker in Gilroy`,
        description: clip(`${vendor.shortBio} Find ${vendor.name} at The Cannery Marketplace in Gilroy, California.`),
        canonical: `${SITE_URL}${path}`, image, imageAlt: `${vendor.name}, a ${vendor.category} maker at ${SITE_NAME}`, index: true,
        preloadImage: vendor.coverImageUrl || undefined,
        jsonLd: [
          {
            "@type": "ProfilePage", "@id": `${SITE_URL}${path}#profile`, url: `${SITE_URL}${path}`, name: `${vendor.name} at ${SITE_NAME}`,
            dateModified: vendor.updatedAt.toISOString(),
            mainEntity: {
              "@type": "Organization", "@id": `${SITE_URL}${path}#maker`, name: vendor.name, description: vendor.shortBio, url: `${SITE_URL}${path}`,
              image: [image, ...gallery].map(absolute), knowsAbout: vendor.category,
              ...(sameAs.length ? { sameAs } : {}),
              ...(vendor.ownerName ? { founder: { "@type": "Person", name: vendor.ownerName } } : {}),
              memberOf: { "@id": `${SITE_URL}/#marketplace` },
            },
          },
          breadcrumbs([["Home", "/"], ["Makers", "/vendors"], [vendor.name, path]]),
          { ...BUSINESS, image: absolute(socialImage) },
        ],
      };
    }
    return { ...base, status: 404, title: "Maker not found", description: "That maker profile is not available. Browse every maker at The Cannery Marketplace.", canonical: `${SITE_URL}/vendors`, index: false, jsonLd: [] };
  }

  const route = STATIC_ROUTES[pathname];
  if (!route) return { ...base, status: 404, title: "Page not found", description: "The page you are looking for is not here. Explore local makers at The Cannery Marketplace in Gilroy.", canonical: `${SITE_URL}/`, index: false, jsonLd: [] };

  let index = route.index;
  if (pathname === "/gifts") index = (await getSiteSetting(db, "gift_boxes_enabled", "false")) === "true";
  const jsonLd: object[] = [];
  if (pathname === "/") jsonLd.push(
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: SITE_NAME, publisher: { "@id": `${SITE_URL}/#marketplace` }, inLanguage: "en-US" },
    { ...BUSINESS, image: absolute(socialImage), logo: absolute(images.get("logo")?.url || "/images/cannery-marketplace-logo.png") },
  );
  if (pathname === "/contact" || pathname === "/about") jsonLd.push({ ...BUSINESS, image: absolute(socialImage) }, breadcrumbs([["Home", "/"], [pathname === "/contact" ? "Contact" : "About", pathname]]));
  if (pathname === "/vendors") jsonLd.push({ "@type": "CollectionPage", url: `${SITE_URL}/vendors`, name: `Makers at ${SITE_NAME}`, isPartOf: { "@id": `${SITE_URL}/#website` } }, breadcrumbs([["Home", "/"], ["Makers", "/vendors"]]));
  if (pathname === "/become-a-vendor") jsonLd.push(breadcrumbs([["Home", "/"], ["Become a vendor", "/become-a-vendor"]]));
  if (pathname === "/reviews") jsonLd.push(breadcrumbs([["Home", "/"], ["Reviews", "/reviews"]]));
  if (pathname === "/apply") jsonLd.push(breadcrumbs([["Home", "/"], ["Become a vendor", "/become-a-vendor"], ["Maker application", "/apply"]]));

  return {
    ...base, status: 200, title: route.title, description: route.description, canonical: `${SITE_URL}${pathname}`, index, jsonLd,
    preloadImage: pathname === "/" ? images.get("home-hero")?.url || DEFAULT_HERO_IMAGE : undefined,
  };
}

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The head tags for a page, as one HTML string. */
export function headTags(meta: PageMeta, productionHost: boolean) {
  const title = escapeHtml(fullTitle(meta.title));
  const description = escapeHtml(meta.description);
  const image = escapeHtml(absolute(meta.image));
  const robots = meta.index && productionHost ? "index, follow, max-image-preview:large, max-snippet:-1" : "noindex, nofollow";
  const lines = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(meta.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ];
  if (meta.preloadImage) lines.push(`<link rel="preload" as="image" href="${escapeHtml(meta.preloadImage)}" fetchpriority="high" />`);
  if (meta.jsonLd.length) lines.push(`<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": meta.jsonLd }).replace(/</g, "\\u003c")}</script>`);
  return lines.join("\n    ");
}

/** Serves an app page with its own tags, the right status code, and no indexing outside the real domain. */
export async function handlePage(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  // One address per page: drop trailing slashes with a permanent redirect.
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return Response.redirect(url.toString(), 301);
  }
  // Pages carry live data (search tags, site text), so the shell is always fetched in full:
  // a conditional request would get an empty 304 body from the asset store, which the
  // rewrite below would turn into a blank page.
  const accept = request.headers.get("Accept") || "";
  const conditional = request.headers.has("If-None-Match") || request.headers.has("If-Modified-Since");
  const assetRequest = conditional && request.method === "GET" && !/\.[a-z0-9]{2,5}$/i.test(url.pathname) ? new Request(request.url, { method: "GET", headers: { Accept: accept || "text/html" } }) : request;
  const asset = await env.ASSETS.fetch(assetRequest);
  if (!(asset.headers.get("Content-Type") || "").includes("text/html") || request.method !== "GET" || asset.status === 304) return asset;

  // Renamed maker pages: send old addresses to the current one (permanent, so search engines update).
  const vendorPath = url.pathname.match(/^\/vendors\/([a-z0-9-]{1,160})$/);
  if (vendorPath) {
    try {
      const db = createDb(env.DB);
      const exists = (await db.select({ id: vendorProfiles.id }).from(vendorProfiles).where(eq(vendorProfiles.slug, vendorPath[1])).limit(1))[0];
      const moved = exists ? null : await redirectFor(db, vendorPath[1]);
      if (moved) { url.pathname = `/vendors/${moved}`; return Response.redirect(url.toString(), 301); }
    } catch (error) { console.error("Redirect check failed", error); }
  }
  const production = isProductionHost(url.hostname);
  let meta: PageMeta;
  try { meta = await resolvePage(createDb(env.DB), url.pathname); }
  catch (error) { console.error("SEO tags failed", error); return asset; }
  const tags = headTags(meta, production);
  // The owners' published wording, so pages render it on first paint (no flash of the original text).
  let siteText: Record<string, string> = {};
  try { siteText = await publishedSiteText(createDb(env.DB)); } catch (error) { console.error("Site text failed", error); }
  const textScript = `<script>window.__SITE_TEXT__=${JSON.stringify(siteText).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029")}</script>`;

  const rewritten = new HTMLRewriter()
    .on("title, meta[name=description], meta[name=robots], meta[property^='og:'], meta[name^='twitter:'], link[rel=canonical]", { element: (element) => { element.remove(); } })
    .on("head", { element: (element) => { element.append(`${tags}\n    ${textScript}`, { html: true }); } })
    .transform(asset);
  const response = new Response(rewritten.body, { status: meta.status, headers: rewritten.headers });
  response.headers.set("Content-Type", "text/html; charset=utf-8");
  response.headers.set("Cache-Control", "no-cache");
  // The asset's validators describe the file on disk, not this page with its live tags and text.
  response.headers.delete("ETag");
  response.headers.delete("Last-Modified");
  if (!production) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

/** robots.txt: open on the real domain, closed on staging so test copies never compete in search. */
export function robotsTxt(request: Request) {
  const production = isProductionHost(new URL(request.url).hostname);
  const body = production
    ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /maker-portal\nDisallow: /api/\nDisallow: /request-a-quote\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

/** sitemap.xml built from the database, so new and hidden makers are always current. */
export async function sitemapXml(env: Env) {
  const db = createDb(env.DB);
  const today = new Date().toISOString().slice(0, 10);
  const giftsOn = (await getSiteSetting(db, "gift_boxes_enabled", "false")) === "true";
  const vendors = await db.select({ slug: vendorProfiles.slug, updatedAt: vendorProfiles.updatedAt, featured: vendorProfiles.featured }).from(vendorProfiles).where(eq(vendorProfiles.active, true)).orderBy(asc(vendorProfiles.slug));
  const entries = [
    ...Object.entries(STATIC_ROUTES).filter(([path, route]) => route.index && (path !== "/gifts" || giftsOn)).map(([path, route]) => ({ loc: `${SITE_URL}${path}`, lastmod: today, changefreq: route.changefreq || "monthly", priority: route.priority ?? 0.5 })),
    ...vendors.map((vendor) => ({ loc: `${SITE_URL}/vendors/${vendor.slug}`, lastmod: vendor.updatedAt.toISOString().slice(0, 10), changefreq: "monthly", priority: vendor.featured ? 0.8 : 0.7 })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((entry) => `  <url><loc>${entry.loc}</loc><lastmod>${entry.lastmod}</lastmod><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority.toFixed(1)}</priority></url>`).join("\n")}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
