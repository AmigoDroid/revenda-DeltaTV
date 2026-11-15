import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL(f,import.meta.url),'utf8');

test('Revenda: menu lateral único e direto, sem sub-dashboards', () => {
  const shell = read('../src/Shell.jsx');
  assert.doesNotMatch(shell, /import WorkArea/);
  assert.doesNotMatch(shell, /Dashboards/);
  assert.doesNotMatch(shell, /sidebar-all-functions/);
  assert.match(shell, /GROUPS\.map\(renderMenuGroup\)/);
});

test('Revenda: início mostra todas as funções permitidas e abre direto', () => {
  const shell = read('../src/Shell.jsx');
  const home = read('../src/pages/Home.jsx');
  assert.match(shell, /<Page go=\{go\} user=\{user\} menu=\{homeGroups\} \/>/);
  assert.match(home, /<AllFunctions groups=\{menu\} onNavigate=\{go\}/);
  assert.doesNotMatch(home, /area\/clientes/);
});
