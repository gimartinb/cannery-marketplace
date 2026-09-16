import { ArrowRight } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";

export default function Contact() {
  return (
    <SiteShell>
      <PageMeta title="Contact" description="Contact The Cannery Marketplace in Gilroy, California, by phone, email, or the online contact form." />
      <main>
        <section className="page-hero">
          <div className="site-container page-hero-content">
            <p className="eyebrow">Contact</p>
            <h1 className="display">Looking for something <em>special?</em></h1>
            <p>Have a question or want to connect with the marketplace? Send a note and we will get back to you soon.</p>
          </div>
        </section>

        <section className="contact-section">
          <div className="site-container contact-grid">
            <div className="contact-intro">
              <p className="eyebrow">Get in touch</p>
              <h2 className="display">We would love to <em>hear from you.</em></h2>
              <p className="body-large">Reach us directly, or use the form for general marketplace questions.</p>
              <div className="contact-list">
                <div className="contact-item"><span>Visit</span><p>7488 Monterey Road<br />Gilroy, California 95020</p></div>
                <div className="contact-item"><span>Call</span><a href="tel:+14083371620">(408) 337-1620</a></div>
                <div className="contact-item"><span>Email</span><a href="mailto:thecannerymarketplace@gmail.com">thecannerymarketplace@gmail.com</a></div>
              </div>
            </div>

            <form className="contact-form" action="https://formsubmit.co/thecannerymarketplace@gmail.com" method="POST">
              <input type="hidden" name="_subject" value="New Cannery Marketplace website inquiry" />
              <input type="hidden" name="_template" value="table" />
              <input type="text" name="_honey" style={{ display: "none" }} tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <h2>Send a message</h2>
              <p>Fields marked with an asterisk are required.</p>
              <div className="form-grid">
                <div className="form-field"><label htmlFor="name">Name *</label><input id="name" name="name" required autoComplete="name" /></div>
                <div className="form-field"><label htmlFor="email">Email *</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
                <div className="form-field full"><label htmlFor="phone">Phone</label><input id="phone" name="phone" type="tel" autoComplete="tel" /></div>
                <div className="form-field full"><label htmlFor="message">How can we help? *</label><textarea id="message" name="message" required /></div>
              </div>
              <button className="button-primary" type="submit">Send inquiry <ArrowRight size={15} /></button>
              <p className="form-note">This form delivers inquiries to the marketplace email address. Please do not include sensitive personal or payment information.</p>
            </form>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
