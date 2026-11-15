# Hotfix: Gestão da Rede — acesso visível e roteamento (14/11/2026)

## Problema
O pacote anterior `DeltaTV-rede-dashboard-fix-build.zip` continha **somente** `src/pages/Network.jsx` e um teste. Ele removia o erro de compilação, mas não garantia que a atualização de `src/Shell.jsx` (a entrada para o dashboard separado), a navegação e o CSS tivessem sido instalados. Além disso, a página inicial da Revenda não tinha um botão próprio para abrir o novo dashboard.

## Alterações deste pacote
- `src/Shell.jsx`: item **Gestão da rede** na seção **Acesso rápido** e rota `#/rede` abrindo o painel separado.
- `src/pages/Home.jsx`: botão visível **Abrir dashboard da rede** para contas com acesso à Revenda.
- `src/pages/Network.jsx`: menu exclusivo, abas/áreas por recurso, marcador interno de versão `data-dashboard-version="2026-11-14.2"`.
- `src/pages/network-navigation.js`, `src/pages/network-dashboard.css`: regras da navegação e visual do novo painel.
- `src/pages/LicenseTrading.jsx` e `src/pages/license-trading.css`: mesmo fluxo comercial já existente, reutilizado pela área Licenças da rede.
- `src/task-directory.js`: atalhos da pesquisa para a rede.
- `tests/network-dashboard.test.js`: teste de regressão e de acesso.

Nenhum backend ou banco é modificado. O dashboard é uma rota específica da Revenda, **não** substitui a tela inicial do portal.

## Instalação segura
1. Faça backup:

```bash
cd /var/www
cp -a revenda-DeltaTV "revenda-DeltaTV.backup-$(date +%Y%m%d-%H%M%S)"
```

2. Envie o ZIP a `/var/www/revenda-DeltaTV` e execute:

```bash
cd /var/www/revenda-DeltaTV
unzip -o DeltaTV-rede-dashboard-entrada-corrigida.zip
npm run build
npm test
```

3. Confirme se o código correto está publicado:

```bash
grep -n 'if (networkRoute) return <Network' src/Shell.jsx
grep -n 'data-network-dashboard-entry' src/pages/Home.jsx
grep -R -l 'rede-v3' dist/assets | head -5
```

4. No navegador, acesse **https://revenda.deltatv.com.br/#/rede** com a conta autenticada e autorizada. Você deve ver o menu **Gestão da Rede** e o botão **Sair da rede**, não a sidebar da Revenda normal.

5. Se a pasta `dist/assets` contiver `rede-v3` mas o site não mostrar o novo dashboard, confirme se o Nginx realmente serve `/var/www/revenda-DeltaTV/dist` e se há cache HTTP/Cloudflare/navegador. `sudo nginx -T` permite conferir a diretiva `root` do `server_name` correspondente.

## Validações realizadas neste ambiente
- 34 testes Node passaram.
- Parsing estático de Shell, Network, Home, navegação e busca passou.
- **Build Vite completo não foi executado neste ambiente**, porque as dependências `node_modules` não estão instaladas. Teste o build na VPS antes de publicar.
