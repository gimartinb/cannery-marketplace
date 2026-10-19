import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";
import { useSiteImage } from "@/lib/siteImages";
import { trpc } from "@/lib/trpc";

export default function About() {
  const aboutImage = useSiteImage("about-display");
  const gallery = trpc.gallery.list.useQuery(undefined, { staleTime: 5 * 60_000 });
  const photos = gallery.data || [];
  return (
    <SiteShell>
      <PageMeta canonicalPath="/about" title="About our Gilroy artisan marketplace" description="Learn how The Cannery Marketplace gives Gilroy makers and artisans a welcoming place to share handcrafted work with the community." />
      <main>
        <section className="page-hero">
          <div className="site-container page-hero-content">
            <p className="eyebrow">About the marketplace</p>
            <h1 className="display">Created for the <em>makers</em> who make Gilroy shine.</h1>
            <p>The Cannery Marketplace brings together the pleasure of shopping local with a dedicated place for makers to share the work they care about.</p>
          </div>
        </section>

        <section className="about-story">
          <div className="site-container about-story-grid">
            <div><p className="eyebrow">Our purpose</p><h2 className="display">Retail with a <em>local heart.</em></h2></div>
            <div className="about-story-copy">
              <p className="body-large">The Cannery Marketplace in Gilroy is a dedicated space where local makers and artisans can showcase and sell their handcrafted products. It is designed to foster community and creativity while making room for the joy of a good find.</p>
              <p className="body-large">Makers can rent small or large shelves or spaces to display their crafts, creating a varied shopping experience that changes as new work arrives.</p>
              <blockquote className="quote-block">“A dedicated space where local makers and artisans can showcase and sell their handcrafted products.”</blockquote>
            </div>
          </div>
          <div className="site-container about-image"><img src={aboutImage?.url} alt={aboutImage?.alt} width="348" height="348" loading="lazy" decoding="async" /></div>
        </section>

        {photos.length > 0 && <section className="about-gallery" aria-labelledby="about-gallery-title">
          <div className="site-container">
            <p className="eyebrow">Inside the Cannery</p>
            <h2 className="display" id="about-gallery-title">A look <em>around.</em></h2>
            <div className="about-gallery-grid">{photos.map((photo) => <figure key={photo.id}><img src={photo.url} alt={photo.alt} loading="lazy" decoding="async" />{photo.caption && <figcaption>{photo.caption}</figcaption>}</figure>)}</div>
          </div>
        </section>}

        <section className="cta-band">
          <div className="site-container cta-band-grid">
            <div><p className="eyebrow">Share your craft</p><h2 className="display">Have something made to be discovered?</h2></div>
            <Link href="/become-a-vendor" className="button-secondary">Explore vendor space <ArrowRight size={15} /></Link>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
