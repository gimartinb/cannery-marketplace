import { PenLine } from "lucide-react";
import { useMemo, useState } from "react";
import PageMeta from "@/components/PageMeta";
import { ReviewCard, ReviewForm, Stars } from "@/components/Reviews";
import SiteShell from "@/components/SiteShell";
import { Txt, usePlainText } from "@/lib/siteText";
import { trpc } from "@/lib/trpc";

type Sort = "newest" | "highest" | "lowest";

/** Every approved review in one place: makers and the marketplace itself, with filters. */
export default function ReviewsPage() {
  const plain = usePlainText();
  const data = trpc.reviews.all.useQuery(undefined, { staleTime: 60_000 });
  const [who, setWho] = useState("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [writing, setWriting] = useState(false);
  const all = data.data?.reviews ?? [];
  const makers = useMemo(() => {
    const seen = new Map<string, { slug: string; name: string; count: number }>();
    for (const row of all) if (row.makerSlug && row.makerName) seen.set(row.makerSlug, { slug: row.makerSlug, name: row.makerName, count: (seen.get(row.makerSlug)?.count ?? 0) + 1 });
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [all]);
  const shown = useMemo(() => {
    const list = all.filter((row) => who === "all" || (who === "marketplace" ? row.profileId === null : row.makerSlug === who));
    const time = (value: Date | string) => new Date(value).getTime();
    return [...list].sort((a, b) => sort === "highest" ? b.rating - a.rating || time(b.createdAt) - time(a.createdAt) : sort === "lowest" ? a.rating - b.rating || time(b.createdAt) - time(a.createdAt) : time(b.createdAt) - time(a.createdAt));
  }, [all, who, sort]);
  const summary = data.data?.summary;
  const marketplaceCount = all.filter((row) => row.profileId === null).length;

  return <SiteShell>
    <PageMeta canonicalPath="/reviews" title="Shopper reviews of Gilroy makers" description="Read what shoppers say about The Cannery Marketplace and its local makers and artisans in Gilroy, California, and share your own review." />
    <main>
      <section className="page-hero"><div className="site-container page-hero-content">
        <p className="eyebrow"><Txt k="reviews.hero.eyebrow" /></p>
        <h1 className="display"><Txt k="reviews.hero.title" /></h1>
        <p><Txt k="reviews.hero.body" /></p>
        {summary && summary.count > 0 && <p className="review-summary reviews-page-summary"><Stars value={summary.average} size={20} label={`Average ${summary.average} out of 5 stars`} /> <strong>{summary.average.toFixed(1)}</strong> from {summary.count} review{summary.count === 1 ? "" : "s"}</p>}
      </div></section>
      <section className="maker-reviews-section reviews-page"><div className="site-container">
        <div className="reviews-toolbar">
          <div className="application-filters" role="tablist" aria-label="Whose reviews">
            <button type="button" role="tab" aria-selected={who === "all"} className={who === "all" ? "active" : ""} onClick={() => setWho("all")}>{plain("reviews.filter.all")} <span>{all.length}</span></button>
            <button type="button" role="tab" aria-selected={who === "marketplace"} className={who === "marketplace" ? "active" : ""} onClick={() => setWho("marketplace")}>{plain("reviews.filter.marketplace")} <span>{marketplaceCount}</span></button>
          </div>
          {makers.length > 0 && <label className="category-select"><span>Maker</span><select value={who !== "all" && who !== "marketplace" ? who : ""} onChange={(event) => setWho(event.target.value || "all")} aria-label="Show reviews for one maker"><option value="">All makers</option>{makers.map((maker) => <option key={maker.slug} value={maker.slug}>{maker.name} ({maker.count})</option>)}</select></label>}
          <label className="category-select"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as Sort)} aria-label="Sort reviews"><option value="newest">Newest first</option><option value="highest">Highest rated</option><option value="lowest">Lowest rated</option></select></label>
          {!writing && <button className="button-primary" type="button" onClick={() => setWriting(true)}><PenLine size={15} /> <Txt k="reviews.button" /></button>}
        </div>
        {writing && <><ReviewForm slug="" makerName="The Cannery Marketplace" onClose={() => setWriting(false)} /><p className="form-hint reviews-maker-hint"><Txt k="reviews.makerHint" /></p></>}
        {data.isLoading ? null : shown.length ? <div className="review-grid">{shown.map((review) => <ReviewCard key={review.id} review={review} maker={review.makerSlug ? { name: review.makerName, slug: review.makerSlug } : { name: "The Cannery Marketplace", slug: null }} />)}</div> : <p className="review-empty"><Txt k="reviews.empty" /></p>}
      </div></section>
    </main>
  </SiteShell>;
}
