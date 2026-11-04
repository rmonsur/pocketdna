/* Genomic datasets behind PocketDNA's browser analysis.
 * Fill in `url` for each entry once; every diagram that shows datasets reads from here.
 * Sizes were measured on the builder's machine (du, 2026-11-05). */

export const DATASET_INTRO =
  "None of these files are in the repository because they are far too large for Git (the biggest is several gigabytes). The repository holds the compact derived reference arrays the browser actually needs, plus the scripts and documents that rebuild them from the sources below.";

export const DATASETS = [
  {
    name: "AADR v66.1, 1240K",
    cite: "Allen Ancient DNA Resource, Reich Lab, Harvard Dataverse, DOI 10.7910/DVN/FFIDCW",
    what: "Genotypes and sample annotations for ancient and present-day individuals on the 1240K SNP set (dates, places, publications).",
    role: "Ancient source groups for the Bronze Age and Medieval fits, and the dated sampling sites that the citations and globe markers come from.",
    size: "about 6.6 GB genotypes, 74 MB markers, 13 MB annotations",
    url: null,
  },
  {
    name: "AADR v66.1, Human Origins",
    cite: "Same release, Human Origins SNP set",
    what: "The same resource on the Human Origins marker set, which covers many present-day populations.",
    role: "Present-day reference populations and the marker set the PCA-25 basis is built on.",
    size: "about 3.8 GB plus 1.8 GB compatibility genotypes, 15 MB annotations",
    url: null,
  },
  {
    name: "EGDP",
    cite: "Estonian Biocentre Human Genome Diversity Panel, Pagani et al.",
    what: "Present-day whole genomes from many world populations.",
    role: "Fills regional gaps in the modern reference set.",
    size: "about 131 MB",
    url: null,
  },
  {
    name: "SGDP",
    cite: "Simons Genome Diversity Project",
    what: "High-coverage whole genomes from diverse present-day populations.",
    role: "Additional modern reference individuals and a cross-check on overlapping populations.",
    size: "about 41 MB",
    url: null,
  },
  {
    name: "Franco-Cantabrian 190",
    cite: "Flores-Bello et al.",
    what: "Present-day genotypes from the Franco-Cantabrian region.",
    role: "Regional detail for Western Europe in the modern reference set.",
    size: "about 46 MB",
    url: null,
  },
  {
    name: "Builder's own 23andMe export",
    cite: "Private, owned by the builder",
    what: "One raw consumer-chip file (v2 and v3 format).",
    role: "The test input for the live demo episode. Never uploaded, never committed.",
    size: "about 24 MB",
    url: null,
  },
];
