# AADR v66.1 Human Origins: initial validation

Run `python3 research/validate_reference.py` from the repository root. The complete machine-readable output is written to ignored `dataset/interim/reference-validation/report.json`. This audit does not read the builder's DNA export.

## Results

- The supplied genotype, individual, SNP, annotation and dataset README files match their corresponding MD5 values in the supplied checksum file. This confirms agreement with that file, not the authenticity of its source or redistribution rights.
- The packed `TGENO` header reports 27,594 individuals and 584,131 markers, matching the `.ind` and `.snp` row counts.
- The individual and annotation files have no duplicate genetic IDs; all 27,594 individual IDs have an exact annotation match. The marker file has no duplicate marker IDs.
- The annotation's `Individual ID` field has 2,280 values shared by multiple representations. These are identity-review candidates, not automatically verified biological duplicates. Preserve their crosswalk and resolve them before basis selection or train/test splitting.
- Annotation assessments for the matched records include 963 `QUESTIONABLE`, 373 `CRITICAL`, 22 `PROVISIONAL_QUESTIONABLE`, 83 `PROVISIONAL_CRITICAL`, 7 `MERGE_QUESTIONABLE`, and 2 `MERGE_CRITICAL`. Assessment labels must be interpreted according to the source documentation; do not silently admit these records to a basis.
- The prior 64-record chromosome 22 smartpca run verified that the installed binary can read and calculate on this format. Its selection was arbitrary and is not an approved panel or scientific validation.

## Remaining gates

Resolve representations and external-study overlaps; confirm source rights and genome assembly; measure actual genotype call rates and allele/build harmonization; screen sample quality and relatedness; establish population coverage and held-out splits; choose and document markers and PCA roles; rerun smartpca and validate its outputs and browser projection on held-out inputs. Until these gates pass, no production PCA basis or individual ancestry result is validated.

## Follow-up: identity, markers and call-rate screening

`python3 research/audit_samples_markers.py` creates an ignored per-record `sample-crosswalk.tsv` and aggregate `sample-marker-summary.json`. Exact annotation joins cover all 27,594 records. The source's `Individual ID` field has 2,280 repeated values covering 5,116 records; `Persistent Genetic ID` values have no repeats in this file. Do not assume either field automatically establishes biological identity across external studies. Twenty-three records have different `.ind` and annotation group labels; the crosswalk flags each for review. There are 4,541 records whose assessment is not exactly `Pass`, including provisional or merge statuses; this is a conservative triage count, not a final rejection rule.

The `.snp` file has no repeated chromosome-position pairs and no within-chromosome decrease in physical coordinates. All 579,720 autosomal entries have distinct A/C/G/T alleles and positive positions; none is an A/T or C/G palindromic pair. These are checks of recorded labels only: they do not establish reference assembly, strand correctness, biological uniqueness or valid cross-dataset joins.

`python3 research/measure_reference_calls.py` reads the reference TGENO file and writes an ignored per-sample table and summary. Against **all 579,720 autosomal markers before filtering**, call-rate median is 72.24%; 5,536 records meet 95% and 4,896 meet 98%. This panel includes ancient and low-coverage records, so these global values are not modern-basis performance. A metadata-only screen for exact `present`, `.HO` and `Pass` yields 4,503 records, of which 3,694 meet 98% on this broad denominator. None is approved automatically: review relationships, identity, source, call type and the eventual filtered marker set.

To validate the reader, an EIGENSOFT `convertf` run exported the 64 existing smoke-test samples on chromosome 22 to EIGENSTRAT format. `python3 research/check_tgeno_oracle.py` compared every exported genotype code with the packed reader: **515,456 calls across 8,054 markers matched exactly**. The comparison outputs and parameters are retained under ignored `dataset/interim/reference-validation/oracle/`; this checks the tested format and subset, not every possible missing-code/build/allele case.

The reference audit remains incomplete. The crosswalk and call counts are review artifacts, not an approved smartpca population list. No relatedness pruning, independent biological-identity reconciliation, chip-specific harmonization, final SNP filtering, held-out validation or production PCA has been performed.

## Follow-up: candidate and relatedness pilot

The preliminary `present` / `.HO` / `HumanOrigins` / `Pass` / ≥98% broad-autosomal-call screen contained two non-basis controls: `Chimp_HO.HO` (`Chimpanzee`) and `Href_HO.HO` (`hg19ref`). Their measured heterozygosity was zero. These records illustrate why metadata labels and call rates alone do not establish human sample eligibility. The pilot explicitly excludes them; systematic species/reference-control screening is still required. The earlier 3,694 figure includes these two and is not a human sample count.

