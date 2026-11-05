# PocketDNA hackathon video

Final delivery: pocketdna-hackathon-demo.mp4 — exactly 180 seconds, 1920×1080, H.264, 24 fps, no audio track. Add your voiceover on a separate track; suggested timing is in VOICEOVER_CUES.md.

Editable scene: index.html, reel-clock.js, reel-clock.css, timeline.json and assets/. Open index.html?controls in a browser to scrub the HTML timing. The episode sections show a poster in this HTML preview; the final MP4 inserts the actual episode footage.

Rendering was done from the pocketdna repository with Node, Playwright Chromium and FFmpeg. render.mjs captures the HTML Reel clock at each frame. Source.md records the inputs and editorial choices; Look.md records the visual system and retiming approach. The completed edit contains an 8-second teaser and a 35-second uninterrupted source episode excerpt, both at original speed.

The original pitch files and screenshots are unchanged. The cropped result image removes identifying name/profile details. No artificial network-tab recording or evidence-drawer interaction was created.

To add voiceover later (from this directory, using an audio file of your own):

```sh
ffmpeg -i pocketdna-hackathon-demo.mp4 -i voiceover.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -af apad -t 180 pocketdna-hackathon-demo-vo.mp4
```
