#!/usr/bin/env python3
"""Group reference records connected by candidate KING flags, without pruning."""
from __future__ import annotations
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
AUDIT=ROOT/'dataset/interim/reference-validation'
GENOME=AUDIT/'relatedness-genome-wide'
CROSS=AUDIT/'external-marker-audit'
Node=tuple[str,str,str]


def fam(path:Path,source:str) -> dict[tuple[str,str],Node]:
    records=[line.split()[:2] for line in path.open() if line.strip()]
    out={(fid,iid):(source,fid,iid) for fid,iid in records}
    if len(out)!=len(records):raise ValueError('Duplicated FID/IID')
    return out


def main() -> None:
    parent:dict[Node,Node]={}
    def find(x:Node) -> Node:
        parent.setdefault(x,x)
        if parent[x]!=x:parent[x]=find(parent[x])
        return parent[x]
    def union(x:Node,y:Node) -> None:
        a,b=find(x),find(y)
        if a!=b:parent[max(a,b)]=min(a,b)
    reference=fam(GENOME/'pilot.fam','aadr')
    for node in reference.values():find(node)
    edge_counts=Counter()
    with (GENOME/'king.kin0').open(newline='') as handle:
        for r in csv.DictReader(handle,delimiter='\t'):
            union(reference[(r['#FID1'],r['IID1'])],reference[(r['FID2'],r['IID2'])]);edge_counts['aadr']+=1
    for panel in ('egdp','sgdp','francocantabrian'):
        extra=fam(CROSS/f'{panel}-subset.fam',panel)
        if reference.keys() & extra.keys():raise ValueError('Ambiguous FID/IID namespace')
        lookup={**reference,**extra}
        for node in extra.values():find(node)
        with (CROSS/f'{panel}-king.kin0').open(newline='') as handle:
            for r in csv.DictReader(handle,delimiter='\t'):
                a=lookup[(r['#FID1'],r['IID1'])];b=lookup[(r['FID2'],r['IID2'])]
                union(a,b);edge_counts[panel]+=1
    for left,right in (('egdp','sgdp'),('egdp','francocantabrian'),('sgdp','francocantabrian')):
        name=f'{left}__{right}'
        lmap=fam(CROSS/f'{name}-{left}.fam',left)
        rmap=fam(CROSS/f'{name}-{right}.fam',right)
        if lmap.keys() & rmap.keys():raise ValueError('Ambiguous external FID/IID namespace')
        lookup={**lmap,**rmap}
        with (CROSS/f'{name}-king.kin0').open(newline='') as handle:
            for r in csv.DictReader(handle,delimiter='\t'):
                key_a=(r['#FID1'],r['IID1']);key_b=(r['FID2'],r['IID2'])
                if (key_a in lmap and key_b in rmap) or (key_a in rmap and key_b in lmap):
                    union(lookup[key_a],lookup[key_b]);edge_counts[name]+=1
    components:dict[Node,list[Node]]={}
    for node in parent:components.setdefault(find(node),[]).append(node)
    groups=sorted((sorted(members) for members in components.values()),key=lambda x:x[0])
    with (AUDIT/'kinship-review-groups.tsv').open('w',newline='') as handle:
        writer=csv.writer(handle,delimiter='\t');writer.writerow(['review_group','source','fid','iid','group_size'])
        for members in groups:
            gid='KRG-'+hashlib.sha256('\n'.join('\t'.join(x) for x in members).encode()).hexdigest()[:16]
            for source,fid,iid in members:writer.writerow([gid,source,fid,iid,len(members)])
    summary={'records':len(parent),'groups':len(groups),'multi_record_groups':sum(len(x)>1 for x in groups),
             'max_group_size':max(map(len,groups)), 'flagged_edges_by_run':dict(edge_counts),
             'cross_source_groups':sum(len({x[0] for x in group})>1 for group in groups),
             'scope':'Flagged-edge grouping only. External-panel comparisons use their respective marker intersections; absence of an edge is not evidence of independence. Do not use as final held-out split.'}
    (AUDIT/'kinship-review-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(json.dumps(summary,indent=2))


if __name__=='__main__':main()
