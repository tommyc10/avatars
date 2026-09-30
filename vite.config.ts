import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: { port: Number(process.env.PORT) || 5182, strictPort: false },
  plugins: [react()],
});
