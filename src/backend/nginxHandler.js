import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { restartNginx } from './nginxUtils.js';

/**
 * Daftarkan handler IPC terkait Nginx
 * @param {import('electron').IpcMain} ipcMain 
 * @param {import('electron-store')} store
 * @param {string} configDir 
 * @param {string} binDir
 */
export function registerNginxHandler(ipcMain, store, configDir, binDir) {
    ipcMain.handle('create-nginx-config', async (event, { filename, content, projectPath, domain }) => {
        // 1. Pastikan direktori root project ada
        if (projectPath && !fs.existsSync(projectPath)) {
            try {
                fs.mkdirSync(projectPath, { recursive: true });
            } catch (e) {
                console.error('Error creating project directory:', e);
                return { success: false, error: `Gagal membuat folder project: ${e.message}` };
            }
        }

        // 2. Perbarui file Hosts Windows (Membutuhkan hak administrator melalui UAC)
        let hostsWarning = null;

        if (domain) {
            const hostsPath = 'C:\\Windows\\System32\\drivers\\etc\\hosts';

            try {
                if (!fs.readFileSync(hostsPath, 'utf8').includes(domain)) {
                    const entry = `127.0.0.1 ${domain}`;
                    exec(
                        `powershell -Command "Start-Process powershell -ArgumentList '-NoProfile -Command \\\"Add-Content -Path ''${hostsPath}'' -Value ([char]10 + ''${entry}'')\\\"' -Verb RunAs"`,
                        (error) => error && console.error('UAC Host update failed:', error)
                    );
                }
            } catch (e) {
                console.warn('Error reading hosts file:', e.message);
                hostsWarning = "Gagal membaca file 'hosts'.";
            }
        }

        // 3. Buat file konfigurasi Nginx
        const nginxEnabledDir = path.join(configDir, 'data', 'nginx_enabled');
        if (!fs.existsSync(nginxEnabledDir)) {
            fs.mkdirSync(nginxEnabledDir, { recursive: true });
        }
        try {
            fs.writeFileSync(path.join(nginxEnabledDir, `${filename}.conf`), content, 'utf-8');

            // 4. Otomatis Restart Nginx agar konfigurasi baru langsung aktif
            try {
                await restartNginx(store, binDir);
            } catch (restartErr) {
                console.error('Auto restart Nginx failed:', restartErr);
                // Kita tetap return true karena file sudah terbuat, tapi beri warning
                return { success: true, warning: (hostsWarning ? hostsWarning + ' ' : '') + 'Konfigurasi terbuat tapi gagal me-restart Nginx otomatis.' };
            }

            return { success: true, warning: hostsWarning };
        } catch (e) {
            console.error('Error creating nginx config:', e);
            return { success: false, error: e.message };
        }
    });
}
