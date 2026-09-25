import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        // Use jsdom's browser storage instead of Node's experimental localStorage.
        execArgv: ['--no-experimental-webstorage'],
        setupFiles: ['./src/test/setup.ts'],
        restoreMocks: true,
        testTimeout: 15000,
    },
});
