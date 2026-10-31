"""B1 verifier: confirm every DOI resolves via Crossref and matches authors/year.

Usage (builder machine, needs network):
  python3 b1/b1_verify.py
Exit nonzero if any entry flags. No entry ships without PASS + builder review.
"""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
INDEX = HERE.parent / "data" / "citation-index.json"


def check(entry: dict) -> str:
    doi = entry["source"]["doi"]
    url = f"https://api.crossref.org/works/{doi}"
    req = urllib.request.Request(url, headers={"User-Agent": "PocketDNA-hackathon/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            work = json.load(resp)["message"]
    except Exception as exc:
        return f"FLAG {entry['id']}: resolve failed ({exc})"
    year = (work.get("published-print") or work.get("published-online") or {}).get("date-parts", [[None]])[0][0]
    first = (work.get("author") or [{}])[0].get("family", "")
    want_author = entry["source"]["authors"].split(",")[0].split(" ")[0].lower()
    problems = []
    if year != entry["source"]["year"]:
        problems.append(f"year {year} != {entry['source']['year']}")
    if want_author and want_author not in first.lower():
        problems.append(f"author {first!r} vs {entry['source']['authors']!r}")
    if problems:
        return f"FLAG {entry['id']}: " + "; ".join(problems)
    return f"PASS {entry['id']}: {work.get('title', ['?'])[0][:80]}"


def main() -> None:
    index = json.loads(INDEX.read_text())
    failed = 0
    for entry in index["entries"]:
        line = check(entry)
        print(line)
        failed += line.startswith("FLAG")
    print(f"{len(index['entries']) - failed}/{len(index['entries'])} pass")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
