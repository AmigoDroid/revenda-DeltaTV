import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../src/refresh.css", import.meta.url), "utf8");

test("listas não prendem o arrastar vertical no celular (overscroll-behavior: contain)", () => {
  // `contain` nos dois eixos em .table-wrap travava a rolagem da página com o dedo sobre a lista.
  assert.doesNotMatch(css, /\.table-wrap[^{}]*\{[^{}]*overscroll-behavior:\s*contain/);
  assert.match(css, /\.table-wrap[^{}]*\{[^{}]*overscroll-behavior-y:\s*auto/);
});

test("cartões de listagem no celular rolam junto com a página", () => {
  assert.match(css, /max-width:700px\)\{\.table-wrap\.labeled-table-wrap\{overflow:visible/);
});
