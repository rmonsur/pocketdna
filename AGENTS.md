# PocketDNA agent responsibilities

Start with [ABOUT.md](docs/ABOUT.md), then [RULES.md](docs/RULES.md) and the specialist contract for the task. The agreed target is local React/Vite + Node/Hono, browser-only raw-genotype analysis, and a 90–150 second silent-first documentary. The existing Expo/FastAPI prototype is migration input, not proof that the target is implemented.

This file defines responsibilities for future assigned work. It does not start agents or authorize deployment, publication, paid generation or implementation beyond the user's current request. Build roles below are work ownership; runtime roles are logical stages in the product. One developer/agent may fill multiple build roles. Do not create separate servers or a generic agent framework for these roles.

## Build ownership

| Owner | Task and owned area | Required output / completion gate | Dependencies and handoff |
| --- | --- | --- | --- |
| IntegrationLead | Own scope, shared contracts, integration order and documentation consistency; coordinate changes to contracts | Versioned EvidenceRecord, ReferenceBundle and ReelPlan; integrated 5–6 hour plan with honest status | Resolve cross-owner interface changes; hand release candidate to QAReleaseEngineer and builder |
| ScientificEngineer | Own `research/`, `dataset/` intake policy, reference manifests and `src/features/ancestry/` math | Identity/QC-reviewed bundle, pinned oracle, numerical parity/held-out reports; reject unsupported or unvalidated inputs | Follow BIOINFORMATICS/POPLIST; hand minimal findings contract to RuntimeEngineer and NarrativeEngineer |
| RuntimeEngineer | Own `src/server/`, `src/lib/muse/`, bootstrap, worker transport and export jobs | Server-only keys, bounded calls/cache, progress/cancel/retry, one-command local startup and local MP4 | Coordinate worker boundary with ScientificEngineer and render route with ExperienceEngineer; hand failure fixtures to QA |
| ExperienceEngineer | Own `src/app/`, design tokens, input UI and `src/features/reel/` renderer | Responsive silent player, accessible source drawer, deterministic seeks, caption-safe export and SVG fallback integration | Consume contracts; integrate approved atlas/image assets; hand phone/export previews to QA |
| NarrativeEngineer | Own versioned interpretation/director/research/compliance prompts and orchestration semantics | Source-linked claims, complete timed ReelPlan, independent narrative/compliance verdicts; unsupported copy blocked | Consume approved findings; request imagery/geography through VisualEngineer contracts |
| VisualEngineer | Own image workflow, atlas data/render module, prompt/asset manifests and visual review integration | Reviewed historical scenes, approved geographic packages, live/cache/replay labels and bounded repair/fallback | Follow IMAGE/AGENT/ATLAS; coordinate render interfaces with ExperienceEngineer; never change numerical ancestry |
| QAReleaseEngineer | Own behavioral tests, coverage reporting, integration QA, `/demo` and release README | Required test/coverage report, fresh-clone/no-key/live checks, privacy checks, phone/export review, demo/provenance package | Review all owner handoffs; report failures to owner; builder owns official-rule verification and actual submission |

These are exclusive primary responsibilities, not separate authorities to rewrite shared files. Agree shared schema changes with IntegrationLead. Keep image/atlas modules separate from the shared film renderer. Every handoff records inputs, changed files, schema/artifact versions, checks actually run, failures and remaining work. Preserve user changes and never invent passing tests or completion.

## Runtime role registry

Canonical names below are used across the docs. Model products (Spark, Muse Image, Wonder and SAM) are tools, not additional owners. Reviewers run separate review steps with actual evidence/artifacts; the same model can serve both steps, but that is not statistically independent validation.

