"""Pydantic mirrors of shared/*.schema.json. Single source for API validation."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Epoch = Literal["bronze", "middle", "modern"]


class PopulationShare(BaseModel):
    id: str
    label: str
    weight: float = Field(ge=0, le=1)
    low: float | None = None
    high: float | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)


class EpochComposition(BaseModel):
    epoch: Epoch
    shares: list[PopulationShare]


class ProgressEvent(BaseModel):
    job_id: str
    step: int = Field(ge=1, le=7)
    title: str = ""
    model: str = ""
    status: Literal["running", "done", "failed"]
    artifact: str = ""


class Beat(BaseModel):
    id: str
    kind: Literal["hook", "method", "era", "convergence", "stamp"]
    epoch: Epoch | None = None
    t_start: float = Field(ge=0)
    t_end: float = Field(ge=0)
    copy: str = Field(max_length=140)
    explainer: str = Field(default="", max_length=280)
    citation_ids: list[str] = []
    scene_id: str = ""
    map_path: list[tuple[float, float]] = []


class Reel(BaseModel):
    version: Literal[1]
    duration_s: float = Field(ge=30, le=60)
    beats: list[Beat] = Field(min_length=7, max_length=7)


class Claim(BaseModel):
    claim: str
    explainer: str
    citation_ids: list[str]
    epoch: Epoch


class CitationResult(BaseModel):
    claims: list[Claim]


class GatekeeperOut(BaseModel):
    vendor: str
    report_type: str
    route: Literal["tier1", "rejection"]
    rejection: Literal["R1", "R2"] | None = None
    confidence: float = Field(ge=0, le=1)


class ParseShare(BaseModel):
    id: str
    label: str
    weight: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)


class ParseOut(BaseModel):
    vendor: str
    shares: list[ParseShare]
    omitted: list[str] = []


class ScenePick(BaseModel):
    beat_id: str
    scene_id: str | None = None
    caption_note: str | None = None
    generate: str | None = None


class ScenePicks(BaseModel):
    picks: list[ScenePick]


class Violation(BaseModel):
    beat_id: str | None = None
    rule: str
    fix: str


class AuditOut(BaseModel):
    passed: bool
    violations: list[Violation] = []


class JobStatus(BaseModel):
    job_id: str
    tier: Literal["tier1", "tier2"]
    state: Literal["queued", "running", "done", "failed", "rejected"]
    rejection: Literal["R1", "R2", "R3", "R4", "R5"] | None = None
    message: str = ""
    reel: Reel | None = None
    events: list[ProgressEvent] = []
