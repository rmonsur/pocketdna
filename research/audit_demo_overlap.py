#!/usr/bin/env python3
"""Privately audit demo-file overlap; never emit or persist genotype calls."""
from __future__ import annotations
import argparse
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SNP = ROOT / 'dataset/aadr_v66p1_ho/v66.p1_HO.aadr.patch.PUB.snp'
OUT = ROOT / 'dataset/interim/reference-validation/demo-overlap.json'


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('genotype_file', type=Path, help='Local 23andMe-format DNA export')
    args = parser.parse_args()
    ref: dict[str, tuple[str, int, set[str]]] = {}
    for line in SNP.open():
        fields = line.split()
        if len(fields) >= 6 and fields[1].isdigit() and 1 <= int(fields[1]) <= 22:
            ref[fields[0]] = (fields[1], int(fields[3]), set(fields[4:6]))
    stats: Counter[str] = Counter()
    builds: set[str] = set()
    seen: set[str] = set()
    with args.genotype_file.open(encoding='utf-8-sig') as handle:
        for raw in handle:
            if raw.startswith('#'):
                match = re.search(r'build\s*(\d+)', raw, re.I)
                if match: builds.add(match.group(1))
                continue
            parts = raw.strip().split()
            if not parts or parts[0].lower() == 'rsid': continue
            if len(parts) != 4:
                stats['malformed_rows'] += 1
                continue
            snpid, chrom, position, genotype = parts
            if chrom not in {str(x) for x in range(1, 23)}: continue
            stats['autosomal_rows'] += 1
            if snpid in seen:
                stats['duplicate_ids'] += 1
                continue
            seen.add(snpid)
            if len(genotype) != 2 or any(a not in 'ACGT' for a in genotype.upper()):
                stats['missing_or_unsupported_calls'] += 1
                continue
            if snpid not in ref: continue
            stats['rsid_matches'] += 1
            ref_chrom, ref_position, alleles = ref[snpid]
            if not position.isdigit() or chrom != ref_chrom or int(position) != ref_position:
                stats['coordinate_mismatch'] += 1
                continue
            stats['matching_rsid_and_position'] += 1
            if set(genotype.upper()) <= alleles:
                stats['called_alleles_compatible_direct'] += 1
            else:
                stats['called_alleles_not_directly_compatible'] += 1
    result = {'source': 'local demo input', 'reported_builds': sorted(builds), 'counts': dict(stats),
              'limitations': 'Preliminary exact-ID/position check only. Does not validate assembly, strand, vendor format, chip support, duplicate coordinates or genotypes. No personal ancestry analysis.'}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2)+'\n')
    print('Demo overlap audit written to private ignored dataset/interim/reference-validation/demo-overlap.json')


if __name__ == '__main__': main()
