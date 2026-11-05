/** Bootstrap: Hono API + static dist on one origin. Local by default; HOST=0.0.0.0 for a hosted deploy (Render). */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { app } from "./app.ts";

const root = process.cwd();
const indexHtml = join(root, "dist", "index.html");
if (existsSync(indexHtml)) {
  app.use("/*", serveStatic({ root: "./dist" }));
  /* SPA fallback: client routes such as /reel load the app shell. API paths keep their own 404s. */
  app.get("*", (c) => (c.req.path.startsWith("/api/") ? c.notFound() : c.html(readFileSync(indexHtml, "utf8"))));
}

const port = Number(process.env.PORT ?? 8000);
const hostname = process.env.HOST ?? "127.0.0.1";
serve({ fetch: app.fetch, port, hostname });
console.log(`PocketDNA server on http://${hostname}:${port}`);
