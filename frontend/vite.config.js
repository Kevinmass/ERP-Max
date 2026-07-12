import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    // Tauri expects a fixed port, fail if that port is not available
    server: {
        port: 5174,
        strictPort: true,
        host: '127.0.0.1', // IPv4 loopback: the Tauri WebView2 window dials 127.0.0.1, so bind there
    },
    // clearScreen: false is recommended for Tauri
    clearScreen: false,
});
