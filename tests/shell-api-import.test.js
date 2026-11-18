import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const shell = readFileSync(new URL('../src/Shell.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('Shell importa API uma única vez e não oferece seletor de contas de terceiros', () => {
  const namedApiImports = [...shell.matchAll(/^import\s*\{([^}]+)\}\s*from\s*["']\.\/api\.js["'];?\s*$/gm)];
  assert.ok(namedApiImports.length > 0, 'Shell precisa importar api.js');
  const names = namedApiImports.flatMap(match => match[1].split(',').map(part => part.trim().split(/\s+as\s+/).at(-1)));
  assert.equal(names.filter(name => name === 'api').length, 1);
  assert.ok(names.includes('logout'));
  assert.doesNotMatch(shell, /<AdminPortalAccounts|import AdminPortalAccounts/);
  assert.doesNotMatch(app, /<AdminPortalAccounts|import AdminPortalAccounts/);
});
