import fs from 'node:fs/promises';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';
const p = await PresentationFile.importPptx(await FileBlob.load('C:/Users/ait/FUZZY-QUEST/fuzzy-quest.pptx'));
const d = await p.inspect({kind:'slide,textbox,notes',maxChars:100000});
for(const s of d.records.filter(x=>x.kind==='slide')) { console.log(`\n=== SLIDE ${s.slideIndex+1}: ${s.title||''} ===`); for(const x of d.records.filter(y=>y.slideIndex===s.slideIndex&&y.kind==='textbox')) console.log(x.text); }
