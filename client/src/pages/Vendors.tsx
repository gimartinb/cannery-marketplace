import { ArrowRight, Instagram, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";
import { categories, vendors } from "@/lib/vendors";

export default function Vendors() {
  const [category, setCategory] = useState("All makers");
  const visibleVendors = useMemo(() => category === "All makers" ? vendors : vendors.filter((vendor) => vendor.category === category), [category]);

  return (
    <SiteShell>
      <PageMeta title="Local makers" description="Meet the local makers and artisans represented at The Cannery Marketplace in Gilroy, California." />
      <main>
        <section className="page-hero directory-hero">
          <div className="site-container page-hero-content">
            <p className="eyebrow">The maker directory</p>
            <h1 className="display">Meet the people behind the <em>good stuff.</em></h1>
            <p>Explore the local makers and artisans who bring their work to The Cannery Marketplace. Each profile is a small window into the hands and ideas behind what you find here.</p>
          </div>
        </section>

        <section className="directory-section">
          <div className="site-container">
            <div className="directory-toolbar">
              <div><p className="eyebrow">Browse the shelves</p><h2 className="display">Find a maker</h2></div>
              <div className="category-filter" aria-label="Filter vendors by category">
                {categories.map((item) => <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
              </div>
            </div>

            <div className="vendor-grid">
              {visibleVendors.map((vendor, index) => (
                <article className={`vendor-card ${index === 0 ? "vendor-card-featured" : ""}`} key={vendor.slug}>
                  <Link href={`/vendors/${vendor.slug}`} className={`vendor-placeholder vendor-tone-${vendor.tone}`} aria-label={`View ${vendor.name} profile`}>
                    <span className="placeholder-stamp">Preview image</span>
                    <span className="vendor-initials">{vendor.initials}</span>
                    <span className="placeholder-note">Photo placeholder</span>
                  </Link>
                  <div className="vendor-card-copy">
                    <div className="vendor-card-meta"><span>{vendor.category}</span>{vendor.featured && <span className="featured-label"><Sparkles size={12} /> Featured</span>}</div>
                    <h3><Link href={`/vendors/${vendor.slug}`}>{vendor.name}</Link></h3>
                    <p>{vendor.bio}</p>
                    <Link className="text-link" href={`/vendors/${vendor.slug}`}>View profile <ArrowRight size={15} /></Link>
                  </div>
                </article>
              ))}
            </div>

            <div className="directory-preview-note"><span><Sparkles size={15} /> Stage 2 preview</span><p>These four profiles use temporary placeholder content so you can review the directory layout. They will be replaced with real vendor information after the Airtable connection is approved.</p></div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
