#!/usr/bin/env python3
"""Run a frozen experimental smartpca basis plus held-out projection."""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import os
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'dataset/interim/reference-validation/experimental-pca'


def sha(path:Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1048576),b''):h.update(chunk)
    return h.hexdigest()


def main() -> None:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--smartpca',type=Path,required=True);parser.add_argument('--timeout',type=int,default=900)
    args=parser.parse_args()
    with (P/'aliases.tsv').open(newline='') as f:r=list(csv.DictReader(f,delimiter='\t'))
    roles={x['alias']:x['role'] for x in r}
    if len(roles)!=len(r):raise ValueError('Duplicate aliases')
    entries=[line.split() for line in (P/'frozen.ind').open() if line.strip()]
    if len(entries)!=len(roles) or set(x[0] for x in entries)!=set(roles):raise ValueError('Alias mismatch')
    ind=P/'pca.ind';ind.write_text(''.join(f"{sid} {sex} {'BASIS' if roles[sid]=='basis' else 'TEST'}\n" for sid,sex,_ in entries))
    (P/'basis.poplist').write_text('BASIS\n')
    params={'genotypename':P/'frozen.geno','snpname':P/'frozen.snp','indivname':ind,
            'evecoutname':P/'pca.evec','evaloutname':P/'pca.eval','snpweightoutname':P/'pca.weights',
            'poplistname':P/'basis.poplist','numoutevec':25,'numoutlieriter':0,'lsqproject':'YES',
            'shrinkmode':'NO','autoshrink':'NO','fastmode':'NO','hiprecision':'YES','noxdata':'YES','killr2':'NO','ldregress':0}
    par=P/'pca.par';par.write_text(''.join(f'{k}: {v}\n' for k,v in params.items()))
    manifest={'status':'started','purpose':'experimental PCA and held-out projection; not production validated',
              'binary_sha256':sha(args.smartpca),'split_sha256':sha(P/'split.tsv'),'aliases_sha256':sha(P/'aliases.tsv'),
              'geno_sha256':sha(P/'frozen.geno'),'snp_sha256':sha(P/'frozen.snp'),'ind_sha256':sha(ind),
              'parameter_sha256':sha(par),'basis_count':sum(x=='basis' for x in roles.values()),
              'test_count':sum(x=='test' for x in roles.values()),'thread_environment':{'OPENBLAS_NUM_THREADS':'4','OMP_NUM_THREADS':'4'}}
    m=P/'pca-manifest.json';m.write_text(json.dumps(manifest,indent=2)+'\n')
    env={**os.environ,**manifest['thread_environment']}
    try:
        with (P/'pca-console.log').open('w') as log:
            run=subprocess.run([str(args.smartpca),'-p',str(par)],stdout=log,stderr=subprocess.STDOUT,env=env,timeout=args.timeout,check=False)
        manifest['exit_code']=run.returncode
        outputs=[P/'pca.evec',P/'pca.eval',P/'pca.weights']
        manifest['status']='completed' if run.returncode==0 and all(x.is_file() and x.stat().st_size for x in outputs) else 'failed'
        if manifest['status']=='completed':manifest['output_sha256']={x.name:sha(x) for x in outputs}
    except subprocess.TimeoutExpired:
        manifest['status']='timed_out'
    finally:m.write_text(json.dumps(manifest,indent=2)+'\n')
    print('Experimental smartpca:',manifest['status'])
    if manifest['status']!='completed':raise SystemExit(1)


if __name__=='__main__':main()
