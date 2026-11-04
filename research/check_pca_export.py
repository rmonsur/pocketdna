#!/usr/bin/env python3
"""Check a deterministic sample of exported PCA TGENO calls against source BED."""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'dataset/interim/reference-validation/experimental-pca'


def main() -> None:
    fam=[x.split()[1] for x in (P/'alias.fam').open() if x.strip()]
    ind=[x.split()[0] for x in (P/'frozen.ind').open() if x.strip()]
    bim=[x.split() for x in (P/'alias.bim').open() if x.strip()]
    snp=[x.split() for x in (P/'frozen.snp').open() if x.strip()]
    if fam!=ind or len(bim)!=len(snp):raise ValueError('Sample or marker dimensions/order mismatch')
    for b,s in zip(bim,snp):
        if (b[1],b[0],b[3],b[4],b[5]) != (s[0],s[1],s[3],s[5],s[4]):raise ValueError('Unexpected export marker order or allele orientation')
    bed_stride=(len(fam)+3)//4; geno_stride=(len(snp)+3)//4
    bed=P/'alias.bed';geno=P/'frozen.geno'
    if bed.stat().st_size!=3+len(bim)*bed_stride or geno.stat().st_size!=48+len(ind)*geno_stride:raise ValueError('Unexpected matrix size')
    with bed.open('rb') as f:
        if f.read(3)!=b'\x6c\x1b\x01':raise ValueError('Expected SNP-major BED')
    with geno.open('rb') as f:
        if not f.read(48).startswith(b'TGENO'):raise ValueError('Expected TGENO')
    b=np.memmap(bed,dtype=np.uint8,mode='r',offset=3,shape=(len(bim),bed_stride))
    t=np.memmap(geno,dtype=np.uint8,mode='r',offset=48,shape=(len(ind),geno_stride))
    samples=np.linspace(0,len(ind)-1,min(64,len(ind)),dtype=int)
    markers=np.arange(len(snp));expected_lookup=np.array([0,3,1,2],dtype=np.uint8)
    mismatch=0
    for i in samples:
        bedcode=(b[:,i//4]>>(2*(i%4)))&3
        actual=(t[i,markers//4]>>((3-markers%4)*2).astype(np.uint8))&3
        mismatch+=int(np.count_nonzero(expected_lookup[bedcode]!=actual))
    out={'samples_checked':len(samples),'markers_checked':len(markers),'calls_checked':len(samples)*len(markers),'mismatches':mismatch,'scope':'Deterministically spaced samples; source BED and exported TGENO, not an independent biological truth.'}
    (P/'export-parity.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
    if mismatch:raise SystemExit(1)


if __name__=='__main__':main()