`python3 research/relatedness_pilot.py` creates an ignored, exploratory chromosome-22 PLINK dataset from the remaining 3,692 selected records in 434 source group labels. It requires matching `.ind`/annotation group labels and unique `Individual ID` within the screened subset. Candidate membership is not production approval. `python3 research/check_plink_oracle.py` checked the BED encoding against EIGENSOFT `convertf`: 475,186 calls across 59 overlapping samples and 8,054 markers matched exactly.

On the available PLINK 1.9 build, exploratory `--indep-pairwise 50 5 0.2` retained 3,030 chromosome-22 markers. `--genome --min 0.125` reported 333,754 pairs, including 4,592 with PI_HAT ≥ 0.25. These are diagnostic flags, **not established relatives**: this estimator depends on allele-frequency assumptions, the combined panel has strong population structure, and one chromosome is inadequate for reliable genome-wide inference. No individual was removed based on these values. PLINK 1.9 `--genome` is not the specified KING-robust analysis; a pinned KING implementation and genome-wide LD-pruned markers remain required. The earlier initial run included the two controls and was overwritten by this corrected pilot.

Reproduce from existing audit inputs and oracle export with:

```sh
python3 research/relatedness_pilot.py
python3 research/check_plink_oracle.py
/path/to/plink --bfile dataset/interim/reference-validation/relatedness-pilot/pilot --indep-pairwise 50 5 0.2 --threads 4 --memory 1024 --out dataset/interim/reference-validation/relatedness-pilot/ld
/path/to/plink --bfile dataset/interim/reference-validation/relatedness-pilot/pilot --extract dataset/interim/reference-validation/relatedness-pilot/ld.prune.in --genome --min 0.125 --threads 4 --memory 1024 --out dataset/interim/reference-validation/relatedness-pilot/ibd
```

`research/audit_demo_overlap.py` provides a local aggregate-only check of the builder's explicitly supplied demo input against AADR marker IDs, coordinates and observed alleles. It writes the results to ignored local storage and does not persist calls or infer ancestry. Exact matching is preliminary and does not establish build/strand compatibility or validate a chip-specific projection.

## Follow-up: genome-wide KING screening

`python3 research/relatedness_pilot.py --genome-wide` creates an exploratory PLINK dataset for the same 3,692 screened candidates, using all 579,720 autosomal markers. The full genome-wide BED's entire chromosome 22 was checked byte-for-byte against the independently validated chromosome 22 pilot, for the same sample order. This extends the tested encoding; it does not establish the accuracy of every other marker or resolve sample identities.

