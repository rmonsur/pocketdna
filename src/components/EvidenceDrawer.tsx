/** Evidence drawer (DESIGN 5): bottom sheet over the reel. Pauses playback,
 * explains what we found, the story of the people involved, why we think so
 * and the sources, in plain language. Restores focus on close. */

import { useEffect, useRef } from "react";
import type { Beat, Claim, EvidenceRecord } from "../contracts/index";

interface Props {
  claims: Claim[];
  evidence: EvidenceRecord;
  beat: Beat;
  onClose: () => void;
}

const ERA_LABEL: Record<string, string> = {
  bronze: "Bronze Age chapter",
  middle: "Middle Ages chapter",
  modern: "Modern period chapter",
};

const MAX_ROWS = 6;

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section>
      <h3 className="pb-1 text-[11px] font-bold uppercase tracking-wider text-archival-amber">{title}</h3>
      <div className="text-[13px] leading-relaxed text-on-surface">{children}</div>
    </section>
  );
}

/** "Antiquity-era people near Rabat: They lived..." -> the name before the colon; null for a plain sentence. */
function claimName(claim: Claim): string | null {
  const colon = claim.text.indexOf(":");
  return colon > 0 && colon < 80 ? claim.text.slice(0, colon) : null;
}

export function EvidenceDrawer({ claims, evidence, beat, onClose }: Props): React.JSX.Element {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  function onKeyDown(e: React.KeyboardEvent): void {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || sheetRef.current === null) return;
    const focusables = sheetRef.current.querySelectorAll<HTMLElement>("button, a[href]");
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const eraFit = evidence.kind === "raw" && beat.era !== undefined ? evidence.epochs.find((x) => x.era === beat.era) : undefined;
  const stories = claims.filter((c) => c.story !== null);

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-drawer-title"
      onKeyDown={onKeyDown}
      className="absolute inset-x-0 bottom-0 z-30 flex max-h-[86%] flex-col gap-4 overflow-y-auto rounded-t-[24px] bg-surface-charcoal/[0.98] p-5 shadow-2xl backdrop-blur-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-bio-lime">
            {evidence.kind === "raw" ? "Measured from your DNA" : "From your report"}
          </p>
          <h2 id="evidence-drawer-title" className="pt-0.5 text-lg font-light leading-snug text-text-primary">
            {beat.headline}
          </h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close evidence"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-text-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 5l14 14M19 5L5 19" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <Section title="What we found">
        {evidence.kind === "provider" ? (
          <>
            <p className="pb-1.5">These are the groups your report lists, exactly as it reports them.</p>
            <ul className="flex flex-col gap-0.5">
              {evidence.shares.slice(0, MAX_ROWS).map((s) => (
                <li key={s.id} className="flex justify-between gap-3">
                  <span>{s.label}</span>
                  <span className="font-mono text-[12px] text-text-muted">{(s.weight * 100).toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </>
        ) : eraFit !== undefined ? (
          <>
            <p className="pb-1.5">
              For this chapter, your DNA was compared with these groups. Each line shows how much of your DNA looks like
              that group, as a likely range. It means similarity, not proof of who your ancestors were.
            </p>
            <ul className="flex flex-col gap-0.5">
              {eraFit.shares.slice(0, MAX_ROWS).map((s) => (
                <li key={s.id} className="flex justify-between gap-3">
                  <span>{s.label}</span>
                  <span className="font-mono text-[12px] text-text-muted">
                    {(s.low * 100).toFixed(1)}–{(s.high * 100).toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>{beat.headline}. This part of the film sets the scene; it does not carry a measurement of its own.</p>
        )}
      </Section>

      {stories.length > 0 && (
        <Section title="Their story">
          <div className="flex flex-col gap-2.5">
            {stories.map((c) => (
              <div key={c.id}>
                {claimName(c) !== null && <p className="text-[12px] font-semibold text-text-primary">{claimName(c)}</p>}
                <p>{c.story}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Why we think so">
        {claims.length > 0 ? (
          claims.map((c) => (
            <p key={c.id} className="pb-1.5">
              {c.text}
              {c.detail !== null ? ` ${c.detail}` : ""}
            </p>
          ))
        ) : (
          <p>
            {evidence.kind === "provider"
              ? "Your DNA company compared your sample with its own reference groups. PocketDNA shows what it reported."
              : "This chapter is history around the measured chapters, not a separate measurement."}
          </p>
        )}
      </Section>

      <Section title="This chapter">
        <p>
          {beat.era !== undefined ? `${ERA_LABEL[beat.era]}. ` : ""}
          {beat.subtext}
        </p>
      </Section>

      <Section title="Sources">
        {claims.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {claims.map((c) => (
              <li key={c.id}>
                {c.source.authors} ({c.source.year}), <em>{c.source.venue}</em>
                {c.source.doi !== null && (
                  <>
                    {" · "}
                    <a
                      href={`https://doi.org/${c.source.doi}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-archival-amber underline underline-offset-2"
                    >
                      doi:{c.source.doi}
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No source is attached to this part; treat its line as narration, not evidence.</p>
        )}
      </Section>
    </div>
  );
}
