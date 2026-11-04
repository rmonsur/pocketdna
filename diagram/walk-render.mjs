/* Renders the plain-language walkthrough that sits under each diagram.
 * Content lives in walk-content.mjs; datasets (and their links) in datasets.mjs. */

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const WALK_CSS = `
    .walk { margin-top: 3rem; border-top: 1px solid rgba(255,255,255,0.16); padding-top: 2rem; }
    .walk h2 { font-family: var(--font-serif); font-weight: 400; font-size: 1.5rem; letter-spacing: -0.01em; margin-bottom: 0.75rem; }
    .walk h3 { font-family: var(--font-sans); font-size: 1rem; font-weight: 600; letter-spacing: -0.005em; }
    .walk p.lead { color: #D4D4D4; font-size: 1rem; line-height: 1.65; max-width: 62rem; margin-bottom: 1.25rem; }
    .walk .eyebrow { margin-bottom: 0.6rem; }
    .critical { border: 1px solid var(--color-accent); background: rgba(238,176,87,0.06); border-radius: 6px; padding: 1rem 1.25rem; margin: 0 0 1.75rem; max-width: 62rem; }
    .critical .eyebrow { color: var(--color-accent); }
    .critical ul { margin-left: 1.1rem; color: #E5E5E5; font-size: 0.92rem; line-height: 1.6; }
    .critical li + li { margin-top: 0.35rem; }
    ol.steps { list-style: none; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 34rem), 1fr)); }
    li.step { background: #18181B; border: 1px solid rgba(255,255,255,0.16); border-radius: 6px; padding: 1.1rem 1.25rem 1.2rem; }
    .step header { display: flex; align-items: center; gap: 0.7rem; flex-wrap: wrap; margin-bottom: 0.8rem; }
    .step .num { font-family: var(--font-mono); font-size: 0.7rem; color: var(--color-muted); border: 1px solid rgba(255,255,255,0.3); border-radius: 999px; min-width: 1.7rem; height: 1.7rem; display: inline-flex; align-items: center; justify-content: center; }
    .chip { font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 3px; padding: 0.22rem 0.5rem; border: 1px solid rgba(255,255,255,0.3); color: var(--color-muted); }
    .chip.muse { color: var(--color-accent); border-color: var(--color-accent); }
    .chip.user { color: #C8F45B; border-color: rgba(200,244,91,0.6); }
    .step dl { display: grid; grid-template-columns: 6.2rem 1fr; gap: 0.5rem 0.9rem; font-size: 0.88rem; line-height: 1.55; }
    .step dt { font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-muted); padding-top: 0.2rem; }
    .step dd { color: #E5E5E5; }
    .step dt.why, .step dt.why + dd { color: var(--color-accent); }
    .step dt.why + dd { color: #F3D9AE; }
    .walk table { border-collapse: collapse; width: 100%; font-size: 0.86rem; line-height: 1.5; }
    .walk th, .walk td { text-align: left; vertical-align: top; padding: 0.6rem 0.8rem; border-top: 1px solid rgba(255,255,255,0.16); }
    .walk th { font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-muted); font-weight: 500; }
    .walk td a { color: #C8F45B; }
    .walk td .todo { color: var(--color-muted); font-style: italic; }
    .datasets { margin-top: 2.25rem; overflow-x: auto; }
    .datasets .note { color: #D4D4D4; font-size: 0.9rem; line-height: 1.6; max-width: 62rem; margin-bottom: 0.9rem; }
    @media (max-width: 640px) { .step dl { grid-template-columns: 1fr; } .step dt { padding-top: 0.5rem; } }
`;

function step(s) {
  const chip = `<span class="chip ${s.kind}">${esc(s.who)}</span>`;
  const rows = [
    ["Gets", s.gets],
    ["Does", s.does],
    ["Hands over", s.hands],
    [s.kind === "muse" ? "Why Muse" : s.kind === "user" ? "Why you" : "Why no model", s.why, "why"],
    ["Guard", s.guard],
  ].filter((r) => r[1]);
  const dl = rows.map(([k, v, c]) => `<dt${c ? ` class="${c}"` : ""}>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");
  return `<li class="step"><header><span class="num">${s.n}</span><h3>${esc(s.title)}</h3>${chip}</header><dl>${dl}</dl></li>`;
}

export function renderDatasets(datasets, intro) {
  const rows = datasets
    .map((d) => {
      const link = d.url ? `<a href="${esc(d.url)}">${esc(d.url)}</a>` : `<span class="todo">link to be added by the builder</span>`;
      return `<tr><td><strong>${esc(d.name)}</strong><br>${esc(d.cite)}</td><td>${esc(d.what)}</td><td>${esc(d.role)}</td><td>${esc(d.size)}</td><td>${link}</td></tr>`;
    })
    .join("");
  return `<div class="datasets"><p class="eyebrow">Genomic datasets behind this step</p><p class="note">${esc(intro)}</p>
<table><thead><tr><th>Dataset</th><th>What it is</th><th>What PocketDNA uses it for</th><th>Size on disk</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function renderWalkthrough(w) {
  const critical = w.critical
    ? `<aside class="critical"><p class="eyebrow">The critical view: what Muse is and is not trusted with</p><ul>${w.critical.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></aside>`
    : "";
  const datasets = w.datasets ? renderDatasets(w.datasets.list, w.datasets.intro) : "";
  return `<section class="walk" aria-labelledby="walk-h">
<p class="eyebrow">Plain-language walkthrough</p>
<h2 id="walk-h">${esc(w.heading)}</h2>
<p class="lead">${esc(w.lead)}</p>
${critical}
<ol class="steps">${w.steps.map(step).join("")}</ol>
${datasets}
</section>`;
}
