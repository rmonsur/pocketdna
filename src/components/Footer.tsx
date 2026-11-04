/** Footer (mockup). */

export function Footer(): React.JSX.Element {
  return (
    <footer className="relative z-10 w-full border-t border-border-glass bg-surface-charcoal">
      <div className="flex w-full flex-col gap-1 px-8 py-8">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-archival-amber" />
          <span className="text-[22px] font-light text-on-surface">
            Pocket<span className="font-medium text-archival-amber">DNA</span>
          </span>
        </div>
        <p className="text-[12px] font-medium text-text-muted">Meta AI Developer 2026 Hackathon Submission</p>
      </div>
    </footer>
  );
}
