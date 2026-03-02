import { shell, dialog, ipcMain } from 'electron';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { installServiceInternal, ensurePhpMyAdminConfig } from './serviceInstaller.js';

export function registerWebHandler(ipcMainInstance, getMainWindow, context) {
    const { store, configDir, binDir, downloadDir } = context;

    ipcMain.handle('open-nginx-web', async (event) => {
        const mainWindow = getMainWindow();
        return new Promise((resolve) => {
            exec('tasklist /FI "IMAGENAME eq nginx.exe"', (err, stdout = '') => {
                const isRunning = (stdout || '').toLowerCase().includes('nginx.exe');
                if (!isRunning) {
                    dialog.showMessageBox(mainWindow, {
                        type: 'warning',
                        title: 'Layanan Nginx Tidak Aktif',
                        message: 'Layanan Nginx tidak aktif, silahkan nyalakan layanan Nginx terlebih dahulu!',
                        buttons: ['OK']
                    });
                    return resolve({ success: false });
                }
                shell.openExternal('http://localhost');
                resolve({ success: true });
            });
        });
    });

    ipcMain.handle('open-mysql-db', async (event) => {
        const mainWindow = getMainWindow();

        // 1. Check MySQL
        const isRunning = await new Promise((resolve) => {
            exec('tasklist /FI "IMAGENAME eq mysqld.exe"', (err, stdout = '') => {
                resolve((stdout || '').toLowerCase().includes('mysqld.exe'));
            });
        });

        if (!isRunning) {
            dialog.showMessageBox(mainWindow, {
                type: 'warning',
                title: 'Layanan MySQL Tidak Aktif',
                message: 'Layanan MySQL tidak aktif, silahkan nyalakan layanan MySQL terlebih dahulu!',
                buttons: ['OK']
            });
            return { success: false };
        }

        // 2. Check phpMyAdmin existence
        const pmaPath = path.join(configDir, 'data', 'phpmyadmin', 'index.php');
        if (!fs.existsSync(pmaPath)) {
            const { response } = await dialog.showMessageBox(mainWindow, {
                type: 'question',
                title: 'phpMyAdmin Tidak Ditemukan',
                message: 'phpMyAdmin belum terinstall di Nodus Panel. Apakah Anda ingin mengunduh dan menginstallnya secara otomatis?',
                buttons: ['Install Sekarang', 'Batal'],
                defaultId: 0,
                cancelId: 1
            });

            if (response === 0) {
                try {
                    await installServiceInternal('phpmyadmin', store, getMainWindow, downloadDir, binDir);
                    shell.openExternal('http://localhost/phpmyadmin');
                    return { success: true };
                } catch (error) {
                    dialog.showErrorBox('Gagal Install', `Gagal menginstall phpMyAdmin: ${error.message}`);
                    return { success: false };
                }
            } else {
                return { success: false };
            }
        }

        // 3. All good, ensure config and open browser
        await ensurePhpMyAdminConfig(binDir);
        shell.openExternal('http://localhost/phpmyadmin');
        return { success: true };
    });
}
