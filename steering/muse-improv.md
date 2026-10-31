# muse-improv (self-improvement loop)

After every CHECKLIST.md item, Muse Code grades its own work with evidence before committing.
No score, no commit. Fixture/sample content only — never Tier 2 genotype-derived frames, JSON, or logs touch hosted vision QA or leave Modal.

## Paths

- Loop dir (absolute): /Users/reshadmonsur/Documents/Git/hackathon/pocketdna/muse-loop
- Loop dir (repo-relative): muse-loop/
- Screenshots: muse-loop/qa-shots/<date>-<item>/
- Logs: muse-loop/qa-logs/<date>-<item>.md
- Rollup: muse-loop/qa-logs/ROLLUP.md

## The loop (6 steps, ~10 min)

1. Build the item per spec (CHECKLIST + UI-COMPONENTS + DESIGN tokens).
2. Self-test: run the item's acceptance criteria + its non-negotiable tests (RULES.md).
3. Screenshot: Playwright 390x844 fixture reel at 5 timestamps (B1 hook, B2 method, one era, B6 convergence, B7 stamp). Save PNGs to `muse-loop/qa-shots/<date>-<item>/`.
4. Score 0-10 on the rubric below. Be harsh: a fail on banned content or privacy is an automatic 0.
5. Log: append entry to `muse-loop/qa-logs/<date>-<item>.md` + checksums to its manifest. Template below.
6. Gate: >= 8.0 commits with log link in message. < 8.0 patches once and re-scores. Two consecutive < 8.0 on the same item escalates Spark -> Wonder.

## Rubric (5 axes x 2 pts = 10)

- Works (2): acceptance criteria pass on device, error case survives, no dead spinner.
- Matches spec (2): tokens, type, spacing, motion, copy match DESIGN/UI-COMPONENTS; A6 visual QA >= 8.0 on fixtures.
- Compliant (2): ancestry only, no health/trait/personality/politics/war, every claim cited, "consistent with" language. Violation = total 0.
- Clean (2): no genotype in logs, no hosted call in Tier 2 path, cost logged, dev cache hit, no secrets, no console.log.
- Shippable (2): committed conventionally, CHECKLIST.md checked with date, demo path still green.

## Log template (`muse-loop/qa-logs/<date>-<item>.md`)

```
# <date> <checklist-item> — score X/10
Works: x/2. Spec: x/2. Compliant: x/2. Clean: x/2. Shippable: x/2.
Spec refs: <files/lines>. Fixtures: <names>.
Shots: muse-loop/qa-shots/<date>-<item>/{b1,b2,era,b6,b7}.png
Manifest: sha256 lines below.
Mistakes seen: <what the screenshots showed, plain words>
Fix applied: <patch or "none">
Cost: <calls x model, ~$>
Verdict: commit | patch-and-rescore | escalate-to-wonder
```

Manifest: `cd muse-loop/qa-shots/<date>-<item> && shasum -a 256 *.png > SHA256SUMS && cat SHA256SUMS >> ../../qa-logs/<date>-<item>.md`.
Also checksum the reel JSON + MP4 when the item produces them: `shasum -a 256 reel.json reel.mp4`.

## Screenshot rules

- Fixture reels only for Spark vision scoring (A6). Per-user Tier 2 frames stay on open weights.
- What to look for: text collisions, chip contrast, badge overlap at 390px, one-idea-per-beat, stamp/QR legibility.
- Keep mistakes: never delete a failing shot. Fixed shots get `-fixed` suffix next to the original.

## Weekly rollup (Nov 3)

One page in `muse-loop/qa-logs/ROLLUP.md`: items scored, mean score, top-3 recurring mistakes, what changed in prompts/specs because of them. This is judging evidence that Muse improved its own output.
