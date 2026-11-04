/**
 * Deterministic raw genotype parsers. Port of backend/pipeline/parse_raw.py.
 * Nothing is skipped silently: every count is returned so the receipt can show it.
 */

export type Vendor = "23andme" | "ancestry";

export interface ParsedGenotypes {
  vendor: Vendor;
  /** rsid -> two-base ACGT call. */
  calls: ReadonlyMap<string, string>;
  nLines: number;
  nSkipped: number;
  nNocall: number;
}

const CALL_LENGTH = 2;
const VALID_BASES = new Set(["A", "C", "G", "T"]);
const RSID_PREFIX = "rs";
const HEADER_WORD = "rsid";
const COMMENT_PREFIX = "#";
const LINE_BREAK = /\r\n|\r|\n/;
const WHITESPACE = /\s+/;
const TAB = "\t";
const MIN_FIELDS_23ANDME = 4;
const MIN_FIELDS_ANCESTRY = 2;
const GENOTYPE_COL_23ANDME = 3;
const GENOTYPE_COL_ANCESTRY = 1;

/** Return a two-base ACGT call, or null (no-call, haploid, indel, ambiguous). */
export function cleanAlleles(raw: string): string | null {
  const geno = raw.trim().replaceAll("/", "").replaceAll("|", "");
  if (geno.length !== CALL_LENGTH) return null;
  for (const base of geno) {
    if (!VALID_BASES.has(base)) return null;
  }
  return geno;
}

interface LineFormat {
  vendor: Vendor;
  split: (line: string) => string[];
  minFields: number;
  genotypeCol: number;
}

const FORMATS: Record<Vendor, LineFormat> = {
  "23andme": {
    vendor: "23andme",
    split: (line) => line.split(TAB),
    minFields: MIN_FIELDS_23ANDME,
    genotypeCol: GENOTYPE_COL_23ANDME,
  },
  ancestry: {
    vendor: "ancestry",
    split: (line) => line.trim().split(WHITESPACE),
    minFields: MIN_FIELDS_ANCESTRY,
    genotypeCol: GENOTYPE_COL_ANCESTRY,
  },
};

function parseWith(format: LineFormat, text: string): ParsedGenotypes {
  const calls = new Map<string, string>();
  let nLines = 0;
  let nSkipped = 0;
  let nNocall = 0;
  for (const line of text.split(LINE_BREAK)) {
    if (line === "" || line.startsWith(COMMENT_PREFIX)) continue;
    const parts = format.split(line);
    const first = parts[0] ?? "";
    if (first.toLowerCase() === HEADER_WORD) continue;
    if (parts.length < format.minFields || !first.startsWith(RSID_PREFIX)) {
      nSkipped += 1;
      continue;
    }
    nLines += 1;
    const geno = cleanAlleles(parts[format.genotypeCol] ?? "");
    if (geno === null) {
      nNocall += 1;
      continue;
    }
    calls.set(first, geno);
  }
  return { vendor: format.vendor, calls, nLines, nSkipped, nNocall };
}

export function parseRaw(vendor: Vendor, text: string): ParsedGenotypes {
  return parseWith(FORMATS[vendor], text);
}
