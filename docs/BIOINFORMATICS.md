# PocketDNA bioinformatics specification

Custom ancestry PCA, projection and reference-mixture engine

## 1. Decision and scope

Build **PocketDNA PCA-25**, a versioned, independently validated ancestry coordinate system. Use Global25 agreement as an external benchmark, not as proof of historical accuracy or the sole optimization objective.

Python, PLINK and EIGENSOFT belong in the research repository. Judges receive precomputed reference assets and a TypeScript browser projection/fitting engine. They do not install Python, rerun PCA, or download original reference genotypes.

Separate three deliverables:

1. A native PocketDNA coordinate system with its own reference coordinates and fitting models.
2. An optional, explicitly approximate G25 prediction adapter, trained and tested separately.
3. A narrative evidence record exposing supported affinities and limitations to Muse.

Do not describe a 25-dimensional PCA as the original G25, mix its coordinates with public G25 references, or claim the original pipeline is known. A 40-to-25 fitted regression is a supervised coordinate prediction model, not a recovery of the original PCA axes.

Follow STACK.md's browser privacy architecture and ancestry-only scope. Screenshots contain provider percentages; they do not provide genotypes. Weighted sums of population coordinates are hypothetical population proxies, not measured personal coordinates. Keep such experiments outside the default scientific path.

## 2. What the earlier run establishes

The work contains valuable controls: diagnosis of fold-assignment noise, paired comparisons, genotype-type screening, replacement of a structure-confounded relationship measure, a marker-thinning experiment, and a reported comparison with smartpca. Preserve these experiments and their intermediate outputs.

### Reported measurements

| Measurement in LEARNINGS.md | Reported value | Interpretation pending code inspection |
| --- | --- | --- |
| PC1–8 band Procrustes | 0.9758 | Strong broad-structure agreement under the report's metric |
| PC9–25 band Procrustes | 0.6609 | Material geometric disagreement remains |
| PC1–8 held-out containment | 0.9970 | Predictability from the chosen predictor space, not identity of axes |
| PC9–25 repeated-CV containment | 0.7820 ± 0.0037 | Needs exact aggregation and uncertainty definition |
| Python versus smartpca | 0.9992 Procrustes; worst per-PC 0.9978 | Encouraging implementation check, insufficient by itself for projection parity |

Do not call all these values “correlation.” Pearson r, held-out R², normalized Procrustes similarity and subspace containment are different quantities. Recover each implementation and give its equation. State whether Procrustes is fitted and scored on the same samples, whether scaling/reflection are allowed, and whether the statistic is 1 minus disparity or something else.

### File-level audit performed for this document

| Check | Observed result |
| --- | --- |
| Population table, excluding its TOTAL row | 550 rows, counts sum to 6,881 |
| ID list | 6,881 lines and 6,881 distinct strings |
| Ancient groups | 18 groups totaling 119 records |
| Singleton populations | 57 |
| Populations with one or two records | 124 |
| Largest 20 population rows | 2,007 records, approximately 29.2% of panel |
| ID suffixes | HO 3,990; DG 1,871; no suffix 889; SG 72; AG 38; TW 18; BY 3 |
| Source totals in final table | AADR 5,992; EGDP 402; France256 256; FrancoCantabrian 189; SGDP 42 |

Unique strings are not unique biological individuals. The supplied list includes `mota.DG`, `mota.SG`, `mota_alt.SG`, and both `Sumidouro5.SG` and `Sumidouro5_d.SG`. These are candidate duplicate representations requiring Master ID/annotation verification. `Selkup4.HO` and `Selkup4a.HO` also merit inspection; names alone do not prove duplication.

The list contains Biaka 20 and Mbuti 10 although the notes describe their inclusion as rejected. It contains Selkup 24 plus Selkups 3, and Nganasan 28 plus Nganasans 2, whereas the notes later mention 9 Selkup and 11 Nganasan. These may reflect different runs or definitions; they cannot be treated as one coherent frozen configuration.

The merged input count 9,477 minus the final 6,881 leaves 2,596 exclusions. The table's 1,821 “held out” figure and the notes' relatedness/pseudo-haploid counts need a sequential exclusion ledger, including overlapping reasons. The difference is not proof of a filtering bug, but the current report does not reconcile it.

### Additional audit: supplied AADR 1240K patch individual file

`v66.p1_1240K.aadr.patch.PUB.ind` contains **23,089 rows**, all with three fields, **23,089 unique IDs**, and **3,898 distinct population labels**. Sex codes are M 12,368, F 9,359 and U 1,362. These are metadata counts, not genotype-quality measurements.

Exact matching against the historical 6,881-ID panel yields **2,002 matches and 4,879 unmatched IDs**. All 1,871 `.DG`, 72 `.SG`, 38 `.AG`, 18 `.TW` and 3 `.BY` panel IDs match. All 3,990 `.HO` and 889 unsuffixed panel IDs do not. This is consistent with comparing the supplied 1240K patch metadata against a Human Origins-plus-external merged panel, but the missing identities still require source-level reconciliation. Do not strip suffixes and assume equivalent genotype rows, or conclude the unmatched individuals are absent from AADR generally.

The file explicitly includes `Chimp.REF` and `Gorilla.REF`; neither is in the supplied final panel ID list. Keep a species eligibility check for any new selection from this file.

| Candidate records | Metadata in supplied `.ind` | Assessment |
| --- | --- | --- |
| `mota.DG`, `mota.SG`, `mota_alt.SG` | All M, `Ethiopia_MotaCave_4500BP` | Stronger duplicate-representation flag; resolve Master ID and choose one basis representation |
| `Sumidouro5.SG`, `Sumidouro5_d.SG` | Both M, `Brazil_CentralMinasGerais_EarlyHolocene_10400BP_HG` | Stronger duplicate-representation flag; check damage-restricted representation in annotations |
| `Selkup4.HO`, `Selkup4a.HO` | Neither present | Cannot resolve with this file; obtain matching HO annotations |

