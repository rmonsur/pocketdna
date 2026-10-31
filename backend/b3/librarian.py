"""B3 SceneLibrarianAgent (build-time): pregenerate the 9:16 plate library.

Per scene: 3 Muse Image candidates -> Spark vision scores vs style lock ->
keep best -> assets/scene-library/<id>.png + scores to scores.jsonl.
Library hits are never regenerated (dev-cache discipline). Masks (SAM 3.1)
are a separate pass once the API shape is verified.

Usage (builder machine, needs network + META_API_KEY):
  python3 b3/librarian.py --dry-run            # briefs + cost estimate, no calls
  python3 b3/librarian.py --all                # build full library (~$0.33)
  python3 b3/librarian.py --scene scene-bronze-steppe-01
"""

from __future__ import annotations

import argparse
import base64
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from muse.client import call_json, generate_image, read_prompt
from muse.models import SPARK_13

HERE = Path(__file__).resolve().parent
LIB_DIR = HERE.parent.parent / "assets" / "scene-library"
CANDIDATES = 3
MAX_IMAGES_PER_RUN = 40


def load_briefs() -> dict[str, Any]:
    return json.loads((HERE / "scenes.json").read_text())


def full_prompt(briefs: dict[str, Any], scene: dict[str, Any]) -> str:
    return f"{briefs['style_prefix']}. Scene: {scene['brief']}. Avoid: {briefs['negative']}."


def score_candidates(brief: str, images_b64: list[str]) -> list[dict[str, Any]]:
    system = read_prompt("b3_score")
    parts: list[dict[str, Any]] = [{"type": "text", "text": f"Beat brief: {brief}"}]
    for i, b64 in enumerate(images_b64):
        parts.append({"type": "text", "text": f"Candidate {i}:"})
        parts.append({"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}})
    res = call_json(
        agent="b3_score", tier="build", model=SPARK_13,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": parts}],
        json_schema={"name": "b3_scores", "strict": True, "schema": {"type": "object"}},
        effort="low",
        validate=lambda d: d if "scores" in d else (_ for _ in ()).throw(ValueError("missing scores")),
    )
    return res.data["scores"]


def build_scene(briefs: dict[str, Any], scene_id: str, spent: list[float]) -> str:
    LIB_DIR.mkdir(parents=True, exist_ok=True)
    target = LIB_DIR / f"{scene_id}.png"
    if target.exists():
        return f"hit: {scene_id} (cached, $0)"
    scene = next(s for s in briefs["scenes"] if s["id"] == scene_id)
    prompt = full_prompt(briefs, scene)
    candidates: list[bytes] = []
    for _ in range(CANDIDATES):
        if len(spent) >= MAX_IMAGES_PER_RUN:
            raise SystemExit("image cap reached; rerun to continue")
        blob, cost = generate_image(prompt=prompt)
        candidates.append(blob)
        spent.append(cost)
    b64s = [base64.b64encode(c).decode() for c in candidates]
    scores = score_candidates(scene["brief"], b64s)
    passed = [s for s in scores if not s.get("fail", False)]
    if not passed:
        raise SystemExit(f"all candidates failed style lock for {scene_id}; brief needs revision")
    best = max(passed, key=lambda s: s["score"])
    target.write_bytes(candidates[best["index"]])
    with (LIB_DIR / "scores.jsonl").open("a") as fh:
        fh.write(json.dumps({"scene": scene_id, "scores": scores, "kept": best["index"]}) + "\n")
    return f"built: {scene_id} kept candidate {best['index']} score {best['score']}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--scene", default="")
    args = ap.parse_args()
    briefs = load_briefs()
    if args.dry_run:
        missing = [s["id"] for s in briefs["scenes"] if not (LIB_DIR / f"{s['id']}.png").exists()]
        print(f"{len(briefs['scenes'])} scenes, {len(missing)} missing, est ${len(missing) * CANDIDATES * 0.01:.2f}")
        for scene_id in missing:
            print(f"  - {scene_id}")
        return
    spent: list[float] = []
    ids = [s["id"] for s in briefs["scenes"]] if args.all else [args.scene]
    for scene_id in ids:
        print(build_scene(briefs, scene_id, spent))
    print(f"image spend this run: ${sum(spent):.2f}")


if __name__ == "__main__":
    main()
