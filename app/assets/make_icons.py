"""Generate brand assets with stdlib only: amber ring on ink. No fonts, no deps.

Outputs (app/assets/images/ + app/public/):
  icon.png 1024, adaptive-icon.png 1024, splash.png 1024, favicon.png 48,
  og-image.png 1200x630 (public/, served at /og-image.png).
Run: python3 app/assets/make_icons.py && python3 app/assets/make_icons.py --verify
"""

from __future__ import annotations

import struct
import sys
import zlib
from pathlib import Path

HERE = Path(__file__).resolve().parent
IMG_DIR = HERE / "images"
PUB_DIR = HERE.parent / "public"

INK = (10, 9, 8)
AMBER = (238, 176, 87)


def paint_ring(x: int, y: int, w: int, h: int) -> tuple[int, int, int]:
    cx, cy = w / 2, h / 2
    dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
    outer, inner = min(w, h) * 0.30, min(w, h) * 0.24
    if inner <= dist <= outer:
        return AMBER
    if dist <= min(w, h) * 0.045:
        return AMBER
    return INK


def paint_og(x: int, y: int, w: int, h: int) -> tuple[int, int, int]:
    cx, cy = w * 0.28, h / 2
    dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
    if h * 0.26 <= dist <= h * 0.33:
        return AMBER
    if w * 0.47 <= x <= w * 0.85 and h * 0.46 <= y <= h * 0.54:
        return AMBER
    return INK


def write_png(path: Path, w: int, h: int, paint) -> None:
    rows = bytearray()
    for y in range(h):
        rows.append(0)
        for x in range(w):
            rows.extend(paint(x, y, w, h))
    blob = struct.pack(">8sI", b"\x89PNG\r\n\x1a\n", 13)
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    blob += b"IHDR" + ihdr + struct.pack(">I", zlib.crc32(b"IHDR" + ihdr))
    comp = zlib.compress(bytes(rows), 6)
    blob += struct.pack(">I", len(comp)) + b"IDAT" + comp
    blob += struct.pack(">I", zlib.crc32(b"IDAT" + comp))
    blob += struct.pack(">I", 0) + b"IEND" + struct.pack(">I", zlib.crc32(b"IEND"))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(blob)


def read_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", path
    (w, h) = struct.unpack(">II", data[16:24])
    return w, h


TARGETS = [
    (IMG_DIR / "icon.png", 1024, 1024, paint_ring),
    (IMG_DIR / "adaptive-icon.png", 1024, 1024, paint_ring),
    (IMG_DIR / "splash.png", 1024, 1024, paint_ring),
    (IMG_DIR / "favicon.png", 48, 48, paint_ring),
    (PUB_DIR / "og-image.png", 1200, 630, paint_og),
]


def main() -> None:
    verify_only = "--verify" in sys.argv
    if not verify_only:
        for path, w, h, paint in TARGETS:
            write_png(path, w, h, paint)
            print(f"wrote {path.relative_to(HERE.parent)} {w}x{h}")
    for path, w, h, _ in TARGETS:
        got = read_size(path)
        assert got == (w, h), f"{path}: {got} != {(w, h)}"
    print("all assets verified")


if __name__ == "__main__":
    main()