The official [PLINK 2 release](https://www.cog-genomics.org/plink/2.0/) installed locally for this run is `PLINK v2.0.0-b.1.3 M1 (31 Oct 2026)`. The archive from the official linked distribution has SHA-256 `52e35a704e6da4c330f48130c8f0ded8969b230ee5fa78783bd89e8e7a7d3e45`. The exact binary SHA-256 is `de69252e00db70f1a002349970b081dcf7c3a8b6d629209e72c5e922b869614e`. These hashes pin what was run; they do not independently authenticate the downloaded file.

Using exploratory pooled-sample filters `--maf 0.03 --geno 0.02 --indep-pairwise 50 5 0.2`, 101,914 markers were retained. Pooled LD pruning may be affected by ancestry structure and is not an approved final marker set; no long-range LD mask was applied. KING-robust screening with `--king-table-filter 0.0884` reported 160 candidate pairs involving 244 samples, with at least 98,969 jointly called retained markers per reported pair. The flagged-pair graph has 94 connected components; its largest has seven samples. These are screening flags, not verified pedigrees, and KING has limitations with population structure, admixture and endogamy. No sample was removed and no held-out split was declared independent.

Twenty pairs had estimated kinship ≥0.354 despite their distinct metadata `Individual ID` values. `python3 research/audit_high_kinship.py` compared their hardcalls on all autosomal markers; among jointly called sites, disagreement ranges from approximately 0.030% to 0.482%, with at least 568,937 joint markers per pair. These high-concordance pairs require source-level review for alternate representations, duplicated records, or genetically identical individuals. Genotype concordance alone does not prove a particular identity. Store each flagged connected component in the same evaluation partition until reviewed, including external datasets.

The PLINK BED, source list, marker list, pair table, per-pair concordance and logs are in ignored `dataset/interim/reference-validation/relatedness-genome-wide/`. Input/output hashes are recorded in its `manifest.json`; the LD-pruned marker list SHA-256 is `ae8ab90f5941b2c437247fc4e42ea62a3c8230f24bce147233f21411cc503e63`, and the KING table SHA-256 is `5cb8ae7c9e4cdf331967c083eebffcb69f07c832f8d99be9567a6b81ded5a33b`.

```sh
python3 research/relatedness_pilot.py --genome-wide
# Verify the chromosome-22 rows and sample order against the prechecked pilot before using the output.
/path/to/plink2 --bfile dataset/interim/reference-validation/relatedness-genome-wide/pilot --maf 0.03 --geno 0.02 --indep-pairwise 50 5 0.2 --threads 4 --memory 2048 --out dataset/interim/reference-validation/relatedness-genome-wide/ld
/path/to/plink2 --bfile dataset/interim/reference-validation/relatedness-genome-wide/pilot --extract dataset/interim/reference-validation/relatedness-genome-wide/ld.prune.in --make-king-table --king-table-filter 0.0884 --threads 4 --memory 2048 --out dataset/interim/reference-validation/relatedness-genome-wide/king
python3 research/audit_high_kinship.py
```

Remaining work includes reconciliation of the flagged pairs and external reference sets, a representative held-out cohort, species and technical QC, a finalized autosomal basis/marker set, and validated smartpca projection and mixture estimates. This KING screen is not a production PCA or a finished scientific validation.

An exact-string inventory check found 402 EGDP, 42 SGDP and 190 Franco-Cantabrian FAM individual IDs, all unique within their respective files. None exactly matches either a candidate AADR Genetic ID or its annotated Individual ID. This is not evidence of biological independence: aliases, suffixes, cross-study IDs and duplicate genotypes still require reconciliation. No external samples were included in the KING run.

## Follow-up: external-panel marker and identity screening

`python3 research/audit_external_markers.py` classifies shared marker IDs by chromosome/position and allele relationship. Among the 101,914 preliminary AADR KING markers, the external panels have the following counts with exact ID and coordinates and directly compatible, non-palindromic allele pairs: EGDP 99,776; SGDP 98,585; Franco-Cantabrian 97,735. Swapped allele order is explicitly retained and handled during PLINK merging. Missing, ambiguous, mismatched or duplicate marker IDs are not used. Matching coordinates and alleles do not by themselves prove assembly or strand provenance.

`research/cross_panel_kinship.py` extracts those intersections, merges each external panel with the 3,692 AADR candidates, and runs KING-robust with a 0.0884 reporting threshold. PLINK 2 `--pgen-diff include-missing` checked **both** input sides of each temporary merge against the merged result: every expected sample and marker was compared with zero differences. Results:

| External dataset | External records | AADR–external pairs ≥0.0884 | Pairs ≥0.354 | High-kinship hardcall disagreement |
| --- | ---: | ---: | ---: | --- |
| EGDP | 402 | 50 | 43 | 0.012%–0.253% |
| SGDP | 42 | 0 | 0 | Not applicable |
| Franco-Cantabrian | 190 | 3 | 3 | 0.064%–0.219% |

`python3 research/cross_panel_concordance.py` measured discordance only at jointly called, matched markers, independently checked each pair's joint count against KING's `NSNP`, and saved row-level results in ignored local storage. The 43 EGDP high-kinship pairs involve 43 external records, and the three Franco-Cantabrian pairs involve three external records. High kinship plus high concordance is strong evidence for an identity or close-identity review, **not proof** that records represent the same person. Candidate pairs need source-level reconciliation before selecting a single representation or making validation splits. Zero SGDP flags at this threshold does not establish biological independence.

The three external panel pairs were also screened against one another on their own direct-compatible marker intersections using `python3 -m research.external_pair_kinship`: EGDP–SGDP used 96,601 markers, EGDP–Franco-Cantabrian 95,929, and SGDP–Franco-Cantabrian 94,576. No cross-panel pair reached 0.0884 in these comparisons. Input and merged genotypes were verified on both sides with zero `--pgen-diff include-missing` differences. Marker intersections differ by comparison; these are screens rather than proof that no more distant relationship or assay issue exists.

`python3 research/build_kinship_review_groups.py` combines the observed KING edges into a review-only cross-source graph: 4,326 records, 4,127 groups, 140 groups containing more than one record, and 49 groups spanning datasets. The full mapping, exact markers, pair tables, concordance tables, logs and tool/input hashes stay in ignored `dataset/interim/reference-validation/`. Keep every connected group in one partition while reviewing; the graph cannot establish independence for unobserved relatives or excluded records and is **not a final train/test split**.

Reproduce the cross-panel screening after the AADR KING run and existing EIGENSOFT oracle have been prepared:

```sh
python3 research/audit_external_markers.py
python3 research/cross_panel_kinship.py --plink /path/to/plink --plink2 /path/to/plink2 --panel egdp
python3 research/cross_panel_kinship.py --plink /path/to/plink --plink2 /path/to/plink2 --panel sgdp
python3 research/cross_panel_kinship.py --plink /path/to/plink --plink2 /path/to/plink2 --panel francocantabrian
python3 research/cross_panel_concordance.py
python3 -m research.external_pair_kinship --plink /path/to/plink --plink2 /path/to/plink2 --left egdp --right sgdp
python3 -m research.external_pair_kinship --plink /path/to/plink --plink2 /path/to/plink2 --left egdp --right francocantabrian
python3 -m research.external_pair_kinship --plink /path/to/plink --plink2 /path/to/plink2 --left sgdp --right francocantabrian
python3 research/build_kinship_review_groups.py
```

Marker-classification behavior is checked by `python3 -m unittest discover -s research/tests -v`. Before a release, resolve the flagged sample identities with study records, verify reference assembly/strand and dataset rights, expand species/technical QC, select a suitable basis and marker set, and validate PCA projection and mixture estimates on a defensible held-out cohort. This remains an exploratory validation report, not a production reference or completed scientific validation.

## Follow-up: experimental train/held-out PCA

`python3 research/create_experimental_split.py` freezes an **experimental**, hash-based kinship-group split and records input and manifest checksums. It excludes 44 records whose source group labels contain `Ignore`, `outlier` or `oRelative`, and retains at most one AADR record per flagged component. The resulting basis has 2,829 records; 698 records are reserved as test projections; 121 other component members are excluded from this experiment. `python3 research/check_experimental_split.py` verifies that the exact keep lists, alias mapping and smartpca labels agree and that no detected kinship component crosses basis/test. Screening was performed across all candidates to prevent relatedness leakage, so this is a **kinship-informed exploratory split**, not a blind final test. Twenty-nine source labels appearing in test are absent from the basis; uneven coverage and undetected relatives remain limitations.

MAF, call-rate and LD filters (`--maf 0.03 --geno 0.02 --indep-pairwise 50 5 0.2`) were fit **on the basis keep list only**, retaining 99,794 autosomal markers. This step does not apply a reviewed long-range LD mask. The EIGENSOFT input uses deterministic short aliases and retains an ignored source crosswalk. `python3 research/check_pca_export.py` checked 6,386,816 genotype codes over 64 spaced samples and all selected markers between the PLINK BED and exported TGENO; no discrepancies were found. First attempts to export/alias failed due to the 39-character EIGENSOFT ID limit and PLINK's update/keep ordering; the corrected alias workflow produced the validated export.

`python3 research/run_experimental_smartpca.py --smartpca /path/to/smartpca` completed 25 PCs with 2,829 basis and 698 projected test samples. It emitted all 99,794 SNP weight IDs; role and marker sets match the frozen inputs and all output coordinates are finite. Its parameters, input hashes, binary identity and output hashes are recorded under ignored `dataset/interim/reference-validation/experimental-pca/`.

For a descriptive software cross-check, PLINK 2 `--pca 25` was run on the same basis and markers. `python3 research/validate_experimental_pca.py` matches samples by alias and compares their in-sample basis vectors: absolute same-PC correlations range from 0.9691 to 0.999999, and the first-eight-PC principal-angle cosines are all at least 0.999997. PCs 23 and 24 differ most in individual-axis correlation; nearby eigenvectors can rotate. PLINK and smartpca use different normalization/missingness conventions. These are **in-sample, same-data geometric checks**, not independent held-out projection parity, calibrated accuracy, or evidence that ancestry mixtures are true.

The external study identity flags remain unresolved, and the test split is not independently certified. No Python/TypeScript projection parity, consumer-chip masking experiment, uncertainty calibration, mixture validation, final reference bundle or production user-genotype analysis has been completed. The full audit/test history is indexed in the repository-root `log.txt`.
