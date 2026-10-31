"""Deterministic raw genotype parsers. Nothing skipped silently: counts returned."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ParsedGenotypes:
    vendor: str
    calls: dict[str, str]
    n_lines: int
    n_skipped: int
    n_nocall: int


def clean_alleles(raw: str) -> str | None:
    """Return a 2-base ACGT call, or None (no-call, haploid, indel, ambiguous)."""
    geno = raw.strip().replace("/", "").replace("|", "")
    if len(geno) != 2 or any(base not in "ACGT" for base in geno):
        return None
    return geno


def parse_23andme(text: str) -> ParsedGenotypes:
    calls: dict[str, str] = {}
    n_lines = n_skipped = n_nocall = 0
    for line in text.splitlines():
        if not line or line.startswith("#"):
            continue
        parts = line.split("\t")
        if parts and parts[0].lower() == "rsid":
            continue  # vendor header, not data
        if len(parts) < 4 or not parts[0].startswith("rs"):
            n_skipped += 1
            continue
        n_lines += 1
        geno = clean_alleles(parts[3])
        if geno is None:
            n_nocall += 1
            continue
        calls[parts[0]] = geno
    return ParsedGenotypes("23andme", calls, n_lines, n_skipped, n_nocall)


def parse_ancestry(text: str) -> ParsedGenotypes:
    calls: dict[str, str] = {}
    n_lines = n_skipped = n_nocall = 0
    for line in text.splitlines():
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if parts and parts[0].lower() == "rsid":
            continue  # vendor header, not data
        if len(parts) < 2 or not parts[0].startswith("rs"):
            n_skipped += 1
            continue
        n_lines += 1
        geno = clean_alleles(parts[1])
        if geno is None:
            n_nocall += 1
            continue
        calls[parts[0]] = geno
    return ParsedGenotypes("ancestry", calls, n_lines, n_skipped, n_nocall)


def parse_raw(vendor: str, text: str) -> ParsedGenotypes:
    if vendor == "23andme":
        return parse_23andme(text)
    if vendor == "ancestry":
        return parse_ancestry(text)
    raise ValueError(f"unsupported vendor: {vendor}")
