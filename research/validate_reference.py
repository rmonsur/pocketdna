#!/usr/bin/env python3
"""Audit AADR metadata and integrity; no consumer DNA is read."""
from __future__ import annotations
import csv
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'dataset/aadr_v66p1_ho'
OUT = ROOT / 'dataset/interim/reference-validation'
PREFIX = 'v66.p1_HO.aadr.patch.PUB'


def checksum(path: Path) -> str:
    h = hashlib.md5()  # Comparison with the distributor's MD5 manifest, not security.
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = DATA / 'v66.p1__files.md5sum'
    expected = {}
    for line in manifest.read_text().splitlines():
        match = re.search(r'\b([0-9a-f]{32})\s+(\S+)$', line)
        if match:
            expected[match.group(2)] = match.group(1)
    files = [DATA / f'{PREFIX}.{ext}' for ext in ('geno', 'ind', 'snp')]
    files += [DATA / 'v66.p1_HO.aadr.PUB.anno', DATA / 'aadr_v66.p1__README.docx']
    checks = {p.name: {'expected': expected.get(p.name), 'actual': checksum(p)} for p in files}
    ind = [line.split() for line in files[1].read_text().splitlines() if line.strip()]
    snps = [line.split() for line in files[2].read_text().splitlines() if line.strip()]
    if any(len(row) != 3 for row in ind) or any(len(row) < 6 for row in snps):
        raise ValueError('Unexpected IND or SNP schema')
    with files[0].open('rb') as f:
        header = f.read(64).split(b'\0', 1)[0].decode('ascii').split()
    with files[3].open(newline='', encoding='utf-8-sig') as f:
        reader = csv.reader(f, delimiter='\t')
        columns = next(reader)
        identity = columns.index('Individual ID')
        status = columns.index('ASSESSMENT')
        annotations = [(row[0], row[identity], row[status]) for row in reader if len(row) > max(identity, status)]
    ids = [r[0] for r in ind]
    anno_by_id = {a: (b, c) for a, b, c in annotations}
    duplicate_anno = len(annotations) - len(anno_by_id)
    matched = [(sid, *anno_by_id[sid]) for sid in ids if sid in anno_by_id]
    master_counts = Counter(master for _, master, _ in matched if master not in ('', '..', 'n/a'))
    counts = Counter(r[0] for r in snps)
    allele = Counter(''.join(sorted((r[4].upper(), r[5].upper()))) for r in snps if int(r[1]) in range(1, 23))
    results = {
        'checksums': {k: {**v, 'match': v['expected'] == v['actual']} for k, v in checks.items()},
        'tgeno_header': header, 'header_dimensions_match': header[0] == 'TGENO' and int(header[1]) == len(ind) and int(header[2]) == len(snps),
        'individuals': len(ind), 'duplicate_genetic_ids': len(ids) - len(set(ids)),
        'annotation_rows': len(annotations), 'duplicate_annotation_ids': duplicate_anno,
        'annotation_matches': len(matched), 'annotation_unmatched': len(ind)-len(matched),
        'individual_ids_with_multiple_representations': sum(n > 1 for n in master_counts.values()),
        'assessment_counts_matched': dict(Counter(v.upper() for _, _, v in matched)),
        'markers': len(snps), 'duplicate_marker_ids': sum(n-1 for n in counts.values() if n > 1),
        'chromosomes': dict(Counter(r[1] for r in snps)), 'autosomal_allele_pairs': dict(allele),
        'interpretation': 'Metadata audit only: no genotype call rate, relatedness, assembly verification, held-out validation, or production approval.'
    }
    (OUT / 'report.json').write_text(json.dumps(results, indent=2, sort_keys=True) + '\n')
    print(json.dumps(results, indent=2, sort_keys=True))


if __name__ == '__main__':
    main()
