import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configDir = app.isPackaged
    ? path.dirname(app.getPath('exe'))
    : __dirname;

const store = new Store({
    cwd: configDir,
    name: 'nodus-config',
    defaults: {
        windowSettings: {
            width: 820,
            height: 560,
        },
        appSettings: {
            autoStart: false,
            minToTray: false,
            autoVhost: true,
            docRoot: path.join(configDir, 'www'),
            dataDir: path.join(configDir, 'data'),
            binDir: path.join(configDir, 'bin'),
            versionNginx: 'v1.29.5',
            versionMysql: 'v8.4.8',
            versionPhp: 'v8.5.3',

            portNginxHttp: 80,
            portNginxSsl: 443,
            portMysql: 3306,

        }
    }
});

// Paksa pembuatan konfigurasi default ke disk jika hilang atau skema berubah.
store.set('appSettings', store.get('appSettings'));
store.set('windowSettings', store.get('windowSettings'));

import { registerServiceStatusHandler } from './src/backend/serviceStatus.js';
import { registerServiceInstallerHandler } from './src/backend/serviceInstaller.js';
import { registerServiceRunnerHandler } from './src/backend/serviceRunner.js';
import { registerWebHandler } from './src/backend/webHandler.js';
import { registerNginxHandler } from './src/backend/nginxHandler.js';

// Pastikan direktori ada
const downloadDir = path.join(configDir, 'download');
const binDir = path.join(configDir, 'bin');
const wwwDir = path.join(configDir, 'www');

if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });
if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

// Pastikan www/index.php ada
if (!fs.existsSync(wwwDir)) {
    fs.mkdirSync(wwwDir, { recursive: true });
}

const indexPhpPath = path.join(wwwDir, 'index.php');
if (!fs.existsSync(indexPhpPath)) {
    const defaultPhpContent = `<?php
$phpVersion = phpversion();
$serverName = $_SERVER['SERVER_NAME'];
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome - Nodus Panel</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --bg: #0f0f1a;
            --card: #161625;
            --accent: #6366f1;
            --text: #e8e8f0;
            --text-dim: #9a9ab5;
            --border: #2a2a45;
        }

        body {
            margin: 0;
            font-family: 'Inter', -apple-system, sans-serif;
            background: var(--bg);
            color: var(--text);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }

        .welcome-card {
            background: var(--card);
            padding: 45px 60px;
            border-radius: 20px;
            border: 1px solid var(--border);
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            position: relative;
            overflow: hidden;
        }

        /* Subtle glow effect top */
        .welcome-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, transparent, var(--accent), transparent);
        }

        .icon-box {
            width: 64px;
            height: 64px;
            background: rgba(99, 102, 241, 0.1);
            color: var(--accent);
            border-radius: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            margin: 0 auto 24px;
        }

        h1 {
            margin: 0 0 8px;
            font-size: 28px;
            font-weight: 700;
        }

        p {
            color: var(--text-dim);
            margin: 0 0 32px;
            font-size: 15px;
        }

        .php-badge {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: var(--bg);
            padding: 10px 20px;
            border-radius: 100px;
            border: 1px solid var(--border);
            font-size: 14px;
        }

        .php-badge i {
            color: #8993be;
            /* PHP Color */
        }

        .php-badge b {
            color: var(--accent);
        }

        footer {
            margin-top: 40px;
            font-size: 12px;
            color: var(--text-dim);
            opacity: 0.6;
        }
    </style>
</head>

<body>
    <div class="welcome-card">
        <div class="icon-box">
            <i class="fas fa-rocket"></i>
        </div>
        <h1>Welcome to Nodus Panel</h1>
        <p>Your development domain <b><?php echo $serverName; ?></b> is ready for takeoff.</p>

        <div class="php-badge">
            <i class="fab fa-php"></i>
            <span>PHP Version: <b><?php echo $phpVersion; ?></b></span>
        </div>

        <footer>
            &copy; <?php echo date('Y'); ?> Nodus Panel &bull; Local Environment
        </footer>
    </div>
</body>

</html>`;
    fs.writeFileSync(indexPhpPath, defaultPhpContent);
}

let mainWindow;
let tray;

function createWindow() {
    const { width, height } = store.get('windowSettings');

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        minWidth: 820,
        minHeight: 560,
        frame: false,
        transparent: false,
        backgroundColor: '#1a1a2e',
        resizable: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
    });

    // Dev mode: Muat dari server pengembang Vite untuk HMR.
    // Production: Muat dari dist/ yang sudah dibangun.
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl) {
        mainWindow.loadURL(devServerUrl);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }

    mainWindow.on('close', (event) => {
        event.preventDefault();
        mainWindow.hide();
    });

    mainWindow.on('resize', () => {
        const { width, height } = mainWindow.getBounds();
        store.set('windowSettings.width', width);
        store.set('windowSettings.height', height);
    });
}

app.whenReady().then(() => {
    createWindow();

    // Buat ikon tray
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    const trayIcon = nativeImage.createFromPath(iconPath);
    tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show Nodus Panel', click: () => mainWindow.show() },
        { type: 'separator' },
        { label: 'Start All', click: () => mainWindow.webContents.send('tray-action', 'start-all') },
        { label: 'Stop All', click: () => mainWindow.webContents.send('tray-action', 'stop-all') },
        { type: 'separator' },
        {
            label: 'Quit', click: () => {
                mainWindow.destroy();
                app.quit();
            }
        },
    ]);

    tray.setToolTip('Nodus Panel');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => mainWindow.show());
});

// Penangan IPC untuk kontrol jendela
ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.on('window-close', () => {
    mainWindow.hide();
});

ipcMain.on('app-quit', () => {
    mainWindow.destroy();
    app.quit();
});

ipcMain.handle('get-config', (event, key) => {
    return store.get(key);
});

ipcMain.handle('set-config', (event, key, value) => {
    store.set(key, value);
    return true;
});

// Periksa status layanan
registerServiceStatusHandler(ipcMain, store, binDir);

// Install service
registerServiceInstallerHandler(ipcMain, store, () => mainWindow, downloadDir, binDir);

// Run service
registerServiceRunnerHandler(ipcMain, store, binDir);

// Penangan Nginx
registerNginxHandler(ipcMain, configDir);

// Penangan Proyek
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

// Simpan proyek
ipcMain.handle('save-projects', async (event, projects) => {
    const projectsPath = path.join(configDir, 'data', 'projects.json');
    const projectsDir = path.dirname(projectsPath);
    if (!fs.existsSync(projectsDir)) {
        fs.mkdirSync(projectsDir, { recursive: true });
    }
    try {
        fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 4), 'utf-8');
        return { success: true };
    } catch (e) {
        console.error('Error saving projects.json:', e);
        return { success: false, error: e.message };
    }
});


// Penangan Web
registerWebHandler(ipcMain, () => mainWindow, { store, configDir, binDir, downloadDir });

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
