/**
 * Generate the synthetic ancestry-composition screenshot fixture.
 * Test collateral for the live parser path (NOT a real vendor screenshot;
 * no logos, generic layout). Rows mirror demo/fixtures/sample-parse.json.
 * Run once: node scripts/make-fixture-screenshot.mjs
 */

import { chromium } from "playwright";

const rows = [
  ["British & Irish", "62.0%"],
  ["French & German", "24.0%"],
  ["Scandinavian", "9.0%"],
  ["Unassigned", "5.0%"],
];

const bars = rows
  .map(
    ([label, pct]) => `
    <div class="row">
      <span class="label">${label}</span>
      <span class="bar"><span class="fill" style="width:${pct}"></span></span>
      <span class="pct">${pct}</span>
    </div>`,
  )
  .join("");

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { font-family: Inter, Arial, sans-serif; background:#ffffff; color:#1a1a1a; margin:0; padding:48px; }
  h1 { font-size:34px; font-weight:600; margin:0 0 8px; }
  p.sub { color:#666; font-size:17px; margin:0 0 36px; }
  .row { display:flex; align-items:center; gap:16px; margin:22px 0; font-size:19px; }
  .label { width:240px; }
  .bar { flex:1; height:14px; background:#eee; border-radius:7px; overflow:hidden; }
  .fill { display:block; height:100%; background:#eeb057; }
  .pct { width:70px; text-align:right; font-weight:600; }
</style></head><body>
  <h1>Ancestry Composition</h1>
  <p class="sub">Your DNA, by region</p>
  ${bars}
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 640 } });
await page.setContent(html);
await page.screenshot({ path: "tests/fixtures/composition.png" });
await browser.close();
console.log("wrote tests/fixtures/composition.png");
