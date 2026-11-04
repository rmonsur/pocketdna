#!/usr/bin/env python3
"""Compare exploratory Python and smartpca projections on masked held-outs."""
from __future__ import annotations
import csv
import json
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'dataset/interim/reference-validation/experimental-pca'
M=P/'demo-marker-mask'


def eigen(path:Path) -> dict[str,tuple[np.ndarray,str]]:
    rows={}
    with path.open() as handle:
        for line in handle:
            if not line.strip() or line.lstrip().startswith('#'):continue
            f=line.split()
            if len(f)!=27 or f[0] in rows:raise ValueError('Unexpected eigenvector file')
            rows[f[0]]=(np.array(f[1:26],dtype=np.float64),f[-1])
    return rows


def main() -> None:
    original=eigen(P/'pca.evec');masked=eigen(M/'masked.evec')
    basis=sorted(sid for sid,(_,role) in masked.items() if role=='BASIS')
    test=sorted(sid for sid,(_,role) in masked.items() if role=='TEST')
    if len(basis)!=2829 or len(test)!=16 or not set(masked)<=set(original):raise ValueError('Unexpected sample roles')
    train_a=np.stack([original[sid][0] for sid in basis]);train_b=np.stack([masked[sid][0] for sid in basis])
    correlations=np.array([np.corrcoef(train_a[:,i],train_b[:,i])[0,1] for i in range(25)])
    if not np.isfinite(correlations).all() or np.any(np.abs(correlations)<.999):raise ValueError('Basis orientations differ; no simple sign alignment')
    signs=np.sign(correlations)
    std=train_a.std(axis=0)
    if np.any(std==0):raise ValueError('Constant basis coordinate')
    true=np.stack([original[sid][0] for sid in test]);masked_scores=np.stack([masked[sid][0] for sid in test])*signs
    relative=(masked_scores-true)/std
    snps=[line.split() for line in (P/'frozen.snp').open() if line.strip()]
    weights=np.loadtxt(M/'masked.weights',usecols=tuple(range(3,28)),dtype=np.float64)
    ids=[line.split()[0] for line in (M/'masked.weights').open() if line.strip()]
    if weights.shape!=(len(snps),25) or ids!=[x[0] for x in snps]:raise ValueError('Weights mismatch')
    with (P/'basis-frequency.acount').open(newline='') as f:freq={r['ID']:r for r in csv.DictReader(f,delimiter='\t')}
    means=[];normal=[]
    for marker,_,_,_,a1,a2 in snps:
        row=freq[marker]
        if row['REF']!=a1 or row['ALT']!=a2:raise ValueError('Frequency allele mismatch')
        n=int(row['OBS_CT']);p=(n-int(row['ALT_CTS']))/n
        if not 0<p<1:raise ValueError('Monomorphic marker')
        means.append(2*p);normal.append(1/np.sqrt(p*(1-p)))
    means=np.array(means);normal=np.array(normal);weights/=np.sqrt(len(snps))
    ind=[line.split()[0] for line in (M/'masked.ind').open() if line.strip()]
    index={sid:i for i,sid in enumerate(ind)}
    data=np.memmap(M/'masked.geno',dtype=np.uint8,mode='r',offset=48,shape=(len(ind),(len(snps)+3)//4))
    mi=np.arange(len(snps));shifts=((3-mi%4)*2).astype(np.uint8)
    calibration=[basis[i] for i in np.linspace(0,len(basis)-1,16,dtype=int)]
    def solve(sid:str) -> tuple[np.ndarray,np.ndarray]:
        calls=(data[index[sid],mi//4]>>shifts)&3;ok=calls!=3
        values=(calls[ok].astype(np.float64)-means[ok])*normal[ok]
        beta,_,rank,_=np.linalg.lstsq(weights[ok],values,rcond=None)
        if rank!=25:raise ValueError('Rank-deficient masked projection')
        return beta,calls
    train=np.stack([solve(sid)[0] for sid in calibration]);targets=np.stack([masked[sid][0] for sid in calibration])
    denominator=(train*train).sum(axis=0)
    if np.any(denominator==0):raise ValueError('Zero calibration variance')
    scales=(train*targets).sum(axis=0)/denominator
    projected=[];calls=[]
    for sid in test:
        x,c=solve(sid);projected.append(x*scales);calls.append(c)
    diff=np.stack(projected)-np.stack([masked[sid][0] for sid in test])
    fixture=M/'ts-parity';fixture.mkdir(exist_ok=True)
    for name,arr in (('weights',weights),('means',means),('normalization',normal),('coordinate-scales',scales)):
        np.asarray(arr,dtype='<f8').tofile(fixture/f'{name}.f64')
    np.stack(calls).astype(np.uint8).tofile(fixture/'calls.u8')
    (fixture/'manifest.json').write_text(json.dumps({'markers':len(snps),'dimensions':25,'samples':len(test),
        'expected_smartpca':[masked[sid][0].tolist() for sid in test], 'scope':'Masked reference samples only; marker-presence proxy.'},indent=2)+'\n')
    result={'basis_correlation_min_absolute':float(np.abs(correlations).min()),'heldout_samples':len(test),
            'python_vs_masked_smartpca_max_absolute_error':float(np.abs(diff).max()),
            'python_vs_masked_smartpca_rmse':float(np.sqrt(np.mean(diff**2))),
            'masked_vs_full_absolute_delta_in_training_sd_median':float(np.median(np.abs(relative))),
            'masked_vs_full_absolute_delta_in_training_sd_p95':float(np.quantile(np.abs(relative),.95)),
            'masked_vs_full_absolute_delta_in_training_sd_max':float(np.max(np.abs(relative))),
            'limitations':'16 reference samples only; demo-file marker presence is not an official chip manifest and does not establish build/strand compatibility; train-based scale calibration and six-decimal oracle output; no mixture/clinical accuracy.'}
    (M/'comparison.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))


if __name__=='__main__':main()
