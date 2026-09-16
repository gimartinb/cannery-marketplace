import { ArrowRight, ExternalLink } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";

const applicationUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdyAfXeN1Y_vIga_U-fQWoe_Yj4eSp8pzTu4JsTkFW1exue7Q/viewform";

export default function BecomeVendor() {
  return (
    <SiteShell>
      <PageMeta title="Become a vendor" description="Apply to share handcrafted products at The Cannery Marketplace in Gilroy, California." />
      <main>
        <section className="page-hero">
          <div className="site-container page-hero-content">
            <p className="eyebrow">For local makers</p>
            <h1 className="display">Make room for your <em>work.</em></h1>
            <p>The Cannery Marketplace gives local makers and artisans a place to showcase and sell their handcrafted products in Gilroy.</p>
          </div>
        </section>

        <section className="vendor-intro">
          <div className="site-container vendor-intro-grid">
            <div>
              <p className="eyebrow">Showcase your craft</p>
              <h2 className="display">Your work belongs in a place built for <em>discovery.</em></h2>
              <p className="body-large">Our marketplace was designed to foster community and creativity. Makers can rent small or large shelves or spaces to display the crafts they make.</p>
            </div>
            <aside className="vendor-panel">
              <p className="eyebrow">Ready to apply?</p>
              <h3>Start with the vendor application.</h3>
              <p>The current application opens in a separate form and will guide you through the information the marketplace needs to review your request.</p>
              <a className="button-primary" href={applicationUrl} target="_blank" rel="noreferrer">Open application <ExternalLink size={14} /></a>
            </aside>
          </div>
        </section>

        <section className="vendor-notes">
          <div className="site-container vendor-notes-grid">
            <article className="vendor-note"><p className="eyebrow">01</p><h3>Handcrafted products</h3><p>The marketplace is dedicated to local makers and artisans sharing handcrafted work.</p></article>
            <article className="vendor-note"><p className="eyebrow">02</p><h3>Flexible display space</h3><p>Small and large shelves or spaces are available for displaying crafts.</p></article>
            <article className="vendor-note"><p className="eyebrow">03</p><h3>Questions first?</h3><p>If you would like to connect before applying, the marketplace is happy to hear from you.</p><a className="text-link" href="/contact">Contact the marketplace <ArrowRight size={15} /></a></article>
          </div>
        </section>

        <section className="cta-band">
          <div className="site-container cta-band-grid">
            <div><p className="eyebrow">Made something meaningful?</p><h2 className="display">Let the community find it.</h2></div>
            <a href={applicationUrl} target="_blank" rel="noreferrer" className="button-secondary">Become a vendor <ExternalLink size={14} /></a>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
