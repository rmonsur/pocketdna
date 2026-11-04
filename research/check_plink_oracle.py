#!/usr/bin/env python3
"""Verify the pilot PLINK encoding against EIGENSOFT's EIGENSTRAT export."""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / 'dataset/interim/reference-validation'
PILOT = AUDIT / 'relatedness-pilot'
ORACLE = AUDIT / 'oracle'


def main() -> None:
    fam = [line.split()[1] for line in (PILOT / 'pilot.fam').open()]
    oracle_ind = [line.split()[0] for line in (ORACLE / 'chr22.ind').open()]
    markers = [line.split()[1] for line in (PILOT / 'pilot.bim').open()]
    oracle_markers = [line.split()[0] for line in (ORACLE / 'chr22.snp').open()]
    if markers != oracle_markers: raise ValueError('Oracle marker sequence mismatch')
    indices = {sid:i for i, sid in enumerate(fam)}
    pairs = [(i,indices[sid]) for i,sid in enumerate(oracle_ind) if sid in indices]
    if not pairs: raise ValueError('No shared oracle samples')
    bed = np.memmap(PILOT / 'pilot.bed', dtype=np.uint8, mode='r', offset=3,
                    shape=(len(markers), (len(fam)+3)//4))
    lines = (ORACLE / 'chr22.geno').read_bytes().splitlines()
    if len(lines) != len(markers) or any(len(line) != len(oracle_ind) for line in lines):
        raise ValueError('Unexpected oracle matrix dimensions')
    oracle = np.frombuffer(b''.join(lines), dtype=np.uint8).reshape(len(markers),len(oracle_ind))-48
    columns = np.array([a for a,_ in pairs]); sample = np.array([b for _,b in pairs])
    decoded = np.array([2,9,1,0])[(bed[:,sample//4] >> (2*(sample%4))) & 3]
    mismatches = int(np.count_nonzero(decoded != oracle[:,columns]))
    result = {'samples':len(pairs),'markers':len(markers),'calls':int(decoded.size),'mismatches':mismatches}
    (PILOT / 'plink-oracle.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result))
    if mismatches: raise SystemExit(1)


if __name__ == '__main__': main()
