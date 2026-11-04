#!/usr/bin/env python3
"""Parse era source lists (G25-format text) and cross-validate IDs against AADR.

The era text files carry Global25 coordinates. Those coordinates are NEVER
used for PocketDNA panels (docs forbid mixing spaces); only the sample/pop
membership and grouping are taken. Native coordinates come from projecting
AADR genotypes onto the PocketDNA PCA-25 bundle.

Matching tiers (strict, reported per row):
  T1 era token == Genetic ID (exact)
  T2 era token == Genetic ID with data-type suffix (.DG/.SG/.AG/...) stripped
  T3 era token == Individual ID (anno)
  T4 era token == Group ID (population-level; all members match)
Datasets: Bronze/Middle search 1240K first, then HO; Modern searches HO first.
Outputs (dataset/interim/era-panels/): era_ids_<era>.csv, matches.csv, unmatched.csv
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HACK = ROOT.parent
DATA = ROOT / "dataset"
OUT = DATA / "interim/era-panels"
SUFFIX = re.compile(r"\.(DG|SG|AG|TW|BY|AA|EC|WGC|HO|REF)$")

ERA_FILES = {
    "bronze": HACK / "Bronze Age.txt",
    "middle": HACK / "Middle Ages.txt",
    "modern": HACK / "Modern_averages_scaled.txt",
}


def parse_era(name: str, path: Path) -> list[dict]:
    rows = []
    if name == "modern":
        with path.open(newline="") as handle:
            reader = csv.reader(handle)
            header = next(reader)
            if header[1] != "PC1" or len(header) != 26:
                raise ValueError("Unexpected modern header")
            for fields in reader:
                if not fields or not fields[0]:
                    continue
                rows.append({"era": name, "group": fields[0], "subgroup": "", "sample_id": fields[0],
                             "coords": fields[1:]})
        return rows
    for line in path.read_text().splitlines():
        if not line.strip():
            continue
        label, *coords = line.split(",")
        if len(coords) != 25:
            raise ValueError(f"{name}: expected 25 coords, got {len(coords)} in {line[:60]}")
        segments = [s.replace("*", " ").strip() for s in label.split(":")]
        rows.append({
            "era": name,
            "group": segments[0],
            "subgroup": ":".join(segments[1:-1]),
            "sample_id": segments[-1],
            "coords": coords,
        })
    return rows


def load_anno(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8", errors="replace") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        cols = reader.fieldnames or []
        gid = cols[0]
        iid = cols[2]
        group = next(c for c in cols if c.startswith("Group ID"))
        date = next(c for c in cols if c.startswith("Date mean"))
        return [{"genetic_id": r[gid].strip(), "individual_id": r[iid].strip(),
                 "group_id": r[group].strip(), "date_bp": r[date].strip()} for r in reader]


COUNTRY = {
    "TUR": "Turkey", "BGR": "Bulgaria", "SRB": "Serbia", "HRV": "Croatia", "ROU": "Romania",
    "HUN": "Hungary", "POL": "Poland", "CHE": "Switzerland", "ITA": "Italy", "CHN": "China",
    "RUS": "Russia", "DEU": "Germany", "IRN": "Iran", "GRC": "Greece", "ESP": "Spain",
    "PRT": "Portugal", "FRA": "France", "GBR": "England", "UKR": "Ukraine", "GEO": "Georgia",
    "ARM": "Armenia", "AZE": "Azerbaijan", "IRQ": "Iraq", "ISR": "Israel", "JOR": "Jordan",
    "LBN": "Lebanon", "SYR": "Syria", "EGY": "Egypt", "MAR": "Morocco", "DZA": "Algeria",
    "TUN": "Tunisia", "ETH": "Ethiopia", "KEN": "Kenya", "TZA": "Tanzania", "IND": "India",
    "PAK": "Pakistan", "NPL": "Nepal", "MNG": "Mongolia", "KAZ": "Kazakhstan", "UZB": "Uzbekistan",
    "TKM": "Turkmenistan", "AFG": "Afghanistan", "JPN": "Japan", "KOR": "Korea", "VNM": "Vietnam",
    "THA": "Thailand", "IDN": "Indonesia", "PNG": "Papua", "AUS": "Australia", "NZL": "Zealand",
    "MEX": "Mexico", "PER": "Peru", "CHL": "Chile", "ARG": "Argentina", "BRA": "Brazil",
    "USA": "USA", "CAN": "Canada", "AUT": "Austria", "CZE": "Czechia", "SVK": "Slovakia",
    "SVN": "Slovenia", "BIH": "Bosnia", "MNE": "Montenegro", "ALB": "Albania", "MKD": "Macedonia",
    "LTU": "Lithuania", "LVA": "Latvia", "EST": "Estonia", "FIN": "Finland", "SWE": "Sweden",
    "NOR": "Norway", "DNK": "Denmark", "NLD": "Netherlands", "BEL": "Belgium", "IRL": "Ireland",
    "ISL": "Iceland", "LUX": "Luxembourg", "MDA": "Moldova", "BLR": "Belarus", "SRB_o": "Serbia",
}


def tokens(text: str) -> set[str]:
    return {t for t in re.split(r"[^a-z0-9]+", text.lower()) if len(t) >= 3}


def t5_candidates(token: str, group_ids: list[str]) -> list[str]:
    """Unique-candidate normalized group match; empty or ambiguous -> []."""
    parts = token.split("_")
    expanded = token
    if parts and parts[0] in COUNTRY:
        expanded = COUNTRY[parts[0]] + "_" + "_".join(parts[1:])
    want = tokens(expanded.replace("(", " ").replace(")", " "))
    scored = []
    for gid in group_ids:
        shared = want & tokens(gid)
        if len(shared) >= 2:
            scored.append((len(shared), gid))
    if not scored:
        return []
    scored.sort(reverse=True)
    if len(scored) > 1 and scored[0][0] == scored[1][0]:
        return []  # ambiguous tie: refuse to guess
    return [scored[0][1]]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    annos = {
        "1240K": load_anno(DATA / "v66.p1_1240K.aadr.PUB.anno"),
        "HO": load_anno(DATA / "v66.p1_compatibility_HO.aadr.PUB.anno"),
    }
    indexes = {}
    for ds, rows in annos.items():
        indexes[ds] = {
            "exact": {r["genetic_id"]: r for r in rows},
            "base": {SUFFIX.sub("", r["genetic_id"]): r for r in rows},
            "individual": {r["individual_id"]: r for r in rows if r["individual_id"]},
            "group": {},
        }
        for r in rows:
            indexes[ds]["group"].setdefault(r["group_id"], []).append(r)

    matches, unmatched, summary = [], [], {}
    for era, path in ERA_FILES.items():
        parsed = parse_era(era, path)
        with (OUT / f"era_ids_{era}.csv").open("w", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(["era", "group", "subgroup", "sample_id", *[f"PC{i}" for i in range(1, 26)],
                            "coord_space"])
            for r in parsed:
                writer.writerow([r["era"], r["group"], r["subgroup"], r["sample_id"], *r["coords"],
                                 "Global25 external (membership only; never used as panel coordinates)"])
        order = ["1240K", "HO"] if era in ("bronze", "middle") else ["HO", "1240K"]
        found = 0
        for row in parsed:
            token = row["sample_id"]
            hit = None
            for ds in order:
                idx = indexes[ds]
                if token in idx["exact"]:
                    hit = (ds, "T1", [idx["exact"][token]])
                elif token in idx["base"]:
                    hit = (ds, "T2", [idx["base"][token]])
                elif token in idx["individual"]:
                    hit = (ds, "T3", [idx["individual"][token]])
                elif token in idx["group"]:
                    hit = (ds, "T4", idx["group"][token])
                if hit:
                    break
            if hit is None:
                for ds in order:
                    groups = t5_candidates(token, list(indexes[ds]["group"].keys()))
                    if groups:
                        hit = (ds, "T5", indexes[ds]["group"][groups[0]])
                        break
            if hit is None:
                unmatched.append({**{k: row[k] for k in ("era", "group", "subgroup", "sample_id")},
                                  "reason": "no ID match in 1240K or HO anno"})
                continue
            found += 1
            ds, tier, samples = hit
            for s in samples:
                matches.append({"era": era, "group": row["group"], "subgroup": row["subgroup"],
                                "sample_id": token, "tier": tier, "dataset": ds,
                                "genetic_id": s["genetic_id"], "aadr_group": s["group_id"],
                                "date_bp": s["date_bp"]})
        summary[era] = {"era_rows": len(parsed), "matched_rows": found,
                        "matched_individuals": sum(1 for m in matches if m["era"] == era)}

    with (OUT / "matches.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(matches[0].keys()))
        writer.writeheader()
        writer.writerows(matches)
    with (OUT / "unmatched.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["era", "group", "subgroup", "sample_id", "reason"])
        writer.writeheader()
        writer.writerows(unmatched)
    print(json.dumps(summary, indent=2))
    tiers: dict[str, int] = {}
    for m in matches:
        tiers[f"{m['era']}:{m['tier']}:{m['dataset']}"] = tiers.get(f"{m['era']}:{m['tier']}:{m['dataset']}", 0) + 1
    print(json.dumps(tiers, indent=2))


if __name__ == "__main__":
    main()
