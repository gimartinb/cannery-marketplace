import { useEffect } from "react";
import { readSiteImages } from "@/lib/siteImages";

export default function PageMeta({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    const fullTitle = `${title} | The Cannery Marketplace`;
    document.title = fullTitle;
    const image = readSiteImages().find((item) => item.id === "social-sharing")?.url;
    const setMeta = (selector: string, attribute: "name" | "property", key: string, content: string) => {
      let tag = document.querySelector<HTMLMetaElement>(selector);
      if (!tag) { tag = document.createElement("meta"); tag.setAttribute(attribute, key); document.head.appendChild(tag); }
      tag.setAttribute("content", content);
    };
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:type"]', "property", "og:type", "website");
    if (image) setMeta('meta[property="og:image"]', "property", "og:image", image);
  }, [title, description]);
  return null;
}
