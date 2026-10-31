"""Upload intake: content sniffing (never extension trust), deterministic raw-file
vendor detect, tier routing, and the Tier 2 privacy assertion."""

from __future__ import annotations

import io
import zipfile

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


def extract_raw_text(filename: str, blob: bytes) -> str:
    """Inner vendor text for an already-routed raw upload. Raises ValueError if unreadable."""
    if blob.startswith(ZIP_MAGIC) or filename.lower().endswith(".zip"):
        text, errmsg = unzip_vendor_file(blob)
        if errmsg or text is None:
            raise ValueError("unreadable archive")
        return text
    return blob.decode("utf-8", errors="replace")


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


def route_upload(filename: str, blob: bytes) -> tuple[str, str, str]:
    """Return (tier, detail, error). tier in {tier1, tier2, rejection}.

    detail is vendor id on success, rejection id (R1-R3) on rejection.
    R1 (health panel) is decided by A0 vision, not here.
    """
    lower = filename.lower()
    if sniff_image(blob):
        if len(blob) > MAX_IMAGE_BYTES:
            return "rejection", "R2", "image over 10MB"
        return "tier1", "screenshot", ""
    text: str | None = None
    if blob.startswith(ZIP_MAGIC) or lower.endswith(".zip"):
        if len(blob) > MAX_RAW_BYTES:
            return "rejection", "R3", "archive over 50MB"
        text, err = unzip_vendor_file(blob)
        if err:
            return "rejection", err, "unreadable archive"
        assert text is not None
    elif lower.endswith(".txt"):
        if len(blob) > MAX_RAW_BYTES:
            return "rejection", "R3", "file over 50MB"
        text = blob.decode("utf-8", errors="replace")
    else:
        return "rejection", "R2", "unsupported file type"
    vendor = detect_raw_vendor(text)
    if not vendor:
        return "rejection", "R3", "not a 23andMe or AncestryDNA export"
    return "tier2", vendor, ""


def assert_open_weights_only(tier: str, provider: str) -> None:
    """Block hosted-API providers for raw-file jobs. Tested; never silent."""
    if tier == "tier2" and provider not in ("modal", "baseten"):
        raise AssertionError(f"privacy invariant: Tier 2 provider must be open weights, got {provider!r}")
