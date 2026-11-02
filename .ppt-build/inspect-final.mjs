import fs from 'node:fs/promises';
import {FileBlob,PresentationFile} from '@oai/artifact-tool';
const p=await PresentationFile.importPptx(await FileBlob.load('C:/Users/ait/FUZZY-QUEST/presentation-output/fuzzy-quest-amelioree.pptx'));
const root='C:/Users/ait/FUZZY-QUEST/.ppt-build/final-render';await fs.mkdir(root,{recursive:true});
for(let i=0;i<p.slides.items.length;i++){const b=await p.export({slide:p.slides.items[i],format:'png',scale:1});await fs.writeFile(`${root}/slide-${String(i+1).padStart(2,'0')}.png`,new Uint8Array(await b.arrayBuffer()))}
const x=await p.inspect({kind:'slide,textbox',maxChars:50000});for(const s of x.records.filter(r=>r.kind==='slide')){console.log(`SLIDE ${s.slideIndex+1} ${s.title||''}`);for(const t of x.records.filter(r=>r.kind==='textbox'&&r.slideIndex===s.slideIndex))console.log(`  ${t.text}`)}
