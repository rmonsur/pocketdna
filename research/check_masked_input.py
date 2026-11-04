#!/usr/bin/env python3
"""Check masked smartpca input changes only intended held-out calls to missing."""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'dataset/interim/reference-validation/experimental-pca'
OUT=P/'demo-marker-mask'


def main() -> None:
    orig=[line.split() for line in (P/'pca.ind').open() if line.strip()]
    ind=[line.split() for line in (OUT/'masked.ind').open() if line.strip()]
    if len(orig)!=len(ind):raise ValueError('Individual count mismatch')
    markers=sum(1 for _ in (P/'frozen.snp').open())
    stride=(markers+3)//4
    before=np.memmap(P/'frozen.geno',dtype=np.uint8,mode='r',offset=48,shape=(len(orig),stride))
    after=np.memmap(OUT/'masked.geno',dtype=np.uint8,mode='r',offset=48,shape=(len(orig),stride))
    idx=np.arange(markers);shift=((3-idx%4)*2).astype(np.uint8)
    changed_calls=0;selected=0
    for i,(a,b) in enumerate(zip(orig,ind)):
        if a[:2]!=b[:2]:raise ValueError('Sample identity/order changed')
        if a[2]=='BASIS':
            if b[2]!='BASIS' or not np.array_equal(before[i],after[i]):raise ValueError('Basis input changed')
        elif b[2]=='TEST':
            selected+=1
            old=(before[i,idx//4]>>shift)&3;new=(after[i,idx//4]>>shift)&3
            if np.any((new!=old)&(new!=3)):raise ValueError('A masked call changed to another called genotype')
            changed_calls+=int(np.count_nonzero(old!=new))
        elif b[2]=='Ignore':
            if not np.array_equal(before[i],after[i]):raise ValueError('Nonselected test input changed')
        else:raise ValueError('Unexpected role')
    if selected!=16:raise ValueError('Unexpected selected test count')
    result={'status':'pass','basis_unchanged':sum(x[2]=='BASIS' for x in ind),'test_samples_masked':selected,
            'called_genotypes_changed_to_missing':changed_calls,'scope':'Checks data and role integrity only; no claim of chip-mask provenance or projection validity.'}
    (OUT/'input-integrity.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))


if __name__=='__main__':main()
