import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';

// Dynamically determine server target (WSL IP on Windows if available)
let serverTarget = process.env.VITE_SERVER_URL || 'http://localhost:5000';
if (process.platform === 'win32' && !process.env.VITE_SERVER_URL) {
  try {
    const wslIp = execSync('wsl -d Ubuntu-24.04 -u root -- hostname -I', { timeout: 2000 })
      .toString()
      .trim()
      .split(' ')[0];
    if (wslIp) {
      serverTarget = `http://${wslIp}:5000`;
    }
  } catch {
    // Fallback to localhost:5000
  }
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: serverTarget,
        changeOrigin: true,
      },
    },
  },
});

