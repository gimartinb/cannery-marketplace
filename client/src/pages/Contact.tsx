import { ArrowRight } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";
import ContactForm from "@/components/ContactForm";
import { StoreHoursList } from "@/components/StoreHours";
import { Txt, usePlainText } from "@/lib/siteText";

export default function Contact() {
  const plain = usePlainText();
  const phone = plain("shared.business.phone");
  const email = plain("shared.business.email");
  return (
    <SiteShell>
      <PageMeta canonicalPath="/contact" title="Contact and visit The Cannery Marketplace in Gilroy" description="Contact The Cannery Marketplace or visit us at 7488 Monterey Road in downtown Gilroy, California." />
      <main>
        <section className="page-hero"><div className="site-container page-hero-content"><p className="eyebrow"><Txt k="contact.hero.eyebrow" /></p><h1 className="display"><Txt k="contact.hero.title" /></h1><p><Txt k="contact.hero.body" /></p></div></section>
        <section className="contact-section"><div className="site-container contact-grid"><div className="contact-intro"><p className="eyebrow"><Txt k="contact.intro.eyebrow" /></p><h2 className="display"><Txt k="contact.intro.title" /></h2><p className="body-large"><Txt k="contact.intro.body" /></p><div className="contact-list"><div className="contact-item"><span>Address</span><p><Txt k="shared.business.addressLine1" /><br /><Txt k="shared.business.addressLine2" /></p></div><div className="contact-item" id="hours"><span>Hours</span><StoreHoursList className="compact-hours contact-hours" /></div><div className="contact-item"><span>Call</span><a href={`tel:+1${phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")}`}>{phone}</a></div><div className="contact-item"><span>Email</span><a href={`mailto:${email}`}>{email}</a></div></div></div><ContactForm /></div></section>
        <section className="map-section" aria-labelledby="map-title"><div className="site-container"><div className="map-heading"><div><p className="eyebrow"><Txt k="contact.map.eyebrow" /></p><h2 className="display" id="map-title"><Txt k="contact.map.title" /></h2></div><p><Txt k="contact.map.body" /></p></div><div className="map-frame"><iframe title="Google map showing The Cannery Marketplace at 7488 Monterey Road, Gilroy" src="https://maps.google.com/maps?hl=en&q=7488+Monterey+Road+Gilroy+CA+95020&z=15&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div><div className="map-actions"><p><strong><Txt k="shared.business.addressLine1" /></strong><br /><Txt k="shared.business.addressLine2" /></p><a className="button-primary" href="https://www.google.com/maps/dir/?api=1&destination=7488+Monterey+Road+Gilroy+CA+95020" target="_blank" rel="noreferrer"><Txt k="contact.map.button" /> <ArrowRight size={15} /></a></div></div></section>
      </main>
    </SiteShell>
  );
}
