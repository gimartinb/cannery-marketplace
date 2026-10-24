import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";
import { useSiteImage } from "@/lib/siteImages";
import { trpc } from "@/lib/trpc";
import { Txt } from "@/lib/siteText";

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
            <p className="eyebrow"><Txt k="about.hero.eyebrow" /></p>
            <h1 className="display"><Txt k="about.hero.title" /></h1>
            <p><Txt k="about.hero.body" /></p>
          </div>
        </section>

        <section className="about-story">
          <div className="site-container about-story-grid">
            <div><p className="eyebrow"><Txt k="about.story.eyebrow" /></p><h2 className="display"><Txt k="about.story.title" /></h2></div>
            <div className="about-story-copy">
              <p className="body-large"><Txt k="about.story.body1" /></p>
              <p className="body-large"><Txt k="about.story.body2" /></p>
              <blockquote className="quote-block"><Txt k="about.story.quote" /></blockquote>
            </div>
          </div>
          <div className="site-container about-image"><img src={aboutImage?.url} alt={aboutImage?.alt} width="348" height="348" loading="lazy" decoding="async" /></div>
        </section>

        {photos.length > 0 && <section className="about-gallery" aria-labelledby="about-gallery-title">
          <div className="site-container">
            <p className="eyebrow"><Txt k="about.gallery.eyebrow" /></p>
            <h2 className="display" id="about-gallery-title"><Txt k="about.gallery.title" /></h2>
            <div className="about-gallery-grid">{photos.map((photo) => <figure key={photo.id}><img src={photo.url} alt={photo.alt} loading="lazy" decoding="async" />{photo.caption && <figcaption>{photo.caption}</figcaption>}</figure>)}</div>
          </div>
        </section>}

        <section className="cta-band">
          <div className="site-container cta-band-grid">
            <div><p className="eyebrow"><Txt k="about.cta.eyebrow" /></p><h2 className="display"><Txt k="about.cta.title" /></h2></div>
            <Link href="/become-a-vendor" className="button-secondary"><Txt k="about.cta.button" /> <ArrowRight size={15} /></Link>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
