"""Local MP4 export: step t deterministically, screenshot, ffmpeg to 1080x1920.

The app renders ?static=1&t=<seconds> as an exact frame (see ReelStage),
so export matches playback by construction.

Usage (builder machine: pip3 install playwright && playwright install chromium; needs ffmpeg):
  python3 reel_export.py --url http://localhost:8081/reel --out pocketdna.mp4
"""

from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True, help="web build reel route, e.g. http://localhost:8081/reel")
    ap.add_argument("--out", default="pocketdna.mp4")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--width", type=int, default=540)
    ap.add_argument("--height", type=int, default=960)
    args = ap.parse_args()

    from playwright.sync_api import sync_playwright

    reel = json.loads((ROOT / "demo" / "fixtures" / "sample-reel.json").read_text())
    duration = float(reel["duration_s"])
    frames = int(duration * args.fps)

    with tempfile.TemporaryDirectory() as tmp:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            page = browser.new_page(viewport={"width": args.width, "height": args.height})
            for i in range(frames):
                t = i / args.fps
                page.goto(f"{args.url}?static=1&t={t:.3f}", wait_until="networkidle")
                page.screenshot(path=f"{tmp}/f{i:05d}.png")
            browser.close()
        subprocess.run(
            ["ffmpeg", "-y", "-framerate", str(args.fps), "-i", f"{tmp}/f%05d.png",
             "-vf", "scale=1080:1920", "-c:v", "libx264", "-pix_fmt", "yuv420p", args.out],
            check=True,
        )
    print(f"wrote {args.out} ({frames} frames, {duration}s)")


if __name__ == "__main__":
    main()
