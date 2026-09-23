import { ArrowRight, Check, Gift, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";
import { readGiftBoxes, type GiftBox } from "@/lib/giftBoxes";
import { trpc } from "@/lib/trpc";

export default function Gifts() {
  const [giftBoxes] = useState<GiftBox[]>(readGiftBoxes);
  const { data: settings } = trpc.settings.public.useQuery();
  if (settings?.giftBoxesEnabled === false) return <SiteShell><PageMeta canonicalPath="/gifts" noIndex title="Gift boxes unavailable" description="The Cannery Marketplace gift-box catalog is currently unavailable." /><main><section className="page-hero gift-hero"><div className="site-container page-hero-content"><p className="eyebrow">Gifting at The Cannery</p><h1 className="display">Gift boxes are <em>restocking.</em></h1><p>The catalog is currently unavailable. Please explore the local maker directory while this feature is paused.</p><Link className="button-primary" href="/vendors">Explore local makers <ArrowRight size={15} /></Link></div></section></main></SiteShell>;
  return (
    <SiteShell>
      <PageMeta canonicalPath="/gifts" title="Gift boxes from local Gilroy makers" description="Shop gift boxes featuring handcrafted goods from makers at The Cannery Marketplace in Gilroy, California." />
      <main>
        <section className="page-hero gift-hero">
          <div className="site-container page-hero-content">
            <p className="eyebrow">Send something made nearby</p>
            <h1 className="display">Gifts with a <em>local story.</em></h1>
            <p>Our gift boxes bring together thoughtful goods from the makers represented at The Cannery Marketplace. This preview shows the future catalog experience.</p>
          </div>
        </section>

        <section className="gift-section">
          <div className="site-container">
            <div className="gift-section-heading"><div><p className="eyebrow">Sample catalog</p><h2 className="display">A good reason to <em>send a box.</em></h2></div><span className="sample-badge">Preview pricing</span></div>
            <div className="gift-grid">
              {giftBoxes.filter((box) => box.active).map((box) => (
                <article className="gift-card" key={box.slug}>
                  <div className={`gift-placeholder gift-tone-${box.tone}`}>{box.photoUrl ? <img className="gift-photo" src={box.photoUrl} alt={`${box.name} product placeholder`} /> : <><Gift size={24} /><span className="gift-initials">{box.initials}</span><span>Authorized photo placeholder</span></>}</div>
                  <div className="gift-card-copy"><div className="gift-card-top"><h3>{box.name}</h3><strong>{box.price}</strong></div><p>{box.description}</p><span className="gift-details">{box.details}</span><button type="button" className="button-primary gift-button" disabled={!box.checkoutUrl}>{box.checkoutUrl ? "Buy this box" : "Checkout setup needed"} <ArrowRight size={15} /></button></div>
                </article>
              ))}
            </div>
            <div className="checkout-note"><div className="checkout-note-icon"><ShieldCheck size={20} /></div><div><strong>Hosted checkout is the plan.</strong><p>When the owner’s Stripe account is connected, each button will open a Stripe-hosted checkout page. Card details will not pass through this website. Products, prices, shipping rates, and tax settings will be managed in Stripe’s dashboard.</p></div></div>
          </div>
        </section>

        <section className="gift-how-it-works"><div className="site-container gift-how-grid"><div><p className="eyebrow">For business gifting</p><h2 className="display">Sending more than a few?</h2><p className="body-large">Corporate and bulk orders need a personal conversation. Tell us what you are planning and we will follow up with custom pricing and invoicing.</p><Link className="button-plain" href="/request-a-quote">Request a quote <ArrowRight size={15} /></Link></div><div className="gift-steps"><div><Check size={16} /><span>Personalized gift notes</span></div><div><Check size={16} /><span>Custom quantities and packaging</span></div><div><Check size={16} /><span>Invoice-based bulk orders</span></div></div></div></section>
      </main>
    </SiteShell>
  );
}
