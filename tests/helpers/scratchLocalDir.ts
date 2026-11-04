/** Import first: points muse diagnostics (cache, cost log) at a scratch directory before the client loads. */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.POCKETDNA_LOCAL_DIR = mkdtempSync(join(tmpdir(), "pocketdna-test-"));
