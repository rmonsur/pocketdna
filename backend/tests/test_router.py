"""Router + store tests: sniffing, vendor detect, zip guards, privacy assertion."""

import io
import sys
import tempfile
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import api.store as store
from api.router import assert_open_weights_only, route_upload

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
TTAM = (
    "# 23andMe test fixture (not real genotypes)\n"
    "# rsid\tchromosome\tposition\tgenotype\n"
    "rs1\t1\t1000\tAA\n"
    "rs2\t1\t2000\t--\n"
)
ANCESTRY = (
    "RsID\tAlleles\tChromosome\tPosition\n"
    "rs1\tA/A\t1\t1000\n"
    "rs2\t-/-\t1\t2000\n"
)


def _zip(files: dict[str, bytes]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for name, data in files.items():
            zf.writestr(name, data)
    return buf.getvalue()


def test_png_routes_tier1() -> None:
    r = route_upload("shot.png", PNG)
    assert (r.tier, r.detail) == ("tier1", "screenshot")


def test_unknown_bytes_reject_r2() -> None:
    r = route_upload("blob.bin", b"not-a-file" * 10)
    assert (r.tier, r.detail) == ("rejection", "R2")


def test_23andme_txt_routes_tier2() -> None:
    r = route_upload("genome.txt", TTAM.encode())
    assert (r.tier, r.detail) == ("tier2", "23andme")
    assert r.text == TTAM


def test_ancestry_txt_routes_tier2() -> None:
    r = route_upload("dna.txt", ANCESTRY.encode())
    assert (r.tier, r.detail) == ("tier2", "ancestry")


def test_zip_inner_file_sniffed() -> None:
    blob = _zip({"genome_test.txt": TTAM.encode()})
    r = route_upload("export.zip", blob)
    assert (r.tier, r.detail) == ("tier2", "23andme")
    assert r.text == TTAM


def test_zip_bomb_guarded() -> None:
    blob = _zip({f"f{i}.txt": b"x" for i in range(20)})
    r = route_upload("export.zip", blob)
    assert (r.tier, r.detail) == ("rejection", "R3")


def test_privacy_assertion_blocks_hosted() -> None:
    assert_open_weights_only("tier2", "modal")
    assert_open_weights_only("tier2", "baseten")
    try:
        assert_open_weights_only("tier2", "hosted")
    except AssertionError:
        return
    raise SystemExit("privacy assertion did not fire")


def test_call_open_refuses_hosted_provider(monkeypatch) -> None:
    """Fix 4: the invariant is enforced on the request path, not only in tests."""
    import pytest

    monkeypatch.setenv("OPEN_WEIGHT_PROVIDER", "hosted")
    monkeypatch.setenv("OPENWEIGHT_BASE_URL", "https://example.invalid/v1")
    from agents.openweights import call_open

    with pytest.raises(AssertionError, match="privacy invariant"):
        call_open(agent="a2", tier="tier2", messages=[], validate=lambda d: d)


def test_store_roundtrip() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        store.DB_PATH = Path(tmp) / "t.db"
        store.create_job("j1", "tier1", "queued")
        store.add_event("j1", 1, "Reading", "spark", "done", "ok")
        store.save_reel("j1", {"version": 1, "duration_s": 42, "beats": []})
        job = store.get_job("j1")
        assert job is not None and job["state"] == "done" and len(job["events"]) == 1


if __name__ == "__main__":
    for name, fn in sorted({k: v for k, v in globals().items() if k.startswith("test_")}.items()):
        fn()
        print(f"PASS {name}")
