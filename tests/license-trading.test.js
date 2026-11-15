import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('Master vende licenças: rota está no menu e pesquisa',()=>{
 const nav=read('../src/Shell.jsx');
 const task=read('../src/task-directory.js');
 assert.match(nav,/id: "vender-licencas"/);
 assert.match(nav,/page: LicenseTrading/);
 assert.match(task,/Vender licenças como Master/);
});
test('Central distingue Pix, créditos e entrega direta',()=>{
 const page=read('../src/pages/LicenseTrading.jsx');
 for(const word of ['Pagamento Pix','Pagamento com créditos','Entregar licenças','payment']) assert.match(page,new RegExp(word));
 assert.match(page,/sessionStorage\.setItem/);
 assert.match(page,/license-deliveries\/by-key/);
});
test('Minha rede não duplica preços e compra de licenças',()=>{
 const network=read('../src/pages/Network.jsx');
 assert.doesNotMatch(network,/<h3>Preços para as minhas revendas<\/h3>/);
 assert.doesNotMatch(network,/<h3>Comprar com créditos \(opcional\)<\/h3>/);
 assert.match(network,/go\?\.\('vender-licencas'\)/);
});
