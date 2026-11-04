/**
 * Full-bleed reel for export and sharing: /reel?job=<id> shows a finished live
 * episode, /reel alone shows the saved replay. With ?static=1&t=<s> the
 * viewport renders one deterministic frame (used by scripts/export.mjs).
 */

import { useEffect, useState } from "react";
import { ReelViewport, type ReelAspect } from "../components/ReelViewport";
import { REPLAY } from "../contracts/fixtures";
import type { ViewingBundle } from "../contracts/index";
import { REPLAY_ASSETS } from "../contracts/replayAssets";
import { ApiError, getJob } from "../lib/api";

type State = { kind: "loading" } | { kind: "ready"; bundle: ViewingBundle } | { kind: "error"; message: string };

export function ReelPage(): React.JSX.Element {
  const params = new URLSearchParams(window.location.search);
  const jobId = params.get("job");
  const aspect: ReelAspect = params.get("aspect") === "landscape" ? "landscape" : "portrait";
  const [state, setState] = useState<State>(jobId === null ? { kind: "ready", bundle: { ...REPLAY, assets: REPLAY_ASSETS } } : { kind: "loading" });

  useEffect(() => {
    if (jobId === null) return;
    let cancelled = false;
    getJob(jobId)
      .then((status) => {
        if (cancelled) return;
        if (status.state === "done" && status.reel !== null && status.evidence !== null) {
          setState({ kind: "ready", bundle: { mode: "live", plan: status.reel, evidence: status.evidence, claims: status.claims, assets: status.assets } });
        } else {
          setState({ kind: "error", message: status.message !== "" ? status.message : `job is ${status.state}` });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ kind: "error", message: err instanceof ApiError ? err.message : "job lookup failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-on-surface" data-reel-ready={state.kind === "ready" ? "1" : "0"}>
      {state.kind === "ready" && <ReelViewport bundle={state.bundle} fullBleed aspect={aspect} />}
      {state.kind === "loading" && <p className="font-mono text-sm text-text-muted">Loading episode…</p>}
      {state.kind === "error" && <p className="font-mono text-sm text-archival-amber">{state.message}</p>}
    </div>
  );
}
