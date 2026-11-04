/**
 * Builds the seven PocketDNA schematic diagrams as self-contained HTML files.
 * Follows the diagram-design skill (cathrynlavery/diagram-design): one SVG per
 * page, orthogonal connectors, masked labels, bottom legend strip, accessible
 * title/desc. Skin = PocketDNA DESIGN.md tokens (dark, amber, lime, Inter).
 *
 *   node diagram/build-diagrams.mjs
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/* ---------- skin (DESIGN.md) ---------- */
const T = {
  paper: "#0A0908",
  paper2: "#18181B",
  ink: "#FFFFFF",
  muted: "#A3A3A3",
  soft: "#8A8A8A",
  rule: "rgba(255,255,255,0.16)",
  ruleSolid: "rgba(255,255,255,0.30)",
  accent: "#EEB057",
  accentTint: "rgba(238,176,87,0.10)",
  link: "#C8F45B",
};
const ink = (a) => `rgba(255,255,255,${a})`;
const amber = (a) => `rgba(238,176,87,${a})`;
const FONT_SANS = "'Inter', system-ui, sans-serif";
const FONT_MONO = "'Geist Mono', ui-monospace, monospace";
const FONT_SERIF = "'Instrument Serif', serif";
const FONTS = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&family=Geist+Mono:wght@400;500;600&display=swap";

/* ---------- primitives ---------- */
const KINDS = {
  focal: { fill: T.accentTint, stroke: T.accent, tag: T.accent, tagStroke: amber(0.5) },
  backend: { fill: T.paper2, stroke: T.ink, tag: T.ink, tagStroke: ink(0.4) },
  store: { fill: ink(0.05), stroke: T.muted, tag: T.muted, tagStroke: "rgba(163,163,163,0.5)" },
  external: { fill: ink(0.03), stroke: ink(0.3), tag: T.soft, tagStroke: ink(0.22) },
  input: { fill: "rgba(163,163,163,0.10)", stroke: T.soft, tag: T.soft, tagStroke: "rgba(138,138,138,0.4)" },
  optional: { fill: ink(0.02), stroke: ink(0.2), tag: T.soft, tagStroke: ink(0.2), dash: "4,3" },
  security: { fill: amber(0.05), stroke: amber(0.5), tag: amber(0.8), tagStroke: amber(0.4), dash: "4,4" },
};

const monoW = (text, size) => text.length * 0.62 * size;
const grid4 = (n) => Math.ceil(n / 4) * 4;

function node({ x, y, w = 160, h = 64, kind = "backend", tag, name, subs = [], rx = 6 }) {
  const k = KINDS[kind];
  const cx = x + w / 2;
  const out = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${T.paper}"/>`];
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${k.fill}" stroke="${k.stroke}" stroke-width="1"${k.dash ? ` stroke-dasharray="${k.dash}"` : ""}/>`);
  if (tag) {
    const tw = grid4(monoW(tag, 7) + 12);
    out.push(`<rect x="${x + 8}" y="${y + 8}" width="${tw}" height="12" rx="2" fill="transparent" stroke="${k.tagStroke}" stroke-width="0.8"/>`);
    out.push(`<text x="${x + 8 + tw / 2}" y="${y + 17}" fill="${k.tag}" font-size="7" font-family="${FONT_MONO}" text-anchor="middle" letter-spacing="0.08em">${tag}</text>`);
  }
  const nameY = h <= 64 ? y + 36 : y + 40;
  out.push(`<text x="${cx}" y="${nameY}" fill="${T.ink}" font-size="12" font-weight="600" font-family="${FONT_SANS}" text-anchor="middle">${name}</text>`);
  const lineGap = h <= 64 ? 16 : 14;
  subs.forEach((s, i) => {
    out.push(`<text x="${cx}" y="${nameY + 16 + i * lineGap}" fill="${T.muted}" font-size="9" font-family="${FONT_MONO}" text-anchor="middle">${s}</text>`);
  });
  return out.join("\n");
}

function terminal({ x, y, w = 160, h = 48, name }) {
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="${T.paper}"/>`,
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="${ink(0.03)}" stroke="${T.muted}" stroke-width="1"/>`,
    `<text x="${x + w / 2}" y="${y + h / 2 + 4}" fill="${T.ink}" font-size="12" font-weight="600" font-family="${FONT_SANS}" text-anchor="middle">${name}</text>`,
  ].join("\n");
}

const STROKES = {
  muted: { stroke: T.muted, marker: "arrow", width: 1.2 },
  accent: { stroke: T.accent, marker: "arrow-accent", width: 1.4 },
  link: { stroke: T.link, marker: "arrow-link", width: 1.2 },
};

function arrow(d, { style = "muted", dashed = false, open = false, noMarker = false } = {}) {
  const s = STROKES[style];
  const marker = noMarker ? "" : ` marker-end="url(#${open ? "arrow-open" : s.marker})"`;
  const dash = dashed ? ` stroke-dasharray="5,4"` : "";
  const width = dashed ? Math.min(s.width, 1.2) : s.width;
  return `<path d="${d}" fill="none" stroke="${s.stroke}" stroke-width="${width}"${dash}${marker}/>`;
}

