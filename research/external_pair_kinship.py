#!/usr/bin/env python3
"""Screen external panel pairs for overlap using common audited AADR markers."""
from __future__ import annotations
import argparse
import csv
import json
from pathlib import Path
from research.cross_panel_kinship import OUT, PANELS, digest, family, run


def main() -> None:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plink',type=Path,required=True);parser.add_argument('--plink2',type=Path,required=True)
    parser.add_argument('--left',choices=sorted(PANELS),required=True);parser.add_argument('--right',choices=sorted(PANELS),required=True)
    args=parser.parse_args()
    if args.left==args.right:raise ValueError('Choose distinct panels')
    name=f'{args.left}__{args.right}'
    markers=sorted(set((OUT/f'{args.left}-safe-king.snps').read_text().splitlines()) & set((OUT/f'{args.right}-safe-king.snps').read_text().splitlines()))
    if not markers:raise ValueError('No common audited markers')
    marker_path=OUT/f'{name}.snps';marker_path.write_text(''.join(x+'\n' for x in markers))
    common=['--threads','4','--memory','2048']; subsets=[]
    for panel in (args.left,args.right):
        dest=OUT/f'{name}-{panel}'
        run([str(args.plink),'--bfile',str(PANELS[panel]),'--extract',str(marker_path),'--make-bed',*common,'--out',str(dest)],OUT/f'{dest.name}-console.log')
        subsets.append(dest)
    l,r=subsets; lf=family(Path(str(l)+'.fam'));rf=family(Path(str(r)+'.fam'))
    if lf & rf:raise ValueError('External FID/IID collision needs explicit resolution before merge')
    merged=OUT/f'{name}-merged'
    run([str(args.plink),'--bfile',str(l),'--bmerge',str(r),'--make-bed',*common,'--out',str(merged)],OUT/f'{name}-merged-console.log')
    if family(Path(str(merged)+'.fam')) != lf|rf:raise ValueError('Merged sample-set mismatch')
    # Compare both inputs to the merged dataset, including missing calls.
    import re
    for label,original,n in (('left',l,len(lf)),('right',r,len(rf))):
        log=OUT/f'{name}-diff-{label}-console.log';dest=OUT/f'{name}-diff-{label}'
        run([str(args.plink2),'--bfile',str(merged),'--pgen-diff',str(original)+'.bed',str(original)+'.bim',str(original)+'.fam','include-missing',*common,'--out',str(dest)],log)
        match=re.search(r'--pgen-diff:\s*(\d+) samples and (\d+) variants compared, (\d+) differences',log.read_text())
        if not match or tuple(map(int,match.groups()))!=(n,len(markers),0):raise ValueError(f'Incomplete or differing {label} merge')
    require=OUT/f'{name}-require.txt';require.write_text(''.join(f'{fid} {iid}\n' for fid,iid in sorted(rf)))
    king=OUT/f'{name}-king'
    run([str(args.plink2),'--bfile',str(merged),'--make-king-table','--king-table-filter','0.0884','--king-table-require',str(require),*common,'--out',str(king)],OUT/f'{name}-king-console.log')
    with Path(str(king)+'.kin0').open(newline='') as f:records=list(csv.DictReader(f,delimiter='\t'))
    cross=[]
    for row in records:
        a=(row['#FID1'],row['IID1']);b=(row['FID2'],row['IID2'])
        if (a in lf and b in rf) or (a in rf and b in lf):cross.append(row)
    summary={'left':args.left,'right':args.right,'left_samples':len(lf),'right_samples':len(rf),'markers':len(markers),
             'cross_panel_pairs_at_least_0_0884':len(cross),'cross_panel_pairs_at_least_0_354':sum(float(x['KINSHIP'])>=.354 for x in cross),
             'minimum_joint_markers':min((int(x['NSNP']) for x in cross),default=None),'marker_list_sha256':digest(marker_path),
             'scope':'Exploratory KING flags, not proven identity or complete independence. No production selection.'}
    (OUT/f'{name}-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary))


if __name__=='__main__':main()
