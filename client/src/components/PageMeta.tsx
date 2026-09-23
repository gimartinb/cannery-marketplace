import { useEffect } from "react";
import { defaultSiteImages } from "@/lib/siteImages";

const SITE_URL = "https://cannerymarket.com";

type PageMetaProps = {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  noIndex?: boolean;
};

function absoluteUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

export default function PageMeta({ title, description, canonicalPath, image, noIndex = false }: PageMetaProps) {
  useEffect(() => {
    const fullTitle = title.includes("The Cannery Marketplace") ? title : `${title} | The Cannery Marketplace`;
    const path = canonicalPath ?? window.location.pathname;
    const canonicalUrl = `${SITE_URL}${path === "/" ? "/" : path.replace(/\/$/, "")}`;
    const socialImage = absoluteUrl(image || defaultSiteImages.find((item) => item.id === "social-sharing")?.url || "/manus-storage/cannery-interior_1da69d7b.jpg");

    document.title = fullTitle;

    const setMeta = (selector: string, attribute: "name" | "property", key: string, content: string) => {
      let tag = document.querySelector<HTMLMetaElement>(selector);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attribute, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[name="robots"]', "name", "robots", noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large");
    setMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:type"]', "property", "og:type", "website");
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMeta('meta[property="og:image"]', "property", "og:image", socialImage);
    setMeta('meta[property="og:image:alt"]', "property", "og:image:alt", "The Cannery Marketplace in Gilroy, California");
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", socialImage);
  }, [canonicalPath, description, image, noIndex, title]);

  return null;
}
