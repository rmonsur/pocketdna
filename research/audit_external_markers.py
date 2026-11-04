#!/usr/bin/env python3
"""Audit exact-position autosomal marker compatibility across external reference panels."""
from __future__ import annotations
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'dataset'
AUDIT = DATA / 'interim/reference-validation'
REF = AUDIT / 'relatedness-genome-wide/pilot.bim'
OUT = AUDIT / 'external-marker-audit'
PANELS = {'egdp': DATA/'egdp_pagani/EGDP_1240k_annotated.bim',
          'sgdp': DATA/'sgdp/sgdp_annotated_matched.bim',
          'francocantabrian': DATA/'francocantabrian190_floresbello/FrancoCantabrian190_FloresBello.bim'}
COMP = str.maketrans('ACGT','TGCA')


def digest(path: Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1048576),b''):h.update(block)
    return h.hexdigest()


def read_bim(path: Path) -> tuple[dict[str,list[list[str]]],int]:
    index:dict[str,list[list[str]]]={}
    rows=0
    with path.open() as handle:
        for line in handle:
            fields=line.split()
            if not fields:continue
            if len(fields)!=6:raise ValueError(f'Invalid BIM row in {path.name}')
            rows+=1
            index.setdefault(fields[1],[]).append(fields)
    return index,rows


def compare(a: list[str],b:list[str]) -> str:
    ca,cb=a[0],b[0]
    if not ca.isdigit() or not cb.isdigit() or not (1 <= int(ca) <= 22 and 1 <= int(cb) <= 22):return 'non_autosomal'
    if int(ca)!=int(cb) or a[3]!=b[3]:return 'coordinate_mismatch'
    x,y=a[4].upper(),a[5].upper(); p,q=b[4].upper(),b[5].upper()
    if any(z not in ('A','C','G','T') for z in (x,y,p,q)) or x==y or p==q:return 'missing_or_invalid_alleles'
    if {x,y} in ({'A','T'},{'C','G'}) or {p,q} in ({'A','T'},{'C','G'}):return 'palindromic'
    if {x,y}=={p,q}:return 'direct_same_order' if (x,y)==(p,q) else 'direct_swapped'
    if {x,y}=={p.translate(COMP),q.translate(COMP)}:return 'complement_same_order' if (x,y)==(p.translate(COMP),q.translate(COMP)) else 'complement_swapped'
    return 'allele_mismatch'


def main() -> None:
    OUT.mkdir(parents=True,exist_ok=True)
    ref,nref=read_bim(REF)
    retained=set((AUDIT/'relatedness-genome-wide/ld.prune.in').read_text().splitlines())
    summary={}
    for label,path in PANELS.items():
        ext,ntotal=read_bim(path)
        counts:Counter[str]=Counter(); retained_counts:Counter[str]=Counter()
        matches=ref.keys() & ext.keys()
        with (OUT/f'{label}-marker-review.tsv').open('w',newline='') as handle:
            w=csv.writer(handle,delimiter='\t');w.writerow(['marker_id','classification','king_pruned_marker'])
            for sid in sorted(matches):
                category='duplicate_id' if len(ref[sid])!=1 or len(ext[sid])!=1 else compare(ref[sid][0],ext[sid][0])
                counts[category]+=1
                if sid in retained:retained_counts[category]+=1
                w.writerow([sid,category,int(sid in retained)])
        summary[label]={'external_rows':ntotal,'external_unique_ids':len(ext),'external_duplicate_id_excess':ntotal-len(ext),
                        'reference_rows':nref,'exact_id_overlap':len(matches),'classification':dict(counts),
                        'king_marker_classification':dict(retained_counts),'bim_sha256':digest(path)}
    summary['limitations']='Marker metadata only; same coordinates do not prove same assembly/strand or sample independence. No genotypes merged.'
    (OUT/'summary.json').write_text(json.dumps(summary,indent=2,sort_keys=True)+'\n')
    print(json.dumps(summary,indent=2,sort_keys=True))


if __name__=='__main__':main()
