import fs from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';import {FileBlob,PresentationFile} from '@oai/artifact-tool';
const root='C:/Users/ait/FUZZY-QUEST';const skill='C:/Users/ait/.codex/plugins/cache/openai-primary-runtime/presentations/26.1026.10807/skills/presentations';const input=path.join(root,'presentation-output','fuzzy-quest-amelioree-final.pptx');const draft=path.join(root,'.ppt-build','fuzzy-quest-amelioree-final-draft.pptx');
const p=await PresentationFile.importPptx(await FileBlob.load(input));const d=await p.inspect({kind:'slide,textbox',maxChars:80000});
function find(text){const x=d.records.find(r=>r.kind==='textbox'&&r.text?.includes(text));if(!x)throw new Error(`Missing ${text}`);return p.resolve(x.id)}
find('Quest For Truth').text='Questionnaires en ligne';
find('Introduction').text='Qu’est-ce que Fuzzy-Quest ?';
find('Un lien à partager aux participants des groups').text='Partagez le lien avec les membres du groupe ou diffusez le QR code lors d’un événement.';
find('Évolutive et comparée aux alternatives').text='Choix techniques et évolutions';
await(await PresentationFile.exportPptx(p)).save(draft);console.log(JSON.stringify({draft,slideCount:p.slides.items.length},null,2));
