import { ArrowRight, Clock3, MapPin, Navigation, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";
import { useSiteImage } from "@/lib/siteImages";
import { publishedVendorToView, type Vendor } from "@/lib/vendors";
import { trpc } from "@/lib/trpc";
import { Txt } from "@/lib/siteText";
import { StoreHoursList } from "@/components/StoreHours";
import { FeaturedReviews } from "@/components/Reviews";


const highlightTones = ["clay", "sun", "cafe"] as const;

export default function Home() {
  const featured = trpc.directory.featured.useQuery(undefined, { staleTime: 5 * 60_000 });
  const highlights = trpc.home.highlights.useQuery(undefined, { staleTime: 5 * 60_000 });
  const productHighlights = highlights.data || [];
  const featuredVendors = useMemo<Vendor[]>(() => (featured.data || []).map(publishedVendorToView), [featured.data]);
  const heroImage = useSiteImage("home-hero");
  const interiorImage = useSiteImage("marketplace-interior");

  // Structured data (LocalBusiness, WebSite) is written into the HTML by the Worker (worker/seo.ts).
  return <SiteShell>
    <PageMeta canonicalPath="/" title="Local makers and artisan goods in Gilroy" description="Discover local makers, artisan products, and the stories behind the work at The Cannery Marketplace in downtown Gilroy, California." image={heroImage.url} />
    <main>
      <section className="hero" aria-labelledby="home-title">
        <img className="hero-media" src={heroImage.url} alt={heroImage.alt} width="1600" height="900" fetchPriority="high" decoding="async" />
        <div className="hero-inner"><div className="hero-copy"><p className="eyebrow"><Txt k="home.hero.eyebrow" /></p><h1 className="display" id="home-title"><Txt k="home.hero.title" /></h1><p><Txt k="home.hero.body" /></p><div className="hero-actions"><Link href="/vendors" className="button-primary"><Txt k="home.hero.primary" /> <ArrowRight size={15} /></Link><Link href="/become-a-vendor" className="button-secondary"><Txt k="home.hero.secondary" /></Link></div></div><aside className="hero-card"><span className="card-kicker"><Txt k="home.hero.cardLabel" /></span><p><Txt k="home.hero.cardText" /></p><Link href="/vendors"><Sparkles size={14} /> <Txt k="home.hero.cardLink" /></Link></aside></div>
      </section>

      {featuredVendors.length > 0 && <section className="featured-makers-section home-maker-first" aria-labelledby="featured-makers-title"><div className="site-container"><div className="featured-makers-heading"><div><p className="eyebrow"><Sparkles size={14} /> <Txt k="home.featured.eyebrow" /></p><h2 className="display" id="featured-makers-title"><Txt k="home.featured.title" /></h2></div><Link className="text-link" href="/vendors"><Txt k="home.featured.link" /> <ArrowRight size={15} /></Link></div><div className="featured-makers-grid">{featuredVendors.map((vendor) => <article className="featured-maker-card" key={vendor.slug}><Link href={`/vendors/${vendor.slug}`} className={`featured-maker-image vendor-tone-${vendor.tone}`}><span className="placeholder-stamp">{vendor.spotlight === "popular" ? "Popular maker" : "Featured maker"}</span>{vendor.photoUrl ? <img className="vendor-photo" src={vendor.photoUrl} alt={`${vendor.name}, a ${vendor.category} maker at The Cannery Marketplace`} width="800" height="800" loading="lazy" decoding="async" /> : <span className="vendor-initials">{vendor.initials}</span>}<span className="sr-only">View {vendor.name} maker profile</span></Link><div className="featured-maker-copy"><span>{vendor.category}</span><h3><Link href={`/vendors/${vendor.slug}`}>{vendor.name}</Link></h3><p>{vendor.bio}</p><Link className="text-link" href={`/vendors/${vendor.slug}`}>Read their story <ArrowRight size={14} /></Link></div></article>)}</div></div></section>}

      {productHighlights.length > 0 && <section className="maker-products-section" aria-labelledby="maker-products-title"><div className="site-container"><div className="maker-products-heading"><div><p className="eyebrow"><Txt k="home.products.eyebrow" /></p><h2 className="display" id="maker-products-title"><Txt k="home.products.title" /></h2></div><p><Txt k="home.products.body" /></p></div><div className="maker-product-grid">{productHighlights.map((product, index) => { const inner = <>{product.imageUrl && <img className="maker-product-photo" src={product.imageUrl} alt="" loading="lazy" decoding="async" />}<span className="maker-product-category">{product.category}</span><h3>{product.title}</h3><p>{product.description}</p>{product.makerSlug && product.makerName && <strong>{product.makerName} <ArrowRight size={14} /></strong>}</>; return <article className={`maker-product-card maker-product-${highlightTones[index % highlightTones.length]}${product.imageUrl ? " has-photo" : ""}`} key={product.id}>{product.makerSlug ? <Link href={`/vendors/${product.makerSlug}`}>{inner}</Link> : <div className="maker-product-body">{inner}</div>}</article>; })}</div></div></section>}

      <FeaturedReviews />

      <section className="community-creed" aria-labelledby="community-title"><div className="site-container community-creed-grid"><div><p className="eyebrow"><Txt k="home.community.eyebrow" /></p><h2 className="display" id="community-title"><Txt k="home.community.title" /></h2></div><div className="community-creed-copy"><p className="body-large"><Txt k="home.community.body" /></p><div className="community-values"><span><Txt k="home.community.value1" /></span><span><Txt k="home.community.value2" /></span><span><Txt k="home.community.value3" /></span></div></div></div></section>

      <section className="intro-section"><div className="site-container intro-grid"><div><p className="eyebrow"><Txt k="home.intro.eyebrow" /></p><h2 className="display"><Txt k="home.intro.title" /></h2></div><div className="intro-copy"><p className="body-large"><Txt k="home.intro.body" /></p><Link className="text-link" href="/vendors"><Txt k="home.intro.link" /> <ArrowRight size={15} /></Link></div></div></section>

      <section className="features-section" aria-label="Ways to discover local makers"><div className="site-container feature-grid"><article className="feature"><span className="feature-number">01</span><h3><Txt k="home.feature1.title" /></h3><p><Txt k="home.feature1.body" /></p></article><article className="feature"><span className="feature-number">02</span><h3><Txt k="home.feature2.title" /></h3><p><Txt k="home.feature2.body" /></p></article><article className="feature"><span className="feature-number">03</span><h3><Txt k="home.feature3.title" /></h3><p><Txt k="home.feature3.body" /></p></article></div></section>

      <section className="image-story"><div className="site-container image-story-grid"><div className="image-frame"><img src={interiorImage.url} alt={interiorImage.alt} width="704" height="396" loading="lazy" decoding="async" /><span className="image-caption">{interiorImage.caption}</span></div><div className="image-story-copy"><p className="eyebrow"><Txt k="home.story.eyebrow" /></p><h2 className="display"><Txt k="home.story.title" /></h2><p className="body-large"><Txt k="home.story.body" /></p><Link className="text-link" href="/vendors"><Txt k="home.story.link" /> <ArrowRight size={15} /></Link></div></div></section>

      <section className="home-visit-compact" id="visit" aria-labelledby="visit-title"><div className="site-container home-visit-compact-grid"><div className="compact-visit-intro"><p className="eyebrow"><Txt k="home.visit.eyebrow" /></p><h2 className="display" id="visit-title"><Txt k="home.visit.title" /></h2><p><MapPin size={16} /> <Txt k="shared.business.addressLine1" />, <Txt k="shared.business.addressLine2" /></p><a className="text-link" href="https://maps.google.com/?q=7488+Monterey+Road+Gilroy+CA+95020" target="_blank" rel="noreferrer"><Txt k="home.visit.directions" /> <Navigation size={14} /></a></div><StoreHoursList /><div className="compact-map"><iframe title="Map preview of The Cannery Marketplace at 7488 Monterey Road in Gilroy" src="https://maps.google.com/maps?hl=en&q=7488+Monterey+Road+Gilroy+CA+95020&z=15&output=embed" width="360" height="220" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div></div></section>
    </main>
  </SiteShell>;
}
