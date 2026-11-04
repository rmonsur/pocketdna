#!/usr/bin/env python3
"""Freeze an exploratory kinship-group split without creating a release cohort."""
from __future__ import annotations
import csv
import hashlib
import io
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
AUDIT=ROOT/'dataset/interim/reference-validation'
OUT=AUDIT/'experimental-pca'
SEED='pocketdna-experimental-pca-split-v1'


def sha(path:Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1048576),b''):h.update(chunk)
    return h.hexdigest()


def main() -> None:
    src=AUDIT/'relatedness-genome-wide/selected.tsv'
    graph=AUDIT/'kinship-review-groups.tsv'
    with src.open(newline='') as f: records=list(csv.DictReader(f,delimiter='\t'))
    with graph.open(newline='') as f: graph_rows=list(csv.DictReader(f,delimiter='\t'))
    nodes={x['iid']:x['review_group'] for x in graph_rows if x['source']=='aadr'}
    if len(nodes)!=sum(x['source']=='aadr' for x in graph_rows):raise ValueError('Duplicate AADR graph node')
    if len(records)!=len({r['genetic_id'] for r in records}):raise ValueError('Duplicate source sample')
    if set(nodes)!={r['genetic_id'] for r in records}:raise ValueError('Candidate and graph identities differ')
    clusters:dict[str,list[dict[str,str]]]=defaultdict(list)
    excluded=[]
    for record in records:
        group=record['group'].lower()
        if any(x in group for x in ('ignore','outlier','orelative')):
            excluded.append(record)
        else:
            clusters[nodes[record['genetic_id']]].append(record)
    output=[]
    for group,members in sorted(clusters.items()):
        ordered=sorted(members,key=lambda x:(-float(x['autosomal_call_rate']),x['genetic_id']))
        split='test' if int(hashlib.sha256(f'{SEED}:{group}'.encode()).hexdigest(),16)%5==0 else 'basis'
        for index,row in enumerate(ordered):
            output.append((row['genetic_id'],row['individual_id'],row['group'],group,split if index==0 else 'excluded_group_member',row['autosomal_call_rate']))
    for row in excluded:
        output.append((row['genetic_id'],row['individual_id'],row['group'],nodes[row['genetic_id']],'excluded_label',row['autosomal_call_rate']))
    output.sort()
    roles=Counter(row[4] for row in output)
    if len(output)!=len(records) or not roles['basis'] or not roles['test']:raise ValueError('Incomplete split')
    seen:dict[str,set[str]]=defaultdict(set)
    for _,_,_,group,role,_ in output:
        if role in ('basis','test'):seen[group].add(role)
    if any(len(role)>1 for role in seen.values()):raise ValueError('Kinship group leakage')
    buffer=io.StringIO(newline='');writer=csv.writer(buffer,delimiter='\t',lineterminator='\n')
    writer.writerow(['genetic_id','individual_id','source_group','kinship_group','role','broad_autosomal_call_rate']);writer.writerows(output)
    manifest=buffer.getvalue().encode(); OUT.mkdir(parents=True,exist_ok=True)
    target=OUT/'split.tsv'
    if target.exists() and target.read_bytes()!=manifest:
        raise ValueError('Frozen split differs; create a new version instead of overwriting')
    target.write_bytes(manifest)
    for role in ('basis','test'):
        (OUT/f'{role}.keep').write_text(''.join(f'{row[0]} {row[0]}\n' for row in output if row[4]==role))
    summary={'version':SEED,'source_selected_sha256':sha(src),'kinship_graph_sha256':sha(graph),
             'split_sha256':sha(target),'role_counts':dict(roles),'kinship_groups':len(clusters),
             'basis_source_groups':len({r[2] for r in output if r[4]=='basis'}),
             'test_source_groups':len({r[2] for r in output if r[4]=='test'}),
             'test_groups_absent_from_basis':len({r[2] for r in output if r[4]=='test'}-{r[2] for r in output if r[4]=='basis'}),
             'limitations':'Exploratory split based on prior all-sample kinship screen; unknown relationships, representation, species and source review remain. Not an approved production or untouched final benchmark.'}
    (OUT/'split-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))


if __name__=='__main__':main()
