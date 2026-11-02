import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const root = 'C:/Users/ait/FUZZY-QUEST';
const skill = 'C:/Users/ait/.codex/plugins/cache/openai-primary-runtime/presentations/26.1026.10807/skills/presentations';
const source = path.join(root, 'fuzzy-quest.pptx');
const draft = path.join(root, '.ppt-build', 'fuzzy-quest-amelioree-draft.pptx');
const output = path.join(root, 'presentation-output', 'fuzzy-quest-amelioree.pptx');
await fs.mkdir(path.dirname(draft), {recursive:true});
await fs.mkdir(path.dirname(output), {recursive:true});
const p = await PresentationFile.importPptx(await FileBlob.load(source));
const original = await p.inspect({kind:'slide,textbox',maxChars:60000});
const titleByText = (value) => {
  const rec = original.records.find(r=>r.kind==='textbox' && r.text?.includes(value));
  if(!rec) throw new Error(`Missing expected text: ${value}`);
  return p.resolve(rec.id);
};
// Clarify the platform's purpose while preserving the original title and card style.
titleByText('Saisir ses questions rapidement').text = 'Créer un questionnaire pour une étude';
titleByText('Livrer un logiciel que le LIMOS peut maintenir').text = 'Suivre la participation et consulter les réponses';

const contentLayout = p.layouts.items.find(x=>x.name==='Contenu');
if(!contentLayout) throw new Error('Contenu layout missing');
const accessSlide = p.slides.items.find((slide,i)=>{
  const rec = original.records.find(r=>r.kind==='slide'&&r.slideIndex===i);
  return rec?.title==='Accès à la plateforme';
});
const introSlide = p.slides.items.find((slide,i)=>{
  const rec = original.records.find(r=>r.kind==='slide'&&r.slideIndex===i);
  return rec?.title==='Introduction';
});
if(!introSlide||!accessSlide) throw new Error('Expected slides missing');
const workflow = p.slides.insert({after:introSlide,layoutId:contentLayout.id}).slide;
const devices = p.slides.insert({after:accessSlide,layoutId:contentLayout.id}).slide;

const C={purple:'#5145CD',pink:'#D6479A',pale:'#F1EFFC',dark:'#212121',muted:'#737F95',white:'#FFFFFF',border:'#D9D5F2'};
function addShape(slide,{name,geometry='textbox',x,y,w,h,fill='none',stroke='none',sw=0,text='',size=18.67,color=C.dark,bold=false,align='left',valign='top',radius}) {
 const s=slide.shapes.add({geometry,name,position:{left:x,top:y,width:w,height:h},fill,line:{style:'solid',fill:stroke,width:sw},...(radius?{borderRadius:radius}:{})});
 if(text){s.text=text;s.text.style={fontSize:size,typeface:'Calibri',color,bold,alignment:align,verticalAlignment:valign,insets:0};}
 return s;
}
function header(slide,title){
 addShape(slide,{name:'title',x:72,y:28.8,w:835.2,h:62.4,text:title,size:37.33,color:C.purple,bold:true});
}
header(workflow,'Fuzzy-Quest, de la question au résultat');
addShape(workflow,{name:'workflow-intro',x:48,y:104,w:860,h:43,text:'La plateforme accompagne le chercheur depuis la création de son étude jusqu’au suivi des réponses.',size:18.67,color:C.dark});
const steps=[
 ['Créer','Le chercheur rédige les questions et choisit les formats de réponse.'],
 ['Diffuser','Il partage un lien ou un QR code, ou affecte l’étude à un groupe.'],
 ['Répondre','Les participants ouvrent le questionnaire et transmettent leurs réponses.'],
 ['Suivre','Le chercheur suit la participation et consulte les réponses recueillies.'],
];
const xs=[48,269,490,711];
steps.forEach(([label,desc],i)=>{
 const x=xs[i];
 addShape(workflow,{name:`step-${i+1}-card`,geometry:'roundRect',x,y:160,w:202,h:239,fill:C.pale,stroke:C.pale,sw:1,radius:14});
 addShape(workflow,{name:`step-${i+1}-number-bg`,geometry:'ellipse',x:x+18,y:179,w:42,h:42,fill:i%2?C.pink:C.purple,stroke:'none'});
 addShape(workflow,{name:`step-${i+1}-number`,x:x+18,y:180,w:42,h:40,text:String(i+1),size:20,color:C.white,bold:true,align:'center',valign:'middle'});
 addShape(workflow,{name:`step-${i+1}-title`,x:x+18,y:240,w:168,h:34,text:label,size:23,color:C.purple,bold:true});
 addShape(workflow,{name:`step-${i+1}-desc`,x:x+18,y:287,w:166,h:96,text:desc,size:17.5,color:C.dark});
});
addShape(workflow,{name:'fuzzy-definition-band',geometry:'roundRect',x:48,y:426,w:864,h:57,fill:C.pale,stroke:C.pale,sw:1,radius:10});
addShape(workflow,{name:'fuzzy-definition',x:67,y:437,w:828,h:38,text:'Réponse floue : une estimation exprimée par trois valeurs — minimum, la plus probable et maximum.',size:17.2,color:C.purple,bold:true,valign:'middle'});

