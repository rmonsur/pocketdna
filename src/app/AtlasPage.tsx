/** Atlas page (ATLAS): wheel of time, search, globe with SVG fallback. */

import { useMemo, useState } from "react";
import { AtlasGlobe } from "../components/AtlasGlobe";
import { AtlasSvg } from "../components/AtlasSvg";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { APPROVED_SITES } from "../contracts/atlas";
import { REPLAY } from "../contracts/fixtures";

const ERAS = [
  { id: "bronze", label: "Bronze Age" },
  { id: "middle", label: "Middle Ages" },
  { id: "modern", label: "Modern" },
] as const;

type Era = (typeof ERAS)[number]["id"];

export function AtlasPage(): React.JSX.Element {
  const [era, setEra] = useState<Era>("bronze");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>("samara-steppe");
  const [svgMode, setSvgMode] = useState(false);
  const [fellBack, setFellBack] = useState(false);

  const visible = useMemo(
    () =>
      APPROVED_SITES.filter(
        (s) => s.era === era && s.label.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [era, query],
  );
  const selected = APPROVED_SITES.find((s) => s.id === selectedId) ?? null;
  const claimById = useMemo(() => new Map(REPLAY.claims.map((c) => [c.id, c])), []);

  return (
    <div className="relative min-h-screen bg-background-obsidian text-on-surface">
      <Header />
      <main className="mx-auto max-w-[1100px] px-6 pb-16 pt-28">
        <h1 className="text-[40px] font-light tracking-tight">Atlas</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Approved places from the current plan only. Drag the globe, turn the wheel of time, tap a site for
          its source.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full bg-surface-charcoal p-1" role="group" aria-label="Wheel of time">
            {ERAS.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEra(e.id)}
                className={
                  era === e.id
                    ? "rounded-full bg-archival-amber px-4 py-1.5 text-xs font-semibold text-surface-container-lowest"
                    : "rounded-full px-4 py-1.5 text-xs text-text-muted hover:text-on-surface"
                }
              >
                {e.label}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search approved sites"
            className="rounded-full border border-border-glass bg-surface-charcoal px-4 py-2 text-sm text-on-surface placeholder:text-text-muted"
          />
          <div className="inline-flex rounded-full bg-surface-charcoal p-1">
            {(["globe", "svg"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSvgMode(m === "svg")}
                className={
                  svgMode === (m === "svg")
                    ? "rounded-full bg-surface-container-high px-3 py-1 text-xs text-text-primary"
                    : "rounded-full px-3 py-1 text-xs text-text-muted"
                }
              >
                {m === "globe" ? "Globe" : "SVG"}
              </button>
            ))}
          </div>
        </div>

        {fellBack && (
          <p className="mt-3 font-mono text-xs text-archival-amber">WebGL unavailable here; showing the SVG atlas.</p>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl bg-surface-translucent backdrop-blur-xl">
          {svgMode ? (
            <AtlasSvg sites={visible} selectedId={selectedId} onSelect={setSelectedId} />
          ) : (
            <AtlasGlobe
              sites={visible}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onError={() => {
                setFellBack(true);
                setSvgMode(true);
              }}
            />
          )}
        </div>

        {selected !== null && (
          <div className="mt-4 rounded-2xl bg-surface-translucent p-5 backdrop-blur-xl">
            <p className="text-lg text-text-primary">{selected.label}</p>
            <p className="mt-1 text-sm text-text-muted">{selected.detail}</p>
            <p className="mt-2 font-mono text-xs text-archival-amber">
              {selected.lon.toFixed(2)}, {selected.lat.toFixed(2)} · {selected.era}
            </p>
            {selected.claimIds.map((cid) => {
              const claim = claimById.get(cid);
              return claim === undefined ? null : (
                <p key={cid} className="mt-2 font-mono text-xs text-on-surface-variant">
                  {claim.source.authors} ({claim.source.year}) {claim.source.venue}
                  {claim.source.doi !== null ? ` · doi:${claim.source.doi}` : ""}
                </p>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
