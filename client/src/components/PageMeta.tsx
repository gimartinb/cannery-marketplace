import { useEffect } from "react";

export default function PageMeta({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    document.title = `${title} | The Cannery Marketplace`;
    const tag = document.querySelector('meta[name="description"]');
    if (tag) tag.setAttribute("content", description);
  }, [title, description]);
  return null;
}
