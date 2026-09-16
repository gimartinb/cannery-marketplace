import { ArrowRight, Search, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";
import { getCategories, readVendors, type Vendor } from "@/lib/vendors";

export default function Vendors() {
  const [category, setCategory] = useState("All makers");
  const [search, setSearch] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>(readVendors);
  const categories = getCategories();
  const visibleVendors = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return vendors.filter((vendor) => {
      if (!vendor.active || (category !== "All makers" && vendor.category !== category)) return false;
      if (!normalizedSearch) return true;
      return [vendor.name, vendor.category, vendor.bio, vendor.socialLabel].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [category, search, vendors]);

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
              <div className="directory-controls">
                <label className="directory-search"><Search size={15} /><span className="sr-only">Search makers</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search makers" /></label>
                <div className="category-filter" aria-label="Filter vendors by category">
                  {categories.map((item) => <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
                </div>
              </div>
            </div>

            {visibleVendors.length > 0 ? <div className="vendor-grid">
              {visibleVendors.map((vendor, index) => (
                <article className={`vendor-card ${index === 0 ? "vendor-card-featured" : ""}`} key={vendor.slug}>
                  <Link href={`/vendors/${vendor.slug}`} className={`vendor-placeholder vendor-tone-${vendor.tone}`} aria-label={`View ${vendor.name} profile`}>
                    {vendor.photoUrl && <img className="vendor-photo" src={vendor.photoUrl} alt="" />}
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
            </div> : <div className="directory-empty"><Search size={19} /><h3>No makers found</h3><p>Try a different name, category, or keyword.</p><button className="button-plain" type="button" onClick={() => { setSearch(""); setCategory("All makers"); }}>Clear search <X size={14} /></button></div>}

            <div className="directory-preview-note"><span><Sparkles size={15} /> Preview directory</span><p>Five mock profiles are loaded for review. Viva Café uses public profile details and a branded placeholder until the owner supplies or authorizes a photo.</p></div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
