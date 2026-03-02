import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { fileURLToPath } from 'url';
import { SERVICE_CONFIG } from './serviceConfig.js';

// Helper Logic for VBS Actions (Same as serviceRunner)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = app.isPackaged ? path.dirname(app.getPath('exe')) : path.resolve(__dirname, '../../');
const actionsDir = path.join(rootDir, 'usr', 'actions');

/**
 * Fungsi untuk melakukan hard restart Nginx (Stop lalu Start)
 * @param {import('electron-store')} store 
 * @param {string} binDir 
 */
export async function restartNginx(store, binDir) {
    const serviceId = 'nginx';
    const service = SERVICE_CONFIG[serviceId];
    const version = store.get(`appSettings.versionNginx`) || 'default';
    const cleanVersion = version.replace(/^v/, '');
    const subFolder = path.join(serviceId, `${serviceId}-${cleanVersion}`);
    const servicePath = path.join(binDir, subFolder);

    const findExe = (dir, target) => {
        if (!fs.existsSync(dir)) return null;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                const found = findExe(fullPath, target);
                if (found) return found;
            } else if (file === target) {
                return fullPath;
            }
        }
        return null;
    };

    const exePath = findExe(servicePath, path.basename(service.exe));
    if (!exePath) throw new Error('Binary Nginx tidak ditemukan');

    const nginxDir = path.dirname(exePath);
    const vbsPath = path.join(actionsDir, 'nginx.vbs');

    // 1. Matikan Paksa Nginx
    await new Promise((resolve) => {
        exec('taskkill /F /IM nginx.exe /T', () => resolve());
    });

    // 2. Beri jeda singkat agar port benar-benar dilepas oleh Windows
    await new Promise(r => setTimeout(r, 500));

    // 3. Jalankan kembali Nginx via VBS (Hidden Window)
    return new Promise((resolve, reject) => {
        exec(`cscript.exe //NoLogo "${vbsPath}" start "${exePath}"`, { cwd: nginxDir }, (error) => {
            if (error) reject(error);
            else resolve();
        });
    });
}
