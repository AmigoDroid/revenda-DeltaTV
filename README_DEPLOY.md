# DeltaTV Revenda — standalone

Este diretório é independente do monorepo. Contém a biblioteca de UI em `vendor/deltatv-ui/` e o verificador em `scripts/verify-env.mjs`.

## Build em Linux

```bash
cd DeltaTV-revenda-standalone
printf 'VITE_API_URL=https://api.deltatv.com.br\n' > .env.production
npm install
npm run build
```

A compilação produz `dist/`, que deve ser testada em homologação antes de substituir o site de produção. Não copie `src/` como se fosse a pasta de arquivos estáticos; o Nginx deve servir a pasta `dist`.

Esta correção resolve caminhos da estrutura e leitura de `.env.production`; não certifica funcionamento completo de todos os recursos.
