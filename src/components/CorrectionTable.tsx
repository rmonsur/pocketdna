/** Correction step (STACK 5): confirm or edit extracted percentages before generation. */

import { useState } from "react";
import type { ExtractedShares } from "../lib/api";

interface Props {
  initial: ExtractedShares;
  onConfirm: (corrected: ExtractedShares) => void;
  onCancel: () => void;
}

export function CorrectionTable({ initial, onConfirm, onCancel }: Props): React.JSX.Element {
  const [vendor, setVendor] = useState(initial.vendor);
  const [shares, setShares] = useState(initial.shares.map((s) => ({ ...s, pct: String(Math.round(s.weight * 1000) / 10) })));
  const total = shares.reduce((acc, s) => acc + (Number(s.pct) || 0), 0);

  function confirm(): void {
    const cleaned = shares
      .filter((s) => s.label.trim() !== "" && Number(s.pct) > 0)
      .map((s) => ({ id: s.id, label: s.label.trim(), weight: Math.min(1, Number(s.pct) / 100) }));
    if (cleaned.length === 0) return;
    onConfirm({ vendor: vendor.trim() || initial.vendor, shares: cleaned, omitted: initial.omitted });
  }

  return (
    <div className="flex w-full max-w-[560px] flex-col gap-4 rounded-2xl bg-surface-translucent p-6 shadow-xl backdrop-blur-xl">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-bio-lime">Check what we read</p>
        <h2 className="pt-1 text-xl font-light text-text-primary">
          {initial.vendor} composition — correct anything wrong
        </h2>
        <p className="pt-1 text-[13px] text-text-muted">
          The film is built from these numbers. Edit a percentage or remove a row; nothing is generated until you confirm.
        </p>
      </div>
      <label className="flex flex-col gap-1 text-[12px] text-text-muted">
        Vendor
        <input
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          className="min-h-10 rounded-lg bg-surface-container-lowest/80 px-3 text-sm text-text-primary"
        />
      </label>
      <ul className="flex flex-col gap-2">
        {shares.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <input
              aria-label={`Label ${i + 1}`}
              value={s.label}
              onChange={(e) => setShares((prev) => prev.map((p, j) => (j === i ? { ...p, label: e.target.value } : p)))}
              className="min-h-10 flex-1 rounded-lg bg-surface-container-lowest/80 px-3 text-sm text-text-primary"
            />
            <input
              aria-label={`Percent ${i + 1}`}
              inputMode="decimal"
              value={s.pct}
              onChange={(e) => setShares((prev) => prev.map((p, j) => (j === i ? { ...p, pct: e.target.value } : p)))}
              className="min-h-10 w-20 rounded-lg bg-surface-container-lowest/80 px-3 text-right font-mono text-sm text-text-primary"
            />
            <span className="text-sm text-text-muted">%</span>
            <button
              type="button"
              aria-label={`Remove ${s.label}`}
              onClick={() => setShares((prev) => prev.filter((_, j) => j !== i))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-text-primary"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <p className="font-mono text-[12px] text-text-muted">Total: {total.toFixed(1)}%</p>
      {initial.omitted.length > 0 && (
        <p className="text-[12px] text-text-muted">Not read (low confidence, omitted): {initial.omitted.join(", ")}</p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={confirm}
          className="inline-flex min-h-11 items-center rounded-xl bg-bio-lime px-6 font-bold text-surface-container-lowest"
        >
          Confirm and generate
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-11 items-center rounded-xl bg-surface-container-high px-6 text-text-primary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
