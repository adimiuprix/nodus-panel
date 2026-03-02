import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = app.isPackaged
    ? path.dirname(app.getPath('exe'))
    : path.resolve(__dirname, '../../');

const usrDir = path.join(rootDir, 'usr');
const packagesFile = path.join(usrDir, 'packages.json');

const DEFAULT_CONFIG = {
    nginx: {
        url: 'https://nginx.org/download/nginx-1.26.3.zip',
        exe: 'nginx.exe'
    },
    mysql: {
        url: 'https://cdn.mysql.com//Downloads/MySQL-9.6/mysql-9.6.0-winx64.zip',
        exe: 'bin/mysqld.exe'
    },
    php: {
        url: 'https://downloads.php.net/~windows/releases/archives/php-8.5.3-nts-Win32-vs17-x64.zip',
        exe: 'php.exe'
    },
    phpmyadmin: {
        url: 'https://files.phpmyadmin.net/phpMyAdmin/5.2.3/phpMyAdmin-5.2.3-all-languages.zip',
        exe: 'index.php'
    }
};

let loadedConfig = DEFAULT_CONFIG;

try {
    if (!fs.existsSync(usrDir)) {
        fs.mkdirSync(usrDir, { recursive: true });
    }

    if (!fs.existsSync(packagesFile)) {
        fs.writeFileSync(packagesFile, JSON.stringify(DEFAULT_CONFIG, null, 4), 'utf8');
    } else {
        const fileConfig = JSON.parse(fs.readFileSync(packagesFile, 'utf8'));

        loadedConfig = { ...DEFAULT_CONFIG, ...fileConfig };

        const hasNewKeys = Object.keys(DEFAULT_CONFIG)
            .some(key => !Object.prototype.hasOwnProperty.call(fileConfig, key));

        if (hasNewKeys) {
            fs.writeFileSync(packagesFile, JSON.stringify(loadedConfig, null, 4), 'utf8');
        }
    }
} catch (error) {
    console.error('Error handling packages.json. Using default config.', error);
}

export const SERVICE_CONFIG = loadedConfig;