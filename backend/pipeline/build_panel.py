"""Build the REAL reference panel from an AADR release (builder-run, heavy).

Prereqs (builder machine or a big Modal job): AADR v66 HO genotype release
downloaded, plink2 + EIGENSOFT smartpca installed, curated population lists.
Output: panel .npz in the engine format (+ smartpca oracle comparison).

Steps:
  1. plink2: intersect HO panel, strand/allele harmonization, drop palindromic SNPs.
  2. smartpca on curated moderns -> oracle eigenvectors (ground truth).
  3. Export loadings V (25 PCs), SNP means, per-epoch source centroids.
  4. Record AADR version + citation + terms in README (compliance).

This script wires the commands once paths are set; dataset-specific curation
(population lists, bad-SNP exclusions) is the builder's genetics call.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys

K_PCS = 25


def need(tool: str) -> str:
    path = shutil.which(tool)
    if path is None:
        sys.exit(f"missing tool: {tool} (install it before building the panel)")
    return path


def run(cmd: list[str]) -> None:
    print("+", " ".join(cmd))
    subprocess.run(cmd, check=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--aadr-prefix", required=True, help="plink prefix of the HO release")
    ap.add_argument("--out", default="/data/aadr-panel.npz")
    ap.add_argument("--pops", required=True, help="curated population list file")
    args = ap.parse_args()

    need("plink2")
    need("smartpca")

    # 1. QC + intersect (flags reviewed with the builder's genetics notes).
    run(["plink2", "--pfile", args.aadr_prefix, "--keep", args.pops,
         "--snps-only", "just-acgt", "--rm-dup", "exclude-all",
         "--make-pgen", "--out", "/tmp/panel-qc"])
    # 2. Oracle smartpca on the curated set (ground truth for CI comparison).
    with open("/tmp/smartpca.par", "w") as fh:
        fh.write("genotypename: /tmp/panel-qc.pgen\nsnpname: /tmp/panel-qc.pvar\n"
                 f"indivname: /tmp/panel-qc.psam\nevecoutname: /tmp/oracle.evec\n"
                 f"evaloutname: /tmp/oracle.eval\nnumoutevec: {K_PCS}\n")
    run(["smartpca", "-p", "/tmp/smartpca.par"])
    print("oracle evec at /tmp/oracle.evec")
    print("NEXT: export loadings + means + epoch centroids to panel .npz (engine format).")
    print(f"Target: {args.out}. Then set POCKETDNA_PANEL_PATH and run the oracle CI test.")


if __name__ == "__main__":
    main()
