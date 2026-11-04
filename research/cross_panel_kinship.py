#!/usr/bin/env python3
"""Run exploratory cross-panel KING comparisons on audited marker intersections."""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'dataset'
AUDIT=DATA/'interim/reference-validation'
OUT=AUDIT/'external-marker-audit'
REF=AUDIT/'relatedness-genome-wide/pilot'
PANELS={'egdp':DATA/'egdp_pagani/EGDP_1240k_annotated',
        'sgdp':DATA/'sgdp/sgdp_annotated_matched',
        'francocantabrian':DATA/'francocantabrian190_floresbello/FrancoCantabrian190_FloresBello'}


def run(args:list[str],log:Path) -> None:
    with log.open('w') as handle:
        subprocess.run(args,stdout=handle,stderr=subprocess.STDOUT,check=True)


def family(path:Path) -> set[tuple[str,str]]:
    result=[tuple(line.split()[:2]) for line in path.open() if line.strip()]
    if len(result)!=len(set(result)):raise ValueError('Duplicate FID/IID pair')
    return set(result)


def digest(path:Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as handle:
        for block in iter(lambda:handle.read(1048576),b''):h.update(block)
    return h.hexdigest()


def main() -> None:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plink',type=Path,required=True)
    parser.add_argument('--plink2',type=Path,required=True)
    parser.add_argument('--panel',choices=sorted(PANELS),required=True)
    args=parser.parse_args(); name=args.panel
    review=OUT/f'{name}-marker-review.tsv'
    with review.open(newline='') as f:
        markers=[r['marker_id'] for r in csv.DictReader(f,delimiter='\t') if r['king_pruned_marker']=='1' and r['classification'] in ('direct_same_order','direct_swapped')]
    if len(markers)!=len(set(markers)) or not markers:raise ValueError('Invalid marker intersection')
    marker_file=OUT/f'{name}-safe-king.snps'
    marker_file.write_text(''.join(x+'\n' for x in markers))
    a=OUT/f'{name}-aadr'; b=OUT/f'{name}-subset'; merged=OUT/f'{name}-merged'
    common=['--threads','4','--memory','2048']
    for inp,dest in ((REF,a),(PANELS[name],b)):
        run([str(args.plink),'--bfile',str(inp),'--extract',str(marker_file),'--make-bed',*common,'--out',str(dest)],OUT/f'{dest.name}-console.log')
    asamples=family(Path(str(a)+'.fam')); bsamples=family(Path(str(b)+'.fam'))
    if asamples & bsamples:raise ValueError('Reference and external FID/IID overlap; resolve before merge')
    run([str(args.plink),'--bfile',str(a),'--bmerge',str(b),'--make-bed',*common,'--out',str(merged)],OUT/f'{name}-merged-console.log')
    mergedfam=family(Path(str(merged)+'.fam'))
    if mergedfam!=asamples|bsamples:raise ValueError('Unexpected merged sample set')
    for label,original,expected_count in (('aadr',a,len(asamples)),('external',b,len(bsamples))):
        diff=OUT/f'{name}-diff-{label}'
        run([str(args.plink2),'--bfile',str(merged),'--pgen-diff',str(original)+'.bed',str(original)+'.bim',str(original)+'.fam','include-missing',*common,'--out',str(diff)],OUT/f'{name}-diff-{label}-console.log')
        text=(OUT/f'{name}-diff-{label}-console.log').read_text()
        match=re.search(r'--pgen-diff:\s*(\d+) samples and (\d+) variants compared, (\d+) differences',text)
        if not match or tuple(map(int,match.groups()))!=(expected_count,len(markers),0):raise ValueError(f'Merge mismatch or incomplete comparison: {label}')
    require=OUT/f'{name}-require.txt'
    require.write_text(''.join(f'{fid} {iid}\n' for fid,iid in sorted(bsamples)))
    king=OUT/f'{name}-king'
    run([str(args.plink2),'--bfile',str(merged),'--make-king-table','--king-table-filter','0.0884','--king-table-require',str(require),*common,'--out',str(king)],OUT/f'{name}-king-console.log')
    with Path(str(king)+'.kin0').open(newline='') as f:relations=list(csv.DictReader(f,delimiter='\t'))
    cross=[]
    for r in relations:
        x=(r['#FID1'],r['IID1']);y=(r['FID2'],r['IID2'])
        if (x in asamples and y in bsamples) or (y in asamples and x in bsamples):cross.append(r)
    summary={'reference_samples':len(asamples),'external_samples':len(bsamples),'markers':len(markers),
             'cross_panel_pairs_at_least_0_0884':len(cross),
             'cross_panel_pairs_at_least_0_354':sum(float(r['KINSHIP'])>=.354 for r in cross),
             'minimum_joint_markers':min((int(r['NSNP']) for r in cross),default=None),
             'marker_list_sha256':digest(marker_file),'plink_sha256':digest(args.plink),'plink2_sha256':digest(args.plink2),
             'scope':'Exploratory screening only. Do not equate high kinship with identity or claim independence below threshold. No production selection.'}
    (OUT/f'{name}-cross-panel-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(name,json.dumps(summary))


if __name__=='__main__':main()
