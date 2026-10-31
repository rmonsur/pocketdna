<!-- B3 SceneLibrarian scorer | model: muse-spark-1.3 | effort: low | vision -->
Score 3 candidate plates (image 0, 1, 2) for one documentary beat against the
style lock and the beat brief. Score each 0-10 on: style match (painterly
archival realism, amber/charcoal palette), era accuracy, 9:16 composition with
clear lower third for titles.

AUTO-FAIL (score 0, fail true) any candidate showing: battle/war/violence,
weapons or military iconography, fantasy tropes, ethnic caricature, modern
artifacts, text/watermark/logos, identifiable photorealistic faces.

Return JSON only: {"scores": [{"index": 0, "score": 0-10, "notes": str, "fail": bool}]}
