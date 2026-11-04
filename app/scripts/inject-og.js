// Inject link-preview (OG/Twitter) meta into dist/index.html after `expo export`.
// SPA export builds the shell from app.json, which has no og:image slot; this
// post-step adds it deterministically. Idempotent. Run: node scripts/inject-og.js
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "dist", "index.html");
const TITLE = "PocketDNA — Your DNA results have a story. Watch it.";
const DESCRIPTION = "Drop your DNA test, get a 30-second cited documentary of your origins.";
// Open Graph needs an absolute og:image for link previews. Set EXPO_PUBLIC_SITE_URL when
// hosting; unset (judges running locally) keeps a relative path and warns.
const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
if (!SITE_URL) {
  console.warn("EXPO_PUBLIC_SITE_URL unset: og:image stays relative (fine for local runs)");
}
const IMAGE = `${SITE_URL}/og-image.png`;

const TAGS = [
  `<meta property="og:title" content="${TITLE}">`,
  `<meta property="og:description" content="${DESCRIPTION}">`,
  `<meta property="og:type" content="website">`,
  `<meta property="og:image" content="${IMAGE}">`,
  `<meta name="twitter:card" content="summary_large_image">`,
  `<meta name="twitter:title" content="${TITLE}">`,
  `<meta name="twitter:description" content="${DESCRIPTION}">`,
  `<meta name="twitter:image" content="${IMAGE}">`,
].join("\n");

let html = fs.readFileSync(FILE, "utf8");
if (!html.includes("og:title")) {
  html = html.replace("</head>", `${TAGS}\n</head>`);
}
html = html.replace("<title>PocketDNA</title>", `<title>${TITLE}</title>`);
fs.writeFileSync(FILE, html);
console.log("injected OG tags into dist/index.html");
