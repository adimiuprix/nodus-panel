import path from 'path';
import fs from 'fs';
import https from 'https';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { exec } from 'child_process';
import { SERVICE_CONFIG } from './serviceConfig.js';

// Helper: move file/dir with rename, fallback to copy+delete on EPERM
function moveSync(src, dest) {
    try {
        fs.renameSync(src, dest);
    } catch (err) {
        if (err.code === 'EPERM' || err.code === 'EXDEV' || err.code === 'EBUSY') {
            fs.cpSync(src, dest, { recursive: true, force: true });
            try {
                fs.rmSync(src, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
            } catch (rmErr) {
                console.warn(`Failed to clean up source after copy: ${src}`, rmErr.message);
            }
        } else {
            throw err;
        }
    }
}


export async function configureNginx(store, binDir) {
    try {
        const nginxVerKey = store.get('appSettings.versionNginx') || 'default';
        const cleanNginxVer = nginxVerKey.replace(/^v/, '');
        const nginxDir = path.join(binDir, 'nginx', `nginx-${cleanNginxVer}`);
        const nginxConfPath = path.join(nginxDir, 'conf', 'nginx.conf');

        const rootDir = path.resolve(binDir, '..');

        // Ensure nginx_enabled directory exists
        const nginxEnabledDir = path.join(rootDir, 'data', 'nginx_enabled');
        const nginxEnabledPath = nginxEnabledDir.replace(/\\/g, '/');
        if (!fs.existsSync(nginxEnabledDir)) {
            fs.mkdirSync(nginxEnabledDir, { recursive: true });
        }

        // Write minimalist nginx.conf — no server block, all handled via include
        const nginxConf = [
            '#user  nobody;',
            'worker_processes  1;',
            '',
            'error_log  logs/error.log;',
            '',
            'pid        logs/nginx.pid;',
            '',
            'events {',
            '    worker_connections  1024;',
            '}',
            '',
            'http {',
            '    include       mime.types;',
            '    default_type  application/octet-stream;',
            '    sendfile        on;',
            '    keepalive_timeout  65;',
            '    gzip  on;',
            '    server_names_hash_bucket_size 128;',
            '    server_names_hash_max_size 1024;',
            '',
            '    # Virtual Hosts Support',
            `    include "${nginxEnabledPath}/*.conf";`,
            '}',
            ''
        ].join('\n');

        fs.writeFileSync(nginxConfPath, nginxConf, 'utf8');
        console.log('Nginx configuration written (minimalist, no server block).');
    } catch (e) {
        console.error('Failed to configure Nginx:', e);
    }
}

export async function ensurePhpMyAdminConfig(binDir) {
    try {
        const rootDir = path.resolve(binDir, '..');
        const pmaDir = path.join(rootDir, 'data', 'phpmyadmin').replace(/\\/g, '/');
        const pmaConfDir = path.join(rootDir, 'data', 'nginx_enabled');
        const pmaConfPath = path.join(pmaConfDir, 'phpmyadmin.conf');

        if (!fs.existsSync(pmaConfDir)) fs.mkdirSync(pmaConfDir, { recursive: true });

        // Location-only block (included inside main server block in nginx.conf)
        const pmaConfContent = `location /phpmyadmin {
    alias "${pmaDir}";
    index index.php index.html index.htm;

    location ~ ^/phpmyadmin/(.+\\.php)$ {
        alias "${pmaDir}/$1";
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $request_filename;
    }
}
`;
        fs.writeFileSync(pmaConfPath, pmaConfContent, 'utf8');
        console.log('phpMyAdmin Nginx configuration ensured.');
    } catch (e) {
        console.error('Failed to ensure phpMyAdmin config:', e);
    }
}

export async function installServiceInternal(serviceId, store, getMainWindow, downloadDir, binDir) {
    const mainWindow = getMainWindow();
    const service = SERVICE_CONFIG[serviceId];
    if (!service) throw new Error('Service configuration not found');

    let tempExtractPath = null;
    const settingsKey = `version${serviceId.charAt(0).toUpperCase() + serviceId.slice(1)}`;
    const version = store.get(`appSettings.${settingsKey}`) || 'default';
    const cleanVersion = version.replace(/^v/, '');

    // Multi-version folder structure
    let subFolder = serviceId;
    if (serviceId === 'mysql') subFolder = path.join('mysql', `mysql-${cleanVersion}`);
    else if (serviceId === 'php') subFolder = path.join('php', `php-${cleanVersion}`);
    else if (serviceId === 'nginx') subFolder = path.join('nginx', `nginx-${cleanVersion}`);

    const firstUrl = Array.isArray(service.url) ? service.url[0] : service.url;
    const originalZipName = path.basename(firstUrl);
    const zipPath = path.join(downloadDir, originalZipName);

    let extractPath = path.join(binDir, subFolder);
    if (serviceId === 'phpmyadmin') {
        const rootDir = path.resolve(binDir, '..');
        extractPath = path.join(rootDir, 'data', 'phpmyadmin');
    }

    try {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

        mainWindow.webContents.send('install-progress', { serviceId, status: 'downloading', progress: 0 });

        const urlsToTry = Array.isArray(service.url) ? service.url : [service.url];
        let downloadSuccess = false;

        for (const url of urlsToTry) {
            try {
                const response = await axios({
                    url: url,
                    method: 'GET',
                    responseType: 'stream',
                    timeout: 60000,
                    maxRedirects: 5,
                    validateStatus: (status) => status < 500,
                    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                    headers: {
                        'User-Agent': 'Mozilla/5.0'
                    }
                });

                if (response.status < 200 || response.status >= 300) {
                    throw new Error(`Server returned status ${response.status}`);
                }

                const totalLength = response.headers['content-length'];
                const contentType = response.headers['content-type'] || '';
                if (contentType.includes('text/html')) {
                    throw new Error('Server returned HTML instead of ZIP. The link might be expired.');
                }

                let downloadedLength = 0;
                const writer = fs.createWriteStream(zipPath);
                response.data.on('data', (chunk) => {
                    downloadedLength += chunk.length;
                    const progress = totalLength ? Math.round((downloadedLength / totalLength) * 100) : 0;
                    const downloadedMB = (downloadedLength / (1024 * 1024)).toFixed(2);
                    const totalMB = totalLength ? (totalLength / (1024 * 1024)).toFixed(2) : '??';

                    mainWindow.webContents.send('install-progress', {
                        serviceId,
                        status: 'downloading',
                        progress,
                        downloadedMB,
                        totalMB
                    });
                });

                response.data.pipe(writer);
                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                downloadSuccess = true;
                break;
            } catch (err) {
                console.error(`Failed downloading ${serviceId} from ${url}:`, err.message);
                if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
            }
        }

        if (!downloadSuccess) {
            throw new Error('All download mirrors failed.');
        }

        await new Promise(r => setTimeout(r, 500));

        // 2. Extract
        mainWindow.webContents.send('install-progress', { serviceId, status: 'extracting', progress: 100 });

        if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size < 1000) {
            throw new Error('Downloaded file is invalid or too small.');
        }

        const buffer = Buffer.alloc(4);
        const fd = fs.openSync(zipPath, 'r');
        fs.readSync(fd, buffer, 0, 4, 0);
        fs.closeSync(fd);
        if (buffer.toString() !== 'PK\x03\x04') {
            throw new Error('The downloaded file is not a valid ZIP archive.');
        }

        // Create temp extract path
        tempExtractPath = path.join(downloadDir, `temp_${serviceId}_${Date.now()}`);
        if (!fs.existsSync(tempExtractPath)) fs.mkdirSync(tempExtractPath, { recursive: true });

        const zip = new AdmZip(zipPath);
        zip.extractAllTo(tempExtractPath, true);

        // Ensure target folder is clean to avoid EPERM rename issues on Windows
        if (fs.existsSync(extractPath)) {
            fs.rmSync(extractPath, { recursive: true, force: true });
        }
        fs.mkdirSync(extractPath, { recursive: true });
        if (serviceId === 'nginx') {
            const nginxInnerFiles = fs.readdirSync(tempExtractPath);
            if (nginxInnerFiles.length === 1 && fs.statSync(path.join(tempExtractPath, nginxInnerFiles[0])).isDirectory()) {
                const subDir = path.join(tempExtractPath, nginxInnerFiles[0]);
                const subFiles = fs.readdirSync(subDir);
                for (const f of subFiles) {
                    moveSync(path.join(subDir, f), path.join(extractPath, f));
                }
            } else {
                for (const f of nginxInnerFiles) {
                    moveSync(path.join(tempExtractPath, f), path.join(extractPath, f));
                }
            }
        } else if (serviceId === 'mysql') {
            const mysqlInnerFiles = fs.readdirSync(tempExtractPath);
            if (mysqlInnerFiles.length === 1 && fs.statSync(path.join(tempExtractPath, mysqlInnerFiles[0])).isDirectory()) {
                const subDir = path.join(tempExtractPath, mysqlInnerFiles[0]);
                const subFiles = fs.readdirSync(subDir);
                for (const f of subFiles) {
                    moveSync(path.join(subDir, f), path.join(extractPath, f));
                }
            } else {
                for (const f of mysqlInnerFiles) {
                    moveSync(path.join(tempExtractPath, f), path.join(extractPath, f));
                }
            }

            // Create datadir structure at app root /data/mysql
            const appDataDir = store.get('appSettings.dataDir');
            const dataDir = path.join(appDataDir, 'mysql');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Create init.sql to set root password to 'root'
            const initSqlPath = path.join(extractPath, 'init.sql');
            fs.writeFileSync(initSqlPath, `ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';\nFLUSH PRIVILEGES;\n`);

            // Setup my.ini
            const myIniPath = path.join(extractPath, 'my.ini');
            const myIniContent = `[mysqld]\nbasedir="${extractPath.replace(/\\/g, '/')}"\ndatadir="${dataDir.replace(/\\/g, '/')}"\ninit-file="${initSqlPath.replace(/\\/g, '/')}"\n`;
            fs.writeFileSync(myIniPath, myIniContent);

            // Initialize DB empty (without password first, then init.sql handles setting it to root on next start)
            const mysqldExe = path.join(extractPath, 'bin', 'mysqld.exe');
            try {
                const isDataDirEmpty = fs.readdirSync(dataDir).length === 0;
                if (isDataDirEmpty) {
                    mainWindow.webContents.send('install-progress', { serviceId, status: 'initializing db...', progress: 95 });
                    await new Promise((resolve, reject) => {
                        exec(`"${mysqldExe}" --initialize-insecure --basedir="${extractPath}" --datadir="${dataDir}"`, (error, stdout, stderr) => {
                            if (error) {
                                console.error('MySQL Init Error:', stderr);
                                reject(error);
                            } else {
                                resolve();
                            }
                        });
                    });
                } else {
                    console.log('MySQL datadir is not empty, skipping initialization.');
                    mainWindow.webContents.send('install-progress', { serviceId, status: 'using existing db...', progress: 95 });
                }
            } catch (e) {
                console.error("Failed to initialize mysql datadir:", e);
                throw new Error("Failed to initialize MySQL Database");
            }
        } else if (serviceId === 'php') {
            const phpInnerFiles = fs.readdirSync(tempExtractPath);
            if (phpInnerFiles.length === 1 && fs.statSync(path.join(tempExtractPath, phpInnerFiles[0])).isDirectory()) {
                const subDir = path.join(tempExtractPath, phpInnerFiles[0]);
                const subFiles = fs.readdirSync(subDir);
                for (const f of subFiles) {
                    moveSync(path.join(subDir, f), path.join(extractPath, f));
                }
            } else {
                for (const f of phpInnerFiles) {
                    moveSync(path.join(tempExtractPath, f), path.join(extractPath, f));
                }
            }

            // Validate php.exe exists
            const phpExePath = path.join(extractPath, 'php.exe');
            if (!fs.existsSync(phpExePath)) {
                throw new Error('Extract not valid: php.exe not found in extracted folder.');
            }

            // Auto setup php.ini from php.ini-development if php.ini doesn't exist
            const phpIniPath = path.join(extractPath, 'php.ini');
            const phpIniDevPath = path.join(extractPath, 'php.ini-development');
            if (!fs.existsSync(phpIniPath) && fs.existsSync(phpIniDevPath)) {
                fs.copyFileSync(phpIniDevPath, phpIniPath);
            }

            // Comment out doc_root in php.ini to allow multi-site/virtual-hosts (fixes "No input file specified")
            if (fs.existsSync(phpIniPath)) {
                let iniContent = fs.readFileSync(phpIniPath, 'utf8');
                iniContent = iniContent.replace(/^doc_root\s*=/m, ';doc_root =');
                fs.writeFileSync(phpIniPath, iniContent, 'utf8');
            }

            // Uncomment extension_dir = "ext" for Windows so PHP can find extensions (mysqli, curl, etc.)
            if (fs.existsSync(phpIniPath)) {
                let iniContent = fs.readFileSync(phpIniPath, 'utf8');
                iniContent = iniContent.replace(/^;extension_dir\s*=\s*"ext"/m, 'extension_dir = "ext"');
                fs.writeFileSync(phpIniPath, iniContent, 'utf8');
            }

            // Validate PHP binary
            mainWindow.webContents.send('install-progress', { serviceId, status: 'validating php...', progress: 95 });

            try {
                await new Promise((resolve, reject) => {
                    exec(`"${phpExePath}" -v`, (error, stdout, stderr) => {
                        if (error) {
                            console.error('PHP validation error:', stderr);
                            reject(error);
                        } else {
                            console.log('PHP version:', stdout.trim());
                            resolve(stdout);
                        }
                    });
                });
            } catch (e) {
                console.error('PHP validation failed:', e);
                throw new Error('PHP validation failed. Binary cannot be executed.');
            }

            // Check important extensions (optional warning)
            try {
                const modulesOutput = await new Promise((resolve, reject) => {
                    exec(`"${phpExePath}" -m`, (error, stdout, stderr) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(stdout);
                        }
                    });
                });

                const requiredExtensions = ['mysqli', 'openssl', 'curl', 'mbstring'];
                const missingExtensions = requiredExtensions.filter(ext =>
                    !modulesOutput.toLowerCase().includes(ext.toLowerCase())
                );

                if (missingExtensions.length > 0) {
                    console.warn(`PHP warning: missing extensions: ${missingExtensions.join(', ')}. Enable them in php.ini.`);
                    mainWindow.webContents.send('install-progress', {
                        serviceId,
                        status: 'warning',
                        message: `Missing extensions: ${missingExtensions.join(', ')}. Enable them in php.ini.`
                    });
                }
            } catch (e) {
                console.warn('Could not check PHP extensions:', e.message);
            }

            // Save installed version to store
            const phpVersions = store.get('phpVersions') || {};
            phpVersions[cleanVersion] = extractPath;
            store.set('phpVersions', phpVersions);
        } else {
            // For other services: If it extracted into a single subfolder, move things up
            const files = fs.readdirSync(tempExtractPath);
            if (files.length === 1 && fs.statSync(path.join(tempExtractPath, files[0])).isDirectory()) {
                const subDir = path.join(tempExtractPath, files[0]);
                const subFiles = fs.readdirSync(subDir);
                for (const f of subFiles) {
                    moveSync(path.join(subDir, f), path.join(extractPath, f));
                }
            } else {
                // Move everything from temp to final
                for (const f of files) {
                    moveSync(path.join(tempExtractPath, f), path.join(extractPath, f));
                }
            }
        }

        if (serviceId === 'phpmyadmin') {
            await ensurePhpMyAdminConfig(binDir);
        }

        // Cleanup (Add retries and safe wrapper for Windows locks)
        try {
            if (fs.existsSync(tempExtractPath)) {
                fs.rmSync(tempExtractPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
            }
        } catch (e) {
            console.warn('Failed to clean up temp extract path:', e.message);
        }
        try {
            if (fs.existsSync(zipPath)) {
                fs.rmSync(zipPath, { force: true, maxRetries: 5, retryDelay: 300 });
            }
        } catch (e) {
            console.warn('Failed to clean up zip file:', e.message);
        }

        mainWindow.webContents.send('install-progress', { serviceId, status: 'completed', progress: 100 });
        return { success: true };
    } catch (error) {
        try { if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true, maxRetries: 3, retryDelay: 200 }); } catch (e) { }
        if (tempExtractPath && fs.existsSync(tempExtractPath)) {
            try { fs.rmSync(tempExtractPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); } catch (e) { }
        }
        mainWindow.webContents.send('install-progress', { serviceId, status: 'error', message: error.message });
        throw error;
    }
}


export function registerServiceInstallerHandler(ipcMain, store, getMainWindow, downloadDir, binDir) {
    ipcMain.handle('install-service', async (event, serviceId) => {
        return installServiceInternal(serviceId, store, getMainWindow, downloadDir, binDir);
    });
}
