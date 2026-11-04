#!/usr/bin/env python3
"""Measure per-sample autosomal call counts in an AADR TGENO reference."""
from __future__ import annotations
import csv
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'dataset/aadr_v66p1_ho'
OUT = ROOT / 'dataset/interim/reference-validation'
PREFIX = 'v66.p1_HO.aadr.patch.PUB'


def main() -> None:
    snps = [line.split() for line in (DATA / f'{PREFIX}.snp').open() if line.strip()]
    individuals = [line.split() for line in (DATA / f'{PREFIX}.ind').open() if line.strip()]
    count = len(snps)
    row_bytes = (count + 3) // 4
    path = DATA / f'{PREFIX}.geno'
    if path.stat().st_size != 48 + row_bytes * len(individuals):
        raise ValueError('TGENO size does not match index dimensions')
    data = np.memmap(path, dtype=np.uint8, mode='r', offset=48, shape=(len(individuals), row_bytes))
    mask = np.array([1 <= int(row[1]) <= 22 for row in snps], dtype=bool)
    indexes = np.flatnonzero(mask)
    bytes_index = indexes // 4
    shifts = (3 - indexes % 4) * 2
    called = np.empty(len(individuals), dtype=np.int64)
    heterozygous = np.empty(len(individuals), dtype=np.int64)
    for start in range(0, len(individuals), 32):
        end = min(start + 32, len(individuals))
        values = (data[start:end, bytes_index] >> shifts.astype(np.uint8)) & 3
        called[start:end] = np.count_nonzero(values != 3, axis=1)
        heterozygous[start:end] = np.count_nonzero(values == 1, axis=1)
    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / 'sample-call-counts.tsv').open('w', newline='') as handle:
        writer = csv.writer(handle, delimiter='\t')
        writer.writerow(['genetic_id', 'autosomal_markers', 'called', 'call_rate', 'heterozygous', 'heterozygosity_among_called'])
        for (sid, _, _), n, h in zip(individuals, called, heterozygous):
            writer.writerow([sid, len(indexes), int(n), f'{n/len(indexes):.8f}', int(h), f'{h/n:.8f}' if n else ''])
    quantiles = np.quantile(called / len(indexes), [0, .05, .25, .5, .75, .95, 1]).tolist()
    summary = {'samples': len(individuals), 'autosomal_marker_denominator': len(indexes),
               'call_rate_quantiles_0_5_25_50_75_95_100_percent': quantiles,
               'samples_ge_98_percent': int(np.count_nonzero(called / len(indexes) >= .98)),
               'samples_ge_95_percent': int(np.count_nonzero(called / len(indexes) >= .95)),
               'scope': 'Raw metadata panel, not the final filtered PCA marker set; do not use as a genotype-type classifier or production QC.'}
    (OUT / 'call-count-summary.json').write_text(json.dumps(summary, indent=2)+'\n')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
