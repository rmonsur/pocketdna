"""Verify the encoded three-minute silent demo, then produce review artifacts."""
from pathlib import Path
import subprocess,json,hashlib
ROOT=Path(__file__).resolve().parent
video=ROOT/'pocketdna-hackathon-demo.mp4'
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-show_chapters','-of','json',str(video)]))
vs=[s for s in probe['streams'] if s['codec_type']=='video']; audio=[s for s in probe['streams'] if s['codec_type']=='audio']
assert len(vs)==1 and not audio, 'Expected one silent video stream'
s=vs[0]
assert s['width']==1920 and s['height']==1080
assert s['r_frame_rate']=='24/1' and int(s['nb_read_frames'])==4320
assert abs(float(probe['format']['duration'])-180)<.002
assert len(probe['chapters'])==14
subprocess.run(['ffmpeg','-v','error','-i',str(video),'-f','null','-'],check=True,stdout=subprocess.DEVNULL)
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(video),'-vf','fps=1/10,scale=480:270,tile=3x6','-frames:v','1',str(ROOT/'contact-sheet.jpg')],check=True)
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(video),'-frames:v','1',str(ROOT/'cover.jpg')],check=True)
h=hashlib.sha256()
with video.open('rb') as f:
 for block in iter(lambda:f.read(1048576),b''):h.update(block)
report={'status':'pass','duration_seconds':float(probe['format']['duration']),'width':1920,'height':1080,'fps':24,'decoded_frames':4320,'audio_streams':0,'chapters':14,'full_decode':'passed','sha256':h.hexdigest(),'source_video_teaser_seconds':[0,8],'source_video_showcase_seconds':[35,70],'voiceover':'not included; add later','visual_qa':'contact sheet and full-size preview frames inspected; see Source.md and Look.md'}
(ROOT/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
