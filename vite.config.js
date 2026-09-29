import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // API_URL (in .env or the shell) says where TradeTrackerBE is running.
  const { API_URL = 'http://127.0.0.1:4000' } = loadEnv(mode, process.cwd(), '');
  const proxy = { '/api': API_URL };

  return {
    plugins: [react()],
    server: { port: 5173, strictPort: true, proxy },
    preview: { port: 4173, proxy },
  };
});
