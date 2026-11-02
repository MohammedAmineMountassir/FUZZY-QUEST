import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {FileBlob,PresentationFile} from '@oai/artifact-tool';
const root='C:/Users/ait/FUZZY-QUEST';
const skill='C:/Users/ait/.codex/plugins/cache/openai-primary-runtime/presentations/26.1026.10807/skills/presentations';
const input=path.join(root,'presentation-output','fuzzy-quest-amelioree.pptx');
const draft=path.join(root,'.ppt-build','fuzzy-quest-amelioree-v2-draft.pptx');
const p=await PresentationFile.importPptx(await FileBlob.load(input));
const snap=await p.inspect({kind:'slide,textbox',maxChars:60000});
const ctx=snap.records.find(r=>r.kind==='textbox'&&r.text?.includes('Suivre la participation et consulter les réponses'));
if(!ctx)throw new Error('Context card not found');
const {makeNativeBulletParagraphs}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const shape=p.resolve(ctx.id);
shape.text=makeNativeBulletParagraphs([
 'Fuzzy-Quest est une plateforme web pour créer et diffuser des questionnaires.',
 'Elle aide les chercheurs à recueillir les réponses de leurs participants.',
 'Pour exprimer une réponse incertaine, indiquez un minimum, une valeur probable et un maximum.'
],{marginLeftPoints:18,hangingPoints:9,spaceAfterPoints:7});
shape.text.style={typeface:'Calibri',fontSize:18.67,color:'#212121',autoFit:'none'};
const latest=await p.inspect({kind:'slide,textbox',maxChars:80000});
// Update inherited slide-number placeholders after inserting the two new slides.
for(const r of latest.records.filter(x=>x.kind==='textbox'&&x.name==='Slide Number Placeholder 0')) {
  p.resolve(r.id).text=String(r.slideIndex+1);
}
function addText(slide,name,x,y,w,h,text,size,color,alignment='left'){
 const s=slide.shapes.add({geometry:'textbox',name,position:{left:x,top:y,width:w,height:h},fill:'none',line:{style:'solid',fill:'none',width:0}});
 s.text=text;s.text.style={fontSize:size,typeface:'Calibri',color,alignment,insets:0};return s;
}
const footer='FUZZY-QUEST · Quest For Truth';
for(const [idx,num] of [[2,3],[4,5]]) {
 const slide=p.slides.getItem(idx);
 addText(slide,`footer-brand-${num}`,48,509,320,16,footer,12,'#737F95');
 addText(slide,`footer-page-${num}`,864,499,48,29,String(num),13.33,'#737F95','right');
}
await (await PresentationFile.exportPptx(p)).save(draft);
console.log(JSON.stringify({draft,slideCount:p.slides.items.length,contextText:shape.text.toString?.()??'updated'},null,2));