An `.ind` provides ID, sex and group only. It cannot establish coverage, contamination, diploidy, biological uniqueness, the correct SNP denominator or genotype identity. Obtain the matching release README, `.anno`, `.snp` and genotype headers, and the Human Origins `.ind`/annotations actually used by the old merge. Check whether the “patch” is a full replacement or a supplemental resource from its README rather than guessing from its filename.

When generating tool inputs, verify the pinned smartpca build's population-label limit. This file's 3,898 raw group labels exceed the 1,000 limit documented in some EIG versions. Preserve full biological labels in a sidecar and use an approved bounded analysis-role label mapping where necessary; do not silently truncate populations.

## 3. Highest-priority methodological corrections

### 3.1 The claimed reproducibility ceiling is not established

Between-population variance divided by total variance measures how much variation the chosen population labels explain. It is not a repeatability estimate or an upper bound on genotype-based prediction.

Within-population variation can include real individual ancestry, recent admixture, family structure, geography, drift, and batch effects. Some of it is recoverable from another marker set. The notes themselves report prediction exceeding the proposed ceiling on several PCs, including aggregate PC1–8. That is evidence against the interpretation of this statistic as a ceiling.

Rename it **population-label variance fraction**. Remove “0.85 is unreachable in principle,” “100.8% of ceiling,” and “only sample depth remains.” To estimate reproducibility, use independent genotype measurements of the same people, marker/platform replication, and measurement-error models. A demonstrable empirical plateau on this benchmark is a reasonable stopping criterion; it is not an information-theoretic limit.

### 3.2 Repeated CV does not create new independent subjects

Repeated folds reduce variability caused by arbitrary partitions. They do not eliminate limited-sample uncertainty, population clustering, relatives, selection bias, or repeated tuning on the same benchmark. A standard error across 60 correlated CV repetitions is not a generalization confidence interval.

Average across fold seeds for stability, but estimate uncertainty at the relevant independent unit: biological individual/family and, for population-generalization claims, population or study. Refit the full learned procedure within resamples when claiming pipeline uncertainty. Bootstrapping a fixed set of predictions only quantifies a narrower conditional uncertainty.

### 3.3 Keep a fresh test set outside the optimization loop

Many configurations were selected using the same approximately 500–550 individuals. Even if each score used CV, repeated experiment selection can overfit the benchmark. Freeze a new outer test set before further comparison. Related people, duplicate representations and reused study samples must not cross boundaries.

A change in panel membership must not change the primary benchmark cohort. Pair comparisons on identical eligible samples; publish any excluded fraction. An intersection can become biased toward easy cases, so also report results on a fixed mandatory evaluation cohort.

### 3.4 Do not treat in-sample alignment as predictive validation

An orthogonal rotation fitted on all evaluated samples gives a useful descriptive geometric comparison. It is not a held-out compatibility test. Train translation/rotation/scale on alignment-training samples and freeze them before testing. For unequal dimensions, distinguish rectangular Procrustes, principal-angle comparisons and arbitrary linear regression.

A learned full linear map can rotate, shear and shrink distances. Strong regression R² does not show that native PocketDNA Euclidean distances or mixture weights match G25.

### 3.5 Ancient anchors and genotype type need a controlled decision

The old pipeline excludes modern pseudo-haploid samples but exempts ancient anchors with the same data type. That exemption is a scientific choice requiring evidence, not a QC exception justified by a label. Ancient anchors may add genuine directions while also introducing sampling noise, coverage structure and disproportionate influence.

Keep the historical anchor configuration as baseline A. Compare a modern diploid basis with ancients projected as candidate B, using identical SNPs and test cohorts. Only retain anchors in the production basis if they improve independent ancient placement and user outcomes without technical PCs. Do not assume one method is universally superior.

### 3.6 A non-significant difference is not equivalence

Intervals spanning zero for dataset additions do not establish that additions “bought nothing” or that population coverage is complete. Their intervals permit meaningful harm or gain. Define a practically relevant equivalence margin and power before making equivalence claims. The small pseudo-haploid-screen Procrustes gain is not established by an interval including zero; genotype-type consistency is a separate justification.

### 3.7 Random thinning is not a full chip-transfer test

Random thinning of a fixed panel answers whether fewer randomly selected markers damage the selected metric. Consumer arrays and external studies select nonrandom loci with different ascertainment, LD and allele spectra. Repeat with actual chip manifests and study masks. A null random-thinning experiment does not eliminate platform-transfer risk.

## 4. Scientific artifacts and run identity

Every run needs an immutable manifest containing software commits/binary hashes; source releases/checksums; assembly; sample/version/Master IDs; exact included IDs; ordered SNP IDs and alleles; filtering decisions; population ontology version; PCA configuration; random seeds; thread/BLAS settings; coordinate conventions; alignment training set; and evaluation splits.

Create separate inventories for biological individuals, assay representations and population annotations. Preserve original source identifiers. Never make a destructive regex rewrite the only record of identity.

Required role fields: `basis`, `alignment_train`, `development`, `final_test`, `source_reference`, `projection_only`, `excluded`. Some reference roles can overlap the basis, but test individuals must not contribute to PCA fitting, normalization, reference centroids or calibration in a claimed inductive evaluation. Export a machine-checkable role-overlap report.

Restore the old scripts/parameters and reproduce the old result before changing them. The current notes cite `pipeline/fastpca.py`, `band_metric.py` and other files not attached here. Their behavior cannot be inferred from filenames.

