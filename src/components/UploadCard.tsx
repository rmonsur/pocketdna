/** Upload card (mockup Section 2): tabs, dropzone, status badge, CTA. */

import { useDropzone } from "../hooks/useDropzone";

interface Props {
  onWatchReplay: () => void;
  onGenerate: (file: File) => void;
  busy: boolean;
}

const INSTRUCTIONS = {
  screenshot: "Upload a PNG/JPEG (up to 10 MB) of your 23andMe or AncestryDNA ancestry composition.",
  raw: "Supports 23andMe and AncestryDNA official raw text exports (.txt, .zip) up to 50 MB.",
} as const;

type Tab = keyof typeof INSTRUCTIONS;

export function UploadCard({ onWatchReplay, onGenerate, busy }: Props): React.JSX.Element {
  const { tab, setTab, file, notice, setNotice, fileInput, bindDrop, pickFile, onFiles } = useDropzone();

  function generate(): void {
    if (busy) return;
    if (file === null) {
      setNotice("Drop a file first, or watch the saved episode below.");
      return;
    }
    onGenerate(file);
  }

  return (
    <div className="relative flex w-full max-w-[560px] flex-col gap-6 overflow-hidden rounded-2xl bg-surface-translucent p-6 shadow-xl backdrop-blur-xl lg:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-archival-amber/10 blur-3xl" />
      <div className="flex items-center justify-center pb-2">
        <div className="inline-flex rounded-full bg-surface-charcoal p-1">
          {(Object.keys(INSTRUCTIONS) as Tab[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={
                tab === key
                  ? "rounded-full bg-surface-container-high px-5 py-2 text-[12px] font-medium text-primary shadow-inner"
                  : "rounded-full px-5 py-2 text-[12px] font-medium text-on-surface-variant transition-colors hover:text-text-primary"
              }
            >
              {key === "screenshot" ? "Screenshot" : "Raw DNA File"}
            </button>
          ))}
        </div>
      </div>

      <div
        {...bindDrop}
        role="button"
        tabIndex={0}
        onClick={pickFile}
        className="group relative cursor-pointer rounded-xl bg-surface-container-lowest/80 p-8 text-center transition-colors hover:bg-surface-container-low"
      >
        <input ref={fileInput} type="file" className="hidden" onChange={onFiles(tab)} />
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-charcoal text-archival-amber shadow-inner transition-transform group-hover:scale-110">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ transform: "rotate(90deg)" }}>
              <path d="M4 7c3 0 5 4 8 4s5-4 8-4M4 17c3 0 5-4 8-4s5 4 8 4M7 8.5v7M17 8.5v7M12 11v2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-[22px] font-light text-text-primary">
            Drop DNA archive or{" "}
            <span className="font-normal text-archival-amber underline underline-offset-4">browse filesystem</span>
          </p>
          <p className="text-sm text-text-muted">{INSTRUCTIONS[tab]}</p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-surface-container-high px-4 py-1.5 text-[12px] font-medium text-primary">
            <span className="h-2 w-2 animate-pulse rounded-full bg-bio-lime" />
            <span>{file !== null ? `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB) ready` : "No file yet. Watch the saved episode to see the film."}</span>
          </div>
        </div>
      </div>

      {notice !== "" && <p className="text-center text-sm text-text-muted">{notice}</p>}

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="inline-flex h-14 items-center gap-3 rounded-xl bg-bio-lime px-8 text-lg font-black tracking-wide text-surface-container-lowest shadow-[0_0_24px_rgba(200,244,91,0.25)] transition-transform hover:scale-[1.02] disabled:opacity-40"
        >
          <span>{busy ? "Working" : "Generate your Episode"}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M4 7c3 0 5 4 8 4s5-4 8-4M4 17c3 0 5-4 8-4s5 4 8 4M7 8.5v7M17 8.5v7M12 11v2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" onClick={onWatchReplay} className="text-xs text-text-muted underline underline-offset-4 hover:text-on-surface">
          Replay mode: saved episode, no upload or key needed.
        </button>
      </div>
    </div>
  );
}
