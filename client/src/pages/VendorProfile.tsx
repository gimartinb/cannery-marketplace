import { ArrowLeft, ExternalLink, Instagram } from "lucide-react";
import { Link, useParams } from "wouter";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";
import { getVendor } from "@/lib/vendors";

export default function VendorProfile() {
  const params = useParams<{ slug: string }>();
  const vendor = getVendor(params.slug);

  if (!vendor) {
    return <SiteShell><main><section className="page-hero"><div className="site-container page-hero-content"><p className="eyebrow">Maker not found</p><h1 className="display">That profile has moved.</h1><Link className="button-primary" href="/vendors">Back to the directory <ArrowLeft size={15} /></Link></div></section></main></SiteShell>;
  }

  return (
    <SiteShell>
      <PageMeta title={vendor.name} description={`${vendor.name} — ${vendor.category} maker at The Cannery Marketplace in Gilroy, California.`} />
      <main>
        <section className="vendor-profile-hero">
          <div className="site-container vendor-profile-grid">
            <div className={`vendor-profile-placeholder vendor-tone-${vendor.tone}`}>{vendor.photoUrl && <img className="vendor-photo" src={vendor.photoUrl} alt={`${vendor.name} preview`} />}<span className="placeholder-stamp">Preview image</span><span className="vendor-initials">{vendor.initials}</span><span className="placeholder-note">Photo placeholder</span></div>
            <div className="vendor-profile-copy">
              <Link className="back-link" href="/vendors"><ArrowLeft size={15} /> All makers</Link>
              <p className="eyebrow">{vendor.category}</p>
              <h1 className="display">{vendor.name}</h1>
              <p className="body-large">{vendor.bio}</p>
              <a className="button-plain" href={vendor.socialUrl} target="_blank" rel="noreferrer"><Instagram size={15} /> {vendor.socialLabel} <ExternalLink size={13} /></a>
            </div>
          </div>
        </section>
        <section className="vendor-profile-bottom">
          <div className="site-container vendor-profile-bottom-grid"><div><p className="eyebrow">Keep exploring</p><h2 className="display">There is more to <em>find.</em></h2></div><Link className="button-primary" href="/vendors">Browse all makers <ArrowLeft size={15} className="rotate-180" /></Link></div>
        </section>
      </main>
    </SiteShell>
  );
}
