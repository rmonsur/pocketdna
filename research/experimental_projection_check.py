#!/usr/bin/env python3
"""Calibrate an exploratory LS projection on basis samples; compare held-outs to smartpca."""
from __future__ import annotations
import csv
import hashlib
import json
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'dataset/interim/reference-validation/experimental-pca'


def main() -> None:
    with (P/'aliases.tsv').open(newline='') as f: aliases=list(csv.DictReader(f,delimiter='\t'))
    role={r['alias']:r['role'] for r in aliases}
    eig={}
    with (P/'pca.evec').open() as f:
        for line in f:
            if line.lstrip().startswith('#') or not line.strip():continue
            fields=line.split();eig[fields[0]]=np.array(fields[1:26],dtype=np.float64)
    ind=[line.split()[0] for line in (P/'frozen.ind').open() if line.strip()]
    if set(ind)!=set(role) or set(ind)!=set(eig):raise ValueError('Input sample IDs mismatch')
    snps=[line.split() for line in (P/'frozen.snp').open() if line.strip()]
    weights=np.loadtxt(P/'pca.weights',usecols=tuple(range(3,28)),dtype=np.float64)
    if weights.shape!=(len(snps),25):raise ValueError('Weight dimensions mismatch')
    with (P/'pca.weights').open() as f:
        ids=[line.split()[0] for line in f if line.strip()]
    if ids!=[r[0] for r in snps]:raise ValueError('Weight SNP order mismatch')
    with (P/'basis-frequency.acount').open(newline='') as f:
        freq={r['ID']:r for r in csv.DictReader(f,delimiter='\t')}
    mean=[];fancy=[]
    for marker,_,_,_,allele1,allele2 in snps:
        r=freq[marker]
        if r['REF']!=allele1 or r['ALT']!=allele2:raise ValueError('Frequency allele mismatch')
        n=int(r['OBS_CT']); alt=int(r['ALT_CTS'])
        p=(n-alt)/n
        if not 0<p<1:raise ValueError('Monomorphic or unobserved basis marker')
        mean.append(2*p);fancy.append(1/np.sqrt(p*(1-p)))
    mu=np.array(mean);scale=np.array(fancy)
    weights/=np.sqrt(len(snps))
    stride=(len(snps)+3)//4
    data=np.memmap(P/'frozen.geno',dtype=np.uint8,mode='r',offset=48,shape=(len(ind),stride))
    mi=np.arange(len(snps)); shifts=((3-mi%4)*2).astype(np.uint8)
    sample_ids={k:sorted([sid for sid in ind if role[sid]==k]) for k in ('basis','test')}
    # Fixed evenly spaced members: no held-out samples influence fitted scaling.
    subset={k:[v[i] for i in np.linspace(0,len(v)-1,16,dtype=int)] for k,v in sample_ids.items()}
    index={sid:i for i,sid in enumerate(ind)}
    preds={}; targets={}; coverage={}
    for label,ids in subset.items():
        predicted=[];target=[];obs=[]
        for sid in ids:
            g=(data[index[sid],mi//4]>>shifts)&3
            mask=g!=3
            values=(g[mask].astype(np.float64)-mu[mask])*scale[mask]
            beta,_,rank,_=np.linalg.lstsq(weights[mask],values,rcond=None)
            if rank!=25:raise ValueError('Rank-deficient projection')
            predicted.append(beta);target.append(eig[sid]);obs.append(int(mask.sum()))
        preds[label]=np.array(predicted);targets[label]=np.array(target);coverage[label]=obs
    train=preds['basis'];truth=targets['basis']
    denom=(train*train).sum(axis=0)
    if np.any(denom==0):raise ValueError('Zero training projection variance')
    calibrated=(train*truth).sum(axis=0)/denom
    results={}
    for label in ('basis','test'):
        diff=preds[label]*calibrated-targets[label]
        results[label]={'n':len(subset[label]),'max_abs_error':float(np.abs(diff).max()),
                        'rmse':float(np.sqrt(np.mean(diff**2))),'per_pc_rmse':np.sqrt(np.mean(diff**2,axis=0)).tolist(),
                        'min_markers':min(coverage[label])}
    result={'status':'exploratory','results':results,'markers':len(snps),'sample_selection':'16 deterministic evenly spaced per role',
            'calibration':'25 independent scales fitted only on 16 basis individuals using known smartpca scores',
            'snp_weights_sha256':hashlib.sha256((P/'pca.weights').read_bytes()).hexdigest(),
            'warning':'Exploratory numerical comparison only; training-score calibration, high-precision text output, no chip mask and no production tolerances. Does not certify browser parity or ancestry accuracy.'}
    (P/'projection-check.json').write_text(json.dumps(result,indent=2)+'\n')
    # Experimental reference-only fixtures remain in the ignored dataset directory.
    fixture=P/'ts-parity';fixture.mkdir(exist_ok=True)
    np.asarray(weights,dtype='<f8').tofile(fixture/'weights.f64')
    np.asarray(mu,dtype='<f8').tofile(fixture/'means.f64')
    np.asarray(scale,dtype='<f8').tofile(fixture/'normalization.f64')
    np.asarray(calibrated,dtype='<f8').tofile(fixture/'coordinate-scales.f64')
    calls=np.stack([((data[index[sid],mi//4]>>shifts)&3) for sid in subset['test']])
    calls.astype(np.uint8).tofile(fixture/'calls.u8')
    (fixture/'manifest.json').write_text(json.dumps({'markers':len(snps),'dimensions':25,'samples':len(subset['test']),
        'expected_smartpca':targets['test'].tolist(), 'scope':'Reference samples only; unmasked exploratory calibration.'},indent=2)+'\n')
    print(json.dumps(result,indent=2))


if __name__=='__main__':main()
