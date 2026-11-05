import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {mkdirSync} from 'node:fs';
const root=resolve(fileURLToPath(new URL('.',import.meta.url))); 
const browser=await chromium.launch({headless:true,args:['--allow-file-access-from-files']});
const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:2});
await page.goto(pathToFileURL(`${root}/index.html`).href);
await page.evaluate(async()=>{await window.__ready();});
if(process.argv.includes('--preview')){
 for(const t of [0,16,29,43,62,78,96,103,114,127,158,169,178]){
  await page.evaluate(async t=>await window.__frame(t),t);
  await page.locator('#stage').screenshot({path:`${root}/preview/${t}.png`});
 }
}else{
 for(const [name,start,dur] of [['opening',0,30],['explain',38,82],['outro',155,25]]){
  const ff=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-vcodec','png','-r','24','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-r','24',`${root}/${name}.mp4`],{stdio:['pipe','inherit','inherit']});
  for(let f=0;f<dur*24;f++){
   await page.evaluate(async t=>await window.__frame(t),start+f/24);
   const buf=await page.screenshot({type:'png'});
   if(!ff.stdin.write(buf))await once(ff.stdin,'drain');
   if(f%240===0)process.stdout.write(`${name}: ${f/24}/${dur}s\n`);
  }
  ff.stdin.end();const [code]=await once(ff,'close');if(code)throw new Error(`ffmpeg ${code}`);
 }
}
await browser.close();
