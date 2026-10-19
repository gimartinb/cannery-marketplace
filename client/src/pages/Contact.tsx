import { ArrowRight } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";
import ContactForm from "@/components/ContactForm";

export default function Contact() {
  return (
    <SiteShell>
      <PageMeta canonicalPath="/contact" title="Contact and visit The Cannery Marketplace in Gilroy" description="Contact The Cannery Marketplace or visit us at 7488 Monterey Road in downtown Gilroy, California." />
      <main>
        <section className="page-hero"><div className="site-container page-hero-content"><p className="eyebrow">Contact The Cannery Marketplace</p><h1 className="display">Looking for something <em>special?</em></h1><p>Find local makers, plan a visit to our Gilroy marketplace, or send the team a question.</p></div></section>
        <section className="contact-section"><div className="site-container contact-grid"><div className="contact-intro"><p className="eyebrow">Visit us in Gilroy</p><h2 className="display">We would love to <em>hear from you.</em></h2><p className="body-large">Reach us directly or use the form for general questions about the marketplace and its makers.</p><div className="contact-list"><div className="contact-item"><span>Address</span><p>7488 Monterey Road<br />Gilroy, California 95020</p></div><div className="contact-item"><span>Call</span><a href="tel:+14083371620">(408) 337-1620</a></div><div className="contact-item"><span>Email</span><a href="mailto:thecannerymarketplace@gmail.com">thecannerymarketplace@gmail.com</a></div></div></div><ContactForm /></div></section>
        <section className="map-section" aria-labelledby="map-title"><div className="site-container"><div className="map-heading"><div><p className="eyebrow">Find the marketplace</p><h2 className="display" id="map-title">Visit us on <em>Monterey Road.</em></h2></div><p>Stay on this site to see where The Cannery Marketplace is located in Gilroy.</p></div><div className="map-frame"><iframe title="Google map showing The Cannery Marketplace at 7488 Monterey Road, Gilroy" src="https://maps.google.com/maps?hl=en&q=7488+Monterey+Road+Gilroy+CA+95020&z=15&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div><div className="map-actions"><p><strong>7488 Monterey Road</strong><br />Gilroy, California 95020</p><a className="button-primary" href="https://www.google.com/maps/dir/?api=1&destination=7488+Monterey+Road+Gilroy+CA+95020" target="_blank" rel="noreferrer">Get Google Maps directions <ArrowRight size={15} /></a></div></div></section>
      </main>
    </SiteShell>
  );
}
