import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const root='C:/Users/ait/FUZZY-QUEST';
const skill='C:/Users/ait/.codex/plugins/cache/openai-primary-runtime/presentations/26.1026.10807/skills/presentations';
const source=path.join(root,'fuzzy-quest.pptx');
const candidate=path.join(root,'.ppt-build','fuzzy-quest-amelioree-final-draft.pptx');
const finalPath=path.join(root,'presentation-output','fuzzy-quest-amelioree-final.pptx');
const sha=crypto.createHash('sha256').update(await fs.readFile(source)).digest('hex');
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const result=await finalizePresentation({workspaceDir:root,candidatePath:candidate,finalPath,pythonExecutable:'C:/Users/ait/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','9144000,5143500','--validate-bullet-geometry','--validate-heading-fit'],explicitTotalSlideCount:15,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[8],sourceTemplatePath:source,requiredTemplateReferenceSlides:[1,2,4],minimumTemplateCoverageRatio:0.8,fontPolicy:{basis:'reference',families:['Calibri'],referencePath:source,referenceSha256:sha},verifyArtifactToolImport:true,receiptPath:path.join(root,'.ppt-build','fuzzy-quest-amelioree-final-copy-validation.json')});
console.log(JSON.stringify({output:finalPath,result},null,2));





