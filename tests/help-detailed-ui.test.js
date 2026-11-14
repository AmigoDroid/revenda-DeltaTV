import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from './read-source.js';
const read = p => readFileSync(new URL(p,import.meta.url),'utf8');
test('Central apresenta guia Roku e checklist com progresso persistido',()=>{
 const jsx=read('../src/HelpExperience.jsx'),css=read('../src/help-experience.css');
 for(const marker of ['roku-delta-qr','roku-delta-controle','roku-white-label-login','help16-checklist','help16-tv-preview','Marcar feita e continuar','saveProgress','Configurar TV'])assert.ok(jsx.includes(marker));
 assert.match(css,/help15-highlight/);assert.match(css,/pointer-events:none/);
 assert.doesNotMatch(jsx,/dangerouslySetInnerHTML|eval\(/);
});
