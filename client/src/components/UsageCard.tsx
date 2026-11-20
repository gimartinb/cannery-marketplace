import { Gauge, HardDrive, Loader2, RefreshCw, Sparkles, Upload } from "lucide-react";
import { notifyError, notifySuccess } from "@/lib/notify";
import { trpc } from "@/lib/trpc";

const gb = (bytes: number) => (bytes / 1024 ** 3);
const formatSize = (bytes: number) => (bytes >= 1024 ** 3 ? `${gb(bytes).toFixed(2)} GB` : bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);
const percent = (value: number, max: number) => Math.min(100, Math.round((value / max) * 100));

function Meter({ value, max, warnAt }: { value: number; max: number; warnAt: number }) {
  const share = percent(value, max);
  const tone = value >= warnAt ? "danger" : value >= warnAt * 0.75 ? "warn" : "ok";
  return <div className={`usage-meter usage-${tone}`} role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={`${share} percent used`}><span style={{ width: `${Math.max(share, 1)}%` }} /></div>;
}

/** Overview card: how much of each free allowance the site is using. */
export default function UsageCard() {
  const utils = trpc.useUtils();
  const usage = trpc.adminPortal.usage.useQuery(undefined, { refetchInterval: 60_000 });
  const check = trpc.adminPortal.runStorageCheck.useMutation({
    onSuccess: async (result) => {
      notifySuccess("Storage checked", { description: `${result.objects} photos use ${formatSize(result.bytes)}.${result.removed ? ` Removed ${result.removed} unused photo${result.removed === 1 ? "" : "s"} (${formatSize(result.removedBytes)}).` : " Nothing unused to remove."}` });
      await utils.adminPortal.usage.invalidate();
    },
    onError: (error) => notifyError(error, "Storage check did not finish"),
  });
  if (usage.isLoading) return <div className="secure-admin-card usage-card"><Loader2 className="animate-spin" /></div>;
  if (!usage.data) return null;
  const { ai, storage, uploads } = usage.data;

  return <section className="secure-admin-card usage-card" aria-labelledby="usage-title">
    <div className="secure-card-heading"><div><p className="eyebrow"><Gauge size={14} /> Staying free</p><h3 id="usage-title">Free plan usage</h3><p>The site stops these features on its own before they could cost anything. Nothing here charges automatically except photo storage, which is protected by the limit below.</p></div></div>
    <div className="usage-grid">
      <div className="usage-item">
        <div className="usage-label"><Sparkles size={15} /> AI writing help today</div>
        <strong>{percent(ai.neuronsToday, ai.freePerDay)}% <small>of the free daily amount</small></strong>
        <Meter value={ai.neuronsToday} max={ai.freePerDay} warnAt={ai.makerStop} />
        <p>{ai.requestsToday} suggestion{ai.requestsToday === 1 ? "" : "s"} today. Makers pause at {percent(ai.makerStop, ai.freePerDay)}%, owners at {percent(ai.ownerStop, ai.freePerDay)}%. Resets daily at midnight UTC (4 or 5 p.m. Pacific).</p>
      </div>
      <div className="usage-item">
        <div className="usage-label"><HardDrive size={15} /> Photo storage</div>
        <strong>{formatSize(storage.bytes)} <small>of {gb(storage.freeBytes).toFixed(0)} GB free</small></strong>
        <Meter value={storage.bytes} max={storage.freeBytes} warnAt={storage.blockBytes} />
        <p>{storage.objects} photos. New uploads pause at {gb(storage.blockBytes).toFixed(0)} GB. {storage.checkedAt ? `Last checked ${new Date(storage.checkedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}${storage.lastRemoved ? `, ${storage.lastRemoved} unused removed` : ""}.` : "Not checked yet. Runs nightly, or click Check now."}</p>
      </div>
      <div className="usage-item">
        <div className="usage-label"><Upload size={15} /> Uploads this month</div>
        <strong>{uploads.thisMonth.toLocaleString()} <small>of {uploads.freePerMonth.toLocaleString()} free</small></strong>
        <Meter value={uploads.thisMonth} max={uploads.freePerMonth} warnAt={uploads.blockAt} />
        <p>Uploads pause at {uploads.blockAt.toLocaleString()} until next month.</p>
      </div>
    </div>
    <div className="review-actions"><button className="button-plain" type="button" disabled={check.isPending} onClick={() => check.mutate()}>{check.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Check storage now</button></div>
    <p className="form-hint">Check storage counts every photo and removes ones no page has used for a week, like replaced cover photos. It also runs automatically every night.</p>
  </section>;
}