## 5. Dataset preparation and harmonization

### 5.1 Inventory

Use the exact AADR Human Origins release from the prior run for baseline reproduction, plus the documented EGDP, France256, FrancoCantabrian and SGDP subsets. Record study accessions, permissions, publications and sample inclusion rules. HO, 1240K and sequencing-derived files are different marker/call resources; do not interchange them silently.

AADR annotations identify different representations of the same individual and include quality/context information. Use Master IDs plus source crosswalks to reconcile biological identity; do not rely on suffix stripping [1]. Verify binary format from headers and the release documentation. “AADR is always TGENO” and “all ancient data are pseudo-haploid” are not safe universal rules.

### 5.2 Common assembly and variants

Use GRCh37/hg19 as the initial canonical assembly to match the existing mask work, while recording precise reference files. Restrict v1 to autosomal biallelic A/C/G/T SNPs. Exclude indels, multiallelic or ambiguous mappings, nonautosomal loci and nonhuman records before statistical analysis.

rsIDs can help match known variants across builds, but they do not eliminate assembly harmonization. Resolve merged/retired IDs and map each retained variant to one canonical assembly location and allele pair. For coordinate-only variants, remap using a versioned chain/reference or drop unmappable sites. Validate uniqueness and reference alleles. Do not join raw coordinates from different builds [5].

For each match classify exact, swapped, complemented, complemented-and-swapped, incompatible or ambiguous. Allele swapping changes dosage from g to 2−g; complementing nucleotide labels alone does not necessarily change dosage. Verify this on known genotype pairs. Drop palindromic A/T and C/G loci initially; frequency-based resolution is optional and requires population-aware validation.

Use canonical chromosome-position-allele keys, with rsID aliases for consumer parsing. Sort numerically by chromosome then physical position. Assert monotonic positions and unique keys after every merge. Store rejection counts by reason and dataset.

### 5.3 Verify custom readers

The report's convertf loss of almost all individuals is an unresolved root-cause item, even if a custom reader bypasses it. Check population/phenotype/Ignore handling, binary header, sample/variant ordering and chromosome encoding. Compare custom PLINK/EIGENSTRAT readers against trusted tools on small truth fixtures and randomly selected cells from real data. Test 0/1/2/missing encodings and allele order explicitly.

### 5.4 Merge strategy

Maintain a high-completeness basis matrix and a larger projection-only pool. Do not force every sparse source into a union basis, or globally intersect all sources and unnecessarily lose high-quality loci.

Report missingness per individual, site, study, population and genotype type. Plot missingness/platform association with PCs. A 0.35% median hides tails and structured missingness. Mean-imputed sparse basis samples can produce technical covariance; lsqproject only helps samples that are projected, not sparse individuals already shaping the basis.

## 6. Biological duplicates, relatives and genotype quality

Deduplicate representations before relatedness pruning. For confirmed duplicate people, choose a preferred representation using documented quality and genotype-type rules; keep other representations only as paired technical-validation data. Never put alternate representations on opposite train/test sides.

For high-quality diploid modern samples, use a trusted KING implementation and compare the custom estimator against it. A threshold around 0.0884 is the usual second-degree boundary, but publish the exact operator and policy. Restrict comparisons to joint nonmissing loci and require enough overlap. Endogamy/admixture and sparse/pseudo-haploid calls can complicate interpretation; use annotations and suitable ancient-relatedness evidence rather than applying diploid KING blindly [3].

Choose retained individuals deterministically, favoring quality and preserving representation. A greedy independent-set choice can change panel composition; record tie-breaks. Avoid deleting the rare group member merely because of input ordering. Recheck after final SNP filtering if the kinship marker panel materially changes.

Classify diploid versus pseudo-haploid using authoritative metadata plus measured heterozygosity. The existing heterozygosity <0.02 and call fraction >0.5 screen is a useful alarm, not a universal classifier. Low heterozygosity may have other causes; low-coverage pseudo-haploid records must not evade the screen. Quarantine unknown call types from the primary basis.

Modern-basis candidate starting gates: ≥98% call rate on the chosen basis panel, with a prespecified ≥95% sensitivity analysis; high-quality nonmissing alleles; no unresolved duplicate identity. These are proposed gates, not settings proven optimal for these files. Inspect exclusions by geography before adopting them.

Ancient projection QC uses actual matched loci, damage/contamination annotations, genotype type and date/site metadata. Compare transversion-only projections where enough data exist. Do not declare the notes' <25% coverage band a universal cutoff; measure error by mask, type and region.

## 7. Population list design

FINALPOPLIST.txt is a human-readable report, not a directly usable smartpca poplist. FINALPOPLIST.panel_ids.txt is an ID list, not a population-label list. Generate each tool-specific input from the audited manifest.

The current panel is not population-balanced: cap 200 does not bind; some groups have >100 samples while 57 have one. Some sampling weight is split across aliases such as Han/CHB/CHS, Japanese/JPT, Yoruba/YRI, Selkup/Selkups and Nganasan/Nganasans. These labels are not necessarily interchangeable: retain original sampling definitions and add a reviewed hierarchical ontology.

Use fields for study, fine group, broader ancestry stratum, geographic locality, time range, genotype type and interpretation eligibility. Numeric suffixes may encode meaningful strata; stripping all of them can silently collapse distinct groups. Prefer a reviewed explicit crosswalk with tests. Terms such as “Bergamasque” and “Italian_North,” or “Bougainville” and “Nasioi,” can have different scope even when useful search aliases.

Recommended comparison:

