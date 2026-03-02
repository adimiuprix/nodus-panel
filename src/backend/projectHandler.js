import fs from 'fs';
import path from 'path';
import { restartNginx } from './nginxUtils.js';

/**
 * Daftarkan handler IPC terkait pengelolaan Proyek
 * @param {import('electron').IpcMain} ipcMain 
 * @param {import('electron-store')} store
 * @param {string} configDir 
 * @param {string} binDir
 */
export function registerProjectHandler(ipcMain, store, configDir, binDir) {
    // Ambil semua proyek
    ipcMain.handle('get-projects', async () => {
        const projectsPath = path.join(configDir, 'data', 'projects.json');
        if (!fs.existsSync(projectsPath)) {
            return [];
        }
        try {
            const data = fs.readFileSync(projectsPath, 'utf-8');
            return JSON.parse(data);
        } catch (e) {
            console.error('Error reading projects.json:', e);
            return [];
        }
    });

    // Simpan/Perbarui proyek
    ipcMain.handle('save-projects', async (event, projects) => {
        const projectsPath = path.join(configDir, 'data', 'projects.json');
        const projectsDir = path.dirname(projectsPath);
        if (!fs.existsSync(projectsDir)) {
            fs.mkdirSync(projectsDir, { recursive: true });
        }
        try {
            fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 4), 'utf-8');
            event.sender.send('projects-updated');
            return { success: true };
        } catch (e) {
            console.error('Error saving projects.json:', e);
            return { success: false, error: e.message };
        }
    });

    // Hapus proyek
    ipcMain.handle('delete-project', async (event, projectName) => {
        const projectsPath = path.join(configDir, 'data', 'projects.json');
        const nginxEnabledDir = path.join(configDir, 'data', 'nginx_enabled');

        try {
            // 1. Perbarui projects.json
            if (fs.existsSync(projectsPath)) {
                const data = fs.readFileSync(projectsPath, 'utf-8');
                let projects = JSON.parse(data);
                projects = projects.filter(p => p.name !== projectName);
                fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 4), 'utf-8');
            }

            // 2. Hapus file konfigurasi Nginx
            const nginxConfigPath = path.join(nginxEnabledDir, `${projectName}.conf`);
            if (fs.existsSync(nginxConfigPath)) {
                fs.unlinkSync(nginxConfigPath);
            }

            // 3. Hard Restart Nginx agar perubahan konfigurasi terbaca (Stop then Start)
            try {
                await restartNginx(store, binDir);
            } catch (error) {
                console.warn(`Nginx restart warning: ${error.message}.`);
            }

            // Kirim sinyal update
            event.sender.send('projects-updated');
            return { success: true };
        } catch (e) {
            console.error('Error deleting project:', e);
            return { success: false, error: e.message };
        }
    });
}
