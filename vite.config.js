import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const sharedUiPath = fileURLToPath(new URL('../shared/ui/src', import.meta.url));
const appearancePath = fileURLToPath(new URL('../shared/ui/src/appearance-screen-settings.js', import.meta.url));
export default defineConfig({plugins:[react()],resolve:{alias:[
 {find:/^react$/,replacement:fileURLToPath(new URL('./node_modules/react/index.js',import.meta.url))},
 {find:/^react-dom$/,replacement:fileURLToPath(new URL('./node_modules/react-dom/index.js',import.meta.url))},
 {find:/^react\/jsx-runtime$/,replacement:fileURLToPath(new URL('./node_modules/react/jsx-runtime.js',import.meta.url))},
 {find:/^@deltatv\/ui\/appearance$/,replacement:appearancePath},
 {find:/^@deltatv\/ui(?=\/|$)/,replacement:sharedUiPath},
],dedupe:['react','react-dom']}});
