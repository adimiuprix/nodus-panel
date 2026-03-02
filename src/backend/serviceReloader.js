import { restartNginx } from './nginxUtils.js';

/**
 * Registrasi handler IPC untuk reload layanan
 * @param {import('electron').IpcMain} ipcMain 
 * @param {import('electron-store')} store
 * @param {string} binDir 
 */
export function registerServiceReloaderHandler(ipcMain, store, binDir) {
    ipcMain.handle('reload-all-services', async (event, runningServices) => {
        const results = [];

        for (const serviceId of runningServices) {
            if (serviceId === 'nginx') {
                try {
                    // Hard restart (Stop then Start)
                    await restartNginx(store, binDir);
                    results.push({ serviceId, success: true });
                } catch (e) {
                    results.push({ serviceId, success: false, error: e.message });
                }
            } else {
                // MySQL/PHP sementara hanya simulasi atau bisa ditambah nanti
                results.push({ serviceId, success: true, simulated: true });
            }
        }

        return results;
    });
}
