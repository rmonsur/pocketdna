/** Spawn the raw-DNA worker and expose a promise API. */

import type { RawAnalysisResult } from "../features/ancestry/analyzeRaw";

export interface RawRunResult extends RawAnalysisResult {
  harmonization: { direct: number; complement: number; missing: number; absent: number; totalLines: number };
}

export function runRawAnalysis(file: File, onProgress: (step: string) => void): Promise<RawRunResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../features/ancestry/rawWorker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as { type: string; step?: string; result?: RawRunResult; message?: string };
      if (data.type === "progress" && data.step !== undefined) onProgress(data.step);
      if (data.type === "result" && data.result !== undefined) {
        worker.terminate();
        resolve(data.result);
      }
      if (data.type === "error") {
        worker.terminate();
        reject(new Error(data.message ?? "raw analysis failed"));
      }
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error("raw analysis worker failed"));
    };
    void file.text().then((text) => {
      worker.postMessage({
        text,
        bundleBase: `${window.location.origin}/api/bundle`,
        panelsUrl: `${window.location.origin}/api/era-panels`,
      });
    }, reject);
  });
}
