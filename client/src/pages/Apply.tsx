import { Check } from "lucide-react";
import ApplicationForm from "@/components/ApplicationForm";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";

const LOOKING_FOR = [
  "High quality goods designed or made in Gilroy or nearby",
  "Beautiful branding",
  "Retail ready price points and packaging",
  "Can meet replenishment demand",
  "Unique, sustainable, and eco conscious",
];

export default function Apply() {
  return <SiteShell>
    <PageMeta canonicalPath="/apply" title="Vendor interest form" description="Tell The Cannery Marketplace about your handmade products. Our team reviews every vendor interest form from Gilroy area makers and artisans." />
    <main>
      <section className="page-hero"><div className="site-container page-hero-content"><p className="eyebrow">For makers and artisans</p><h1 className="display">Tell us about your <em>work.</em></h1><p>Thank you for your interest in The Cannery Marketplace. Share a little about your business and our team will be in touch if it is a good fit.</p></div></section>
      <section className="contact-section"><div className="site-container contact-grid">
        <div className="contact-intro">
          <p className="eyebrow">A curated makers market</p>
          <h2 className="display">We look for the people who <em>make it.</em></h2>
          <p className="body-large">You, the artist or maker, create the products yourself rather than reselling them. Completing this form does not guarantee a space, and every submission is reviewed by our team.</p>
          <ul className="apply-criteria">{LOOKING_FOR.map((item) => <li key={item}><Check size={15} /> {item}</li>)}</ul>
        </div>
        <ApplicationForm />
      </div></section>
    </main>
  </SiteShell>;
}
