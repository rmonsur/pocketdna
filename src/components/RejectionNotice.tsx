/** Typed failure / rejection states (R1-R5). Designed copy, next action. */

export type NoticeKind = "R1" | "R2" | "R3" | "R4" | "R5";

const COPY: Record<NoticeKind, { title: string; body: string }> = {
  R1: {
    title: "Ancestry only",
    body: "PocketDNA reads ancestry only. We never interpret health data. Upload the ancestry composition screen instead.",
  },
  R2: {
    title: "Could not read that",
    body: "Please upload the ancestry composition screen from 23andMe or AncestryDNA as PNG or JPEG.",
  },
  R3: {
    title: "File problem",
    body: "That is not a readable 23andMe or AncestryDNA export. Re-export the raw .txt (or .zip) and try again.",
  },
  R4: {
    title: "Something failed",
    body: "A pipeline step failed. Your partial progress is kept; retry to resume where it stopped.",
  },
  R5: {
    title: "Paused",
    body: "Paid calls are paused or the endpoint is unreachable. Wait and retry, or watch the saved episode.",
  },
};

interface Props {
  kind: NoticeKind;
  message?: string;
  onRetry: () => void;
  onReplay: () => void;
}

export function RejectionNotice({ kind, message, onRetry, onReplay }: Props): React.JSX.Element {
  return (
    <div className="w-full max-w-[560px] rounded-2xl bg-surface-translucent p-6 shadow-xl backdrop-blur-xl">
      <p className="text-lg font-medium text-text-primary">{COPY[kind].title}</p>
      <p className="mt-2 font-mono text-sm text-text-muted">{message !== undefined && message !== "" ? message : COPY[kind].body}</p>
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-bio-lime px-5 py-2.5 text-sm font-bold text-surface-container-lowest transition-transform hover:scale-[1.02]"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={onReplay}
          className="rounded-xl bg-surface-container-high px-5 py-2.5 text-sm text-on-surface transition-transform hover:scale-[1.02]"
        >
          Watch saved episode
        </button>
      </div>
    </div>
  );
}
