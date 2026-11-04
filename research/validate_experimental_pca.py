#!/usr/bin/env python3
"""Check experimental PCA outputs and compare training subspaces with PLINK."""
from __future__ import annotations
import csv
import json
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'dataset/interim/reference-validation/experimental-pca'


def main() -> None:
    with (P/'aliases.tsv').open(newline='') as handle:
        aliases=list(csv.DictReader(handle,delimiter='\t'))
    role={x['alias']:x['role'] for x in aliases}
    eig={}
    with (P/'pca.evec').open() as f:
        for line in f:
            if line.lstrip().startswith('#') or not line.strip():continue
            row=line.split()
            if len(row)!=27:raise ValueError('Expected ID, 25 PCs, group')
            if row[0] in eig:raise ValueError('Duplicate smartpca sample')
            eig[row[0]]=(np.array(row[1:26],dtype=np.float64),row[26])
    if set(eig)!=set(role):raise ValueError('smartpca sample set mismatch')
    for sample,(_,group) in eig.items():
        if group!=('BASIS' if role[sample]=='basis' else 'TEST'):raise ValueError('smartpca role mismatch')
    with (P/'plink-basis.eigenvec').open(newline='') as f:
        rows=list(csv.DictReader(f,delimiter='\t'))
    plink={r['IID']:np.array([r[f'PC{i}'] for i in range(1,26)],dtype=np.float64) for r in rows}
    basis=sorted(x for x in role if role[x]=='basis');test=sorted(x for x in role if role[x]=='test')
    if len(plink)!=len(rows) or set(plink)!=set(basis):raise ValueError('PLINK basis sample mismatch')
    weights=[line.split()[0] for line in (P/'pca.weights').open() if line.strip()]
    markers=[line.split()[0] for line in (P/'frozen.snp').open() if line.strip()]
    if len(weights)!=len(set(weights)) or set(weights)!=set(markers):raise ValueError('SNP weight identity mismatch')
    a=np.stack([eig[x][0] for x in basis]);b=np.stack([plink[x] for x in basis]);t=np.stack([eig[x][0] for x in test])
    if not np.isfinite(a).all() or not np.isfinite(b).all() or not np.isfinite(t).all():raise ValueError('Non-finite PC value')
    correlations=[float(np.corrcoef(a[:,i],b[:,i])[0,1]) for i in range(25)]
    if not np.isfinite(correlations).all():raise ValueError('Constant or non-finite PC')
    def subspace(lo:int,hi:int) -> list[float]:
        x=a[:,lo:hi]-a[:,lo:hi].mean(axis=0);y=b[:,lo:hi]-b[:,lo:hi].mean(axis=0)
        qx=np.linalg.qr(x)[0];qy=np.linalg.qr(y)[0]
        return np.clip(np.linalg.svd(qx.T@qy,compute_uv=False),0,1).tolist()
    pc_outside=((t<a.min(axis=0))|(t>a.max(axis=0))).sum(axis=0).tolist()
    result={'basis_samples':len(basis),'held_out_samples':len(test),'pcs':25,'markers':len(markers),
            'smartpca_sample_roles_match':True,'snp_weight_ids_match':True,'finite_outputs':True,
            'in_sample_abs_per_pc_correlation':[abs(x) for x in correlations],
            'in_sample_pc1_8_principal_angle_cosines':subspace(0,8),
            'in_sample_pc9_25_principal_angle_cosines':subspace(8,25),
            'held_out_counts_outside_training_axis_minmax':pc_outside,
            'limitations':'PLINK and smartpca have different missingness/normalization conventions. This is descriptive in-sample software agreement, not an independent validation of historical ancestry, out-of-sample projection, or numerical parity. Coordinate-wise extremes alone do not establish failure.'}
    (P/'pca-validation.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))


if __name__=='__main__':main()
