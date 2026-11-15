import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const get=path=>readFileSync(fileURLToPath(new URL(path,import.meta.url)),'utf8');
test('ativação é página própria no menu e não é um plano de cliente',()=>{
  const shell=get('../src/Shell.jsx');const clients=get('../src/pages/Customers3.jsx');
  assert.match(shell,/id: "ativar-tv", label: "Ativar TV"/);
  assert.match(shell,/go\("ativar-tv"\)/);
  assert.doesNotMatch(clients,/Plano comercial do cliente/);
  assert.doesNotMatch(clients,/Vincular TV existente ao plano/);
});
test('interface compartilhada oferece estoque, código e emissão direta autorizada',()=>{
  const component=get('../vendor/deltatv-ui/src/DeviceLicenseActivation.jsx');
  for (const route of ['/partner/stock/apply','/partner/license-activation/code','/partner/license-activation/direct'])
    assert.ok(component.includes(route));
  assert.ok(component.includes('enabled === true && authorization.value.eligible === true'));
  assert.match(component,/idempotencyKey: operationKey\.current/);
});