/** Masked arrow label: cx = centre, top = mask top edge (12 tall). */
function label(cx, top, text, color = T.soft) {
  const w = grid4(monoW(text, 8) + 8);
  return [
    `<rect x="${cx - w / 2}" y="${top}" width="${w}" height="12" rx="2" fill="${T.paper}"/>`,
    `<text x="${cx}" y="${top + 9.5}" fill="${color}" font-size="8" font-family="${FONT_MONO}" text-anchor="middle" letter-spacing="0.06em">${text}</text>`,
  ].join("\n");
}

/** Label beside a vertical segment: anchor at mask left edge (side = "right") or right edge (side = "left"). */
function sideLabel(edgeX, top, text, side = "right", color = T.soft) {
  const w = grid4(monoW(text, 8) + 8);
  const x = side === "right" ? edgeX : edgeX - w;
  return label(x + w / 2, top, text, color);
}

function zone({ x, y, w, h, title, dashed = false }) {
  const tw = grid4(monoW(title, 7) + 12);
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${ink(0.02)}" stroke="${ink(0.10)}" stroke-width="0.8"${dashed ? ` stroke-dasharray="6,4"` : ""}/>`,
    `<rect x="${x + 16}" y="${y + 4}" width="${tw}" height="12" rx="2" fill="${T.paper}"/>`,
    `<text x="${x + 16 + tw / 2}" y="${y + 13}" fill="${T.soft}" font-size="7" font-family="${FONT_MONO}" text-anchor="middle" letter-spacing="0.14em">${title}</text>`,
  ].join("\n");
}

function callout({ x, y, text, anchor = "end", leader, dot, color = T.ink, lines }) {
  const texts = (lines ?? [text]).map((t, i) => `<text x="${x}" y="${y + i * 18}" fill="${color}" font-size="14" font-style="italic" font-family="${FONT_SERIF}" text-anchor="${anchor}">${t}</text>`);
  const leaderColor = color === T.accent ? amber(0.5) : ink(0.4);
  return [
    ...texts,
    `<path d="${leader}" fill="none" stroke="${leaderColor}" stroke-width="1" stroke-dasharray="4,3"/>`,
    `<circle cx="${dot[0]}" cy="${dot[1]}" r="2" fill="${color}"/>`,
  ].join("\n");
}

function legend({ y, x0 = 40, x1, items }) {
  const out = [
    `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${ink(0.10)}" stroke-width="0.8"/>`,
    `<text x="${x0}" y="${y + 16}" fill="${T.muted}" font-size="8" font-family="${FONT_MONO}" letter-spacing="0.18em">LEGEND</text>`,
  ];
  let x = x0;
  const rowY = y + 36;
  for (const it of items) {
    if (it.kind === "swatch") {
      const k = KINDS[it.treat];
      out.push(`<rect x="${x}" y="${rowY - 4}" width="14" height="10" rx="2" fill="${k.fill}" stroke="${k.stroke}" stroke-width="1"${k.dash ? ` stroke-dasharray="${k.dash}"` : ""}/>`);
      out.push(`<text x="${x + 20}" y="${rowY + 4}" fill="${T.muted}" font-size="8.5" font-family="${FONT_SANS}">${it.text}</text>`);
      x += 20 + it.text.length * 5.2 + 24;
    } else if (it.kind === "terminal") {
      out.push(`<rect x="${x}" y="${rowY - 4}" width="18" height="10" rx="5" fill="${ink(0.03)}" stroke="${T.muted}" stroke-width="1"/>`);
      out.push(`<text x="${x + 24}" y="${rowY + 4}" fill="${T.muted}" font-size="8.5" font-family="${FONT_SANS}">${it.text}</text>`);
      x += 24 + it.text.length * 5.2 + 24;
    } else if (it.kind === "frame") {
      out.push(`<rect x="${x}" y="${rowY - 8}" width="28" height="18" rx="2" fill="${ink(0.04)}" stroke="${ink(0.22)}" stroke-width="1"/>`);
      out.push(`<text x="${x + 8}" y="${rowY + 4}" fill="${T.muted}" font-size="7" font-family="${FONT_MONO}">ALT</text>`);
      out.push(`<text x="${x + 36}" y="${rowY + 4}" fill="${T.muted}" font-size="8.5" font-family="${FONT_SANS}">${it.text}</text>`);
      x += 36 + it.text.length * 5.2 + 24;
    } else {
      const s = STROKES[it.style ?? "muted"];
      const dash = it.dashed ? ` stroke-dasharray="5,4"` : "";
      const marker = it.open ? "arrow-open" : s.marker;
      out.push(`<line x1="${x}" y1="${rowY}" x2="${x + 28}" y2="${rowY}" stroke="${s.stroke}" stroke-width="${s.width}"${dash} marker-end="url(#${marker})"/>`);
      out.push(`<text x="${x + 36}" y="${rowY + 4}" fill="${T.muted}" font-size="8.5" font-family="${FONT_SANS}">${it.text}</text>`);
      x += 36 + it.text.length * 5.2 + 24;
    }
  }
  return out.join("\n");
}