header(devices,'La plateforme sur ordinateur et téléphone');
addShape(devices,{name:'desktop-label',x:55,y:119,w:556,h:28,text:'ORDINATEUR',size:18.67,color:C.purple,bold:true,align:'center'});
addShape(devices,{name:'phone-label',x:674,y:119,w:198,h:28,text:'TÉLÉPHONE',size:18.67,color:C.pink,bold:true,align:'center'});
// Desktop device frame with a replaceable screenshot area.
addShape(devices,{name:'desktop-monitor',geometry:'roundRect',x:53,y:153,w:560,h:284,fill:C.purple,stroke:C.purple,sw:1,radius:13});
addShape(devices,{name:'desktop-screen',geometry:'rect',x:67,y:167,w:532,h:255,fill:C.white,stroke:C.white,sw:1});
addShape(devices,{name:'desktop-placeholder-border',geometry:'roundRect',x:82,y:182,w:502,h:224,fill:C.pale,stroke:'#BDB7EB',sw:1.3,radius:5});
addShape(devices,{name:'desktop-placeholder-title',x:105,y:251,w:456,h:38,text:'CAPTURE DU SITE À AJOUTER',size:22,color:C.purple,bold:true,align:'center',valign:'middle'});
addShape(devices,{name:'desktop-placeholder-subtitle',x:105,y:296,w:456,h:52,text:'Ex. tableau de bord ou création d’un questionnaire',size:16,color:C.muted,align:'center',valign:'middle'});
addShape(devices,{name:'desktop-neck',geometry:'rect',x:292,y:437,w:82,h:24,fill:C.purple,stroke:C.purple,sw:1});
addShape(devices,{name:'desktop-stand',geometry:'roundRect',x:251,y:459,w:164,h:12,fill:C.purple,stroke:C.purple,sw:1,radius:6});
// Mobile device frame with a separate replaceable vertical screenshot area.
addShape(devices,{name:'phone-body',geometry:'roundRect',x:687,y:151,w:174,h:322,fill:C.purple,stroke:C.purple,sw:1,radius:25});
addShape(devices,{name:'phone-screen',geometry:'roundRect',x:699,y:169,w:150,h:286,fill:C.white,stroke:C.white,sw:1,radius:15});
addShape(devices,{name:'phone-placeholder',geometry:'roundRect',x:710,y:190,w:128,h:246,fill:C.pale,stroke:'#BDB7EB',sw:1.2,radius:7});
addShape(devices,{name:'phone-placeholder-title',x:720,y:254,w:108,h:92,text:'CAPTURE\nMOBILE\nÀ AJOUTER',size:17,color:C.pink,bold:true,align:'center',valign:'middle'});
addShape(devices,{name:'phone-speaker',geometry:'roundRect',x:745,y:159,w:57,h:5,fill:C.white,stroke:C.white,sw:1,radius:3});
addShape(devices,{name:'device-caption',x:70,y:490,w:820,h:26,text:'Ajoutez ici deux captures du site : une vue ordinateur et la vue adaptée au téléphone.',size:16,color:C.muted,align:'center'});

// Export a review draft and previews before final validation.
await fs.mkdir(path.join(root,'.ppt-build','review'),{recursive:true});
for(let i=0;i<p.slides.items.length;i++){
 const blob=await p.export({slide:p.slides.items[i],format:'png',scale:1});
 await fs.writeFile(path.join(root,'.ppt-build','review',`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await blob.arrayBuffer()));
}
await (await PresentationFile.exportPptx(p)).save(draft);
const sha=crypto.createHash('sha256').update(await fs.readFile(source)).digest('hex');
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const result=await finalizePresentation({workspaceDir:root,candidatePath:draft,finalPath:output,pythonExecutable:'C:/Users/ait/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','9144000,5143500','--validate-bullet-geometry','--validate-heading-fit'],explicitTotalSlideCount:15,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],sourceTemplatePath:source,requiredTemplateReferenceSlides:[1,2,3],minimumTemplateCoverageRatio:0.85,fontPolicy:{basis:'reference',families:['Calibri'],referencePath:source,referenceSha256:sha},verifyArtifactToolImport:true,receiptPath:path.join(root,'.ppt-build','fuzzy-quest-amelioree-validation.json')});
console.log(JSON.stringify({slides:p.slides.items.length,output,validation:result},null,2));


