/**
 * Dev script: Runs Vite dev server + Electron together
 * - Vite serves React with HMR (Hot Module Replacement)
 * - Electron loads from Vite's dev server URL
 * - Auto-restarts Electron when main process files change
 * 
 * Usage: node dev.js
 */

import { spawn } from 'child_process';
import { createServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VITE_PORT = 5173;
const ELECTRON_MAIN = 'index.js';

// Files to watch for Electron restart
const WATCH_FILES = [
    'index.js',
    'src/backend/serviceRunner.js',
    'src/backend/serviceConfig.js',
    'src/backend/serviceStatus.js',
    'src/backend/serviceInstaller.js',
    'src/backend/webHandler.js',
];

let electronProcess = null;

function startElectron() {
    if (electronProcess) {
        // Kill previous Electron process
        electronProcess.kill('SIGTERM');
        electronProcess = null;
    }

    console.log('\x1b[36m[dev]\x1b[0m Starting Electron...');

    electronProcess = spawn('npx', ['electron', '.'], {
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            VITE_DEV_SERVER_URL: `http://localhost:${VITE_PORT}`,
        },
    });

    electronProcess.on('close', (code) => {
        if (code !== null) {
            console.log(`\x1b[36m[dev]\x1b[0m Electron exited with code ${code}`);
        }
    });
}

function watchMainProcess() {
    const debounceMap = new Map();

    for (const file of WATCH_FILES) {
        const fullPath = path.join(__dirname, file);
        if (!fs.existsSync(fullPath)) continue;

        fs.watch(fullPath, (eventType) => {
            if (eventType !== 'change') return;

            // Debounce: wait 500ms before restarting
            if (debounceMap.has(file)) {
                clearTimeout(debounceMap.get(file));
            }

            debounceMap.set(file, setTimeout(() => {
                console.log(`\x1b[33m[dev]\x1b[0m ${file} changed — restarting Electron...`);
                startElectron();
                debounceMap.delete(file);
            }, 500));
        });
    }

    console.log(`\x1b[36m[dev]\x1b[0m Watching ${WATCH_FILES.length} backend files for changes`);
}

async function main() {
    console.log('\x1b[36m[dev]\x1b[0m Starting Vite dev server...');

    // Start Vite dev server
    const server = await createServer({
        configFile: path.join(__dirname, 'vite.config.js'),
        server: {
            port: VITE_PORT,
            open: false, // Don't open browser, Electron will load it
        },
    });

    await server.listen();
    console.log(`\x1b[32m[dev]\x1b[0m Vite ready at http://localhost:${VITE_PORT}`);

    // Small delay to ensure Vite is fully ready
    await new Promise((r) => setTimeout(r, 500));

    // Start Electron
    startElectron();

    // Watch backend files for auto-restart
    watchMainProcess();

    // Graceful shutdown
    const cleanup = () => {
        console.log('\n\x1b[36m[dev]\x1b[0m Shutting down...');
        if (electronProcess) electronProcess.kill('SIGTERM');
        server.close();
        process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
}

main().catch((err) => {
    console.error('\x1b[31m[dev]\x1b[0m Error:', err);
    process.exit(1);
});