function page({ slug, type, title, desc, width, height, body, maxWidth = 1280 }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} · PocketDNA</title>
  <link href="${FONTS}" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --color-paper:  ${T.paper};
      --color-ink:    ${T.ink};
      --color-muted:  ${T.muted};
      --color-accent: ${T.accent};
      --font-sans:    ${FONT_SANS};
      --font-serif:   ${FONT_SERIF};
      --font-mono:    ${FONT_MONO};
    }
    body {
      font-family: var(--font-sans);
      background: var(--color-paper);
      color: var(--color-ink);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 2rem;
    }
    .frame { max-width: ${maxWidth}px; width: 100%; }
    .diagram-container { width: 100%; overflow-x: auto; }
    .eyebrow {
      font-family: var(--font-mono);
      font-size: 0.66rem;
      font-weight: 500;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--color-muted);
      margin-bottom: 0.5rem;
    }
    h1 {
      font-family: var(--font-serif);
      font-size: clamp(1.5rem, 2.4vw + 0.75rem, 2rem);
      font-weight: 400;
      letter-spacing: -0.02em;
      line-height: 1.15;
      color: var(--color-ink);
      margin-bottom: 1.5rem;
    }
    svg { width: 100%; min-width: ${width}px; display: block; }
    @media print {
      .diagram-container { overflow-x: visible; }
      svg { min-width: 0; }
    }
  </style>
</head>
<body>
  <div class="frame">
    <p class="eyebrow">${type} · PocketDNA · Diagram Design</p>
    <h1>${title}</h1>
    <div class="diagram-container">
      <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${slug}-title ${slug}-desc">
        <title id="${slug}-title">${title}</title>
        <desc id="${slug}-desc">${desc}</desc>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="${T.muted}"/></marker>
          <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="${T.accent}"/></marker>
          <marker id="arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="${T.link}"/></marker>
          <marker id="arrow-open" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polyline points="0 0, 8 3, 0 6" fill="none" stroke="${T.muted}" stroke-width="1.2"/></marker>
        </defs>
        <rect width="100%" height="100%" fill="${T.paper}"/>
${body}
      </svg>
    </div>
  </div>
