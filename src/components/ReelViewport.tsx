/** 9:16 documentary viewport (mockup right column). Same frameAt(t) as export. */

import { useEffect, useRef, useState } from "react";
import type { ViewingBundle } from "../contracts/index";
import { frameAt } from "../reel/engine";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { Waveform } from "./Waveform";

const PLATES: Record<string, string> = {
  "asset-steppe-horseman": "linear-gradient(180deg,#3a2a18 0%,#141210 55%,#0a0908 100%)",
  "asset-method-panel": "linear-gradient(180deg,#18181b 0%,#0a0908 100%)",
  "asset-market-town": "linear-gradient(180deg,#1e2a22 0%,#0a0908 100%)",
  "asset-harbor": "linear-gradient(180deg,#1a2233 0%,#0a0908 100%)",
  "asset-convergence-globe": "linear-gradient(180deg,#0f1715 0%,#0a0908 100%)",
  "asset-stamp-dark": "linear-gradient(180deg,#0a0908 0%,#000000 100%)",
};

function MapOverlay({ origin, paths }: { origin: [number, number]; paths: Array<{ to: [number, number]; label: string | null }> }): React.JSX.Element {
  return (
    <svg viewBox="0 0 100 60" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
      <circle cx={origin[0]} cy={origin[1]} r={2.2} fill="#EEB057" />
      {paths.map((p, i) => (
        <g key={i}>
          <line x1={origin[0]} y1={origin[1]} x2={p.to[0]} y2={p.to[1]} stroke="#EEB057" strokeWidth={0.7} strokeLinecap="round" />
          <circle cx={p.to[0]} cy={p.to[1]} r={1.4} fill="#C8F45B" />
        </g>
      ))}
    </svg>
  );
}

