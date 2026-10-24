import { Check } from "lucide-react";
import ApplicationForm from "@/components/ApplicationForm";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";
import { Txt } from "@/lib/siteText";

export default function Apply() {
  return <SiteShell>
    <PageMeta canonicalPath="/apply" title="Maker application" description="Apply to become a maker at The Cannery Marketplace. Our team reviews every application from Gilroy area makers and artisans." />
    <main>
      <section className="page-hero"><div className="site-container page-hero-content"><p className="eyebrow"><Txt k="apply.hero.eyebrow" /></p><h1 className="display"><Txt k="apply.hero.title" /></h1><p><Txt k="apply.hero.body" /></p></div></section>
      <section className="contact-section"><div className="site-container contact-grid">
        <div className="contact-intro">
          <p className="eyebrow"><Txt k="apply.intro.eyebrow" /></p>
          <h2 className="display"><Txt k="apply.intro.title" /></h2>
          <p className="body-large"><Txt k="apply.intro.body" /></p>
          <p className="apply-note"><Txt k="apply.intro.curated" /></p>
          <ul className="apply-criteria">{[1, 2, 3, 4, 5].map((n) => <li key={n}><Check size={15} /> <span><Txt k={`apply.criteria${n}`} /></span></li>)}</ul>
          <p className="apply-note"><Txt k="apply.intro.closing" /></p>
        </div>
        <ApplicationForm />
      </div></section>
    </main>
  </SiteShell>;
}
