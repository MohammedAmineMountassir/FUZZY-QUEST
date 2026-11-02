import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {FileBlob,PresentationFile} from '@oai/artifact-tool';
const root='C:/Users/ait/FUZZY-QUEST';
const input=path.join(root,'fuzzy-quest.pptx');
const draft=path.join(root,'.ppt-build','participant-slide9-draft.pptx');
const p=await PresentationFile.importPptx(await FileBlob.load(input));
if(p.slides.items.length!==15)throw new Error(`Expected 15 slides, got ${p.slides.items.length}`);
const d=await p.inspect({kind:'slide,textbox,image',maxChars:50000});
const targetSlide=d.records.find(r=>r.kind==='slide'&&r.slideIndex===8&&r.title==='Participant');
if(!targetSlide)throw new Error('Slide 9 Participant not found');
const slide=p.resolve(targetSlide.id);
const byName=(name)=>{const r=d.records.find(x=>x.kind==='image'&&x.slideIndex===8&&x.name===name);if(!r)throw new Error(`Missing source screenshot ${name}`);return p.resolve(r.id)};
const title=d.records.find(r=>r.kind==='textbox'&&r.slideIndex===8&&r.text==='Participant');
const page=d.records.find(r=>r.kind==='textbox'&&r.slideIndex===8&&r.name==='Slide Number Placeholder 0');
p.resolve(title.id).text='Le parcours du participant';
p.resolve(page.id).text='9';
const subtitle=slide.shapes.add({geometry:'textbox',name:'participant-summary',position:{left:48,top:99,width:864,height:38},fill:'none',line:{style:'solid',fill:'none',width:0}});
subtitle.text='Une étude s’ouvre depuis l’espace public ou par un lien reçu. Ensuite, le participant répond directement en ligne.';
subtitle.text.style={fontSize:18.67,typeface:'Calibri',color:'#212121',insets:0};
const screens=[
 {name:'Image 13',frame:{left:62,top:151,width:260,height:157},fit:'contain'},
 {name:'Image 17',frame:{left:350,top:151,width:260,height:157},fit:'contain'},
 {name:'Image 15',frame:{left:638,top:151,width:260,height:157},fit:'contain'},
];
for(const spec of screens){const img=byName(spec.name);img.frame=spec.frame;img.fit=spec.fit;img.alt=spec.name==='Image 13'?'Liste des questionnaires publics':spec.name==='Image 17'?'Invitation par e-mail avec un lien vers le questionnaire':'Formulaire de réponse du participant';}
const columns=[
 {x:48,title:'Étude publique',color:'#5145CD',body:'Le participant choisit un questionnaire dans la liste des études ouvertes.'},
 {x:348,title:'Invitation par e-mail',color:'#D6479A',body:'Il ouvre le lien reçu, qui le conduit directement au questionnaire.'},
 {x:648,title:'Répondre et envoyer',color:'#5145CD',body:'Il peut rester anonyme ou s’identifier, puis envoyer ses réponses.'},
];
for(let i=0;i<columns.length;i++){
 const c=columns[i];
 const h=slide.shapes.add({geometry:'textbox',name:`participant-step-${i+1}-title`,position:{left:c.x,top:324,width:264,height:31},fill:'none',line:{style:'solid',fill:'none',width:0}});
 h.text=c.title;h.text.style={fontSize:20,typeface:'Calibri',color:c.color,bold:true,insets:0};
 const b=slide.shapes.add({geometry:'textbox',name:`participant-step-${i+1}-description`,position:{left:c.x,top:362,width:264,height:72},fill:'none',line:{style:'solid',fill:'none',width:0}});
 b.text=c.body;b.text.style={fontSize:16.67,typeface:'Calibri',color:'#212121',insets:0};
}
await(await PresentationFile.exportPptx(p)).save(draft);
console.log(JSON.stringify({draft,slides:p.slides.items.length,slide9:{title:'Le parcours du participant',screens:screens.length}},null,2));
