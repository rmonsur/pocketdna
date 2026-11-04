"""Upload intake: content sniffing (never extension trust), deterministic raw-file
vendor detect, tier routing, and the Tier 2 privacy assertion."""

from __future__ import annotations

import io
import zipfile
from dataclasses import dataclass

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_RAW_BYTES = 50 * 1024 * 1024
MAX_ZIP_ENTRIES = 8
MAX_ZIP_UNCOMPRESSED = 100 * 1024 * 1024

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
JPEG_MAGIC = b"\xff\xd8\xff"
ZIP_MAGIC = b"PK\x03\x04"


def sniff_image(blob: bytes) -> bool:
    return blob.startswith(PNG_MAGIC) or blob.startswith(JPEG_MAGIC)


def unzip_vendor_file(blob: bytes) -> tuple[str | None, str]:
    """Return (inner_text, error_code). Error codes: '' ok, 'R3' malformed, 'R2' unreadable."""
    try:
        with zipfile.ZipFile(io.BytesIO(blob)) as zf:
            names = [n for n in zf.namelist() if not n.endswith("/")]
            if len(names) == 0 or len(names) > MAX_ZIP_ENTRIES:
                return None, "R3"
            total = sum(zf.getinfo(n).file_size for n in names)
            if total > MAX_ZIP_UNCOMPRESSED:
                return None, "R3"
            inner = max(names, key=lambda n: zf.getinfo(n).file_size)
            return zf.read(inner).decode("utf-8", errors="replace"), ""
    except zipfile.BadZipFile:
        return None, "R2"


def detect_raw_vendor(text: str) -> str:
    """Deterministic vendor detect from export header. Returns vendor id or ''."""
    head = "\n".join(text.splitlines()[:25]).lower()
    if "rsid" in head and "chromosome" in head and "position" in head:
        if "alleles" in head and "rsid\talleles" in head.replace(" ", "\t"):
            return "ancestry"
        if "# rsid" in head or "genotype" in head:
            return "23andme"
        # Fallback: two-allele columns (ancestry) vs single genotype column (23andme)
        for line in text.splitlines():
            if line.startswith("#") or not line.startswith("rs"):
                continue
            cols = line.split()
            if len(cols) >= 5:
                return "ancestry"
            if len(cols) == 4:
                return "23andme"
            break
    return ""


@dataclass(frozen=True)
class RoutedUpload:
    tier: str  # "tier1" | "tier2" | "rejection"
    detail: str  # vendor id on success, rejection id (R1-R3) on rejection
    message: str  # human-readable reason on rejection, else ""
    text: str = ""  # decoded raw export text for tier2 (unzipped once, here), else ""


def route_upload(filename: str, blob: bytes) -> RoutedUpload:
    """Sniff content, route to a tier, decode raw text exactly once.

    R1 (health panel) is decided by A0 vision, not here.
    """
    lower = filename.lower()
    if sniff_image(blob):
        if len(blob) > MAX_IMAGE_BYTES:
            return RoutedUpload("rejection", "R2", "image over 10MB")
        return RoutedUpload("tier1", "screenshot", "")
    if blob.startswith(ZIP_MAGIC) or lower.endswith(".zip"):
        if len(blob) > MAX_RAW_BYTES:
            return RoutedUpload("rejection", "R3", "archive over 50MB")
        text, err = unzip_vendor_file(blob)
        if err or text is None:
            return RoutedUpload("rejection", err or "R2", "unreadable archive")
    elif lower.endswith(".txt"):
        if len(blob) > MAX_RAW_BYTES:
            return RoutedUpload("rejection", "R3", "file over 50MB")
        text = blob.decode("utf-8", errors="replace")
    else:
        return RoutedUpload("rejection", "R2", "unsupported file type")
    vendor = detect_raw_vendor(text)
    if not vendor:
        return RoutedUpload("rejection", "R3", "not a 23andMe or AncestryDNA export")
    return RoutedUpload("tier2", vendor, "", text)


OPEN_WEIGHT_PROVIDERS = ("modal", "baseten")


def assert_open_weights_only(tier: str, provider: str) -> None:
    """Block hosted-API providers for raw-file jobs. Enforced in agents.openweights.call_open."""
    if tier == "tier2" and provider not in OPEN_WEIGHT_PROVIDERS:
        raise AssertionError(f"privacy invariant: Tier 2 provider must be open weights, got {provider!r}")
