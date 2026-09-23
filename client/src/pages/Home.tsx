import { ArrowRight, Clock3, MapPin, Navigation, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";
import { defaultSiteImages } from "@/lib/siteImages";
import { defaultVendors, publishedVendorToView, type Vendor } from "@/lib/vendors";
import { trpc } from "@/lib/trpc";

const hours = [
  ["Monday", "Closed"], ["Tuesday", "Closed"], ["Wednesday", "11 AM–6 PM"],
  ["Thursday", "11 AM–7 PM"], ["Friday", "11 AM–7 PM"],
  ["Saturday", "11 AM–7 PM"], ["Sunday", "11 AM–6 PM"],
];

const productHighlights = [
  { maker: "Juniper Clay Studio", slug: "juniper-clay-studio", category: "Ceramics", name: "Hand-thrown pottery", description: "Small-batch vessels shaped for everyday rituals.", tone: "clay" },
  { maker: "Golden Hour Goods", slug: "golden-hour-goods", category: "Home & Gifts", name: "Thoughtful home goods", description: "Useful, warm pieces inspired by California light.", tone: "sun" },
  { maker: "VIVRA CAFÉ", slug: "vivra-cafe", category: "Coffee & Bakery", name: "Scratch-made café favorites", description: "Mexican-inspired drinks and artisan bakery treats.", tone: "cafe" },
];

export default function Home() {
  const directory = trpc.directory.list.useQuery();
  const vendors = useMemo<Vendor[]>(() => {
    const approved = (directory.data || []).map(publishedVendorToView);
    const approvedSlugs = new Set(approved.map((vendor) => vendor.slug));
    return [...approved, ...defaultVendors.filter((vendor) => !approvedSlugs.has(vendor.slug))];
  }, [directory.data]);
  const heroImage = defaultSiteImages.find((image) => image.id === "home-hero")!;
  const interiorImage = defaultSiteImages.find((image) => image.id === "marketplace-interior")!;
  const featuredVendors = useMemo(() => vendors.filter((vendor) => vendor.active && vendor.featured).sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99)).slice(0, 3), [vendors]);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": "https://cannerymarket.com/#marketplace",
        name: "The Cannery Marketplace",
        description: "A Gilroy marketplace where shoppers discover local makers, artisan products, and the stories behind the work.",
        image: "https://cannerymarket.com/manus-storage/cannery-interior_1da69d7b.jpg",
        url: "https://cannerymarket.com/",
        telephone: "+1-408-337-1620",
        address: { "@type": "PostalAddress", streetAddress: "7488 Monterey Road", addressLocality: "Gilroy", addressRegion: "CA", postalCode: "95020", addressCountry: "US" },
        geo: { "@type": "GeoCoordinates", latitude: 37.0079724, longitude: -121.568909 },
        openingHoursSpecification: [
          { "@type": "OpeningHoursSpecification", dayOfWeek: "https://schema.org/Wednesday", opens: "11:00", closes: "18:00" },
          { "@type": "OpeningHoursSpecification", dayOfWeek: ["https://schema.org/Thursday", "https://schema.org/Friday", "https://schema.org/Saturday"], opens: "11:00", closes: "19:00" },
          { "@type": "OpeningHoursSpecification", dayOfWeek: "https://schema.org/Sunday", opens: "11:00", closes: "18:00" },
        ],
      },
      {
        "@type": "ItemList",
        name: "Featured makers at The Cannery Marketplace",
        itemListElement: featuredVendors.map((vendor, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `https://cannerymarket.com/vendors/${vendor.slug}`,
          item: { "@type": "Organization", name: vendor.name, description: vendor.bio, knowsAbout: vendor.category },
        })),
      },
      ...productHighlights.map((product) => ({
        "@type": "Product",
        name: product.name,
        description: product.description,
        category: product.category,
        brand: { "@type": "Brand", name: product.maker },
        url: `https://cannerymarket.com/vendors/${product.slug}`,
      })),
    ],
  };

  return <SiteShell>
    <PageMeta canonicalPath="/" title="Local makers and artisan goods in Gilroy" description="Discover local makers, artisan products, and the stories behind the work at The Cannery Marketplace in downtown Gilroy, California." image={heroImage.url} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <main>
      <section className="hero" aria-labelledby="home-title">
        <img className="hero-media" src={heroImage.url} alt={heroImage.alt} width="1600" height="900" fetchPriority="high" decoding="async" />
        <div className="hero-inner"><div className="hero-copy"><p className="eyebrow">Gilroy, California</p><h1 className="display" id="home-title">Made here. <em>Found by you.</em></h1><p>Meet the people, products, and stories shaping Gilroy’s local maker community.</p><div className="hero-actions"><Link href="/vendors" className="button-primary">Explore the makers <ArrowRight size={15} /></Link><Link href="/become-a-vendor" className="button-secondary">Become a maker</Link></div></div><aside className="hero-card"><span className="card-kicker">Start with the story</span><p>Local makers.<br />Distinctive work.</p><Link href="/vendors"><Sparkles size={14} /> Browse every maker</Link></aside></div>
      </section>

      {featuredVendors.length > 0 && <section className="featured-makers-section home-maker-first" aria-labelledby="featured-makers-title"><div className="site-container"><div className="featured-makers-heading"><div><p className="eyebrow"><Sparkles size={14} /> Makers to discover</p><h2 className="display" id="featured-makers-title">Meet the people behind the <em>work.</em></h2></div><Link className="text-link" href="/vendors">See all makers <ArrowRight size={15} /></Link></div><div className="featured-makers-grid">{featuredVendors.map((vendor) => <article className="featured-maker-card" key={vendor.slug}><Link href={`/vendors/${vendor.slug}`} className={`featured-maker-image vendor-tone-${vendor.tone}`}><span className="placeholder-stamp">{vendor.spotlight === "popular" ? "Popular maker" : "Featured maker"}</span>{vendor.photoUrl ? <img className="vendor-photo" src={vendor.photoUrl} alt={`${vendor.name}, a ${vendor.category} maker at The Cannery Marketplace`} width="800" height="800" loading="lazy" decoding="async" /> : <span className="vendor-initials">{vendor.initials}</span>}<span className="sr-only">View {vendor.name} maker profile</span></Link><div className="featured-maker-copy"><span>{vendor.category}</span><h3><Link href={`/vendors/${vendor.slug}`}>{vendor.name}</Link></h3><p>{vendor.bio}</p><Link className="text-link" href={`/vendors/${vendor.slug}`}>Read their story <ArrowRight size={14} /></Link></div></article>)}</div></div></section>}

      <section className="maker-products-section" aria-labelledby="maker-products-title"><div className="site-container"><div className="maker-products-heading"><div><p className="eyebrow">Made by local hands</p><h2 className="display" id="maker-products-title">Find something with a <em>story.</em></h2></div><p>Explore a few of the goods and flavors represented by makers at The Cannery, then step into each profile to learn who made them.</p></div><div className="maker-product-grid">{productHighlights.map((product) => <article className={`maker-product-card maker-product-${product.tone}`} key={product.name}><Link href={`/vendors/${product.slug}`}><span className="maker-product-category">{product.category}</span><h3>{product.name}</h3><p>{product.description}</p><strong>{product.maker} <ArrowRight size={14} /></strong></Link></article>)}</div></div></section>

      <section className="community-creed" aria-labelledby="community-title"><div className="site-container community-creed-grid"><div><p className="eyebrow">A marketplace made by its community</p><h2 className="display" id="community-title">Made here. Backed here. <em>Built to last.</em></h2></div><div className="community-creed-copy"><p className="body-large">Gilroy is shaped by makers, growers, doers, and neighbors who choose local. Every purchase keeps storefronts full, skills in motion, and opportunity close to home.</p><div className="community-values"><span>Meet the person behind the work</span><span>Choose local goods with a story</span><span>Build a stronger downtown together</span></div></div></div></section>

      <section className="intro-section"><div className="site-container intro-grid"><div><p className="eyebrow">The Cannery Marketplace</p><h2 className="display">A home for <em>handcrafted</em> things.</h2></div><div className="intro-copy"><p className="body-large">The Cannery Marketplace gives local makers and artisans a dedicated place to share their work. Come for the maker stories, stay for the pleasure of discovering something distinctive and made close to home.</p><Link className="text-link" href="/vendors">Meet the local makers <ArrowRight size={15} /></Link></div></div></section>

      <section className="features-section" aria-label="Ways to discover local makers"><div className="site-container feature-grid"><article className="feature"><span className="feature-number">01</span><h3>Meet the maker</h3><p>Learn who made each piece and what inspires their work.</p></article><article className="feature"><span className="feature-number">02</span><h3>Explore the craft</h3><p>Browse ceramics, paper goods, woodworking, food, and more.</p></article><article className="feature"><span className="feature-number">03</span><h3>Find something lasting</h3><p>Take home thoughtful work with a local story behind it.</p></article></div></section>

      <section className="image-story"><div className="site-container image-story-grid"><div className="image-frame"><img src={interiorImage.url} alt={interiorImage.alt} width="704" height="396" loading="lazy" decoding="async" /><span className="image-caption">{interiorImage.caption}</span></div><div className="image-story-copy"><p className="eyebrow">Shop local, naturally</p><h2 className="display">A place to <em>wander</em> awhile.</h2><p className="body-large">Stop in when you are looking for something special, or simply because you would like to see what local hands have been making.</p><Link className="text-link" href="/vendors">Explore the maker directory <ArrowRight size={15} /></Link></div></div></section>

      <section className="home-visit-compact" id="visit" aria-labelledby="visit-title"><div className="site-container home-visit-compact-grid"><div className="compact-visit-intro"><p className="eyebrow">Plan your visit</p><h2 className="display" id="visit-title">Find us in <em>downtown Gilroy.</em></h2><p><MapPin size={16} /> 7488 Monterey Road, Gilroy, CA 95020</p><a className="text-link" href="https://maps.google.com/?q=7488+Monterey+Road+Gilroy+CA+95020" target="_blank" rel="noreferrer">Get directions <Navigation size={14} /></a></div><div className="compact-hours" aria-label="Business hours"><div><Clock3 size={16} /><strong>Operating hours</strong></div>{hours.map(([day, time]) => <p key={day}><span>{day}</span><strong>{time}</strong></p>)}</div><div className="compact-map"><iframe title="Map preview of The Cannery Marketplace at 7488 Monterey Road in Gilroy" src="https://maps.google.com/maps?hl=en&q=7488+Monterey+Road+Gilroy+CA+95020&z=15&output=embed" width="360" height="220" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div></div></section>
    </main>
  </SiteShell>;
}