| Panel | Purpose |
| --- | --- |
| A: audited reproduction | Same historical composition/settings after resolving duplicate/identity errors; distinguishes bug fixes from methodology changes |
| B: modern diploid basis | Main product candidate; broad geography, high completeness, ancients projected |
| C: B with constrained ancient anchors | Tests whether anchors add independently useful dimensions |
| D: modest rebalancing of B | Tests sampling dominance without adopting a tiny 850-person panel |

Select a limited cap sensitivity, for example 20/40/80 per reviewed stratum, and repeated deterministic subsamples. These are development experiments, not assumed improvements. Preserve singleton populations as labeled exploratory references; they cannot support precise population uncertainty or leave-one-out centroid validation. Do not fabricate missing groups by renaming substitutes.

Recent admixed individuals may be projected rather than basis-defining as a design choice. Excluding them from evaluation is unacceptable if the product serves admixed users. Include real admixture diversity in held-out tests. Do not exclude African hunter-gatherers merely to improve G25 similarity; assess resulting coverage and performance explicitly.

## 8. SNP filtering and ascertainment

Separate a conservative kinship panel, the PCA fitting panel, and the consumer-observable projection masks. Different purposes can justify different SNP sets, but all must have versioned relationships.

Baseline reproduction uses the reported MAF >0.03, long-range LD mask and r² 0.4 window procedure, only after retrieving exact code/units. “Window 200” omits whether this means SNPs or kilobases, the step, pruning order and founder/sample policy. PLINK documents these distinctions [4].

Production development recipe:

1. Autosomal biallelic, harmonized, unambiguous variants only.
2. Remove monomorphic sites on the training basis; calculate allele frequencies on training individuals only.
3. Start with ≥98% call rate among eligible basis individuals; inspect study-specific dropout. Evaluate a predeclared alternative if this removes disproportionate geography.
4. Retain MAF >0.03 as the measured historical candidate; compare 0.01 and 0.05 on fixed development splits. Do not treat the earlier noisy effect sizes as universal facts.
5. Apply a reviewed, assembly-correct long-range LD mask. Save exact interval file/checksum and boundary convention. The claimed 25 intervals require inspection. Such masks change scientific content; they are not literally “free.”
6. Prune LD on unrelated modern basis candidates with a fully specified procedure. Compare the historical r² 0.4 result with one moderate alternative and one stricter alternative. Use genomic order and chromosome boundaries. Do not confuse pooled population structure with local LD.
7. Inspect loadings for localized spikes and correlations with batch/missingness. Within-population LD sensitivity can reveal structure effects, even if the historical metric showed no gain.
8. Freeze the final SNP order and allele-frequency/normalization arrays with the basis.

Do not apply global Hardy–Weinberg filtering across diverse or admixed populations; population structure itself can create departures. Use study/population-aware QC only where sample size and call type justify it. Never apply diploid HWE criteria to pseudo-haploid ancient data.

Create real 23andMe/Ancestry chip masks after harmonization and filtering. Record observed counts, not assumptions of 200k overlap. Compare retaining the larger basis with missing-aware projection against a shared-chip basis; do not immediately discard informative loci just to simplify browser arithmetic. Validate uncommon chip versions explicitly or reject them.

## 9. smartpca specification

Use the exact old binary/configuration for reproduction if recoverable. For new work pin one EIGENSOFT commit/binary and its matching documentation, then retain full stdout/stderr. Never silently combine defaults from different releases [2].

Proposed configuration choices below are an experimental baseline, not a recovered original G25 recipe:

| Setting/input | Proposed choice and rationale |
| --- | --- |
| genotype, SNP and individual files | Validated, dimension-matched inputs with frozen row/column order |
| `poplistname` | Generated basis-role labels matching `.ind` exactly |
| `numoutevec` | 40 for research comparisons; native product uses selected first 25 initially |
| `numoutlieriter` | 0; inspect unusual samples explicitly instead of deleting real global diversity automatically |
| `lsqproject` | YES for out-of-basis projection |
| `fastmode` | NO for the validation oracle |
| `snpweightoutname` | Retain SNP weights and reconcile omitted monomorphic sites |
| `evecoutname`, `evaloutname` | Save full coordinates and spectrum |
| `hiprecision` | YES for higher-precision text output where supported |
| `noxdata`, autosomal input | YES plus explicit autosomal prefilter |
| `killr2` | NO when pruning has already been performed externally |
| `ldregress` | Disable/zero for this baseline; avoid a second undocumented LD transformation |
| `shrinkmode`, `autoshrink` | Start both NO for numerical parity; compare one correction method at a time on held-out samples |
| `popsizelimit` | Do not use hidden random selection; preselect exact basis IDs |
| threads and seeds | Explicit and recorded; test numerical reproducibility across the supported environment |

Audit the pinned source's `fvadjust`, missing-value handling, row normalization and coordinate conventions. Do not assume textbook z-scoring equals smartpca normalization. Record all remaining defaults in the run manifest. An `inbreed` option documented for FST is not a blanket correction for pseudo-haploid PCA variance.

To select individuals within a population, a population poplist alone is insufficient. Generate basis versus projection role labels in the run-specific `.ind`, preserving biological labels in a sidecar. Verify that the fitted basis IDs equal the approved list exactly. Avoid thousands of unique artificial population labels that may exceed tool limits.

Extract loadings, eigenvalues, means, scales and sample coordinates as one coherent artifact. Align SNP-weight rows by validated IDs; never assume weights have one row per original input SNP. Verify allele dosage direction using small fixtures.

## 10. Projection mathematics and browser contract

Define the coordinate convention first. One convenient convention is standardized basis matrix X ≈ T Vᵀ, where rows are samples, columns are SNPs, V contains SNP loadings and T contains scores. smartpca's exported eigenvectors may require additional scaling to match this convention; derive it against the pinned oracle.

