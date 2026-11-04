/**
 * Raw consumer export harmonization (browser-side; genotypes never leave the device).
 * Consumer genotypes are allele letters on the forward strand. Bundle calls count
 * copies of allele a1; complements (A<->T, C<->G) are applied when the consumer
 * pair matches the bundle pair only after complementing (strand flip).
 */

export type HarmonizeOutcome = "direct" | "complement" | "missing";

const COMPLEMENT: Record<string, string> = { A: "T", T: "A", C: "G", G: "C" };

/** Returns copies of a1 in {0,1,2}, or 3 for missing/unusable. */
export function harmonizeCall(genotype: string, a1: string, a2: string): { call: number; outcome: HarmonizeOutcome } {
  const g = genotype.trim().toUpperCase();
  if (g.length !== 2 || g.includes("-") || g.includes("I") || g.includes("D")) {
    return { call: 3, outcome: "missing" };
  }
  const [x, y] = g;
  if (!COMPLEMENT[x] || !COMPLEMENT[y]) return { call: 3, outcome: "missing" };
  const count = (allele: string, target: string): number => (allele === target ? 1 : 0);
  if ((x === a1 || x === a2) && (y === a1 || y === a2)) {
    return { call: count(x, a1) + count(y, a1), outcome: "direct" };
  }
  const cx = COMPLEMENT[x];
  const cy = COMPLEMENT[y];
  if ((cx === a1 || cx === a2) && (cy === a1 || cy === a2)) {
    return { call: count(cx, a1) + count(cy, a1), outcome: "complement" };
  }
  return { call: 3, outcome: "missing" };
}

export interface MarkerRef {
  id: string;
  a1: string;
  a2: string;
}

export interface AlignedCalls {
  calls: Uint8Array;
  stats: { direct: number; complement: number; missing: number; absent: number; totalLines: number };
}

/**
 * Parse a 23andMe/AncestryDNA text export and align to bundle markers by rsID.
 * Lines: rsid, chromosome, position, genotype (tab or space separated, # comments).
 */
export function alignExport(text: string, markers: MarkerRef[]): AlignedCalls {
  const index = new Map<string, number>();
  markers.forEach((m, i) => index.set(m.id, i));
  const calls = new Uint8Array(markers.length).fill(3);
  const seen = new Uint8Array(markers.length);
  const stats = { direct: 0, complement: 0, missing: 0, absent: 0, totalLines: 0 };
  for (const line of text.split(/\r?\n/)) {
    if (line === "" || line.startsWith("#")) continue;
    const fields = line.split(/\s+/);
    if (fields.length < 4 || !fields[0].startsWith("rs")) continue;
    stats.totalLines += 1;
    const at = index.get(fields[0]);
    if (at === undefined || seen[at] === 1) continue;
    seen[at] = 1;
    const { call, outcome } = harmonizeCall(fields[3], markers[at].a1, markers[at].a2);
    calls[at] = call;
    stats[outcome] += 1;
  }
  stats.absent = seen.reduce((acc, v) => acc + (v === 0 ? 1 : 0), 0);
  return { calls, stats };
}
