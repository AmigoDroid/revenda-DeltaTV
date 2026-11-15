import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {WORK_AREAS,LEGACY_CENTERS,findWorkArea,workAreaPath} from '../src/work-areas.js';
const source=file=>readFileSync(new URL(file,import.meta.url),'utf8');
test('menu interno das áreas não repete destinos e preserva todas as tarefas comerciais',()=>{
  const areas=Object.values(WORK_AREAS);assert.ok(areas.length>=5);
  const ids=areas.flatMap(a=>a.items.map(i=>i.id));assert.equal(ids.length,new Set(ids).size);
  for(const a of areas){assert.equal(findWorkArea(a.id),a);
    for(const item of a.items){assert.equal(findWorkArea(workAreaPath(a,item)),a);if(!item.id.startsWith('area/')) assert.equal(findWorkArea(item.id),null);assert.ok(item.page&&item.label&&item.description);}}
  const pages=areas.flatMap(a=>a.items.map(i=>i.page));
  for(const id of ['clientes','dispositivos','ativar-tv','estoque','licencas','vender-licencas','financeiro','creditos','pix-master','codigos','servidores','monitoramento'])assert.ok(pages.includes(id),id);
});
test('dashboard separado de rede não é substituído nem duplicado',()=>{
  const shell=source('../src/Shell.jsx');
  assert.match(shell,/if \(networkRoute\) return <Network/);
  assert.match(shell,/if \(workArea && hasAreaAccess\) return <WorkArea/);
  assert.match(shell,/items\.some\(n => n\.id === item\.page\)/);
  assert.match(shell,/renderPage=\{item=>\{/);
  assert.ok(existsSync(new URL('../src/workspace-dashboard.css',import.meta.url)));
});
test('ativação de TV permanece por licença, nunca exige selecionar plano comercial',()=>{
  assert.equal(findWorkArea('ativar-tv'),null);assert.equal(findWorkArea(workAreaPath(WORK_AREAS['area/licencas'],WORK_AREAS['area/licencas'].items[0])).id,'area/licencas');
  const clients=source('../src/pages/Customers3.jsx');
  assert.match(clients,/visibleTab = activeTab \|\| tab/);
  assert.match(clients,/!hideTabs &&/);
  assert.doesNotMatch(source('../src/work-areas.js'),/ativar ou vincular TV ao plano/i);
});
test('endereços antigos das centrais seguem válidos',()=>{
  assert.equal(LEGACY_CENTERS['central-pagamentos'],'area/financeiro');
  assert.equal(LEGACY_CENTERS['central-ativacao'],'area/licencas');
  assert.match(source('../src/Shell.jsx'),/LEGACY_CENTERS\[value\]/);
});
