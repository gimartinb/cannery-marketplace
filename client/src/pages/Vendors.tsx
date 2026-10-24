import { ArrowRight, Loader2, Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import PageMeta from "@/components/PageMeta";
import SiteShell from "@/components/SiteShell";
import { publishedVendorToView } from "@/lib/vendors";
import { trpc } from "@/lib/trpc";
import { Txt, usePlainText } from "@/lib/siteText";

const PAGE_SIZES = [10, 25, 50] as const;
type PageSize = (typeof PAGE_SIZES)[number];

/** Waits until typing pauses before searching, so each keystroke is not a separate request. */
function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(timer); }, [value, delay]);
  return debounced;
}

export default function Vendors() {
  const plain = usePlainText();
  const [category, setCategory] = useState("All makers");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const debouncedSearch = useDebounced(search.trim());
  const categoriesQuery = trpc.directory.categories.useQuery(undefined, { staleTime: 5 * 60_000 });
  const categories = useMemo(() => ["All makers", ...(categoriesQuery.data || [])], [categoriesQuery.data]);
  useEffect(() => { if (categoriesQuery.data && !categories.includes(category)) setCategory("All makers"); }, [categoriesQuery.data, categories, category]);
  // Loads makers in pages (10, 25, or 50 at a time) instead of the whole directory at once.
  const directory = trpc.directory.page.useInfiniteQuery(
    { limit: pageSize, category: category === "All makers" ? undefined : category, search: debouncedSearch || undefined },
    { getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined, staleTime: 60_000 },
  );
  const visibleVendors = useMemo(() => (directory.data?.pages || []).flatMap((page) => page.items).map(publishedVendorToView), [directory.data]);
  const total = directory.data?.pages[0]?.total ?? 0;
  const remaining = Math.max(0, total - visibleVendors.length);

  return (
    <SiteShell>
      <PageMeta canonicalPath="/vendors" title="Local maker directory in Gilroy" description="Meet local makers and artisans at The Cannery Marketplace in Gilroy. Search maker profiles, discover their products, and read the stories behind the work." />
      <main>
        <section className="page-hero directory-hero">
          <div className="site-container page-hero-content">
            <p className="eyebrow"><Txt k="makers.hero.eyebrow" /></p>
            <h1 className="display"><Txt k="makers.hero.title" /></h1>
            <p><Txt k="makers.hero.body" /></p>
          </div>
        </section>

        <section className="directory-section">
          <div className="site-container">
            <div className="directory-toolbar">
              <div><p className="eyebrow"><Txt k="makers.list.eyebrow" /></p><h2 className="display"><Txt k="makers.list.title" /></h2></div>
              <div className="directory-controls">
                <label className="directory-search"><Search size={15} /><span className="sr-only">{plain("makers.list.search")}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={plain("makers.list.search")} /></label>
                <label className="category-select"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter makers by category">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              </div>
            </div>

            {directory.isLoading ? <div className="directory-empty"><Loader2 size={19} className="animate-spin" /><h3>Loading makers…</h3></div> : visibleVendors.length > 0 ? <div className="vendor-grid">
              {visibleVendors.map((vendor, index) => (
                <article className={`vendor-card ${index === 0 ? "vendor-card-featured" : ""}`} key={vendor.slug}>
                  <Link href={`/vendors/${vendor.slug}`} className={`vendor-placeholder vendor-tone-${vendor.tone}`} aria-label={`View ${vendor.name} profile`}>
                    {vendor.photoUrl && <img className="vendor-photo" src={vendor.photoUrl} alt={`${vendor.name}, a ${vendor.category} maker at The Cannery Marketplace`} width="800" height="800" loading="lazy" decoding="async" />}
                                        <span className="vendor-initials">{vendor.initials}</span>
                                      </Link>
                  <div className="vendor-card-copy">
                    <div className="vendor-card-meta"><span>{vendor.category}</span>{vendor.featured && <span className="featured-label"><Sparkles size={12} /> Featured</span>}</div>
                    <h3><Link href={`/vendors/${vendor.slug}`}>{vendor.name}</Link></h3>
                    <p>{vendor.bio}</p>
                    <Link className="text-link" href={`/vendors/${vendor.slug}`}><Txt k="makers.card.link" /> <ArrowRight size={15} /></Link>
                  </div>
                </article>
              ))}
            </div> : <div className="directory-empty"><Search size={19} /><h3><Txt k="makers.empty.title" /></h3><p><Txt k="makers.empty.body" /></p><button className="button-plain" type="button" onClick={() => { setSearch(""); setCategory("All makers"); }}>Clear search <X size={14} /></button></div>}

            {visibleVendors.length > 0 && <div className="directory-pagination" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginTop: "2rem" }}>
              <p aria-live="polite">Showing {visibleVendors.length} of {total} maker{total === 1 ? "" : "s"}</p>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem" }}>
                <label className="category-select"><span>Show</span><select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value) as PageSize)} aria-label="Makers to load at a time">{PAGE_SIZES.map((size) => <option key={size} value={size}>{size} at a time</option>)}</select></label>
                {directory.hasNextPage && <button className="button-primary" type="button" disabled={directory.isFetchingNextPage} onClick={() => void directory.fetchNextPage()}>{directory.isFetchingNextPage ? <><Loader2 size={14} className="animate-spin" /> Loading…</> : <>Show {Math.min(pageSize, remaining)} more <ArrowRight size={14} /></>}</button>}
              </div>
            </div>}
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
