import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "wouter";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";

export default function Home() {
  return (
    <SiteShell>
      <PageMeta title="Gilroy's marketplace for local makers" description="Discover handcrafted products from local makers and artisans at The Cannery Marketplace in Gilroy, California." />
      <main>
        <section className="hero" aria-labelledby="home-title">
          <div className="hero-inner">
            <div className="hero-copy">
              <p className="eyebrow">Gilroy, California</p>
              <h1 className="display" id="home-title">Made here. <em>Found by you.</em></h1>
              <p>Discover the thoughtful, handcrafted work of the local makers who make our community one of a kind.</p>
              <div className="hero-actions">
                <Link href="/vendors" className="button-primary">Meet the makers <ArrowRight size={15} /></Link>
                <a href="#visit" className="button-secondary">Plan your visit</a>
              </div>
            </div>
            <aside className="hero-card">
              <span className="card-kicker">Find us in Gilroy</span>
              <p>7488 Monterey Road<br />Gilroy, CA 95020</p>
              <a href="https://maps.google.com/?q=7488+Monterey+Road+Gilroy+CA+95020" target="_blank" rel="noreferrer"><MapPin size={14} /> Get directions</a>
            </aside>
          </div>
        </section>

        <section className="intro-section">
          <div className="site-container intro-grid">
            <div>
              <p className="eyebrow">The Cannery Marketplace</p>
              <h2 className="display">A home for <em>handcrafted</em> things.</h2>
            </div>
            <div className="intro-copy">
              <p className="body-large">The Cannery Marketplace in Gilroy is a dedicated space where local makers and artisans can showcase and sell their handcrafted products. We are built for the pleasure of discovering something distinctive, made close to home.</p>
              <Link className="text-link" href="/vendors">Meet the local makers <ArrowRight size={15} /></Link>
            </div>
          </div>
        </section>

        <section className="features-section" aria-label="Marketplace qualities">
          <div className="site-container feature-grid">
            <article className="feature"><span className="feature-number">01</span><h3>Local hands</h3><p>Discover work made by people in and around our community.</p></article>
            <article className="feature"><span className="feature-number">02</span><h3>Made to keep</h3><p>Find thoughtful gifts, everyday treasures, and handcrafted pieces with a story.</p></article>
            <article className="feature"><span className="feature-number">03</span><h3>Room to grow</h3><p>Our flexible shelf and display spaces help makers share their work in a welcoming setting.</p></article>
          </div>
        </section>

        <section className="image-story">
          <div className="site-container image-story-grid">
            <div className="image-frame"><img src="/manus-storage/cannery-interior_1da69d7b.jpg" alt="Handcrafted goods displayed inside The Cannery Marketplace" /><span className="image-caption">Made for discovery</span></div>
            <div className="image-story-copy">
              <p className="eyebrow">Shop local, naturally</p>
              <h2 className="display">A place to <em>wander</em> awhile.</h2>
              <p className="body-large">Stop in when you are looking for something special, or simply because you would like to see what local hands have been making.</p>
              <Link className="text-link" href="/contact">Get in touch <ArrowRight size={15} /></Link>
            </div>
          </div>
        </section>

        <section className="visit-band" id="visit">
          <div className="site-container visit-grid">
            <div><p className="eyebrow">Visit the marketplace</p><h2 className="display">Your next favorite find is nearby.</h2></div>
            <div className="visit-details"><p>7488 Monterey Road<br />Gilroy, California 95020</p><a className="button-secondary" href="https://maps.google.com/?q=7488+Monterey+Road+Gilroy+CA+95020" target="_blank" rel="noreferrer">Map & directions <ArrowRight size={15} /></a></div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
