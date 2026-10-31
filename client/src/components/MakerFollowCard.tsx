import { Facebook, Instagram, Music2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Txt } from "@/lib/siteText";

type Links = { instagramUrl?: string; facebookUrl?: string; tiktokUrl?: string };
const SEEN_KEY = "cannery:follow-card:";

/**
 * A small card that slides up once the visitor has scrolled halfway down a maker page,
 * asking them to follow that maker. Shown once per maker per device; easy to close;
 * never covers the page (so it stays friendly on phones and for search engines).
 */
export default function MakerFollowCard({ slug, name, links }: { slug: string; name: string; links: Links }) {
  const buttons = [
    { label: "Instagram", url: links.instagramUrl, icon: Instagram },
    { label: "Facebook", url: links.facebookUrl, icon: Facebook },
    { label: "TikTok", url: links.tiktokUrl, icon: Music2 },
  ].filter((item) => item.url);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!buttons.length) return;
    let seen = false;
    try { seen = window.localStorage.getItem(SEEN_KEY + slug) === "yes"; } catch { /* private window */ }
    if (seen) return;
    const check = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0 || window.scrollY / scrollable >= 0.5) { setOpen(true); window.removeEventListener("scroll", check); }
    };
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [slug, buttons.length]);

  function close() {
    setOpen(false);
    try { window.localStorage.setItem(SEEN_KEY + slug, "yes"); } catch { /* private window */ }
  }

  if (!open) return null;
  return <aside className="maker-follow-card" role="dialog" aria-label={`Follow ${name}`}>
    <button className="maker-follow-close" type="button" aria-label="Close" onClick={close}><X size={16} /></button>
    <p className="eyebrow"><Txt k="profile.followCard.eyebrow" /></p>
    <h2 className="display"><Txt k="profile.follow.title" vars={{ business: name, maker: name }} /></h2>
    <p><Txt k="profile.followCard.body" vars={{ business: name, maker: name }} /></p>
    <div className="maker-follow-buttons">{buttons.map(({ label, url, icon: Icon }) => <a key={label} className={`follow-button follow-${label.toLowerCase()}`} href={url} target="_blank" rel="noopener noreferrer" onClick={close}><Icon size={15} /> Follow on {label}</a>)}</div>
  </aside>;
}
