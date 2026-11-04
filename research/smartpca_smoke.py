#!/usr/bin/env python3
"""Run a small, non-scientific smartpca input-compatibility smoke test."""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT / 'dataset/aadr_v66p1_ho'
OUT = ROOT / 'dataset/interim/smartpca-smoke'
PREFIX = 'v66.p1_HO.aadr.patch.PUB'


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--smartpca', type=Path, required=True)
    parser.add_argument('--samples', type=int, default=64)
    parser.add_argument('--timeout', type=int, default=180)
    args = parser.parse_args()
    if args.samples < 8:
        parser.error('at least eight samples are required')
    OUT.mkdir(parents=True, exist_ok=True)
    ind = REFERENCE / f'{PREFIX}.ind'
    snp = REFERENCE / f'{PREFIX}.snp'
    geno = REFERENCE / f'{PREFIX}.geno'
    rows = [line.split() for line in ind.read_text().splitlines() if line.strip()]
    if any(len(row) != 3 for row in rows):
        raise ValueError('Expected three fields in reference .ind')
    # A technical read/compute check only: these are not QC-approved individuals.
    eligible = [i for i, row in enumerate(rows) if row[0].endswith('.HO') and row[2] != 'Ignore']
    if len(eligible) < args.samples:
        raise ValueError('Not enough .HO reference records for smoke test')
    chosen = set(eligible[:args.samples])
    ind_out = OUT / 'smoke.ind'
    ind_out.write_text(''.join(f'{sid} {sex} {"SMOKE" if i in chosen else "Ignore"}\n' for i, (sid, sex, _) in enumerate(rows)))
    (OUT / 'poplist.txt').write_text('SMOKE\n')
    for old_output in ('smoke.evec', 'smoke.eval', 'smoke.weights'):
        (OUT / old_output).unlink(missing_ok=True)
    params = {
        'genotypename': geno, 'snpname': snp, 'indivname': ind_out,
        'evecoutname': OUT / 'smoke.evec', 'evaloutname': OUT / 'smoke.eval',
        'snpweightoutname': OUT / 'smoke.weights', 'poplistname': OUT / 'poplist.txt',
        'numoutevec': 5, 'numoutlieriter': 0, 'lsqproject': 'YES',
        'shrinkmode': 'NO', 'autoshrink': 'NO', 'fastmode': 'NO',
        'noxdata': 'YES', 'chrom': 22,
    }
    par = OUT / 'smartpca.par'
    par.write_text(''.join(f'{key}: {value}\n' for key, value in params.items()))
    manifest = {'purpose': 'input compatibility smoke test; not a validated reference basis',
                'sample_count': len(chosen), 'reference_ind_count': len(rows),
                'reference_snp_count': sum(1 for _ in snp.open()),
                'smartpca_sha256': sha256(args.smartpca), 'ind_sha256': sha256(ind),
                'snp_sha256': sha256(snp), 'genotype_sha256': sha256(geno),
                'parameter_sha256': sha256(par), 'status': 'started'}
    manifest_path = OUT / 'manifest.json'
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    try:
        with (OUT / 'smartpca.log').open('w') as log:
            result = subprocess.run([str(args.smartpca), '-p', str(par)], stdout=log,
                                    stderr=subprocess.STDOUT, timeout=args.timeout, check=False)
        manifest['exit_code'] = result.returncode
        outputs = [OUT / 'smoke.evec', OUT / 'smoke.eval', OUT / 'smoke.weights']
        manifest['status'] = 'passed' if result.returncode == 0 and all(p.is_file() and p.stat().st_size > 0 for p in outputs) else 'failed'
    except subprocess.TimeoutExpired:
        manifest['status'] = 'timed_out'
    finally:
        manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    print(f"smartpca smoke test: {manifest['status']}; log and manifest in {OUT.relative_to(ROOT)}")
    if manifest['status'] != 'passed':
        raise SystemExit(1)


if __name__ == '__main__':
    main()
