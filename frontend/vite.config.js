import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    // Tauri expects a fixed port, fail if that port is not available
    server: {
        port: 5174,
        strictPort: true,
        host: true, // Listen on all addresses
    },
    // clearScreen: false is recommended for Tauri
    clearScreen: false,
});