For target calls g on observed loci O, standardize with frozen training means μ and scales s: z_j = (g_j − μ_j)/s_j. Estimate scores by minimizing ||V_O t − z_O||². A full-data orthonormal basis permits a dot product; restricted rows generally do not remain orthonormal.

Use a stable QR/SVD solve in the reference implementation. If browser performance favors a small Gram-system solve, assess conditioning, use a checked factorization, and reject or reduce dimensionality on rank deficiency. Avoid explicit matrix inversion. Any ridge regularization changes the estimator and must be versioned and evaluated.

Do not fill missing standardized calls with zero and claim equivalence to least-squares projection. Do not repair all missingness with a multiplier based on marker count. A fixed chip-mask operator can be precomputed, but individual no-calls alter that mask; handle them exactly or validate an explicitly approximate method.

Separate missing-data correction from out-of-sample shrinkage. Compare uncorrected and calibrated projections using independent calibration people and chip masks. Correct source and target coordinate conventions consistently. Do not combine training eigenvectors, corrected target coordinates and uncorrected projected ancient references without validating comparability.

For relatedness-separated reference centroids, use held-out/self-excluded projections or a validated common calibration procedure to control in-sample versus out-of-sample differences. Report residual differences rather than assuming shrinkmode removes them perfectly [6].

Browser worker operations: parse and validate → match allele/build → gather observed calls → compute QC and conditioning → project → fixed coordinate transform if any → compatible references → constrained fits → evidence output. No LLM participates in numerical ancestry estimation.

Export Float32 loading storage initially, Float64 accumulation, frozen dimensions/order, checksums and schema versions. For 169,983 markers, 25 Float32 loadings occupy about 17.0 MB; 40 occupy about 27.2 MB, excluding metadata. A 40-PC predictor must ship all required information even if its output has 25 columns. Quantization requires a separate error budget and parity tests.

## 11. Benchmark design and honest G25 comparison

Freeze identities, reference-coordinate release and scaled/unscaled convention. Match the same biological person, never just a population label. Detect duplicate target rows and incorrect aliases. Record G25 access/use rights and provenance.

Use three partitions: PCA training, development/alignment/calibration, and untouched final test. An optional G25 predictor is trained only on permitted calibration samples. For nested validation, tune regression regularization and model selection inside the training folds. Split families/duplicate representations together. Include leave-study-out and leave-population-out tests for claims extending beyond known cohorts.

Report:

- Per-PC held-out R² with a specified baseline and aggregation; retain negative values.
- Pearson correlation alongside scale error, bias and normalized RMSE.
- PC1–8, PC9–25 and complete-space metrics, weighted and unweighted definitions.
- Train-fitted Procrustes error on held-out samples and descriptive full-sample geometry separately.
- Principal angles/canonical subspace similarity when axes exchange order due to nearby eigenvalues.
- Pairwise-distance distortion and nearest-reference rank stability.
- Per-region/study/chip/type distributions, failures and worst-performing groups.
- Stability of mixture weights, model residuals and broad narrative conclusions.

A high PC1–8 score can be dominated by continental structure while within-region detail is poor. Center/compare within relevant regions as an additional diagnostic. Report all benchmark sample counts and masks. Do not compare mean r with mean R² or call either a percentage of ancestry accuracy.

For paired uncertainty, use common individuals and fixed evaluation definitions. Bootstrap family/population clusters as appropriate, with enough resamples to stabilize intervals; report Monte Carlo error separately. Repeated random folds describe partition sensitivity, not a new n. Preserve a complete experiment ledger to expose selection over many attempted configurations.

## 12. Era-specific ancestry models

Use native PocketDNA references for native targets. Fit a weighted least-squares model with nonnegative weights summing to one. Specify PC weights/metric and source list before evaluating. A residual is a distance in that metric, not a p-value or confidence percentage.

Keep the component catalog distinct from the PCA basis population catalog. A basis may include groups unsuitable as temporal ancestry proxies. Curate ancient sources with dates, location, biological uniqueness, coverage, genotype type and supporting publications. Do not pool `Anc_SubSaharan_Anc` or `Anc_PaleoIndian` into scientifically homogeneous ancestry sources just because they are convenient basis labels.

Use smaller interpretable candidate sets and explicit alternatives; hundreds of collinear sources can produce multiple equally good fits. Examine singular values/conditioning, source swaps and coefficient instability. A sum-to-one fit always allocates the whole target somewhere, even when an important source is absent. Report “poorly represented” instead of interpreting a forced component as truth.

Build Bronze Age, Medieval and modern models separately. Era boundaries vary geographically; do not force European historical labels onto every region. A chapter can offer historical context without a percentage when references are insufficient. Separate early Neolithic proxies from actual Bronze Age individuals in labels.

Validate with held-out real people, synthetic mixtures of independent donor genotypes and marker-block resampling. Synthetic mixtures test numerical behavior but cannot establish real genealogical truth. Resample sources and genomic blocks to assess sensitivity; independent SNP bootstraps understate LD dependence. Propagate projection and source uncertainty where feasible. Call outputs sensitivity ranges unless coverage is demonstrated.

Do not infer migration dates, literal ancestors, IBD, haplogroups, health, traits or personality from the PCA fit. qpAdm or other population-genetic validation can be a separate research extension for appropriately specified population hypotheses; it is not an automatic validator of individual documentary percentages.

## 13. Release gates and tests

