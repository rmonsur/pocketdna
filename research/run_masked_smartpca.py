#!/usr/bin/env python3
"""Evaluate a local consumer-marker presence mask on held-out reference samples."""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import os
import shutil
import subprocess
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'dataset/interim/reference-validation/experimental-pca'
OUT=P/'demo-marker-mask'


def sha(path:Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1048576),b''):h.update(chunk)
    return h.hexdigest()


def main() -> None:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--genotype-file',type=Path,required=True)
    parser.add_argument('--smartpca',type=Path,required=True)
    parser.add_argument('--timeout',type=int,default=900)
    args=parser.parse_args()
    with (P/'aliases.tsv').open(newline='') as f:r=list(csv.DictReader(f,delimiter='\t'))
    role={x['alias']:x['role'] for x in r}
    samples=sorted(sid for sid in role if role[sid]=='test')
    selected=[samples[i] for i in np.linspace(0,len(samples)-1,16,dtype=int)]
    ind=[line.split() for line in (P/'pca.ind').open() if line.strip()]
    if set(x[0] for x in ind)!=set(role):raise ValueError('PCA input ID mismatch')
    snps=[line.split() for line in (P/'frozen.snp').open() if line.strip()]
    lookup={x[0]:(i,x[1],x[3]) for i,x in enumerate(snps)}
    if len(lookup)!=len(snps):raise ValueError('Duplicate SNP IDs')
    mask=np.zeros(len(snps),dtype=bool)
    # Read only marker identifiers and positions. No genotype values are stored or analyzed.
    with args.genotype_file.open(encoding='utf-8-sig') as handle:
        for line in handle:
            if line.startswith('#'):continue
            cols=line.split(maxsplit=3)
            if len(cols)<3 or cols[0] not in lookup:continue
            i,chrom,pos=lookup[cols[0]]
            if cols[1]==chrom and cols[2]==pos:mask[i]=True
    if int(mask.sum())<26:raise ValueError('Insufficient matched markers')
    OUT.mkdir(parents=True,exist_ok=True)
    p=P/'frozen.geno';target=OUT/'masked.geno';shutil.copyfile(p,target)
    stride=(len(snps)+3)//4
    if target.stat().st_size!=48+len(ind)*stride:raise ValueError('TGENO size mismatch')
    data=np.memmap(target,dtype=np.uint8,mode='r+',offset=48,shape=(len(ind),stride))
    to_mask=np.flatnonzero(~mask)
    # A byte OR mask sets each excluded two-bit code to 3 (missing).
    byte_mask=np.zeros(stride,dtype=np.uint8)
    np.bitwise_or.at(byte_mask,to_mask//4,(3 << ((3-to_mask%4)*2)).astype(np.uint8))
    for i,(sid,_,_) in enumerate(ind):
        if sid in selected:data[i] |= byte_mask
    data.flush();del data
    (OUT/'masked.ind').write_text(''.join(f'{sid} {sex} '+('BASIS' if label=='BASIS' else ('TEST' if sid in selected else 'Ignore'))+'\n' for sid,sex,label in ind))
    (OUT/'basis.poplist').write_text('BASIS\n')
    params={'genotypename':target,'snpname':P/'frozen.snp','indivname':OUT/'masked.ind',
            'evecoutname':OUT/'masked.evec','evaloutname':OUT/'masked.eval',
            'snpweightoutname':OUT/'masked.weights','poplistname':OUT/'basis.poplist',
            'numoutevec':25,'numoutlieriter':0,'lsqproject':'YES','shrinkmode':'NO','autoshrink':'NO',
            'fastmode':'NO','hiprecision':'YES','noxdata':'YES','killr2':'NO','ldregress':0}
    par=OUT/'masked.par';par.write_text(''.join(f'{k}: {v}\n' for k,v in params.items()))
    meta={'status':'started','basis_samples':sum(x=='basis' for x in role.values()),'selected_test_samples':len(selected),
          'matched_marker_count':int(mask.sum()),'all_basis_markers':len(mask),'masked_geno_sha256':sha(target),
          'ind_sha256':sha(OUT/'masked.ind'),'parameter_sha256':sha(par),'smartpca_sha256':sha(args.smartpca),
          'scope':'Consumer-file marker presence is an individual-specific proxy, not an official chip manifest; applied to unrelated reference samples only. No consumer genotype calls used.'}
    manifest=OUT/'manifest.json';manifest.write_text(json.dumps(meta,indent=2)+'\n')
    try:
        with (OUT/'masked-console.log').open('w') as log:
            result=subprocess.run([str(args.smartpca),'-p',str(par)],stdout=log,stderr=subprocess.STDOUT,timeout=args.timeout,
                                  env={**os.environ,'OPENBLAS_NUM_THREADS':'4','OMP_NUM_THREADS':'4'},check=False)
        meta['exit_code']=result.returncode
        meta['status']='completed' if result.returncode==0 and all((OUT/x).is_file() and (OUT/x).stat().st_size for x in ('masked.evec','masked.eval','masked.weights')) else 'failed'
    except subprocess.TimeoutExpired:meta['status']='timed_out'
    finally:manifest.write_text(json.dumps(meta,indent=2)+'\n')
    print('Masked smartpca:',meta['status'],'matched markers:',meta['matched_marker_count'])
    if meta['status']!='completed':raise SystemExit(1)


if __name__=='__main__':main()
