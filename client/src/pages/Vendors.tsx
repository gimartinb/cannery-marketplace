import { ArrowRight, Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";
import { defaultVendors, publishedVendorToView } from "@/lib/vendors";
import { trpc } from "@/lib/trpc";

export default function Vendors() {
  const [category, setCategory] = useState("All makers");
  const [search, setSearch] = useState("");
  const vendors = defaultVendors;
  const directory = trpc.directory.list.useQuery();
  const allVendors = useMemo(() => { const approved = (directory.data || []).map(publishedVendorToView); const slugs = new Set(approved.map((vendor) => vendor.slug)); return [...approved, ...vendors.filter((vendor) => !slugs.has(vendor.slug))]; }, [directory.data, vendors]);
  const categories = useMemo(() => ["All makers", ...Array.from(new Set(allVendors.filter((vendor) => vendor.active).map((vendor) => vendor.category))).sort()], [allVendors]);
  useEffect(() => { if (!categories.includes(category)) setCategory("All makers"); }, [categories, category]);
  const visibleVendors = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return allVendors.filter((vendor) => {
      if (!vendor.active || (category !== "All makers" && vendor.category !== category)) return false;
      if (!normalizedSearch) return true;
      return [vendor.name, vendor.category, vendor.bio, vendor.socialLabel].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [category, search, allVendors]);
  const directoryStructuredData = { "@context": "https://schema.org", "@type": "CollectionPage", name: "Local makers at The Cannery Marketplace", url: "https://cannerymarket.com/vendors", mainEntity: { "@type": "ItemList", itemListElement: allVendors.filter((vendor) => vendor.active).map((vendor, index) => ({ "@type": "ListItem", position: index + 1, url: `https://cannerymarket.com/vendors/${vendor.slug}`, item: { "@type": "Organization", name: vendor.name, description: vendor.bio, knowsAbout: vendor.category } })) } };

  return (
    <SiteShell>
      <PageMeta canonicalPath="/vendors" title="Local maker directory in Gilroy" description="Meet local makers and artisans at The Cannery Marketplace in Gilroy. Search maker profiles, discover their products, and read the stories behind the work." />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(directoryStructuredData) }} />
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
                <label className="category-select"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter makers by category">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              </div>
            </div>

            {visibleVendors.length > 0 ? <div className="vendor-grid">
              {visibleVendors.map((vendor, index) => (
                <article className={`vendor-card ${index === 0 ? "vendor-card-featured" : ""}`} key={vendor.slug}>
                  <Link href={`/vendors/${vendor.slug}`} className={`vendor-placeholder vendor-tone-${vendor.tone}`} aria-label={`View ${vendor.name} profile`}>
                    {vendor.photoUrl && <img className="vendor-photo" src={vendor.photoUrl} alt={`${vendor.name}, a ${vendor.category} maker at The Cannery Marketplace`} width="800" height="800" loading="lazy" decoding="async" />}
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
