import { ArrowRight, Check, ExternalLink, Gift, Loader2, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";
import { Txt, useOwnerPreview } from "@/lib/siteText";
import { trpc } from "@/lib/trpc";

const TONES = ["sage", "sun", "clay"] as const;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");

/** Shown while gift boxes are turned off (owners still see the real page in Preview). */
export function GiftsUnavailable({ path }: { path: string }) {
  return <SiteShell><PageMeta canonicalPath={path} noIndex title="Gift boxes unavailable" description="The Cannery Marketplace gift box catalog is currently unavailable." /><main><section className="page-hero gift-hero"><div className="site-container page-hero-content"><p className="eyebrow"><Txt k="gifts.hero.eyebrow" /></p><h1 className="display"><Txt k="gifts.off.title" /></h1><p><Txt k="gifts.off.body" /></p><Link className="button-primary" href="/vendors">Explore local makers <ArrowRight size={15} /></Link></div></section></main></SiteShell>;
}

export default function Gifts() {
  const ownerPreview = useOwnerPreview();
  const publicCatalog = trpc.gifts.catalog.useQuery(undefined, { enabled: !ownerPreview, staleTime: 60_000 });
  // Owners previewing a hidden catalog see every active box from the owner endpoint.
  const ownerBoxes = trpc.adminPortal.giftBoxes.useQuery(undefined, { enabled: ownerPreview });
  if (!ownerPreview && publicCatalog.isLoading) return <SiteShell><main className="route-loading"><Loader2 className="animate-spin" /></main></SiteShell>;
  if (!ownerPreview && !publicCatalog.data?.enabled) return <GiftsUnavailable path="/gifts" />;

  const settings = ownerBoxes.data?.settings;
  const boxes = ownerPreview
    ? (ownerBoxes.data?.boxes ?? []).filter((box) => box.active && !box.corporateOnly).map((box) => ({ slug: box.slug, name: box.name, price: box.price, description: box.description, details: box.details, imageUrl: box.imageUrl, checkoutUrl: settings?.provider === "none" ? null : box.checkoutUrl }))
    : publicCatalog.data?.boxes ?? [];
  const providerName = ownerPreview ? (settings?.provider === "none" ? "" : settings?.providerName || (settings?.provider.startsWith("square") ? "Square" : "")) : publicCatalog.data?.providerName;
  const pickupNote = ownerPreview ? settings?.pickupNote : publicCatalog.data?.pickupNote;

  return (
    <SiteShell>
      <PageMeta canonicalPath="/gifts" title="Gift boxes from local Gilroy makers" description="Shop gift boxes featuring handcrafted goods from makers at The Cannery Marketplace in Gilroy, California." />
      <main>
        <section className="page-hero gift-hero">
          <div className="site-container page-hero-content">
            <p className="eyebrow"><Txt k="gifts.hero.eyebrow" /></p>
            <h1 className="display"><Txt k="gifts.hero.title" /></h1>
            <p><Txt k="gifts.hero.body" /></p>
          </div>
        </section>

        <section className="gift-section">
          <div className="site-container">
            <div className="gift-section-heading"><div><p className="eyebrow"><Txt k="gifts.catalog.eyebrow" /></p><h2 className="display"><Txt k="gifts.catalog.title" /></h2></div></div>
            {boxes.length ? <div className="gift-grid">
              {boxes.map((box, index) => (
                <article className="gift-card" key={box.slug}>
                  <div className={`gift-placeholder gift-tone-${TONES[index % TONES.length]}`}>{box.imageUrl ? <img className="gift-photo" src={box.imageUrl} alt={box.name} loading="lazy" decoding="async" /> : <><Gift size={24} /><span className="gift-initials">{initials(box.name)}</span></>}</div>
                  <div className="gift-card-copy">
                    <div className="gift-card-top"><h3>{box.name}</h3><strong>{box.price}</strong></div>
                    <p>{box.description}</p>
                    {box.details && <span className="gift-details">{box.details}</span>}
                    {box.checkoutUrl
                      ? <a className="button-primary gift-button" href={box.checkoutUrl} target="_blank" rel="noopener noreferrer"><Txt k="gifts.catalog.buy" /> <ExternalLink size={14} /></a>
                      : <Link className="button-plain gift-button" href={`/contact`}><Txt k="gifts.catalog.ask" /> <ArrowRight size={15} /></Link>}
                  </div>
                </article>
              ))}
            </div> : <div className="directory-empty"><Gift size={19} /><h3>New gift boxes are on the way.</h3><p>Ask us about a custom box in the meantime.</p></div>}
            <div className="checkout-note"><div className="checkout-note-icon"><ShieldCheck size={20} /></div><div><strong><Txt k="gifts.checkout.title" />{providerName ? ` with ${providerName}` : ""}</strong><p><Txt k="gifts.checkout.body" />{pickupNote ? ` ${pickupNote}` : ""}</p></div></div>
          </div>
        </section>

        <section className="gift-how-it-works"><div className="site-container gift-how-grid"><div><p className="eyebrow"><Txt k="gifts.business.eyebrow" /></p><h2 className="display"><Txt k="gifts.business.title" /></h2><p className="body-large"><Txt k="gifts.business.body" /></p><Link className="button-plain" href="/request-a-quote"><Txt k="gifts.business.button" /> <ArrowRight size={15} /></Link></div><div className="gift-steps">{[1, 2, 3].map((n) => <div key={n}><Check size={16} /><span><Txt k={`gifts.business.item${n}`} /></span></div>)}</div></div></section>
      </main>
    </SiteShell>
  );
}
