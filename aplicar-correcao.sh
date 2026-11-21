#!/bin/sh
# Execute na raiz do projeto Vite correspondente. Nao sobrescreve arquivos existentes.
set -eu
if [ ! -f package.json ] || [ ! -f vite.config.js ]; then
  echo 'ERRO: execute este script na raiz do projeto Vite (junto de package.json e vite.config.js).' >&2
  exit 1
fi
if [ ! -s src/EmergencyDns.jsx ]; then
  echo 'ERRO: arquivo src/EmergencyDns.jsx nao encontrado. Extraia o ZIP nesta pasta primeiro.' >&2
  exit 1
fi
if [ ! -f src/Shell.jsx ]; then
  echo 'ERRO: src/Shell.jsx nao encontrado. Nao alterei este import.' >&2
  exit 1
fi
if [ ! -f src/pages/Devices.jsx ]; then
  echo 'ERRO: src/pages/Devices.jsx nao encontrado. Nao alterei este import.' >&2
  exit 1
fi
if grep -q '@deltatv/ui/EmergencyDns' src/Shell.jsx; then
  sed -i 's|@deltatv/ui/EmergencyDns|./EmergencyDns.jsx|g' src/Shell.jsx
fi
if ! grep -q './EmergencyDns.jsx' src/Shell.jsx; then
  echo 'ERRO: import inesperado em src/Shell.jsx. Revise manualmente.' >&2
  exit 1
fi
if grep -q '@deltatv/ui/EmergencyDns' src/pages/Devices.jsx; then
  sed -i 's|@deltatv/ui/EmergencyDns|../EmergencyDns.jsx|g' src/pages/Devices.jsx
fi
if ! grep -q '../EmergencyDns.jsx' src/pages/Devices.jsx; then
  echo 'ERRO: import inesperado em src/pages/Devices.jsx. Revise manualmente.' >&2
  exit 1
fi
echo 'OK: componente em src/EmergencyDns.jsx e imports locais atualizados.'
