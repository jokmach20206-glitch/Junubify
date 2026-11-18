import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin.html', import.meta.url)),
        adminConfirm: fileURLToPath(new URL('./admin-confirm.html', import.meta.url)),
        analytics: fileURLToPath(new URL('./analytics.html', import.meta.url)),
      },
    },
  },
  root: projectRoot,
});
