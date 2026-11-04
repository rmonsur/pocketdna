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
import { ApiError, createJob, createRawEpisode, extractPreview, getJob, subscribeJob, type ExtractedShares } from "../lib/api";
import { runRawAnalysis, type RawRunResult } from "../lib/rawAnalysis";
import { CorrectionTable } from "../components/CorrectionTable";
import { RawResult } from "../components/RawResult";

type Phase =
  | { kind: "idle" }
  | { kind: "processing"; jobId: string; events: ProgressEvent[] }
  | { kind: "extracting" }
  | { kind: "correct"; file: File; extracted: ExtractedShares }
  | { kind: "raw-processing"; step: string }
  | { kind: "raw-result"; result: RawRunResult }
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

  async function generateRaw(file: File): Promise<void> {
    if (file.name.toLowerCase().endsWith(".zip")) {
      setPhase({
        kind: "error",
        notice: "R2",
        message: "ZIP archives are not unpacked in the browser yet. Please upload the unzipped .txt export.",
      });
      return;
    }
    setPhase({ kind: "raw-processing", step: "Starting on-device analysis" });
    try {
      const result = await runRawAnalysis(file, (step) => setPhase({ kind: "raw-processing", step }));
      setPhase({ kind: "raw-result", result });
    } catch (err) {
      setPhase({ kind: "error", notice: "R3", message: err instanceof Error ? err.message : "raw analysis failed" });
    }
  }

  async function generate(file: File, tab: "screenshot" | "raw"): Promise<void> {
    if (tab === "raw") {
      await generateRaw(file);
      return;
    }
    setPhase({ kind: "extracting" });
    try {
      const extracted = await extractPreview(file);
      setPhase({ kind: "correct", file, extracted });
    } catch (err) {
      const notice = (err instanceof ApiError ? err.code : "R4") as NoticeKind;
      setPhase({ kind: "error", notice, message: err instanceof ApiError ? err.message : "extraction failed" });
    }
  }

  function watchJob(jobId: string): void {
    setPhase({ kind: "processing", jobId, events: [] });
    streamRef.current?.close();
    streamRef.current = subscribeJob(
      jobId,
      (event) =>
        setPhase((p) => (p.kind === "processing" && p.jobId === jobId ? { ...p, events: [...p.events, event] } : p)),
      () => void finish(jobId),
      () => {
        /* SSE dropped: fall back to a single status poll. */
        void finish(jobId);
      },
    );
  }

  async function startJob(file: File, corrected?: ExtractedShares): Promise<void> {
    try {
      const created = await createJob(file, corrected);
      watchJob(created.job_id);
    } catch (err) {
      const notice = (err instanceof ApiError ? err.code : "R4") as NoticeKind;
      setPhase({ kind: "error", notice, message: err instanceof ApiError ? err.message : "upload failed" });
    }
  }

  async function generateEpisode(result: RawRunResult): Promise<void> {
    try {
      const created = await createRawEpisode({
        basisId: result.basisId,
        markerCount: result.markers,
        usableMarkers: result.usableMarkers,
        epochs: result.eras.map((era) => ({
          era: era.era as "bronze" | "middle" | "modern",
          shares: era.shares
            .filter((s) => s.weight > 0)
            .slice(0, 12)
            .map((s) => ({ id: s.source_id, label: s.source_id, weight: s.weight, low: s.low, high: s.high })),
          closest: era.closest.map((c) => ({ label: c.source_id, distance: c.distance })),
        })),
        limitations: result.limitations,
      });
      watchJob(created.job_id);
    } catch (err) {
      const notice = (err instanceof ApiError ? err.code : "R4") as NoticeKind;
      setPhase({ kind: "error", notice, message: err instanceof ApiError ? err.message : "episode creation failed" });
    }
  }

  const busy = phase.kind === "processing" || phase.kind === "raw-processing" || phase.kind === "extracting";

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
              <UploadCard onWatchReplay={watchReplay} onGenerate={(file, tab) => void generate(file, tab)} busy={busy} />
              {phase.kind === "processing" && <ProcessingLog events={phase.events} />}
              {phase.kind === "extracting" && <p className="text-sm text-text-muted" role="status">Reading your screenshot…</p>}
              {phase.kind === "correct" && (
                <CorrectionTable
                  initial={phase.extracted}
                  onConfirm={(corrected) => void startJob(phase.file, corrected)}
                  onCancel={() => setPhase({ kind: "idle" })}
                />
              )}
              {phase.kind === "raw-processing" && (
                <p className="text-sm text-text-muted" role="status">{phase.step}…</p>
              )}
              {phase.kind === "raw-result" && (
                <RawResult result={phase.result} onGenerateEpisode={() => void generateEpisode(phase.result)} />
              )}
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
