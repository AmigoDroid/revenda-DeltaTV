import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = f => readFileSync(new URL(f, import.meta.url), 'utf8');
test('revenda exibe ajuda inclusive bloqueada, mantendo o tour entre telas', () => {
  const shell=read('../src/Shell.jsx'); const guide=read('../src/HelpExperience.jsx');
  assert.match(shell, /const ACCOUNT = \[/);
  assert.match(shell, /id: "ajuda"/);
  assert.match(shell, /HelpExperience screen=\{cur\.id\}/);
  assert.doesNotMatch(shell, /<main className="content" key=\{cur\.id\}/);
  assert.match(guide, /"\/partner\/help"/);
  assert.match(guide, /welcome-seen/);
  assert.doesNotMatch(guide, /dangerouslySetInnerHTML/);
});
