#!/usr/bin/env python3
"""Create a chromosome-22 PLINK dataset for exploratory relatedness screening."""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'dataset/aadr_v66p1_ho'
AUDIT = ROOT / 'dataset/interim/reference-validation'
OUT = AUDIT / 'relatedness-pilot'
PREFIX = 'v66.p1_HO.aadr.patch.PUB'
# Known controls discovered during the review; this is not an exhaustive species screen.
EXCLUDED_CONTROLS = {'Chimp_HO.HO', 'Href_HO.HO'}


def rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline='') as handle:
        return list(csv.DictReader(handle, delimiter='\t'))


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as handle:
        for data in iter(lambda: handle.read(1024 * 1024), b''): h.update(data)
    return h.hexdigest()


def main() -> None:
    global OUT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--genome-wide', action='store_true', help='Use all autosomes for exploratory QC')
    args = parser.parse_args()
    if args.genome_wide:
        OUT = AUDIT / 'relatedness-genome-wide'
    crosswalk = rows(AUDIT / 'sample-crosswalk.tsv')
    calls = {r['genetic_id']: float(r['call_rate']) for r in rows(AUDIT / 'sample-call-counts.tsv')}
    date_keys = [k for k in crosswalk[0] if k.startswith('Full Date')]
    if len(date_keys) != 1: raise ValueError('Ambiguous date field')
    selected = [r for r in crosswalk if r['genetic_id'].endswith('.HO')
                and r[date_keys[0]].strip().lower() == 'present'
                and r['ASSESSMENT'].upper() == 'PASS' and r['Data type'] == 'HumanOrigins'
                and calls[r['genetic_id']] >= 0.98 and r['ind_group'] == r['Group ID']
                and r['genetic_id'] not in EXCLUDED_CONTROLS]
    if len({r['Individual ID'] for r in selected}) != len(selected):
        raise ValueError('Resolve duplicate Individual IDs before screening')
    ind = [line.split() for line in (DATA / f'{PREFIX}.ind').open() if line.strip()]
    snps = [line.split() for line in (DATA / f'{PREFIX}.snp').open() if line.strip()]
    indexes = {r[0]: i for i, r in enumerate(ind)}
    sample_idx = np.array([indexes[r['genetic_id']] for r in selected])
    marker_idx = np.array([i for i, r in enumerate(snps) if (r[1].isdigit() and 1 <= int(r[1]) <= 22) if args.genome_wide or r[1] == '22'])
    row_bytes = (len(snps) + 3) // 4
    source = DATA / f'{PREFIX}.geno'
    if source.stat().st_size != 48 + len(ind) * row_bytes: raise ValueError('Invalid TGENO size')
    data = np.memmap(source, dtype=np.uint8, mode='r', offset=48, shape=(len(ind), row_bytes))
    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / 'pilot.fam').open('w') as fam, (OUT / 'selected.tsv').open('w') as table:
        writer = csv.writer(table, delimiter='\t')
        writer.writerow(['genetic_id', 'individual_id', 'group', 'autosomal_call_rate'])
        for r in selected:
            sid = r['genetic_id']
            fam.write(f'{sid} {sid} 0 0 0 -9\n')
            writer.writerow([sid, r['Individual ID'], r['ind_group'], calls[sid]])
    with (OUT / 'pilot.bim').open('w') as bim:
        for i in marker_idx:
            sid, chrom, dist, pos, a1, a2 = snps[i][:6]
            bim.write(f'{chrom} {sid} {dist} {pos} {a1} {a2}\n')
    # EIGENSTRAT dosage 2/1/0/9 maps to PLINK SNP-major codes 00/10/11/01.
    mapping = np.array([3, 2, 0, 1], dtype=np.uint8)
    padding = (-len(sample_idx)) % 4
    with (OUT / 'pilot.bed').open('wb') as bed:
        bed.write(bytes((0x6c, 0x1b, 0x01)))
        for start in range(0, len(marker_idx), 1024):
            midx = marker_idx[start:start+1024]
            tgeno = (data[sample_idx[:, None], midx[None, :] // 4] >> ((3 - midx[None, :] % 4) * 2).astype(np.uint8)) & 3
            codes = mapping[tgeno.T]
            if padding: codes = np.pad(codes, ((0, 0), (0, padding)))
            codes = codes.reshape(len(midx), -1, 4)
            packed = codes[:,:,0] | codes[:,:,1] << 2 | codes[:,:,2] << 4 | codes[:,:,3] << 6
            bed.write(packed.tobytes())
    manifest = {'purpose': ('exploratory genome-wide' if args.genome_wide else 'exploratory chromosome-22') + ' relatedness pilot; not a validated panel',
                'samples': len(selected), 'markers': len(marker_idx), 'sample_groups': len({r['ind_group'] for r in selected}),
                'selection': 'present, .HO, HumanOrigins, Pass, >=0.98 full-autosomal call rate, matching group labels; unique Individual ID; exclude two known nonhuman/reference controls',
                'bed_sha256': digest(OUT/'pilot.bed'), 'bim_sha256': digest(OUT/'pilot.bim'),
                'fam_sha256': digest(OUT/'pilot.fam'), 'selection_sha256': digest(OUT/'selected.tsv'),
                'excluded_known_controls': sorted(EXCLUDED_CONTROLS),
                'note': 'Species screening, held-out split and cross-study identity checks remain open.' + ('' if args.genome_wide else ' Chromosome 22 cannot establish genome-wide unrelatedness.')}
    (OUT/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__': main()