| Gate | Required evidence |
| --- | --- |
| Identity | Duplicate representations resolved; no biological overlap across held-out roles |
| Harmonization | One assembly/allele convention; mismatch/rejection ledger; trusted-reader parity |
| Basis | Exact approved IDs; reviewed genotype types; no nonhuman records; technical-PC diagnostics |
| Oracle parity | Python and TypeScript compared on identical files, masks and scale conventions; maximum and per-axis errors reported |
| Scientific validity | Held-out regional/chip performance and uncertainty; stable interpretable fits |
| Consumer behavior | Real supported exports, no-calls and unsupported builds tested; low-quality inputs fail safely |
| Provenance | Every number and narrative-ready claim linked to method/model/source metadata |
| Packaging | Bundle checksum and schema checks; no Python or raw data upload in judge runtime |

Set numerical tolerances before final testing, using oracle precision and downstream sensitivity. Do not substitute an arbitrary “correlation >0.99” gate: uniform scale mistakes can preserve correlation. Compare direct coordinates after only legitimate sign/order alignment, pairwise distances, residuals and weights. Include sparse masks and held-out ancients in parity tests, not only dense basis samples.

Regression fixtures must cover every historical bug: nonhuman aliases; canonical-label mismatch; numeric chromosome sorting; duplicate representations; pseudo-haploid unknowns; sample/marker reorder; monomorphic weight omissions; wrong coverage denominator; surplus PC column joins; missing-code parsing; allele swaps; relatedness on joint missingness; and outlier defaults.

Honor RULES' TDD/80% coverage for first-party research/runtime logic. Retain privacy: no personal genotypes in logs or public fixtures. Public redistribution consent for a DNA file is separate from permission to show a private demo.

## 14. Prioritized execution plan

1. **Freeze the evidence.** Archive old manifests, scripts, inputs and benchmark outputs; label existing numbers as historical. Recover exact metric definitions and actual smartpca settings.
2. **Resolve identities and counts.** Join all 6,881 records to AADR/source annotations; investigate Mota/Sumidouro and other repeats; reconcile 9,477 → 6,881 and the conflicting population counts.
3. **Fix the evaluation.** Freeze an untouched biological test cohort and matched development splits; separate descriptive alignment from predictive testing; withdraw the ceiling claim.
4. **Reproduce audited baseline A.** First reproduce the old result where possible, then apply mandatory identity/reader fixes and report their effects separately.
5. **Prepare B and C.** Compare modern diploid basis versus explicitly controlled ancient anchors on the same markers/cohorts. Keep the experiment set small.
6. **Validate consumer masks.** Run actual supported chip masks, no-call perturbations, study-transfer and ancient damage/missingness tests. Select QC gates from measured outcomes.
7. **Freeze native engine.** Select dimensions/metric/calibration on development data; fit source references and era models; run final evaluation once.
8. **Port and package.** Export bundle, implement TypeScript parity tests, benchmark complete analysis and document limitations. Keep Python rebuild commands available in the repo.
9. **Optional G25 adapter.** Only after native correctness, train a regularized alignment/prediction layer; release its own held-out error report and version. It must not silently replace native coordinates.

For the hackathon, prioritize identity fixes, frozen validation, reliable projection and one well-supported narrative region over chasing another small G25 score increase. Existing broad-structure agreement is promising; the product's defensibility depends on demonstrable transfer to consumer files and honest interpretations.

## 15. Expected research outputs

- Data/source/rights manifest, biological sample manifest and variant harmonization ledger.
- Exact basis/projection IDs, reviewed population crosswalk, tool-ready poplist and `.ind` files.
- Filtering waterfall; genotype type, missingness, relatedness and platform diagnostics.
- Frozen smartpca parameters, binary identity, ordered SNP list and run logs.
- Normalization arrays, loadings, eigenvalues, source coordinates and calibration artifacts.
- Metric definitions, fixed splits, predictions and experiment ledger.
- Held-out performance report with per-chip/region breakdowns and uncertainty.
- Numerical parity fixtures and browser benchmark report.
- Versioned runtime bundle and a rebuild guide with resource estimates measured from an actual run.

A roughly 6,881 × 169,983 matrix has about 1.17 billion entries: approximately 1.17 GB as int8, 4.68 GB as Float32 or 9.36 GB as Float64 before copies and workspaces. Plan chunked/memory-mapped preprocessing and record peak RAM. A sample covariance matrix is much smaller, but eigensolver and normalization workspaces still matter. This cost belongs offline.

## 16. References and evidence boundaries

