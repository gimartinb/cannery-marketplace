import fs from "node:fs";

const reportPath = process.argv[2] || new URL("../lighthouse-home.json", import.meta.url);
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const categories = Object.fromEntries(Object.entries(report.categories).map(([key, value]) => [key, value.score]));
const metrics = {
  FCP: report.audits["first-contentful-paint"].displayValue,
  LCP: report.audits["largest-contentful-paint"].displayValue,
  CLS: report.audits["cumulative-layout-shift"].displayValue,
  TBT: report.audits["total-blocking-time"].displayValue,
  SI: report.audits["speed-index"].displayValue,
};
const opportunities = Object.values(report.audits)
  .filter((audit) => audit.details?.type === "opportunity" && (audit.details.overallSavingsMs || 0) > 0)
  .sort((a, b) => (b.details.overallSavingsMs || 0) - (a.details.overallSavingsMs || 0))
  .slice(0, 12)
  .map((audit) => ({ id: audit.id, title: audit.title, score: audit.score, savingsMs: Math.round(audit.details.overallSavingsMs || 0), display: audit.displayValue }));
const failures = Object.values(report.audits)
  .filter((audit) => audit.scoreDisplayMode === "binary" && audit.score === 0)
  .map((audit) => ({ id: audit.id, title: audit.title }));
const accessibilityDetails = ["color-contrast", "label-content-name-mismatch", "meta-viewport"].map((id) => {
  const audit = report.audits[id];
  return {
    id,
    explanation: audit.explanation,
    items: (audit.details?.items || []).slice(0, 10).map((item) => ({ snippet: item.node?.snippet, selector: item.node?.selector, explanation: item.explanation })),
  };
});

console.log(JSON.stringify({ categories, metrics, opportunities, failures, accessibilityDetails }, null, 2));
