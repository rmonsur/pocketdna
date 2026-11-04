#!/usr/bin/env python3
"""Generate a review-only individual crosswalk and marker integrity audit."""
from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'dataset/aadr_v66p1_ho'
OUT = ROOT / 'dataset/interim/reference-validation'
PREFIX = 'v66.p1_HO.aadr.patch.PUB'
MISSING = {'', '..', 'n/a', 'N/A', 'NA'}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ind = [line.split() for line in (DATA / f'{PREFIX}.ind').read_text().splitlines() if line.strip()]
    with (DATA / 'v66.p1_HO.aadr.PUB.anno').open(encoding='utf-8-sig', newline='') as handle:
        reader = csv.reader(handle, delimiter='\t')
        headers = next(reader)
        fields = ['Individual ID', 'Persistent Genetic ID', 'Group ID', 'Full Date One of two formats. (Format 1) 95.4% CI calibrated radiocarbon age (Conventional Radiocarbon Age BP, Lab number) e.g. 2624-2350 calBCE (3990+-40 BP, Ua-35016). (Format 2) Archaeological context range, e.g. 2500-1700 BCE', 'Data type', 'Family relations', 'ASSESSMENT']
        indexes = [headers.index(name) for name in fields]
        annotations = {}
        for row in reader:
            if len(row) <= max(indexes):
                raise ValueError('Incomplete annotation record')
            if row[0] in annotations:
                raise ValueError('Duplicate annotation ID')
            annotations[row[0]] = [row[i] for i in indexes]
    groups = Counter(values[0] for values in annotations.values() if values[0] not in MISSING)
    persistent = Counter(values[1] for values in annotations.values() if values[1] not in MISSING)
    assessment = Counter()
    unmatched = []
    group_mismatch = 0
    with (OUT / 'sample-crosswalk.tsv').open('w', newline='') as handle:
        writer = csv.writer(handle, delimiter='\t')
        writer.writerow(['genetic_id', 'ind_sex', 'ind_group', *fields, 'individual_id_representations', 'persistent_id_representations', 'review_status'])
        for sid, sex, group in ind:
            if sid not in annotations:
                unmatched.append(sid)
                continue
            values = annotations[sid]
            individual, pid, anno_group, _, _, _, quality = values
            group_mismatch += group != anno_group
            assessment[quality.upper()] += 1
            reasons = []
            if individual in MISSING: reasons.append('missing_individual_id')
            if groups[individual] > 1: reasons.append('shared_individual_id')
            if pid in MISSING: reasons.append('missing_persistent_id')
            if persistent[pid] > 1: reasons.append('shared_persistent_id')
            if quality.upper() != 'PASS': reasons.append('non_pass_assessment')
            if group != anno_group: reasons.append('group_mismatch')
            writer.writerow([sid, sex, group, *values, groups[individual], persistent[pid], ';'.join(reasons) or 'review_pending'])
    coords = Counter()
    alleles = Counter()
    chromosome_counts = Counter()
    unsorted = []
    last = defaultdict(int)
    with (DATA / f'{PREFIX}.snp').open() as handle:
        for lineno, line in enumerate(handle, 1):
            row = line.split()
            if len(row) < 6: raise ValueError(f'Invalid SNP row {lineno}')
            snpid, chrom, _, pos, a, b = row[:6]
            c, p = int(chrom), int(pos)
            chromosome_counts[c] += 1
            coords[(c,p)] += 1
            pair = ''.join(sorted((a.upper(),b.upper())))
            if c in range(1,23):
                alleles['autosomal_total'] += 1
                if a.upper() not in 'ACGT' or b.upper() not in 'ACGT' or len(a) != 1 or len(b) != 1 or a.upper()==b.upper(): alleles['invalid_alleles'] += 1
                if pair in ('AT','CG'): alleles['palindromic'] += 1
                if p <= 0: alleles['invalid_position'] += 1
            if p < last[c]: unsorted.append((lineno,snpid,c,p,last[c]))
            last[c] = p
    summary = {'individual_rows': len(ind), 'unmatched_individuals': len(unmatched), 'group_label_mismatches': group_mismatch,
               'missing_individual_ids': sum(v[0] in MISSING for v in annotations.values()),
               'shared_individual_id_groups': sum(n > 1 for n in groups.values()),
               'shared_persistent_id_groups': sum(n > 1 for n in persistent.values()),
               'duplicate_coordinate_excess': sum(n-1 for n in coords.values() if n > 1),
               'within_chromosome_decreasing_positions': len(unsorted), 'first_order_issues': unsorted[:10],
               'autosomal_marker_counts': dict(alleles), 'assessment_counts': dict(assessment),
               'scope': 'metadata review only; no selection, genotype QC or biological identity confirmation'}
    (OUT / 'sample-marker-summary.json').write_text(json.dumps(summary, indent=2, sort_keys=True)+'\n')
    print(json.dumps(summary, indent=2, sort_keys=True))


if __name__ == '__main__':
    main()
