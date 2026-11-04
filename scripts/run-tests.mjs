import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const files = readdirSync("tests")
  .filter((name) => name.endsWith(".test.ts"))
  .sort()
  .map((name) => join("tests", name));
if (files.length === 0) throw new Error("No test files found");
const result = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "--test", ...files], { stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
