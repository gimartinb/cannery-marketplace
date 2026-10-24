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
    <PageMeta canonicalPath="/apply" title="Maker application" description="Apply to become a maker at The Cannery Marketplace. Our team reviews every application from Gilroy area makers and artisans." />
    <main>
      <section className="page-hero"><div className="site-container page-hero-content"><p className="eyebrow">For makers and artisans</p><h1 className="display">Tell us about your <em>work.</em></h1><p>Thank you for your interest in The Cannery Marketplace. If you are interested in becoming a member of the marketplace, please fill out the application below.</p></div></section>
      <section className="contact-section"><div className="site-container contact-grid">
        <div className="contact-intro">
          <p className="eyebrow">A curated makers market</p>
          <h2 className="display">We look for the people who <em>make it.</em></h2>
          <p className="body-large">Please note that this is an application. Completing it does not guarantee a space in The Cannery Marketplace. Our team reviews the information you provide and will contact you about your product if it appears to be a good fit for our store.</p>
          <p className="apply-note">We are a “curated” makers market. This means you (the artist, maker, etc.) are the one making and creating your products rather than just “selling” them. We look for:</p>
          <ul className="apply-criteria">{LOOKING_FOR.map((item) => <li key={item}><Check size={15} /> {item}</li>)}</ul>
          <p className="apply-note">Log your interest in working with us using the application form.</p>
        </div>
        <ApplicationForm />
      </div></section>
    </main>
  </SiteShell>;
}
