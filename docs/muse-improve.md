# muse-improve — self-improvement loop

After every phase gate or feature in [ABOUT.md](ABOUT.md)'s plan, the build grades its own work with evidence before moving on. No score, no next phase. Fixture/sample content only — never raw genotype-derived frames, JSON, or logs.

## Paths

- Loop dir: `muse-loop/` (repo root)
- Screen captures: `muse-loop/qa-shots/<date>-<item>/`
- Logs: `muse-loop/qa-logs/<date>-<item>.md`
- Checksums: `muse-loop/qa-logs/SHA256SUMS-fixtures`
- Rollup: `muse-loop/qa-logs/ROLLUP.md`

## The loop (6 steps)

1. Build the item per its governing doc (design tokens, contracts, schemas).
2. Self-test: run the item's acceptance checks plus the phase gate.
3. Screen capture: capture the fixture reel/screens at key times (hook, method, one chapter, convergence, stamp; 390pt phone width + one desktop width).
4. Score 0-10 on the rubric. Be harsh: a compliance or privacy fail is an automatic 0.
5. Log: entry in `muse-loop/qa-logs/<date>-<item>.md` + checksums appended to the manifest. Template below.
6. Gate: >= 8.0 proceeds. < 8.0 patches once and re-scores. Two consecutive < 8.0 on the same item escalates to a Wonder research pass.

## Rubric (5 axes x 2 pts = 10)

- Works (2): acceptance criteria pass, error state survives, no dead spinner.
- Matches spec (2): tokens, type, timing, copy match the governing doc.
- Compliant (2): ancestry only, no health/trait/personality/politics/war, every claim cited, "consistent with" language. Violation = total 0.
- Clean (2): no genotype in logs or network (browser-only), cost logged, cache stated, no secrets, no console.log.
- Shippable (2): committed, clean-clone demo still green, limitations recorded honestly.

## Log template (`muse-loop/qa-logs/<date>-<item>.md`)

```
# <date> <item> — score X/10
Works: x/2. Spec: x/2. Compliant: x/2. Clean: x/2. Shippable: x/2.
Spec refs: <docs/lines>. Fixtures: <names>.
Shots: muse-loop/qa-shots/<date>-<item>/*.png
Manifest: sha256 lines appended to SHA256SUMS-fixtures.
Mistakes seen: <what the shots showed, plain words>
Fix applied: <patch or "none">
Cost: <calls x model, ~$>
Verdict: proceed | patch-and-rescore | escalate
```

Manifest: `cd muse-loop/qa-shots/<date>-<item> && shasum -a 256 *.png >> ../../qa-logs/SHA256SUMS-fixtures`.
Also checksum reel JSON / MP4 / bundles when the item produces them.

## Screen capture rules

- Fixtures only for model-vision scoring (A6). Raw-file frames never leave the browser.
- Watch for: text collisions, chip contrast, badge overlap at 390px, one idea per beat, stamp legibility.
- Keep mistakes: never delete a failing shot. Fixes get a `-fixed` suffix beside the original.

## Rollup (before submission)

One page in `muse-loop/qa-logs/ROLLUP.md`: items scored, mean score, top-3 recurring mistakes, what changed in prompts/specs because of them. Judging evidence that the output improved itself.
