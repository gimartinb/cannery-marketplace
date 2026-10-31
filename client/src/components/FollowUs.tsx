import { Facebook, Instagram, Loader2, Music2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { Txt } from "@/lib/siteText";
import { trpc } from "@/lib/trpc";
import { DEFAULT_MARKETPLACE_SOCIALS, MARKETPLACE_SOCIALS, SOCIAL_LABEL, marketplaceSocialSchema, type MarketplaceSocial, type MarketplaceSocialLinks } from "@shared/marketplaceSocial";

export const SOCIAL_ICON: Record<MarketplaceSocial, typeof Instagram> = { instagram: Instagram, facebook: Facebook, tiktok: Music2 };

/** The marketplace's social links (falls back to the defaults while loading). */
export function useMarketplaceSocials(): MarketplaceSocialLinks {
  const { data } = trpc.settings.public.useQuery(undefined, { staleTime: 5 * 60_000 });
  return data?.socials ?? DEFAULT_MARKETPLACE_SOCIALS;
}
const filled = (links: MarketplaceSocialLinks) => MARKETPLACE_SOCIALS.filter((kind) => links[kind]);

/** Slim "Follow The Cannery" bar at the very top of every page. It scrolls away with the page. */
export function FollowBar() {
  const links = useMarketplaceSocials();
  const kinds = filled(links);
  if (!kinds.length) return null;
  return <div className="follow-bar"><div className="site-container follow-bar-inner">
    <p><strong><Txt k="shared.follow.title" /></strong><span className="follow-bar-body"><Txt k="shared.follow.body" /></span></p>
    <div className="follow-bar-links">{kinds.map((kind) => { const Icon = SOCIAL_ICON[kind]; return <a key={kind} href={links[kind]} target="_blank" rel="noopener noreferrer" aria-label={`Follow The Cannery Marketplace on ${SOCIAL_LABEL[kind]}`}><Icon size={14} /><span>{SOCIAL_LABEL[kind]}</span></a>; })}</div>
  </div></div>;
}

/** Small icons in the footer. */
export function FooterSocialIcons() {
  const links = useMarketplaceSocials();
  return <>{filled(links).map((kind) => { const Icon = SOCIAL_ICON[kind]; return <a key={kind} className="social-link" href={links[kind]} target="_blank" rel="noreferrer" aria-label={`The Cannery Marketplace on ${SOCIAL_LABEL[kind]}`}><Icon size={16} /></a>; })}</>;
}

/** Owner editor for the marketplace's own social links (Edit pages, Every page). */
export function MarketplaceSocialEditor() {
  const utils = trpc.useUtils();
  const current = useMarketplaceSocials();
  const [form, setForm] = useState<MarketplaceSocialLinks>(current);
  const [errors, setErrors] = useState<Partial<Record<MarketplaceSocial, string>>>({});
  useEffect(() => { setForm(current); }, [current.instagram, current.facebook, current.tiktok]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = trpc.adminPortal.saveMarketplaceSocials.useMutation({ onSuccess: async () => { notifySuccess("Social links saved", { description: "The Follow buttons and footer icons use them right away." }); await utils.settings.public.invalidate(); }, onError: (error) => notifyError(error, "Social links not saved") });
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = marketplaceSocialSchema.safeParse(form);
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message]))); return; }
    setErrors({}); save.mutate(parsed.data);
  }
  return <form className="secure-admin-card site-text-card social-links-editor" onSubmit={submit}>
    <div className="site-text-head"><div><strong>Marketplace social links</strong><small>Used by the Follow bar at the top of every page and the footer icons. Paste a link or an @handle. Leave one blank to hide it. Saving puts them live right away.</small></div></div>
    <div className="form-grid">{MARKETPLACE_SOCIALS.map((kind) => <label key={kind}>{SOCIAL_LABEL[kind]}<input value={form[kind]} placeholder={kind === "facebook" ? "facebook.com/yourpage" : "@yourhandle"} onChange={(event) => setForm({ ...form, [kind]: event.target.value })} aria-invalid={errors[kind] ? true : undefined} />{errors[kind] && <span className="form-error">{errors[kind]}</span>}</label>)}</div>
    <div className="review-actions"><button className="button-primary compact-button" type="submit" disabled={save.isPending}>{save.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save social links</button></div>
  </form>;
}
