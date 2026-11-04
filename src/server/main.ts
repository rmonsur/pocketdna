/** Local bootstrap: Hono API + static dist on one localhost origin (STACK 10). */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { app } from "./app.ts";

const root = process.cwd();
if (existsSync(join(root, "dist", "index.html"))) {
  app.use("/*", serveStatic({ root: "./dist" }));
}

const port = Number(process.env.PORT ?? 8000);
serve({ fetch: app.fetch, port, hostname: "127.0.0.1" });
console.log(`PocketDNA local server on http://localhost:${port}`);
