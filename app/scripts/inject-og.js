// Inject link-preview (OG/Twitter) meta into dist/index.html after `expo export`.
// SPA export builds the shell from app.json, which has no og:image slot; this
// post-step adds it deterministically. Idempotent. Run: node scripts/inject-og.js
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "dist", "index.html");
const TITLE = "PocketDNA — Your DNA results have a story. Watch it.";
const DESCRIPTION = "Drop your DNA test, get a 30-second cited documentary of your origins.";
const IMAGE = "/og-image.png";

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
