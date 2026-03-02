import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { fileURLToPath } from 'url';
import { SERVICE_CONFIG } from './serviceConfig.js';
import { configureNginx } from './serviceInstaller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find app root based on packaged vs development mode
const rootDir = app.isPackaged ? path.dirname(app.getPath('exe')) : path.resolve(__dirname, '../../');
const actionsDir = path.join(rootDir, 'usr', 'actions');

if (!fs.existsSync(actionsDir)) {
    fs.mkdirSync(actionsDir, { recursive: true });
}

// Generate VBS files for each service
const VBS_SCRIPTS = {

    mysql: `Set WshShell = CreateObject("WScript.Shell")
Action = WScript.Arguments(0)
If Action = "start" Then
    ExePath = WScript.Arguments(1)
    WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(ExePath)
    WshShell.Run Chr(34) & ExePath & Chr(34), 0, False
ElseIf Action = "stop" Then
    WshShell.Run "taskkill /F /IM mysqld.exe /T", 0, True
End If`,

    nginx: `Set WshShell = CreateObject("WScript.Shell")
Action = WScript.Arguments(0)
If Action = "start" Then
    ExePath = WScript.Arguments(1)
    WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(ExePath)
    WshShell.Run Chr(34) & ExePath & Chr(34), 0, False
ElseIf Action = "stop" Then
    WshShell.Run "taskkill /F /IM nginx.exe /T", 0, True
End If`,

    php: `Set WshShell = CreateObject("WScript.Shell")
Action = WScript.Arguments(0)
If Action = "start" Then
    ExePath = WScript.Arguments(1)
    WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(ExePath)
    PhpCgi = Replace(ExePath, "php.exe", "php-cgi.exe")
    WshShell.Run Chr(34) & PhpCgi & Chr(34) & " -b 127.0.0.1:9000", 0, False
ElseIf Action = "stop" Then
    WshShell.Run "taskkill /F /IM php-cgi.exe /T", 0, True
End If`,

};

// Write out all scripts
for (const [svc, content] of Object.entries(VBS_SCRIPTS)) {
    const vbsPath = path.join(actionsDir, `${svc}.vbs`);
    if (!fs.existsSync(vbsPath)) {
        fs.writeFileSync(vbsPath, content, 'utf8');
    }
}

export function registerServiceRunnerHandler(ipcMain, store, binDir) {
    ipcMain.handle('run-service', async (event, serviceId, start) => {
        const service = SERVICE_CONFIG[serviceId];
        if (!service) throw new Error(`Unknown service: ${serviceId}`);

        // Target VBS script
        const vbsPath = path.join(actionsDir, `${serviceId}.vbs`);
        if (!fs.existsSync(vbsPath)) {
            throw new Error(`VBS script not found for ${serviceId}`);
        }

        if (!start) {
            // Stop service
            return new Promise((resolve, reject) => {
                exec(`cscript.exe //NoLogo "${vbsPath}" stop`, (error, stdout, stderr) => {
                    resolve({ success: true, message: stdout });
                });
            });
        }

        // --- Start Service ---
        // Need to find the exact exePath first
        const settingsKey = `version${serviceId.charAt(0).toUpperCase() + serviceId.slice(1)}`;
        const version = store.get(`appSettings.${settingsKey}`) || 'default';

        let subFolder = serviceId;
        const cleanVersion = version.replace(/^v/, '');
        if (serviceId === 'mysql') {
            const cleanVersion = version.replace(/^v/, '');
            subFolder = path.join('mysql', `mysql-${cleanVersion}`);
        } else if (serviceId === 'php') {
            const cleanVersion = version.replace(/^v/, '');
            subFolder = path.join('php', `php-${cleanVersion}`);
        } else if (serviceId === 'nginx') {
            const cleanVersion = version.replace(/^v/, '');
            subFolder = path.join('nginx', `nginx-${cleanVersion}`);
        }

        const servicePath = path.join(binDir, subFolder);
        if (!fs.existsSync(servicePath)) throw new Error(`Service directory not found: ${servicePath}`);

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
        if (!exePath) throw new Error(`Executable not found for ${serviceId}`);

        if (serviceId === 'nginx') {
            await configureNginx(store, binDir);
        }

        return new Promise((resolve, reject) => {
            exec(`cscript.exe //NoLogo "${vbsPath}" start "${exePath}"`, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({ success: true });
                }
            });
        });
    });
}

