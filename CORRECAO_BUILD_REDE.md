# DeltaTV — Correção do build da Rede de Revendas

## Erro corrigido
`[vite:esbuild] The symbol "allowedNetworkSections" has already been declared`

Causa: `src/pages/Network.jsx` importava `allowedNetworkSections` de `network-navigation.js` e também a declarava no mesmo arquivo. Removida apenas a declaração local duplicada. A função centralizada em `network-navigation.js` continua responsável pela visibilidade das seções.

## Instalação na VPS (hotfix)

1. Faça backup do arquivo atual:

```bash
cd /var/www/revenda-DeltaTV
cp src/pages/Network.jsx src/pages/Network.jsx.bak.$(date +%Y%m%d-%H%M%S)
```

2. Envie e extraia `DeltaTV-rede-dashboard-fix-build.zip` nesta mesma pasta:

```bash
unzip -o DeltaTV-rede-dashboard-fix-build.zip
npm run build
```

O hotfix contém somente `src/pages/Network.jsx` e `tests/network-dashboard.test.js`, além deste documento. Não altera backend, banco, Nginx, arquivos `.env` ou biblioteca compartilhada.

## Verificações realizadas
- 33 testes `node --test` aprovados (estáticos e unitários); teste adicional previne a declaração duplicada.
- `node --check` de `network-navigation.js` aprovado.
- `Network.jsx` conferido: somente import e uso de `allowedNetworkSections`, sem declaração local.
- Build Vite completo não foi executado neste ambiente; rode `npm run build` na VPS.

Se a instalação tiver uma versão diferente do painel, compare `Network.jsx` antes de aplicar para não sobrescrever customizações.
