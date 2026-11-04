/** Landing (mockup asymmetric grid): story left, 9:16 viewport right. */

import { useEffect, useRef, useState } from "react";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Hero } from "../components/Hero";
import { ProcessingLog } from "../components/ProcessingLog";
import { ReelViewport } from "../components/ReelViewport";
import { RejectionNotice, type NoticeKind } from "../components/RejectionNotice";
import { UploadCard } from "../components/UploadCard";
import { REPLAY } from "../contracts/fixtures";
import type { ProgressEvent, ViewingBundle } from "../contracts/index";
import { ApiError, createJob, getJob, subscribeJob } from "../lib/api";

type Phase =
  | { kind: "idle" }
  | { kind: "processing"; jobId: string; events: ProgressEvent[] }
  | { kind: "error"; notice: NoticeKind; message: string };

export function Landing(): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [bundle, setBundle] = useState<ViewingBundle>(REPLAY);
  const [playerKey, setPlayerKey] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<{ close: () => void } | null>(null);

  useEffect(() => () => streamRef.current?.close(), []);

  function show(bundleToShow: ViewingBundle): void {
    setBundle(bundleToShow);
    setPlayerKey((k) => k + 1);
    playerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function watchReplay(): void {
    streamRef.current?.close();
    setPhase({ kind: "idle" });
    show(REPLAY);
  }

  async function finish(jobId: string): Promise<void> {
    try {
      const status = await getJob(jobId);
      if (status.state === "done" && status.reel !== null && status.evidence !== null) {
        setPhase({ kind: "idle" });
        show({ mode: "live", plan: status.reel, evidence: status.evidence, claims: status.claims });
        return;
      }
      const notice = (status.rejection ?? "R4") as NoticeKind;
      setPhase({ kind: "error", notice, message: status.message });
    } catch (err) {
      setPhase({ kind: "error", notice: "R4", message: err instanceof ApiError ? err.message : "job lookup failed" });
    }
  }

  async function generate(file: File): Promise<void> {
    try {
      const created = await createJob(file);
      setPhase({ kind: "processing", jobId: created.job_id, events: [] });
      streamRef.current?.close();
      streamRef.current = subscribeJob(
        created.job_id,
        (event) =>
          setPhase((p) => (p.kind === "processing" && p.jobId === created.job_id ? { ...p, events: [...p.events, event] } : p)),
        (state) => {
          if (state === "done") void finish(created.job_id);
          else void finish(created.job_id);
        },
        () => {
          /* SSE dropped: fall back to a single status poll. */
          void finish(created.job_id);
        },
      );
    } catch (err) {
      const notice = (err instanceof ApiError ? err.code : "R4") as NoticeKind;
      setPhase({ kind: "error", notice, message: err instanceof ApiError ? err.message : "upload failed" });
    }
  }

  const busy = phase.kind === "processing";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background-obsidian text-on-surface antialiased">
      <div className="pointer-events-none fixed -top-40 left-1/2 z-0 h-[360px] w-[720px] -translate-x-1/2 bg-archival-amber/10 blur-[130px]" />
      <Header />
      <main className="relative z-10 w-full bg-background-obsidian pt-20">
        <div className="relative w-full overflow-hidden px-6 py-8 lg:px-12 lg:py-16">
          <div className="pointer-events-none absolute left-10 top-1/4 -z-10 h-96 w-96 rounded-full bg-archival-amber/10 blur-[140px]" />
          <div className="pointer-events-none absolute bottom-10 right-20 -z-10 h-[500px] w-[500px] rounded-full bg-bio-lime/5 blur-[160px]" />
          <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="flex flex-col gap-10 lg:col-span-7">
              <Hero />
              <UploadCard onWatchReplay={watchReplay} onGenerate={(file) => void generate(file)} busy={busy} />
              {phase.kind === "processing" && <ProcessingLog events={phase.events} />}
              {phase.kind === "error" && (
                <RejectionNotice kind={phase.notice} message={phase.message} onRetry={() => setPhase({ kind: "idle" })} onReplay={watchReplay} />
              )}
            </div>
            <div ref={playerRef} className="flex w-full flex-col items-center justify-center lg:col-span-5 lg:pt-[120px]">
              <ReelViewport key={playerKey} bundle={bundle} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
