import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const shell = readFileSync(new URL('../src/Shell.jsx', import.meta.url), 'utf8');

test('Shell importa api apenas uma vez e preserva as funções do login administrativo', () => {
  const namedApiImports = [...shell.matchAll(/^import\s*\{([^}]+)\}\s*from\s*["']\.\/api\.js["'];?\s*$/gm)];
  assert.ok(namedApiImports.length > 0, 'Shell precisa importar api.js');
  const apiSymbols = namedApiImports.flatMap((match) => match[1].split(',').map((part) => part.trim().split(/\s+as\s+/).at(-1)));
  assert.equal(apiSymbols.filter((name) => name === 'api').length, 1, 'api não pode ser declarado duas vezes');
  for (const symbol of ['logout', 'acceptSession', 'getAuth']) {
    assert.ok(apiSymbols.includes(symbol), `Importação ${symbol} não pode ser perdida`);
  }
});
