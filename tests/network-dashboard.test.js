import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { NETWORK_SECTIONS, allowedNetworkSections } from '../src/pages/network-navigation.js';

const src = name => readFileSync(new URL(name, import.meta.url), 'utf8');
const ids = network => allowedNetworkSections(network).map(section => section.id);

test('o catálogo de seções não repete identificadores', () => {
  assert.equal(new Set(NETWORK_SECTIONS.map(section => section.id)).size, NETWORK_SECTIONS.length);
  assert.equal(NETWORK_SECTIONS[0].id, 'resumo');
});

test('Master autorizado vê gestão comercial, convites, recursos e comissões', () => {
  const available = ids({ account: { distributionRole: 'master' }, policy: { canInvite: true, canSell: true } });
  for (const item of ['resumo','revendas','convites','hierarquia','permissoes','comissoes','licencas','assinatura']) assert.ok(available.includes(item), item);
});

test('permissões recusadas não aparecem no menu do Master', () => {
  const available = ids({ account: { distributionRole: 'master' }, policy: { canInvite: false, canSell: false } });
  assert.deepEqual(available, ['resumo','revendas','assinatura']);
});

test('revenda subordinada não recebe ferramentas de Master', () => {
  const available = ids({ account: { distributionRole: 'reseller' }, parent: {id: 'master-id'}, policy: {canInvite: true,canSell: true} });
  assert.deepEqual(available, ['resumo','licencas','assinatura']);
});

test('revenda independente não recebe ferramentas de negociação ou hierarquia', () => {
  assert.deepEqual(ids({ account: { distributionRole: 'reseller' }, parent: null }), ['resumo','assinatura']);
});

test('o painel geral encaminha /rede/* ao dashboard separado e permite voltar', () => {
  const shell=src('../src/Shell.jsx');
  assert.match(shell,/route\.startsWith\("rede\/"\)/);
  assert.match(shell,/if \(networkRoute\) return <Network/);
  const dashboard=src('../src/pages/Network.jsx');
  assert.match(dashboard,/go\("inicio"\)/);
  assert.match(dashboard,/aria-label="Seções da rede de revendas"/);
});

test('licenças são reutilizadas sem duplicar serviços de vendas', () => {
  const dashboard=src('../src/pages/Network.jsx');
  assert.match(dashboard,/import LicenseTrading from "\.\/LicenseTrading\.jsx"/);
  assert.match(dashboard,/<LicenseTrading go=\{go\}/);
  assert.match(dashboard,/go\?\.\('vender-licencas'\)/);
  assert.doesNotMatch(dashboard,/api\("\/partner\/network\/buy"/);
});

test('rotas de convites e hierarquia são alcançáveis pela pesquisa', () => {
  const search=src('../src/task-directory.js');
  assert.match(search,/rede\/convites/);
  assert.match(search,/rede\/hierarquia/);
  assert.match(src('../src/Shell.jsx'),/id\.startsWith\("rede\/"\)/);
  assert.ok(existsSync(new URL('../src/pages/network-dashboard.css',import.meta.url)));
});

test('dashboard usa apenas a política de navegação centralizada', () => {
  const dashboard = src('../src/pages/Network.jsx');
  assert.match(dashboard, /import\s*\{\s*allowedNetworkSections\s*\}\s*from\s*["']\.\/network-navigation\.js["']/);
  assert.doesNotMatch(dashboard, /(?:export\s+)?function\s+allowedNetworkSections\s*\(/);
  assert.doesNotMatch(dashboard, /\bNETWORK_SECTIONS\b/);
});

test('entrada do dashboard visível na página inicial e no menu rápido', () => {
  const home=src('../src/pages/Home.jsx');
  const shell=src('../src/Shell.jsx');
  assert.match(home, /data-network-dashboard-entry="true"/);
  assert.match(home, /onClick=\{\(\) => go\("rede"\)\}/);
  assert.match(shell, /label: "Gestão da rede"/);
  assert.match(shell, /label: "Acesso rápido", ids: \["clientes", "dispositivos", "rede"/);
  assert.match(src('../src/pages/Network.jsx'), /data-dashboard-version="2026-11-14\.2"/);
});