| Class / role | Responsibility and input | Required output and recipient | Authority boundary / failure behavior |
| --- | --- | --- | --- |
| Orchestrator / PipelineOrchestrator | Validate mode, route input, schedule stages, reserve shared budget, track status/cancel/resume | Versioned job state and stage requests to workers; final approved package to ReelAssembler | Cannot bypass QC/audits; stop, repair within caps or return labelled fallback/error |
| Worker / InterpretationAgent | Read validated raw findings plus approved context | Plain-language interpretation with finding/source IDs to director and NarrativeAuditor | Cannot change numbers, invent confidence, infer traits or personal routes |
| Worker / HistoricalResearchReviewer | Research source-backed historical/material-culture briefs and verify source locators/rights | Versioned brief, uncertainty and permissible details to image workflow and director | No fabricated evidence; narrow/reject insufficient scenes; later visual audit is separate |
| Worker / HistoricalMigrationVerifier | Verify atomic place/date/movement claims and counterevidence | ClaimVerification with per-claim ClaimVerdicts to AtlasAgent and AtlasEvidenceAuditor | No model-memory route invention; unsupported movement gets a static alternative |
| Worker / DocumentaryDirector | Author hook, method beat, three chapters, convergence and ending from approved evidence | One complete timed ReelPlan to orchestrator; visual requests to AtlasAgent/HistoricalImageAgent; review to NarrativeAuditor | Own pacing/copy, not ancestry, geometry or audit approval; follow DIRECTOR |
| Worker / HistoricalImageAgent | Research coordination, prompt compilation, live generation, continuity, bounded repair and fallback | Reviewed image assets/manifests to AssetSelector and director | Follow AGENT/IMAGE; cannot approve its own candidate or receive personal genotype material |
| Worker / AtlasAgent | Resolve entities, select verified geometry, plan terrain/camera/map scenes and image handoffs | AtlasScenePackage to AtlasEvidenceAuditor, then director/AssetSelector | Cannot infer territory or routes from genetic percentages; optional masks never establish geography |
| Worker / AssetSelector | Resolve approved scene/asset IDs; select compatible reviewed library fallbacks, verify provenance/readiness | Complete asset manifest to orchestrator/ReelAssembler | No unaudited assets or silent substitution of personal findings; generation requests go through HistoricalImageAgent |
| Auditor / VisualEvidenceAuditor | Inspect actual generated image against brief, sources and final crop | Pass/repair/fallback with specific issues to HistoricalImageAgent | One repair per scene, at most two episode-wide; no self-certification by generator |
| Auditor / AtlasEvidenceAuditor | Review source entailment, geometry, movement implication and real rendered preview frames | Pass/revise/fallback to AtlasAgent and orchestrator | Unsupported arrows/polygons blocked; narrower static depiction still needs review |
| Auditor / NarrativeAuditor | Check exact captions, numbers, qualifiers, cut order, asset implications and source links | Pass/revise/block tied to ReelPlan version to director/orchestrator | Cannot approve unsupported personal inference; changed meaning invalidates affected approval |
| Auditor / ComplianceAuditorAgent | Check complete plan/assets for RULES ancestry, privacy, imagery and claim boundaries | Required pass/block tied to final plan/assets to orchestrator | Final render gate; no bypass on timeout or exhausted budget |
| Deterministic worker / ReelAssembler | Validate approved plan/assets, assemble absolute-time scenes, preview and export | Interactive film, MP4 and companion evidence manifest to UI | No new claims or creative mutations after approval; errors return to orchestrator |

The deterministic ancestry engine is a tool owned by ScientificEngineer. It parses/harmonizes/projects/fits inside the browser worker and emits validated raw EvidenceRecords. It is never an LLM agent. Wonder supports development/research only. Optional SAM segmentation is an AtlasAgent tool with inspected masks, not a historical verifier.

## Graph, review and completion

1. PipelineOrchestrator selects live, cached or replay mode. Raw input passes deterministic validation/QC/analysis. Unsupported inputs stop with typed errors.
2. InterpretationAgent consumes eligible findings. HistoricalResearchReviewer and HistoricalMigrationVerifier obtain the required contextual evidence; relevant independent reviews approve permitted use.
3. DocumentaryDirector creates a draft ReelPlan. NarrativeAuditor checks its claims before expensive visual work. The orchestrator resolves requested evidence gaps through the appropriate research role.
4. HistoricalImageAgent → VisualEvidenceAuditor supplies reviewed images. AtlasAgent → AtlasEvidenceAuditor supplies reviewed geography and real preview frames. Independent work may overlap within the shared budget; continuity-dependent image jobs wait for their approved anchor.
5. AssetSelector resolves the approved manifest. DocumentaryDirector finalizes timing/copy. NarrativeAuditor reviews the final exact plan and its visual implications; ComplianceAuditorAgent supplies final approval.
6. ReelAssembler renders only the approved plan/asset versions. Any meaning-changing edit reopens affected reviews. Cancellation prevents late results entering the film. No-key replay uses a previously reviewed versioned package and is visibly labelled replay.

Use `ClaimVerification` for the verifier response containing per-claim `ClaimVerdict` records. `EvidenceRecord` carries validated raw findings; `ReferenceBundle` carries basis identity; `ReelPlan`, `AtlasScenePackage` and image manifests retain claim and asset IDs. Validate every boundary before handoff.

Legacy generic labels map to these canonical roles: controller/orchestrator → PipelineOrchestrator; researcher → HistoricalResearchReviewer (historical briefs) or HistoricalMigrationVerifier (movement); interpreter → InterpretationAgent; evidence auditor → NarrativeAuditor; AtlasPlanner → AtlasAgent; ImagePromptDesigner → HistoricalImageAgent. Do not implement duplicate roles under the old names.

## Scope and handoff discipline

Follow the phase gates in [ABOUT.md](docs/ABOUT.md). If the reference data or scientific validation is missing, report the raw branch as blocked/incomplete and ship only honestly labelled eligible paths. More credits are not scientific evidence. Deferred items include voiceover, G25 prediction, extra terrain, optional SAM, hosted export and hosted deployment.

This documentation pass ends after reconciliation, document indexing, ownership definitions and the dataset folder. Wait for the user's next task before starting the implementation plan.

## Test log

Append every test or validation check performed to the repository-root [log.txt](log.txt), including the command or method, result, date when known, relevant scope and any failure or skip. Preserve earlier entries; link to detailed QA artifacts when appropriate. Never record DNA calls, personal ancestry summaries, secrets or raw model payloads. Distinguish historical reports from checks actually rerun and never mark unperformed checks as passed.