export function ReelViewport({ bundle }: { bundle: ViewingBundle }): React.JSX.Element {
  const { plan, evidence, claims } = bundle;
  const params = new URLSearchParams(window.location.search);
  const staticT = params.get("static") === "1" && params.get("t") !== null ? Number(params.get("t")) : undefined;

  const [liveT, setLiveT] = useState(0);
  const [playing, setPlaying] = useState(
    staticT === undefined && !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const headlineRef = useRef<HTMLButtonElement>(null);
  const tRef = useRef(0);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  const t = staticT ?? liveT;

  useEffect(() => {
    if (staticT !== undefined) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number): void => {
      if (playingRef.current && tRef.current < plan.duration_s) {
        tRef.current = Math.min(tRef.current + (now - last) / 1000, plan.duration_s);
        setLiveT(tRef.current);
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [plan.duration_s, staticT]);

  const frame = frameAt(plan, t);
  const beat = plan.beats[frame.beatIndex];
  const beatClaims = claims.filter((c) => beat.claimIds.includes(c.id));

  function closeEvidence(): void {
    setEvidenceOpen(false);
    headlineRef.current?.focus();
  }
  const eraBeats = plan.beats.filter((b) => b.era !== undefined);

  function seek(beatIndex: number): void {
    const target = plan.beats[beatIndex];
    tRef.current = target.tStart;
    setLiveT(target.tStart);
    setEvidenceOpen(false);
    if (staticT !== undefined) return;
  }

  async function share(): Promise<void> {
    const payload = { title: "PocketDNA", text: "Watch my origins on PocketDNA.", url: window.location.href };
    if (navigator.share !== undefined) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard?.writeText(window.location.href);
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative h-[670px] w-full max-w-[375px] rounded-[36px] bg-background-obsidian p-3 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9)]">
        <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] bg-surface-charcoal select-none">
          <div
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ background: PLATES[beat.assetId] ?? PLATES["asset-stamp-dark"], opacity: frame.sceneAlpha }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background-obsidian/85 via-transparent to-background-obsidian/95" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background-obsidian via-background-obsidian/30 to-transparent" />
          {beat.mapPaths.length > 0 && <MapOverlay origin={[60, 47]} paths={beat.mapPaths} />}
          <span className="absolute bottom-24 left-5 z-10 rounded-full bg-black/50 px-2 py-0.5 font-mono text-[11px] text-white/60">
            Illustration (reconstruction)
          </span>
          {beat.coords !== null && (
            <div className="pointer-events-none absolute right-4 top-24 font-mono text-[11px] tracking-widest text-archival-amber/70">
              {beat.coords}
            </div>
          )}

          <div className="relative z-20 flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 overflow-x-hidden">
                {eraBeats.map((b) => {
                  const active = b.id === beat.id || (beat.era !== undefined && b.era === beat.era);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => seek(plan.beats.indexOf(b))}
                      className={
                        active
                          ? "flex min-h-9 items-center whitespace-nowrap rounded-full bg-archival-amber px-2.5 text-[11px] font-semibold text-surface-container-lowest"
                          : "flex min-h-9 items-center whitespace-nowrap rounded-full bg-surface-charcoal/80 px-2.5 text-[11px] text-text-muted hover:text-on-surface"
                      }
                    >
                      {b.era === "bronze" ? "Bronze Age" : b.era === "middle" ? "Middle Ages" : "Modern Period"}
                    </button>
                  );
                })}
              </div>
              <span className="font-mono text-[11px] text-text-muted">{Math.floor(t)}s / {plan.duration_s}s</span>
            </div>
            <div className="grid w-full gap-1.5 pt-1" style={{ gridTemplateColumns: `repeat(${plan.beats.length}, 1fr)` }}>
              {plan.beats.map((b, i) => {
                const fill = t >= b.tEnd ? 100 : t <= b.tStart ? 0 : ((t - b.tStart) / (b.tEnd - b.tStart)) * 100;
                return (
                  <button
                    key={b.id}
                    type="button"
                    aria-label={`Beat ${i + 1}: ${b.category}`}
                    onClick={() => seek(i)}
                    className="flex h-6 items-center"
                  >
                    <span className="relative block h-1 w-full overflow-hidden rounded-full bg-surface-container-high">
                      <span className="absolute inset-y-0 left-0 bg-archival-amber transition-[width] ease-linear" style={{ width: `${fill}%` }} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative z-20 flex flex-col items-start gap-4 px-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-charcoal/90 px-3 py-1 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-bio-lime" />
              <span className="font-mono text-[11px] font-semibold uppercase text-on-surface-variant">
                {bundle.mode === "replay" ? "Saved episode · replay" : "Live episode"}
              </span>
            </div>
            <button
              ref={headlineRef}
              type="button"
              aria-haspopup="dialog"
              onClick={() => {
                setPlaying(false);
                setEvidenceOpen(true);
              }}
              className="group w-full rounded-2xl bg-surface-container-lowest/60 p-3.5 text-left backdrop-blur-md transition-colors hover:bg-surface-container-lowest/80"
            >
              <span className="flex items-center gap-1.5 pb-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-archival-amber">{beat.category}</span>
              </span>
              <span className="block text-[32px] font-light leading-tight text-text-primary group-hover:text-archival-amber">
                {beat.headline}
              </span>
              <span className="block pt-1 text-sm text-text-muted">{beat.subtext}</span>
            </button>
          </div>

          <div className="relative z-20 flex flex-col gap-3 bg-gradient-to-t from-background-obsidian via-background-obsidian/90 to-transparent p-4">
            <Waveform />
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="flex min-h-10 items-center gap-2 rounded-full bg-surface-charcoal px-3.5 text-xs text-text-primary transition-colors hover:bg-surface-container"
              >
                <span className="text-archival-amber">{playing ? "❚❚" : "▶"}</span>
                <span>{playing ? "Playing" : "Paused"}</span>
              </button>
              <button
                type="button"
                onClick={() => void share()}
                className="flex min-h-10 items-center gap-1.5 rounded-full bg-surface-charcoal px-3 text-xs text-on-surface transition-colors hover:bg-surface-container"
              >
                <span>Export 9:16</span>
              </button>
            </div>
          </div>
          {evidenceOpen && (
            <EvidenceDrawer claims={beatClaims} evidence={evidence} beat={beat} onClose={closeEvidence} />
          )}
        </div>
      </div>
      <p className="max-w-xs pt-4 text-center text-sm text-text-muted">
        Interactive documentary viewport. Tap any stat overlay in the reel to explore archaeological citations.
      </p>
    </div>
  );
}