[1] [AADR data model, annotations and multiple representations](https://www.nature.com/articles/s41597-024-03031-7); [versioned dataset](https://doi.org/10.7910/DVN/FFIDCW).

[2] [EIGENSOFT smartpca documentation](https://github.com/DReichLab/EIG/blob/master/POPGEN/README). Pin the commit used; documentation on the moving branch is not an immutable experiment specification.

[3] [PLINK KING/relationship-based pruning](https://www.cog-genomics.org/plink/2.0/distance).

[4] [PLINK LD pruning semantics and units](https://www.cog-genomics.org/plink/2.0/ld).

[5] [NCBI dbSNP mapping documentation](https://www.ncbi.nlm.nih.gov/books/NBK573560/). The proposed harmonization checks are project requirements; rsID matching alone does not certify allele/assembly identity.

[6] [Efficient toolkit implementing best practices for PCA of population genetic data](https://pmc.ncbi.nlm.nih.gov/articles/PMC7750941/).

[7] [Missing-locus uncertainty in ancient-genome PCA projection](https://doi.org/10.1186/s12864-025-11728-1).

Local evidence: v66.p1_1240K.aadr.patch.PUB.ind; LEARNINGS.md; FINALPOPLIST.txt; FINALPOPLIST.panel_ids.txt; current STACK.md, RULES.md and ABOUT.md. Performance claims from the earlier run remain unverified until the original data/code/results are reproduced. Earlier candidate duplicate identities were provisional; section 17 confirms four Master-ID pairs using the supplied v62 annotations and leaves others unresolved. Proposed thresholds and ablations are a plan, not results.


## 17. Refinement from the supplied v62 HO and 1240K annotations

This section updates the earlier provisional identity findings and adds a candidate-selection plan. It uses the two supplied v62 CSV exports, not downloaded replacement annotations. No genotype quality or performance was recalculated. Counts are exact-ID/metadata comparisons unless explicitly marked otherwise.

### 17.1 Version reconciliation is necessary

| Inventory | Rows / unique Genetic IDs | Exact matches to the 6,881 selected IDs |
| --- | ---: | ---: |
| v62 HO annotations | 21,945 / 21,945 | 5,758 |
| v62 1240K annotations | 17,629 / 17,629 | 1,948 |
| Union of annotation IDs | Not summed: panels overlap | 5,758 |

The remaining 1,123 selected IDs comprise 889 unsuffixed, 180 HO, 26 SG, 18 TW, 5 DG, 3 BY and 2 AG. The unsuffixed records require the external-study manifests. The other 234 require release/representation reconciliation. The v62 annotation coverage is 83.7% of the full selected list; it is useful but incomplete.

Comparing v62 1240K annotation IDs with the supplied v66 1240K patch `.ind`: 16,079 IDs overlap, 7,010 occur only in the v66 file and 1,550 only in the v62 file. These are file-set differences, not proven biological additions/deletions: representations, renaming and patch scope may contribute. Nevertheless, “differences are minute” is not supported at the file level. Never label a v62 warning or PASS status as verified v66 status.

Required merge keys: exact Genetic ID first; versioned Master ID next for identity review, never automatic genotype substitution. Attach `annotation_release`, `matched_by`, and `current_release_verified` fields. Use v62 for candidate discovery; verify decisions affecting actual v66 genotypes before freezing the run.

### 17.2 Confirmed duplicate identities in the selected panel

Both annotation exports identify these four selected pairs with the same Master ID:

| Master ID | Selected representations | v62 assessment from 1240K file |
| --- | --- | --- |
| BOT2016 | BOT2016.SG, BOT2016.AG | Both PASS |
| I11974 | I11974.AG, I11974.SG | Both PASS |
| I1583 | I1583.DG, I1583.SG | Both PASS |
| Sumidouro5 | Sumidouro5.SG, Sumidouro5_d.SG | Original QUESTIONABLE; damage-restricted PASS |

These are four redundant selected records beyond one record per represented Master ID, within the matched subset. They are not four independent sample pairs for testing. Resolve them before fitting and cross-validation. PASS does not make alternate representations independent.

For Sumidouro5, the v62 metadata favor investigating the damage-restricted representation for projection; still check its usable SNP overlap and current-release status. For the other pairs, choose by actual call type, overlap and quality, rather than suffix preference alone. Preserve alternate assays for technical comparisons with all versions assigned to the same split.

Only `mota.SG` is matched in these v62 annotations; the other selected Mota representations remain unresolved, not cleared. In contrast, `Selkup4.HO` and `Selkup4a.HO` have **different v62 Master IDs**, Selkup4 and Selkup4a. Withdraw the name-based duplicate suggestion for that pair unless genotype/relationship evidence establishes a problem.

### 17.3 Nine selected records have v62 QUESTIONABLE assessments

Among the 1,948 selected records matched to the 1240K annotations, 1,939 are PASS and nine QUESTIONABLE. All nine must be reviewed before use as basis anchors:

| Genetic ID | v62 group | Warning summary |
| --- | --- | --- |
| I0867.AG | Israel_PPNB.AG | hapConX interval 0.010–0.016 |
| TAF013.AG | Morocco_Iberomaurusian.AG | hapConX 0.017–0.022 |
| La368.SG | Laos_Hoabinhian.SG | hapConX 0.011–0.021 |
| Ma912.SG | Malaysia_LN.SG | ANGSD 0.013–0.020; hapConX 0.007–0.013 |
| MA1.SG | Russia_MA1_UP.SG | hapConX 0.012–0.019 |
| TAF011.AG | Morocco_Iberomaurusian.AG | hapConX 0.013–0.017; retest damaged reads |
| TAF010.AG | Morocco_Iberomaurusian.AG | hapConX 0.014–0.020; retest damaged reads |
| Sumidouro6.SG | Brazil_MG_C_Sumidouro_EH_HG_10100BP.SG | hapConX 0.013–0.019; retest damaged reads |
| Sumidouro5.SG | Brazil_MG_C_Sumidouro_EH_HG_10400BP.SG | hapConX 0.019–0.022; retest damaged reads |

These intervals are annotation fields, not new estimates or a substitute for reading their methodology. Do not turn them into a universal percentage cutoff. Temporarily quarantine unresolved QUESTIONABLE records from the production basis; maintain a documented sensitivity run and consider reviewed alternative representations. This affects scientifically influential ancient groups, including ANE, Taforalt and Hoabinhian references; small counts of problematic records can matter substantially.

The HO CSV does **not** include ASSESSMENT/WARNING columns. A missing assessment is unknown, not PASS. Transfer assessment only across exact representation matches with version provenance; do not transfer a damaged-read representation's PASS to the original assay.

### 17.4 Candidate ranking: count people, then evaluate purpose

The preliminary candidate screen uses `Full Date = present`, a HO/DG representation, and no explicit non-PASS assessment where an exact 1240K assessment is available. This yields metadata candidates, not approved unrelated high-quality basis individuals. Master IDs are deduplicated within each group. Remaining candidates must pass exclusions for nonhuman/reference records, Ignore/relative/outlier labels, genotype-type verification, current-release reconciliation and measured QC.

“Represented” below means the Master ID appears anywhere among selected IDs matched to v62 HO. “Unrepresented” is therefore an **upper bound** on possible additions: the 889 external IDs and 234 other unmatched selected IDs have not been resolved. Only terminal HO/DG suffixes were removed for these comparisons; broader aliases were not silently merged.

| Candidate group | v62 modern HO/DG Master IDs screened | Already represented by matched selected IDs | Potential additional Master IDs | Recommended role |
| --- | ---: | ---: | ---: | --- |
| Nganasan | 33 | 28 | 5 | Targeted northern Eurasian depth experiment |
| Selkup | 24 | 23 | 1 | Reconcile first; little demonstrated new depth in v62 |
| Ket | 19 | 16 | 3 | Reconcile final panel's 39 Ket records before adding |
| Kankanaey | 10 | 1 | 9 | Southeast Asian coverage candidate; external-ID crosswalk required |
| Vietnamese | 10 | 2 | 8 | Sampling/alias review against KHV and external studies |
| Dusun | 11 | 4 | 7 | External EGDP overlap review before claiming novelty |
| Murut | 10 | 3 | 7 | Southeast Asian candidate after identity/QC checks |
| Burmese | 11 | 5 | 6 | EGDP overlap review; do not simply add six |
| Indonesia_Flores_Rampasasa | 19 | 0 | 19 | Regional coverage and held-out transfer candidate |
| PapuaNewGuinea_NewBritain_Baining | 17 | 0 | 17 | Oceanian coverage candidate |
| Indonesia_Flores_Cibol | 13 | 0 | 13 | Regional candidate; test redundancy and platform effects |
| Indonesia_Flores_Bena | 12 | 0 | 12 | Regional candidate, same constraints |
| Indonesia_Mentawai | 10 | 0 | 10 | Regional candidate |
| Indonesia_Nias_Hilitobara | 8 | 0 | 8 | Regional candidate |
| Australian | 5 | 0 | 5 | Representation/consent/quality review; small sample |
| BEB | 85 | 85 | 0 | Existing resource; useful held-out South Asian validation |

Candidate availability does not demonstrate a higher G25 score. Select additions by a prespecified geographic product-coverage goal, then evaluate on a frozen benchmark. The Indonesian/Oceanian groups are more interesting expansion leads than merely adding alternate `.DG` rows for familiar populations, but their external-study overlap remains unresolved.

### 17.5 Alternate representations are replacement experiments

The raw row counts make Han.DG (45 unselected rows), Druze.DG (41), Papuan.DG (28), Sardinian.DG (28) and numerous other groups look absent. Many individuals are already represented under a different assay. Compare Master IDs globally before concluding new population coverage.

Use paired HO-versus-DG experiments for the same person to measure platform/marker effects, preserving train/test identity. If a DG assay provides better compatible calls, replace the selected representation after validation; do not append both. For a Human Origins-centered basis, broader sequencing coverage is not automatically an advantage once restricted to the fixed SNP panel.

### 17.6 Admixed modern groups are valuable tests

The metadata screen finds PUR 99, CLM 94, ACB 92, PEL 68, MXL 62 and ASW 55 Master IDs with none represented among v62-matched selected IDs: **470 candidate records across six groups**. This aligns with the old run's deliberate exclusions, rather than a newly discovered oversight.

Use an unrelated, identity-reconciled subset for out-of-basis evaluation of admixed consumers. Check broad affinities, projection stability and component sensitivity; these groups do not supply individual true ancestry percentages merely through their labels. Reserve them before tuning if they will support final generalization claims. Whether some belong in the basis is a separate controlled experiment.

### 17.7 Annotation export anomalies and safe parsing

Do not parse the two CSVs by shared column positions: schemas differ. Match exact column names with an explicit alias map and fail on ambiguous headers. The 1240K CSV includes contamination and assessment fields absent from HO; HO includes publication DOI/repository and molecular-sex fields not present in the same form in the supplied 1240K export.

The HO export contains 81 records with `Data type = Netherlands`, including I4067.AG, I4068.AG and I4069.AG. That value is not a genotype technology. Quarantine invalid field values and inspect the original workbook/export alignment; do not infer the cause or automatically relabel those records. Geography-like values in a technical column demonstrate that schema validity needs more than a successful CSV parse.

Store the two SNP-hit columns separately. Counts on the 1240K and HO target sets are not equivalent, and neither is the call rate on the final ~170k selected basis. Calculate the latter from actual retained SNP calls. These exports do not supply a complete relationship manifest; lack of a relative flag is not unrelatedness evidence.

### 17.8 Updated build priorities

1. Deduplicate the four confirmed Master-ID pairs and investigate unresolved Mota representations.
2. Resolve nine QUESTIONABLE selected ancient records, and audit how their removal/replacement affects the small anchor groups.
3. Build the v62-to-v66 representation crosswalk; make unmatched records visible instead of copying metadata silently.
4. Join all external selected IDs to study identities before ranking additional people.
5. Preserve the audited historical panel as one benchmark; construct a clean modern diploid candidate and a reviewed-anchor variant.
6. Prioritize Nganasan/Ket depth as a limited hypothesis test, Southeast Asian/Oceanian groups as coverage experiments, and admixed groups as held-out evaluation resources.
7. Test actual SNP overlap, batch structure, relatives and out-of-sample performance before issuing a final smartpca poplist.

These annotations justify a concrete candidate queue and several corrective actions. They do not yet justify an unconditional replacement population list. The final basis must be selected at individual/representation level and then summarized by population.
