import fs from 'fs';
import path from 'path';
import { SERVICE_CONFIG } from './serviceConfig.js';

export function registerServiceStatusHandler(ipcMain, store, binDir) {
    ipcMain.handle('check-service-status', async (event, serviceId) => {
        const service = SERVICE_CONFIG[serviceId];
        if (!service) return { installed: false };

        const settingsKey = `version${serviceId.charAt(0).toUpperCase() + serviceId.slice(1)}`;
        const version = store.get(`appSettings.${settingsKey}`) || 'default';

        let subFolder = serviceId;
        if (['mysql', 'php', 'nginx'].includes(serviceId)) {
            const cleanVersion = version.replace(/^v/, '');
            subFolder = path.join(serviceId, `${serviceId}-${cleanVersion}`);
        }

        const servicePath = path.join(binDir, subFolder);
        if (!fs.existsSync(servicePath)) return { installed: false };

        const findExe = (dir, target) => {
            if (!fs.existsSync(dir)) return null;

            for (const file of fs.readdirSync(dir)) {
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
        return { installed: !!exePath, path: exePath, version, folder: servicePath };
    });
}