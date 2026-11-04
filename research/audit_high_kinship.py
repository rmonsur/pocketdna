#!/usr/bin/env python3
"""Compare hardcalls for high-kinship reference pairs; preserve all pairs for review."""
from __future__ import annotations
import csv
import hashlib
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'dataset/interim/reference-validation/relatedness-genome-wide'


def main() -> None:
    with (DATA/'king.kin0').open(newline='') as handle:
        pairs = [r for r in csv.DictReader(handle, delimiter='\t') if float(r['KINSHIP']) >= 0.354]
    individuals = [line.split()[1] for line in (DATA/'pilot.fam').open() if line.strip()]
    index = {sid:i for i,sid in enumerate(individuals)}
    markers = sum(1 for _ in (DATA/'pilot.bim').open())
    stride = (len(individuals)+3)//4
    bed = DATA/'pilot.bed'
    if bed.stat().st_size != 3 + markers*stride: raise ValueError('Unexpected BED dimensions')
    with bed.open('rb') as handle:
        if handle.read(3) != b'\x6c\x1b\x01': raise ValueError('Expected SNP-major PLINK BED')
    matrix = np.memmap(bed, dtype=np.uint8, mode='r', offset=3, shape=(markers,stride))
    result = []
    for pair in pairs:
        a,b = index[pair['IID1']],index[pair['IID2']]
        ac = (matrix[:,a//4] >> (2*(a%4))) & 3
        bc = (matrix[:,b//4] >> (2*(b%4))) & 3
        common = (ac != 1) & (bc != 1)
        joint = int(np.count_nonzero(common))
        discord = int(np.count_nonzero((ac != bc) & common))
        result.append({'IID1':pair['IID1'],'IID2':pair['IID2'],'kinship':pair['KINSHIP'],
                       'joint_markers':joint,'discordant_hardcalls':discord,
                       'discordance_fraction':discord/joint if joint else None})
    with (DATA/'high-kinship-concordance.tsv').open('w',newline='') as handle:
        writer=csv.DictWriter(handle,fieldnames=['IID1','IID2','kinship','joint_markers','discordant_hardcalls','discordance_fraction'],delimiter='\t')
        writer.writeheader(); writer.writerows(result)
    # Bind the review to its exact input, while keeping all row-level reference data local.
    sha=hashlib.sha256((DATA/'king.kin0').read_bytes()).hexdigest()
    summary={'pairs':len(result),'joint_markers_min':min((x['joint_markers'] for x in result),default=None),
             'discordance_fraction_min':min((x['discordance_fraction'] for x in result if x['discordance_fraction'] is not None),default=None),
             'discordance_fraction_max':max((x['discordance_fraction'] for x in result if x['discordance_fraction'] is not None),default=None),
             'king_table_sha256':sha,'scope':'High concordance can indicate duplicate assays or genetically identical people; it does not establish sample identity.'}
    (DATA/'high-kinship-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(json.dumps(summary,indent=2))


if __name__ == '__main__': main()