</body>
</html>
`;
}

/* =========================================================================
 * 01 · System architecture
 * ========================================================================= */
function architecture() {
  const W = 1280, H = 600;
  const body = [
    zone({ x: 40, y: 88, w: 408, h: 328, title: "BROWSER · LOCALHOST" }),
    zone({ x: 512, y: 192, w: 432, h: 328, title: "NODE · HONO · :8000" }),
    zone({ x: 960, y: 192, w: 208, h: 328, title: "META MUSE API", dashed: true }),

    /* arrows */
    arrow("M 264,240 H 152 Q 144,240 144,232 V 184"),                       // app -> worker (raw file)
    arrow("M 224,152 H 312 Q 320,152 320,160 V 224"),                       // worker -> app (findings)
    arrow("M 264,272 H 152 Q 144,272 144,280 V 328"),                       // app -> reel
    arrow("M 224,136 H 656 Q 664,136 664,144 V 224", { style: "link", dashed: true }), // worker -> api bundle
    arrow("M 424,240 H 536", { style: "link" }),                             // app -> api
    arrow("M 536,272 H 424", { dashed: true }),                              // api -> app sse
    arrow("M 616,288 V 328"),                                                // api -> orchestrator
    arrow("M 696,360 H 760"),                                                // orchestrator -> adapter
    arrow("M 840,392 V 432"),                                                // adapter -> cache
    arrow("M 920,344 H 1072 Q 1080,344 1080,336 V 288", { style: "link" }), // adapter -> spark
    arrow("M 920,376 H 1040 Q 1048,376 1048,384 V 432", { style: "link" }), // adapter -> image

    /* labels */
    sideLabel(136, 200, "RAW FILE", "left"),
    sideLabel(328, 184, "FINDINGS", "right"),
    sideLabel(136, 296, "PLAN + ASSETS", "left"),
    label(416, 116, "REF BUNDLE", T.link),
    label(480, 220, "POST /API/JOBS", T.link),
    label(480, 280, "SSE PROGRESS"),
    sideLabel(624, 302, "RUN JOB", "right"),
    label(728, 340, "PAID CALL"),
    sideLabel(848, 406, "CACHE · COST", "right"),
    label(996, 324, "JSON SCHEMA", T.link),
    label(980, 384, "RESPONSES API", T.link),

    /* nodes */
    node({ x: 64, y: 120, kind: "security", tag: "WORKER", name: "Ancestry worker", subs: ["PCA-25 · fits · in-memory"] }),
    node({ x: 264, y: 224, kind: "input", tag: "SPA", name: "React app", subs: ["upload · correct · play"] }),
    node({ x: 64, y: 328, kind: "backend", tag: "REEL", name: "Reel engine + globe", subs: ["t-driven · Three.js"] }),
    node({ x: 536, y: 224, kind: "backend", tag: "API", name: "Hono API", subs: ["/api/jobs · SSE · bundle"] }),
    node({ x: 536, y: 328, kind: "backend", tag: "ORCH", name: "Orchestrator", subs: ["pipeline.ts · gazetteer"] }),
    node({ x: 760, y: 328, kind: "focal", tag: "ADAPTER", name: "Muse adapter", subs: ["callJson · callImage"] }),
    node({ x: 760, y: 432, kind: "store", tag: "LOCAL", name: "Cache + cost log", subs: [".local/ · sha256 keys"] }),
    node({ x: 984, y: 224, kind: "external", tag: "LLM", name: "Muse Spark", subs: ["muse-spark-1.3"] }),
    node({ x: 984, y: 432, kind: "external", tag: "IMG", name: "Muse Image", subs: ["muse-image-1.0"] }),

    callout({ x: 1240, y: 56, text: "Raw genotypes never leave the worker; only a derived summary crosses.", leader: "M 882,60 Q 600,56 304,86", dot: [300, 88] }),
    callout({ x: 40, y: 468, anchor: "start", text: "Every paid call passes one adapter: kill switch, $5 run cap, cache, JSON schema, one retry.", leader: "M 508,464 Q 640,460 756,386", dot: [760, 384] }),

    legend({ y: 540, x1: 1240, items: [
      { kind: "swatch", treat: "focal", text: "Focal: the one paid-call gate" },
      { kind: "swatch", treat: "security", text: "Privacy boundary" },
      { kind: "swatch", treat: "backend", text: "First-party code" },
      { kind: "swatch", treat: "store", text: "Local files" },
      { kind: "swatch", treat: "external", text: "Hosted model" },
      { kind: "swatch", treat: "input", text: "User-facing" },
      { kind: "arrow", style: "link", text: "HTTP" },
      { kind: "arrow", text: "In-process" },
      { kind: "arrow", dashed: true, text: "Return / stream" },
    ] }),
  ].join("\n");
  return page({ slug: "architecture", type: "Architecture", title: "How PocketDNA runs on one laptop", width: W, height: H, body,
    desc: "Architecture diagram showing the browser app and its in-memory ancestry worker, the local Hono server with the pipeline orchestrator and the single Muse adapter, and the hosted Muse Spark and Muse Image models behind it." });
}

/* =========================================================================
 * 02 · Input to evidence
 * ========================================================================= */
function inputEvidence() {
  const W = 1280, H = 520;
  const body = [
    zone({ x: 40, y: 104, w: 880, h: 112, title: "SCREENSHOT TIER · SERVER · MUSE SPARK" }),
    zone({ x: 40, y: 296, w: 880, h: 112, title: "RAW DNA TIER · BROWSER WORKER · NO MODEL" }),

    arrow("M 224,168 H 272"),
    arrow("M 432,168 H 480"),
    arrow("M 640,168 H 688"),
    arrow("M 848,168 H 1032 Q 1040,168 1040,176 V 232"),
    arrow("M 368,200 V 232"),
    arrow("M 520,200 V 248 Q 520,256 512,256 H 464", { dashed: true }),
    arrow("M 224,360 H 272"),
    arrow("M 432,360 H 480"),
    arrow("M 640,360 H 1032 Q 1040,360 1040,352 V 296"),

    label(940, 148, "PROVIDER"),
    sideLabel(376, 208, "R1 · R2", "right"),
    sideLabel(528, 216, "UNREADABLE", "right"),
    label(836, 368, "DERIVED ONLY"),

    node({ x: 64, y: 136, kind: "input", tag: "PNG·JPG", name: "Screenshot", subs: ["≤10 MB · sniffed"] }),
    node({ x: 272, y: 136, kind: "backend", tag: "SPARK", name: "Gatekeeper", subs: ["low · vendor · health?"] }),
    node({ x: 480, y: 136, kind: "backend", tag: "SPARK", name: "Extractor", subs: ["medium · shares · omitted"] }),
    node({ x: 688, y: 136, kind: "input", tag: "USER", name: "Correction table", subs: ["confirm/edit before pay"] }),
    terminal({ x: 304, y: 232, name: "Rejected · R1 / R2" }),
    node({ x: 64, y: 328, kind: "input", tag: "TXT·ZIP", name: "Raw export", subs: ["≤50 MB · never uploaded"] }),
    node({ x: 272, y: 328, kind: "security", tag: "WORKER", name: "Parse + QC", subs: ["harmonize · call rate"] }),
    node({ x: 480, y: 328, kind: "security", tag: "WORKER", name: "Project + fit", subs: ["PCA-25 · era NNLS · boot"] }),
    node({ x: 960, y: 232, kind: "focal", tag: "V1", name: "EvidenceRecord", subs: ["provider | raw"] }),

    callout({ x: 1240, y: 56, text: "Only the raw branch carries measured results; a screenshot proves what the provider reported.", leader: "M 1180,62 Q 1200,140 1124,246", dot: [1120, 248] }),
    callout({ x: 1240, y: 444, text: "The server schema is strict: any genotype or coordinate field is a 400, never forwarded.", leader: "M 792,440 Q 650,440 564,396", dot: [560, 392] }),

    legend({ y: 468, x1: 1240, items: [
      { kind: "swatch", treat: "input", text: "User input" },
      { kind: "swatch", treat: "backend", text: "Spark agent (effort shown)" },
      { kind: "swatch", treat: "security", text: "Deterministic worker · genotypes stay here" },
      { kind: "swatch", treat: "focal", text: "Shared contract" },
      { kind: "terminal", text: "Typed rejection" },
      { kind: "arrow", text: "Handoff" },
      { kind: "arrow", dashed: true, text: "Unreadable" },
    ] }),
  ].join("\n");
  return page({ slug: "input-evidence", type: "Flowchart", title: "Two inputs, one EvidenceRecord", width: W, height: H, body,
    desc: "Flowchart showing a screenshot passing Spark gatekeeper, extractor and user correction, and a raw DNA export analysed entirely in the browser worker, both ending in one discriminated EvidenceRecord." });
}

/* =========================================================================
 * 03 · Evidence to film
 * ========================================================================= */
function evidenceFilm() {
  const W = 1280, H = 540;
  const body = [
    arrow("M 200,168 H 240"),
    arrow("M 400,168 H 440"),
    arrow("M 600,168 H 640"),
    arrow("M 800,168 H 840"),
    arrow("M 1000,168 H 1040"),
    arrow("M 1120,136 V 104 Q 1120,96 1112,96 H 728 Q 720,96 720,104 V 136", { dashed: true }),
    arrow("M 1120,200 V 328", { style: "accent" }),
    arrow("M 1040,360 H 976"),
    arrow("M 816,360 H 752"),

    label(920, 76, "REVISE · ONCE"),
    sideLabel(1128, 258, "BOTH PASS", "right", T.accent),
    label(1008, 340, "SCENES"),
    label(784, 340, "ASSETS"),

    node({ x: 40, y: 136, kind: "input", tag: "V1", name: "EvidenceRecord", subs: ["provider | raw"] }),
    node({ x: 240, y: 136, kind: "backend", tag: "SPARK HI", name: "Population profiler", subs: ["raw only · gazetteer"] }),
    node({ x: 440, y: 136, kind: "backend", tag: "SPARK HI", name: "Interpretation", subs: ["cited claims · index"] }),
    node({ x: 640, y: 136, kind: "backend", tag: "SPARK HI", name: "Director", subs: ["ReelPlan v1 · 7–9 beats"] }),
    node({ x: 840, y: 136, kind: "backend", tag: "SPARK HI", name: "Narrative auditor", subs: ["captions · numbers · cuts"] }),
    node({ x: 1040, y: 136, kind: "backend", tag: "SPARK HI", name: "Compliance auditor", subs: ["ancestry-only firewall"] }),
    node({ x: 1040, y: 328, kind: "store", tag: "CODE", name: "Atlas scenes", subs: ["gazetteer only · d3-geo"] }),
    node({ x: 816, y: 328, kind: "backend", tag: "IMAGE", name: "Illustrate scenes", subs: ["muse-image + visual audit"] }),
    node({ x: 592, y: 328, kind: "focal", tag: "DONE", name: "Film ready", subs: ["ReelPlan + assets · SSE"] }),

    callout({ x: 1240, y: 56, text: "A second audit failure returns R4. No reel renders without both passes.", leader: "M 1236,62 Q 1244,120 1204,182", dot: [1200, 184] }),
    callout({ x: 40, y: 456, anchor: "start", text: "Approved copy is frozen before this row; atlas scenes and images add no claims.", leader: "M 448,452 Q 560,452 668,396", dot: [672, 392] }),

    legend({ y: 476, x1: 1240, items: [
      { kind: "swatch", treat: "input", text: "Input contract" },
      { kind: "swatch", treat: "backend", text: "Spark call (high effort)" },
      { kind: "swatch", treat: "store", text: "Deterministic code" },
      { kind: "swatch", treat: "focal", text: "Outcome" },
      { kind: "arrow", text: "Stage order" },
      { kind: "arrow", dashed: true, text: "One repair pass" },
      { kind: "arrow", style: "accent", text: "Render gate" },
    ] }),
  ].join("\n");
  return page({ slug: "evidence-film", type: "Process", title: "From evidence to an audited film", width: W, height: H, body,
    desc: "Process diagram showing Spark profiling, interpretation and direction, the narrative and compliance audits with one repair loop, then deterministic atlas scenes and reviewed images before the film is ready." });
}

/* =========================================================================
 * 04 · Agent swimlane
 * ========================================================================= */
function swimlane() {
  const W = 1280, H = 540;
  const lanes = [["ORCHESTRATOR", "PIPELINE"], ["WORKERS", "MUSE SPARK"], ["AUDITORS", "MUSE SPARK"], ["DETERMINISTIC", "NO MODEL"]];
  const laneTop = 80, laneH = 96;
  const body = [];
  body.push(`<line x1="40" y1="${laneTop}" x2="1240" y2="${laneTop}" stroke="${ink(0.22)}" stroke-width="1"/>`);
  lanes.forEach((l, i) => {
    const top = laneTop + i * laneH;
    if (i > 0) body.push(`<line x1="40" y1="${top}" x2="1240" y2="${top}" stroke="${ink(0.10)}" stroke-width="1"/>`);
    const mid = top + laneH / 2;
    body.push(`<text x="56" y="${mid - 2}" fill="${T.muted}" font-size="9" font-family="${FONT_MONO}" letter-spacing="0.18em">${l[0]}</text>`);
    body.push(`<text x="56" y="${mid + 10}" fill="${T.soft}" font-size="7" font-family="${FONT_MONO}" letter-spacing="0.14em">${l[1]}</text>`);
  });
  body.push(`<line x1="40" y1="${laneTop + 4 * laneH}" x2="1240" y2="${laneTop + 4 * laneH}" stroke="${ink(0.22)}" stroke-width="1"/>`);
  body.push(`<line x1="160" y1="${laneTop}" x2="160" y2="${laneTop + 4 * laneH}" stroke="${ink(0.22)}" stroke-width="1"/>`);

  body.push(
    arrow("M 312,128 H 384 Q 392,128 392,136 V 192"),
    arrow("M 488,224 H 536"),
    arrow("M 664,224 H 712"),
    arrow("M 792,256 V 288"),
    arrow("M 760,288 V 256", { dashed: true }),
    arrow("M 840,304 H 856 Q 864,304 864,296 V 232 Q 864,224 872,224 H 888", { style: "accent" }),
    arrow("M 968,256 V 288"),
    arrow("M 1016,320 H 1120 Q 1128,320 1128,328 V 384"),
    arrow("M 776,352 V 408 Q 776,416 784,416 H 1064"),

    sideLabel(400, 152, "DISPATCH", "right"),
    sideLabel(800, 266, "DRAFT", "right"),
    sideLabel(752, 266, "REVISE", "left"),
    sideLabel(872, 260, "BOTH PASS", "right", T.accent),
    sideLabel(976, 266, "IMAGE", "right"),
    label(1068, 300, "APPROVED"),
    label(924, 424, "APPROVED PLAN"),

    node({ x: 184, y: 96, w: 128, kind: "backend", tag: "ORCH", name: "Route + budget", subs: ["mode · cap $5 · kill"] }),
    node({ x: 360, y: 192, w: 128, kind: "backend", tag: "SPARK", name: "Gate + extract", subs: ["low · medium"] }),
    node({ x: 536, y: 192, w: 128, kind: "backend", tag: "SPARK", name: "Profile + cite", subs: ["high · gazetteer"] }),
    node({ x: 712, y: 192, w: 128, kind: "backend", tag: "SPARK", name: "Director", subs: ["high · ReelPlan"] }),
    node({ x: 712, y: 288, w: 128, kind: "backend", tag: "SPARK", name: "Two auditors", subs: ["narrative · rules"] }),
    node({ x: 888, y: 192, w: 128, kind: "backend", tag: "IMAGE", name: "Image agent", subs: ["6 scenes · conc 2"] }),
    node({ x: 888, y: 288, w: 128, kind: "backend", tag: "SPARK", name: "Visual auditor", subs: ["pass · fallback"] }),
    node({ x: 1064, y: 384, w: 128, kind: "focal", tag: "CODE", name: "Assemble film", subs: ["atlas · t-driven"] }),

    callout({ x: 420, y: 120, anchor: "start", text: "Every step pushes a progress event; the browser follows it over SSE.", leader: "M 412,116 Q 380,112 316,104", dot: [312, 104] }),

    legend({ y: 492, x1: 1240, items: [
      { kind: "swatch", treat: "backend", text: "Role (Muse Spark unless marked)" },
      { kind: "swatch", treat: "focal", text: "Deterministic outcome" },
      { kind: "arrow", text: "Handoff" },
      { kind: "arrow", dashed: true, text: "Revision loop (once)" },
      { kind: "arrow", style: "accent", text: "Render gate" },
    ] }),
  );
  return page({ slug: "agents", type: "Swimlane", title: "Who hands what to whom", width: W, height: H, body: body.join("\n"),
    desc: "Swimlane diagram of the PocketDNA runtime roles: the orchestrator dispatches work, Spark workers extract, cite and direct, Spark auditors gate the plan and images, and deterministic code assembles the film." });
}

/* =========================================================================
 * 05 · Muse adapter sequence
 * ========================================================================= */
function museSequence() {
  const W = 1160, H = 760;
  const L = { stage: 120, adapter: 360, cache: 600, api: 840, cost: 1040 };
  const lifeline = (x) => `<line x1="${x}" y1="128" x2="${x}" y2="696" stroke="${ink(0.22)}" stroke-width="1" stroke-dasharray="3,3"/>`;
  const activation = (x, y, h) => `<rect x="${x - 4}" y="${y}" width="8" height="${h}" fill="${ink(0.06)}" stroke="${T.muted}" stroke-width="0.8"/>`;
  const msg = (x1, x2, y, opts) => arrow(`M ${x1},${y} H ${x2}`, opts);
  const self = (x, y) => arrow(`M ${x + 4},${y} H ${x + 44} V ${y + 24} H ${x + 8}`);
  const actor = (x, kind, tag, name, sub) => node({ x: x - 72, y: 72, w: 144, h: 56, kind, tag, name, subs: [sub] });
  const body = [
    lifeline(L.stage), lifeline(L.adapter), lifeline(L.cache), lifeline(L.api), lifeline(L.cost),
    activation(L.adapter, 176, 488),
    activation(L.cache, 256, 88),
    activation(L.cache, 584, 16),
    activation(L.api, 432, 40),
    activation(L.api, 552, 16),
    activation(L.cost, 616, 8),

    msg(L.stage + 4, L.adapter - 4, 176),
    self(L.adapter, 200),
    msg(L.adapter + 4, L.cache - 4, 256),

    /* ALT frame */
    `<rect x="232" y="288" width="856" height="344" rx="4" fill="${ink(0.04)}" stroke="${ink(0.22)}" stroke-width="1"/>`,
    `<rect x="232" y="288" width="40" height="16" rx="2" fill="${T.paper}" stroke="${ink(0.22)}" stroke-width="1"/>`,
    `<text x="252" y="300" fill="${T.muted}" font-size="8" font-family="${FONT_MONO}" text-anchor="middle" letter-spacing="0.12em">ALT</text>`,
    `<text x="244" y="324" fill="${T.muted}" font-size="8" font-family="${FONT_MONO}" letter-spacing="0.04em">[cache hit]</text>`,
    msg(L.cache - 4, L.adapter + 8, 344, { dashed: true }),
    `<line x1="240" y1="376" x2="1080" y2="376" stroke="${ink(0.20)}" stroke-width="1" stroke-dasharray="4,3"/>`,
    `<text x="244" y="400" fill="${T.muted}" font-size="8" font-family="${FONT_MONO}" letter-spacing="0.04em">[else · miss]</text>`,
    msg(L.adapter + 4, L.api - 4, 432, { style: "link" }),
    msg(L.api - 4, L.adapter + 8, 472, { dashed: true }),
    self(L.adapter, 496),
    msg(L.adapter + 4, L.api - 4, 552, { style: "link" }),
    msg(L.adapter + 4, L.cache - 4, 584),
    msg(L.adapter + 4, L.cost - 4, 616, { dashed: true, open: true }),

    msg(L.adapter - 4, L.stage + 8, 664, { style: "accent" }),

    label(240, 160, "CALLJSON(OPTS)"),
    sideLabel(412, 206, "KILL · CAP $5", "right"),
    label(480, 240, "SHA256 KEY"),
    label(480, 328, "HIT · $0"),
    label(720, 416, "POST /CHAT", T.link),
    label(480, 456, "COMPLETION"),
    sideLabel(412, 502, "ZOD · RETRY ×1", "right"),
    label(720, 536, "RETRY + ERROR", T.link),
    label(480, 568, "PUT VALIDATED"),
    label(940, 600, "APPEND USD"),
    label(240, 648, "TYPED RESULT", T.accent),

    actor(L.stage, "input", "STAGE", "Pipeline stage", "pipeline.ts"),
    actor(L.adapter, "focal", "ADAPTER", "Muse adapter", "client.ts"),
    actor(L.cache, "store", "FS", "Local cache", ".local/muse-cache"),
    actor(L.api, "external", "HTTPS", "Meta API", "muse-spark-1.3"),
    actor(L.cost, "store", "LOG", "Cost log", "muse-cost.jsonl"),

    callout({ x: 1120, y: 48, text: "Muse Image takes the same gate via /responses ($0.01 per image); bytes never enter logs.", leader: "M 1000,54 Q 940,52 904,70", dot: [900, 72] }),

    legend({ y: 712, x1: 1120, items: [
      { kind: "swatch", treat: "focal", text: "Focal: the only module that spends money" },
      { kind: "frame", text: "Cache branch" },
      { kind: "arrow", style: "link", text: "HTTPS call" },
      { kind: "arrow", dashed: true, text: "Return" },
      { kind: "arrow", dashed: true, open: true, text: "Async append" },
      { kind: "arrow", style: "accent", text: "Validated result" },
    ] }),
  ].join("\n");
  return page({ slug: "muse-call", type: "Sequence", title: "What one Muse call goes through", width: W, height: H, body, maxWidth: 1160,
    desc: "Sequence diagram of callJson in the Muse adapter: kill switch and run cap, content-addressed cache lookup, Meta API chat completion with a JSON schema, Zod validation with one retry, cache write, cost log append and a typed result." });
}

/* =========================================================================
 * 06 · HistoricalImageAgent state machine
 * ========================================================================= */
function imageAgentState() {
  const W = 1240, H = 640;
  const state = (x, y, kind, name, sub) => node({ x, y, kind, tag: "STATE", name, subs: [sub], rx: 8 });
  const body = [
    arrow("M 62,192 H 120"),
    arrow("M 280,192 H 336"),
    arrow("M 496,192 H 552"),
    arrow("M 712,192 H 768"),
    arrow("M 848,224 V 336"),
    arrow("M 768,368 H 696"),
    arrow("M 616,336 C 616,264 800,264 800,336", { dashed: true }),
    arrow("M 928,360 H 984", { style: "accent" }),
    arrow("M 848,400 V 472 Q 848,480 856,480 H 984"),
    arrow("M 1144,368 H 1188"),
    arrow("M 1144,480 H 1188"),

    label(92, 172, "JOB"),
    label(308, 172, "VALIDATE"),
    label(524, 172, "BRIEF OK"),
    label(740, 172, "BUDGET OK"),
    sideLabel(856, 274, "CANDIDATE", "right"),
    label(732, 348, "ONE REPAIR"),
    label(708, 262, "RE-AUDIT"),
    label(956, 340, "PASS", T.accent),
    sideLabel(856, 424, "FALLBACK", "right"),

    `<circle cx="56" cy="192" r="6" fill="${T.ink}"/>`,
    state(120, 160, "backend", "Queued", "validate scene · mode"),
    state(336, 160, "backend", "Researching", "brief · sources · dates"),
    state(552, 160, "backend", "Prompt ready", "HIST-IMAGE-01 compiled"),
    state(768, 160, "backend", "Generating", "muse-image · 9:16 · png"),
    state(536, 336, "optional", "Repairing", "HIST-REPAIR-01 · ≤1/scene"),
    state(768, 336, "backend", "Auditing", "HIST-AUDIT-01 · Spark vision"),
    state(984, 336, "focal", "Approved", "manifest · hash · label"),
    state(984, 448, "store", "Fallback", "reviewed plate · honest label"),
    state(120, 336, "optional", "Cancelled / failed", "no late result enters"),
    `<circle cx="1196" cy="368" r="8" fill="none" stroke="${T.ink}" stroke-width="1"/>`,
    `<circle cx="1196" cy="368" r="5" fill="${T.ink}"/>`,
    `<circle cx="1196" cy="480" r="8" fill="none" stroke="${T.ink}" stroke-width="1"/>`,
    `<circle cx="1196" cy="480" r="5" fill="${T.ink}"/>`,

    callout({ x: 192, y: 548, anchor: "start", text: "Any state → cancelled / failed on cancel, uncertain timeout or exhausted budget.", leader: "M 184,544 Q 176,470 200,404", dot: [200, 400] }),
    callout({ x: 1200, y: 572, text: "images.ts v1 skips repair: a failed audit goes straight to fallback; AGENT.md allows one repair per scene.", leader: "M 676,566 Q 640,500 604,404", dot: [600, 400] }),

    legend({ y: 596, x1: 1200, items: [
      { kind: "swatch", treat: "backend", text: "Agent state" },
      { kind: "swatch", treat: "optional", text: "Specified, not yet in code" },
      { kind: "swatch", treat: "focal", text: "Approved asset" },
      { kind: "swatch", treat: "store", text: "Honest substitute" },
      { kind: "arrow", text: "Transition" },
      { kind: "arrow", dashed: true, text: "Repair loop" },
      { kind: "arrow", style: "accent", text: "Happy path" },
    ] }),
  ].join("\n");
  return page({ slug: "image-agent", type: "State machine", title: "One historical scene, from job to asset", width: W, height: H, body, maxWidth: 1240,
    desc: "State machine for the HistoricalImageAgent: queued, researching, prompt ready, generating, auditing, an optional single repair, then approved or fallback, with cancellation and failure reachable from any state." });
}

/* =========================================================================
 * 07 · Muse model map (tree)
 * ========================================================================= */
function modelMap() {
  const W = 1200, H = 520;
  const edge = (d, dashed = false) => `<path d="${d}" fill="none" stroke="${T.muted}" stroke-width="1"${dashed ? ` stroke-dasharray="4,3"` : ""}/>`;
  const body = [
    edge("M 600,120 V 152"),
    edge("M 388,152 H 1080"),
    edge("M 388,152 V 192"),
    edge("M 820,152 V 192"),
    edge("M 1080,152 V 192", true),
    edge("M 388,256 V 288"),
    edge("M 164,288 H 612"),
    edge("M 164,288 V 320"),
    edge("M 388,288 V 320"),
    edge("M 612,288 V 320"),
    edge("M 820,256 V 320"),

    node({ x: 520, y: 56, kind: "focal", tag: "SERVER", name: "Muse adapter", subs: ["src/lib/muse/client.ts"] }),
    node({ x: 308, y: 192, kind: "external", tag: "LLM", name: "Muse Spark", subs: ["$1.25 in · $4.25 out /M"] }),
    node({ x: 740, y: 192, kind: "external", tag: "IMG", name: "Muse Image", subs: ["$0.01 per image"] }),
    node({ x: 1000, y: 192, kind: "optional", tag: "DEV", name: "Muse Wonder", subs: ["dev + research only"] }),
    node({ x: 64, y: 320, w: 200, h: 112, kind: "backend", tag: "EFFORT", name: "Low", subs: ["temp 0.2 · 1024 tok", "gatekeeper"] }),
    node({ x: 288, y: 320, w: 200, h: 112, kind: "backend", tag: "EFFORT", name: "Medium", subs: ["temp 0.4 · 2048 tok", "extractor · visual auditor"] }),
    node({ x: 512, y: 320, w: 200, h: 112, kind: "backend", tag: "EFFORT", name: "High", subs: ["temp 0.7 · 8192 tok", "profiler · interpretation", "director · two auditors"] }),
    node({ x: 720, y: 320, w: 200, h: 112, kind: "backend", tag: "TOOL", name: "Historical scenes", subs: ["HIST-IMAGE-01 · 9:16", "≤6 per episode · conc 2", "audited by Spark vision"] }),

    callout({ x: 1160, y: 36, text: "One gate for every paid call: kill switch · $5 cap · sha256 cache · schema + Zod · retry once · cost log.", leader: "M 596,40 Q 620,40 640,52", dot: [640, 56] }),

    legend({ y: 464, x1: 1160, items: [
      { kind: "swatch", treat: "focal", text: "Server-only adapter" },
      { kind: "swatch", treat: "external", text: "Hosted Muse model" },
      { kind: "swatch", treat: "backend", text: "Effort tier · stages that use it" },
      { kind: "swatch", treat: "optional", text: "Not a runtime dependency" },
    ] }),
  ].join("\n");
  return page({ slug: "model-map", type: "Tree", title: "Which Muse model does what, at which effort", width: W, height: H, body, maxWidth: 1200,
    desc: "Tree showing the server-only Muse adapter above Muse Spark, Muse Image and the development-only Muse Wonder, with Spark's low, medium and high effort tiers mapped to the pipeline stages that use them." });
}

const FILES = {
  "01-system-architecture.html": architecture,
  "02-input-to-evidence.html": inputEvidence,
  "03-evidence-to-film.html": evidenceFilm,
  "04-agent-swimlane.html": swimlane,
  "05-muse-call-sequence.html": museSequence,
  "06-image-agent-state.html": imageAgentState,
  "07-muse-model-map.html": modelMap,
};

for (const [file, build] of Object.entries(FILES)) {
  writeFileSync(join(HERE, file), build());
  process.stdout.write(`wrote ${file}\n`);
}
