#!/usr/bin/env python3
"""Review cross-panel high-KING pairs on mutually called, allele-aligned hardcalls."""
from __future__ import annotations
import csv
import json
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dataset/interim/reference-validation/external-marker-audit'


def family(path:Path) -> set[tuple[str,str]]:
    return {tuple(line.split()[:2]) for line in path.open() if line.strip()}


def main() -> None:
    for panel in ('egdp','sgdp','francocantabrian'):
        ref=family(OUT/f'{panel}-aadr.fam'); ext=family(OUT/f'{panel}-subset.fam')
        fam=[tuple(line.split()[:2]) for line in (OUT/f'{panel}-merged.fam').open() if line.strip()]
        if len(set(fam)) != len(fam):raise ValueError('Merged sample IDs are not unique')
        indexes={pair:i for i,pair in enumerate(fam)}
        with (OUT/f'{panel}-king.kin0').open(newline='') as f:
            rows=list(csv.DictReader(f,delimiter='\t'))
        pairs=[]
        for row in rows:
            a=(row['#FID1'],row['IID1']);b=(row['FID2'],row['IID2'])
            if ((a in ref and b in ext) or (b in ref and a in ext)) and float(row['KINSHIP'])>=.354:
                pairs.append((a,b,row))
        markers=sum(1 for _ in (OUT/f'{panel}-merged.bim').open())
        stride=(len(fam)+3)//4
        bed=OUT/f'{panel}-merged.bed'
        if bed.stat().st_size!=3+markers*stride:raise ValueError('Unexpected PLINK BED dimensions')
        with bed.open('rb') as f:
            if f.read(3)!=b'\x6c\x1b\x01':raise ValueError('Unexpected PLINK BED header')
        data=np.memmap(bed,dtype=np.uint8,mode='r',offset=3,shape=(markers,stride))
        output=[]
        for a,b,row in pairs:
            ai,bi=indexes[a],indexes[b]
            x=(data[:,ai//4]>>(2*(ai%4)))&3
            y=(data[:,bi//4]>>(2*(bi%4)))&3
            both=(x!=1)&(y!=1)
            n=int(np.count_nonzero(both)); mismatch=int(np.count_nonzero((x!=y)&both))
            if n != int(row['NSNP']):raise ValueError('Joint marker count differs from KING')
            output.append({'fid1':a[0],'iid1':a[1],'fid2':b[0],'iid2':b[1],
                           'kinship':row['KINSHIP'],'joint_markers':n,'discordant_calls':mismatch,
                           'discordance_fraction':mismatch/n if n else None})
        path=OUT/f'{panel}-high-kinship-concordance.tsv'
        with path.open('w',newline='') as f:
            writer=csv.DictWriter(f,fieldnames=['fid1','iid1','fid2','iid2','kinship','joint_markers','discordant_calls','discordance_fraction'],delimiter='\t')
            writer.writeheader();writer.writerows(output)
        fractions=[r['discordance_fraction'] for r in output if r['discordance_fraction'] is not None]
        summary={'pairs':len(output),'min_discordance_fraction':min(fractions,default=None),'max_discordance_fraction':max(fractions,default=None),
                 'scope':'Exploratory cross-panel hardcall concordance on selected markers, not a proof of identity.'}
        (OUT/f'{panel}-high-kinship-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
        print(panel,json.dumps(summary))


if __name__=='__main__':main()
