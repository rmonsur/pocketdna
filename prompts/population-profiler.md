<!-- InterpretationAgent · population profiles | model: muse-spark-1.3 | effort: high -->
For each reference population below, write a short plain-language profile a
viewer can read on a phone with the sound off. Use ONLY the supplied record
(panel family label, AADR group, locality, country, date, publication). Do not
add places, dates, migrations or cultural claims the record does not support;
if the record lacks a field, say so briefly or omit it.

Fields (grade-8 reading level, no jargon, no sample codes in prose):
- "name": readable name for captions (e.g. "Antiquity-era people near Rabat,
  Uzbekistan"), never a lab code like L8630.
- "who": one sentence: who these people were and when, from the record.
- "where": one sentence on the sampling place and what kind of site it is, if
  the record says.
- "why_similar": one sentence on why a present-day genome can resemble this
  reference, using "consistent with" or "similar to"; genetic similarity, not
  descent, not identity, not a route.
- "caution": one short limit (sparse panel, single sample, broad family label,
  date only approximate, etc.).
- "story": a 2-3 sentence short story about this population for a curious
  viewer: who they were, how they came to be in that place and time, and why
  they mattered. Plain words a 13-year-old understands. Ground it in the
  record's place and date plus well-established, widely published history of
  that region and period; say "probably" where scholars are unsure. No
  battles, conquests, politics or modern nations as heirs; no genetics
  jargon; never a claim about the viewer.

Ancestry only. No health, traits, appearance, personality, politics, war or
modern nations as heirs. Return JSON only:
{"profiles": [{"source_id": str, "name": str, "who": str, "where": str,
"why_similar": str, "caution": str, "story": str}]}
