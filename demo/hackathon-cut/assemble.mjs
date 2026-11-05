import {spawnSync} from 'node:child_process';
import {writeFileSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
const source=process.argv[2] ?? resolve(root,'assets/source-episode.mp4');
function run(args){const r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{stdio:'inherit'});if(r.status)throw new Error(`ffmpeg ${r.status}`);}
for(const [name,start,duration] of [['teaser',0,8],['showcase',35,35]])run(['-ss',`${start}`,'-i',source,'-t',`${duration}`,'-an','-vf','fps=24,scale=1920:1080','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',resolve(root,`${name}.mp4`)]);
run(['-loop','1','-framerate','24','-i',resolve(root,'assets/evidence-card.png'),'-t','10','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',resolve(root,'evidence.mp4')]);
run(['-ss','10','-i',resolve(root,'outro.mp4'),'-t','15','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',resolve(root,'ending.mp4')]);
writeFileSync(resolve(root,'concat.txt'),['opening','teaser','explain','showcase','evidence','ending'].map(n=>`file '${resolve(root,`${n}.mp4`)}'`).join('\n'));
run(['-f','concat','-safe','0','-i',resolve(root,'concat.txt'),'-c','copy','-an','-movflags','+faststart',resolve(root,'assembled.mp4')]);
const timeline=JSON.parse(readFileSync(resolve(root,'timeline.json'),'utf8'));
const metadata=';FFMETADATA1\ntitle=PocketDNA — Hackathon Demo\ncomment=Silent edit; voiceover to be recorded later.\n'+timeline.map((s,i)=>`[CHAPTER]\nTIMEBASE=1/1000\nSTART=${s.start*1000}\nEND=${s.end*1000}\ntitle=${(s.title||'Episode showcase').replaceAll('\n',' ')}\n`).join('');
writeFileSync(resolve(root,'chapters.ffmeta'),metadata);
run(['-i',resolve(root,'assembled.mp4'),'-i',resolve(root,'chapters.ffmeta'),'-map_metadata','1','-map_chapters','1','-c','copy','-an','-movflags','+faststart',resolve(root,'pocketdna-hackathon-demo.mp4')]);
