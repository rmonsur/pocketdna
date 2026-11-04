#!/usr/bin/env python3
"""Check split, alias, marker and smartpca input invariants."""
from __future__ import annotations
import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
A=ROOT/'dataset/interim/reference-validation'
P=A/'experimental-pca'


def read(path:Path) -> list[dict[str,str]]:
    with path.open(newline='') as f:return list(csv.DictReader(f,delimiter='\t'))


def main() -> None:
    records=read(P/'split.tsv'); graph=read(A/'kinship-review-groups.tsv'); aliases=read(P/'aliases.tsv')
    sid_group={r['iid']:r['review_group'] for r in graph if r['source']=='aadr'}
    roles={r['genetic_id']:r['role'] for r in records}
    if len(roles)!=len(records) or set(roles)!=set(sid_group):raise ValueError('Incomplete or duplicate split')
    observed:dict[str,set[str]]=defaultdict(set)
    for r in records:
        if r['kinship_group']!=sid_group[r['genetic_id']]:raise ValueError('Graph changed')
        if r['role'] in ('basis','test'):observed[r['kinship_group']].add(r['role'])
    if any(len(v)>1 for v in observed.values()):raise ValueError('Kinship group leakage')
    for role in ('basis','test'):
        expected={r['genetic_id'] for r in records if r['role']==role}
        keep={line.split()[1] for line in (P/f'{role}.keep').open() if line.strip()}
        if keep!=expected:raise ValueError('Keep list disagrees with split')
    alias_map={r['alias']:r for r in aliases}
    expected_ids={sid for sid,role in roles.items() if role in ('basis','test')}
    if len(alias_map)!=len(aliases) or {r['genetic_id'] for r in aliases}!=expected_ids:raise ValueError('Alias identity mismatch')
    eigenind=[line.split() for line in (P/'pca.ind').open() if line.strip()]
    if len(eigenind)!=len(aliases) or {x[0] for x in eigenind}!=set(alias_map):raise ValueError('PCA input individual mismatch')
    for sid,_,label in eigenind:
        expected='BASIS' if roles[alias_map[sid]['genetic_id']]=='basis' else 'TEST'
        if label!=expected:raise ValueError('PCA individual role mismatch')
    markers=[line.strip() for line in (P/'basis-ld.prune.in').open() if line.strip()]
    exported=[line.split()[0] for line in (P/'frozen.snp').open() if line.strip()]
    if len(markers)!=len(set(markers)) or set(markers)!=set(exported):raise ValueError('Export marker mismatch')
    result={'candidate_records':len(records),'basis':sum(x=='basis' for x in roles.values()),
            'held_out':sum(x=='test' for x in roles.values()),'eligible_aliases':len(aliases),
            'screened_marker_count':len(markers),'review_group_leakage':0,'status':'pass',
            'limitations':'Does not establish independence beyond observed kinship edges or scientific validity.'}
    (P/'split-check.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))


if __name__=='__main__':main()
