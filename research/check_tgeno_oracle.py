#!/usr/bin/env python3
"""Compare reference TGENO decoding with convertf's EIGENSTRAT output."""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'dataset/aadr_v66p1_ho'
OUT = ROOT / 'dataset/interim/reference-validation'
ORACLE = OUT / 'oracle'
PREFIX = 'v66.p1_HO.aadr.patch.PUB'


def main() -> None:
    individuals = [line.split()[0] for line in (DATA / f'{PREFIX}.ind').open() if line.strip()]
    markers = [line.split()[0] for line in (DATA / f'{PREFIX}.snp').open() if line.strip()]
    oracle_ind = [line.split()[0] for line in (ORACLE / 'chr22.ind').open() if line.strip()]
    oracle_snp = [line.split()[0] for line in (ORACLE / 'chr22.snp').open() if line.strip()]
    if len(set(individuals)) != len(individuals) or len(set(markers)) != len(markers):
        raise ValueError('Input IDs must be unique')
    imap = {v:i for i,v in enumerate(individuals)}
    smap = {v:i for i,v in enumerate(markers)}
    si = np.array([smap[x] for x in oracle_snp])
    ii = np.array([imap[x] for x in oracle_ind])
    row_bytes = (len(markers) + 3) // 4
    data = np.memmap(DATA / f'{PREFIX}.geno', dtype=np.uint8, mode='r', offset=48, shape=(len(individuals), row_bytes))
    decoded = ((data[ii[:, None], si[None, :] // 4] >> ((3 - si[None, :] % 4) * 2).astype(np.uint8)) & 3).T
    decoded[decoded == 3] = 9
    lines = (ORACLE / 'chr22.geno').read_bytes().splitlines()
    if len(lines) != len(si) or any(len(line) != len(ii) for line in lines):
        raise ValueError('Unexpected EIGENSTRAT matrix dimensions')
    oracle = np.frombuffer(b''.join(lines), dtype=np.uint8).reshape(len(si),len(ii)) - ord('0')
    mismatches = int(np.count_nonzero(decoded != oracle))
    summary = {'samples': len(ii), 'markers': len(si), 'compared_calls': decoded.size,
               'mismatches': mismatches, 'method': '64 smoke samples on chromosome 22; exact genotype code equality against EIGENSOFT convertf'}
    (OUT / 'tgeno-oracle-comparison.json').write_text(json.dumps(summary, indent=2)+'\n')
    print(json.dumps(summary, indent=2))
    if mismatches: raise SystemExit(1)


if __name__ == '__main__': main()
