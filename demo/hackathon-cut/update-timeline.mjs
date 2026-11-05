import {readFileSync,writeFileSync} from 'node:fs';
const html=new URL('./index.html',import.meta.url);
const timeline=JSON.parse(readFileSync(new URL('./timeline.json',import.meta.url),'utf8'));
if(timeline[0].start!==0 || timeline.at(-1).end!==180)throw new Error('Timeline must cover 0–180 seconds');
for(let i=1;i<timeline.length;i++)if(timeline[i].start!==timeline[i-1].end)throw new Error('Timeline must be contiguous');
const text=readFileSync(html,'utf8');
const start=text.indexOf('const SCENES=');const end=text.indexOf(';\nlet active',start);
if(start<0||end<0)throw new Error('Scene table not found');
writeFileSync(html,text.slice(0,start)+'const SCENES='+JSON.stringify(timeline)+text.slice(end));
