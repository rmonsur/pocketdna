"""Copy the verified hackathon cut and editable sources to the requested folder."""
from pathlib import Path
import shutil
import json

ROOT=Path(__file__).resolve().parent
TARGET=Path('/Users/reshadmonsur/Documents/Git/hackathon/pocketdnafinal')
report=json.loads((ROOT/'verification.json').read_text())
if report.get('status')!='pass':raise SystemExit('Final export has not passed verification')
TARGET.mkdir(parents=True,exist_ok=True)
for name in ('pocketdna-hackathon-demo.mp4','VOICEOVER_CUES.md','cover.jpg','contact-sheet.jpg','verification.json'):
    shutil.copy2(ROOT/name,TARGET/name)
source=TARGET/'demo-edit';source.mkdir(exist_ok=True)
for name in ('index.html','reel-clock.js','reel-clock.css','timeline.json','render.mjs','assemble.mjs','update-timeline.mjs','package.json','README.md','Source.md','Look.md','VOICEOVER_CUES.md'):
    shutil.copy2(ROOT/name,source/name)
assets=source/'assets';assets.mkdir(exist_ok=True)
for file in (ROOT/'assets').iterdir():
    if file.name in ('screen-0.png','screen-4.png'):continue
    shutil.copy2(file,assets/file.name)
shutil.copy2(ROOT.parent/'pocketdna-live-episode.mp4',assets/'source-episode.mp4')
print(TARGET/'pocketdna-hackathon-demo.mp4')
