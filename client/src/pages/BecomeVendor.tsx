import { ArrowRight, Check, ClipboardList, MessageCircle, Sparkles, Store } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";
import { Link } from "wouter";
import { Txt } from "@/lib/siteText";

// The maker application now lives on this site (/apply) instead of Google Forms.
const applicationUrl = "/apply";

const onboardingSteps = [
  { number: "01", icon: ClipboardList, key: "step1" },
  { number: "02", icon: MessageCircle, key: "step2" },
  { number: "03", icon: Store, key: "step3" },
  { number: "04", icon: Sparkles, key: "step4" },
];

export default function BecomeVendor() {
  return <SiteShell><PageMeta canonicalPath="/become-a-vendor" title="Become a maker at The Cannery Marketplace" description="Apply to become a vendor at The Cannery Marketplace in Gilroy and follow a simple onboarding process for local makers and artisans." /><main>
    <section className="page-hero vendor-onboarding-hero"><div className="site-container page-hero-content"><p className="eyebrow"><Txt k="become.hero.eyebrow" /></p><h1 className="display"><Txt k="become.hero.title" /></h1><p><Txt k="become.hero.body" /></p><div className="hero-actions"><a className="button-primary" href={applicationUrl}><Txt k="become.hero.primary" /> <ArrowRight size={14} /></a><a className="button-plain" href="/maker-portal"><Txt k="become.hero.portal" /> <ArrowRight size={15} /></a><a className="button-plain" href="#how-it-works"><Txt k="become.hero.how" /> <ArrowRight size={15} /></a></div></div></section>
    <section className="vendor-intro"><div className="site-container vendor-intro-grid"><div><p className="eyebrow"><Txt k="become.intro.eyebrow" /></p><h2 className="display"><Txt k="become.intro.title" /></h2><p className="body-large"><Txt k="become.intro.body" /></p></div><aside className="vendor-panel"><p className="eyebrow"><Txt k="become.panel.eyebrow" /></p><h3><Txt k="become.panel.title" /></h3><p><Txt k="become.panel.body" /></p><a className="button-primary" href={applicationUrl}><Txt k="become.panel.button" /> <ArrowRight size={14} /></a><small><Txt k="become.panel.note" /></small></aside></div></section>
    <section className="vendor-process" id="how-it-works"><div className="site-container"><div className="vendor-process-heading"><div><p className="eyebrow"><Txt k="become.how.eyebrow" /></p><h2 className="display"><Txt k="become.how.title" /></h2></div><p><Txt k="become.how.body" /></p></div><div className="vendor-process-grid">{onboardingSteps.map((step) => { const Icon = step.icon; return <article className="vendor-process-card" key={step.number}><div className="vendor-process-top"><span>{step.number}</span><Icon size={20} /></div><h3><Txt k={`become.${step.key}.title`} /></h3><p><Txt k={`become.${step.key}.body`} /></p></article>; })}</div></div></section>
    <section className="vendor-prep"><div className="site-container vendor-prep-grid"><div><p className="eyebrow"><Txt k="become.prep.eyebrow" /></p><h2 className="display"><Txt k="become.prep.title" /></h2><p className="body-large"><Txt k="become.prep.body" /></p></div><div className="vendor-checklist"><p><Txt k="become.prep.listTitle" /></p>{[1, 2, 3, 4, 5].map((n) => <div key={n}><Check size={15} /><span><Txt k={`become.prep.item${n}`} /></span></div>)}</div></div></section>
    <section className="vendor-faq"><div className="site-container vendor-faq-grid"><div><p className="eyebrow"><Txt k="become.faq.eyebrow" /></p><h2 className="display"><Txt k="become.faq.title" /></h2></div><div><p><strong><Txt k="become.faq.q1" /></strong><br /><Txt k="become.faq.a1" /></p><p><strong><Txt k="become.faq.q2" /></strong><br /><Txt k="become.faq.a2" /></p><p><strong><Txt k="become.faq.q3" /></strong><br /><Txt k="become.faq.a3" /> <a className="text-link" href="/contact"><Txt k="become.faq.contact" /> <ArrowRight size={15} /></a></p></div></div></section>
    <section className="cta-band"><div className="site-container cta-band-grid"><div><p className="eyebrow"><Txt k="become.cta.eyebrow" /></p><h2 className="display"><Txt k="become.cta.title" /></h2></div><a href={applicationUrl} className="button-secondary"><Txt k="become.cta.button" /> <ArrowRight size={14} /></a></div></section>
  </main></SiteShell>;
}
