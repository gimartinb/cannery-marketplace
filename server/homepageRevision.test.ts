import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const project = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(project, path), "utf8");

describe("maker-first homepage revision", () => {
  it("places maker discovery before general information and the compact visit section last", () => {
    const home = read("client/src/pages/Home.tsx");
    const featured = home.indexOf("featured-makers-section");
    const products = home.indexOf("maker-products-section");
    const intro = home.indexOf("intro-section");
    const visit = home.indexOf("home-visit-compact");

    expect(featured).toBeGreaterThan(0);
    expect(products).toBeGreaterThan(featured);
    expect(intro).toBeGreaterThan(products);
    expect(visit).toBeGreaterThan(intro);
  });

  it("keeps gift navigation behind the administrator-controlled feature setting", () => {
    const shell = read("client/src/components/SiteShell.tsx");
    const router = read("server/routers.ts");

    expect(shell).toContain("giftBoxesEnabled ? [{ href: \"/gifts\"");
    expect(shell).toContain("publicSettings?.giftBoxesEnabled === true");
    expect(router).toContain('getSiteSetting("gift_boxes_enabled", "false")');
  });

  it("uses a sticky centered desktop header and a dedicated mobile menu", () => {
    const css = read("client/src/index.css");
    const shell = read("client/src/components/SiteShell.tsx");

    expect(css).toMatch(/\.navbar \{ position: sticky; top: 0;/);
    expect(css).toContain("grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr)");
    expect(shell).toContain('aria-controls="mobile-navigation"');
    expect(shell).toContain('aria-expanded={open}');
  });

  it("publishes canonical crawl controls while excluding private and disabled routes", () => {
    const robots = read("client/public/robots.txt");
    const sitemap = read("client/public/sitemap.xml");
    const pageMeta = read("client/src/components/PageMeta.tsx");
    const gifts = read("client/src/pages/Gifts.tsx");

    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /maker-portal");
    expect(robots).not.toContain("Disallow: /gifts");
    expect(sitemap).toContain("https://cannerymarket.com/vendors");
    expect(sitemap).not.toContain("https://cannerymarket.com/gifts");
    expect(pageMeta).toContain('link[rel="canonical"]');
    expect(gifts).toContain('canonicalPath="/gifts" noIndex');
  });
});
