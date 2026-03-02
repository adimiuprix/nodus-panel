import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './App.css';
import ServiceCard from './components/ServiceCard';
import QuickActionButton from './components/QuickActionButton';
import AboutModal from './components/AboutModal';
import QuickCreateModal from './components/QuickCreateModal';
import ProjectsTab from './page_tabs/ProjectsTab';

// ===== SERVICE DATA =====
const INITIAL_SERVICES = {
    nginx: { name: 'Nginx', fullName: 'Nginx Web Server', icon: 'fas fa-server', colorClass: 'nginx' },
    mysql: { name: 'MySQL', fullName: 'MySQL', icon: 'fas fa-database', colorClass: 'mysql' },
    php: { name: 'PHP', fullName: 'PHP', icon: 'fab fa-php', colorClass: 'php' },

};

const FRAMEWORKS = [
    { id: 'laravel', name: 'Laravel', icon: 'fab fa-laravel' },
    { id: 'wordpress', name: 'WordPress', icon: 'fab fa-wordpress' },
    { id: 'react', name: 'React', icon: 'fab fa-react' },
    { id: 'vue', name: 'Vue.js', icon: 'fab fa-vuejs' },
    { id: 'next', name: 'Next.js', icon: 'fas fa-arrow-right' },
    { id: 'blank', name: 'Blank', icon: 'fas fa-file-code' },
];

// ===== HELPER =====
function getTimestamp() {
    return new Date().toLocaleTimeString('id-ID', { hour12: false });
}

// ===== TOAST COMPONENT =====
function Toast({ toasts, onDismiss }) {
    return (
        <div className="toast-container" id="toastContainer">
            {toasts.map((t) => (
                <div key={t.id} className={`toast ${t.type} ${t.exiting ? 'toast-exit' : ''}`}>
                    <i className={`toast-icon ${t.iconClass}`} />
                    <span className="toast-message">{t.message}</span>
                    <button className="toast-close" onClick={() => onDismiss(t.id)}>
                        <i className="fas fa-times" />
                    </button>
                </div>
            ))}
        </div>
    );
}

// ===== MAIN APP COMPONENT =====
export default function App() {
    // State
    const [activeTab, setActiveTab] = useState('dashboard');
    const [services, setServices] = useState(() => {
        const s = {};
        for (const key of Object.keys(INITIAL_SERVICES)) s[key] = false;
        return s;
    });
    const [terminalLines, setTerminalLines] = useState([
        { text: '', type: 'header', jsx: <><span className="term-prompt">Nodus Panel</span> v1.0.0 — Local Development Environment</> },
        { text: '', type: 'info', jsx: <>Type <span className="term-highlight">'help'</span> for available commands.</> },
        { text: '─────────────────────────────────────────────────', type: 'separator' },
    ]);
    const [terminalInput, setTerminalInput] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showQuickCreate, setShowQuickCreate] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [uptime, setUptime] = useState(null); // null = not started
    const [memoryUsage, setMemoryUsage] = useState('-');
    const [settings, setSettings] = useState({
        autoStart: false,
        minToTray: false,
        autoVhost: true,
        docRoot: 'www',
        dataDir: 'data',
        binDir: 'bin',
        versionNginx: 'v1.29.5',
        versionMysql: 'v8.4.8',
        versionPhp: 'v8.5.3',

        portNginxHttp: 80,
        portNginxSsl: 443,
        portMysql: 3306,

    });
    const [installationStatus, setInstallationStatus] = useState({});
    const [installing, setInstalling] = useState({}); // { nginx: { status: 'downloading', progress: 0 } }

    // ===== COMPUTE ACTIVE SERVICES =====
    const activeServices = useMemo(() => ({
        nginx: { ...INITIAL_SERVICES.nginx, version: settings.versionNginx, port: `${settings.portNginxHttp}, ${settings.portNginxSsl}`, ports: [`:${settings.portNginxHttp}`, `:${settings.portNginxSsl}`] },
        mysql: { ...INITIAL_SERVICES.mysql, version: settings.versionMysql, port: `${settings.portMysql}`, ports: [`:${settings.portMysql}`] },
        php: { ...INITIAL_SERVICES.php, version: settings.versionPhp, port: 'FastCGI', ports: ['FastCGI'] },

    }), [settings]);

    // ===== LOAD SETTINGS FROM STORE =====
    useEffect(() => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('get-config', 'appSettings').then(savedSettings => {
                if (savedSettings) setSettings(savedSettings);
            });

            // Listen for install progress
            ipcRenderer.on('install-progress', (event, data) => {
                setInstalling(prev => ({ ...prev, [data.serviceId]: data }));

                if (data.status === 'completed' || data.status === 'error') {
                    if (data.status === 'completed') {
                        checkInstallation(data.serviceId);
                        addToast(`${data.serviceId} install completed!`, 'success');
                    }
                    // Auto-hide progress bar after 3 seconds
                    setTimeout(() => {
                        setInstalling(prev => {
                            const newState = { ...prev };
                            delete newState[data.serviceId];
                            return newState;
                        });
                    }, 3000);
                }
            });
        }
        checkAllInstallations();
    }, []);

    const checkInstallation = async (serviceId) => {
        if (!window.require) return;
        const res = await window.require('electron').ipcRenderer.invoke('check-service-status', serviceId);
        setInstallationStatus(prev => ({ ...prev, [serviceId]: res.installed }));
    };

    const checkAllInstallations = () => {
        Object.keys(activeServices).forEach(serviceId => checkInstallation(serviceId));
    };

    const handleInstallService = async (serviceId) => {
        if (!window.require) return;
        addToast(`Starting installation for ${serviceId}...`, 'info');
        try {
            await window.require('electron').ipcRenderer.invoke('install-service', serviceId);
        } catch (error) {
            addToast(`Installation failed: ${error.message}`, 'error');
        }
    };

    const updateSetting = (key, value) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        if (window.require) {
            window.require('electron').ipcRenderer.invoke('set-config', 'appSettings', newSettings);
        }
    };

    const terminalOutputRef = useRef(null);
    const terminalInputRef = useRef(null);
    const toastIdRef = useRef(0);
    const uptimeRef = useRef(null);

    // Computed
    const runningServices = Object.values(services).filter(Boolean);
    const runningCount = runningServices.length;
    const totalCount = Object.keys(services).length;
    const someRunning = runningCount > 0;
    const allRunning = runningCount === totalCount;

    // ===== WINDOW CONTROLS =====
    const handleMinimize = () => {
        if (window.require) window.require('electron').ipcRenderer.send('window-minimize');
    };

    const handleMaximize = () => {
        if (window.require) window.require('electron').ipcRenderer.send('window-maximize');
    };

    const handleClose = () => {
        if (window.require) window.require('electron').ipcRenderer.send('window-close');
    };

    // ===== TOAST =====
    const addToast = useCallback((message, type = 'info') => {
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-times-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle',
        };
        const id = ++toastIdRef.current;
        setToasts((prev) => [...prev, { id, message, type, iconClass: iconMap[type] }]);
        setTimeout(() => dismissToast(id), 4000);
    }, []);

    const dismissToast = (id) => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 250);
    };

    // ===== TERMINAL =====
    const addTermLine = useCallback((text, type = '') => {
        setTerminalLines((prev) => [...prev, { text, type }]);
    }, []);

    useEffect(() => {
        if (terminalOutputRef.current) {
            terminalOutputRef.current.scrollTop = terminalOutputRef.current.scrollHeight;
        }
    }, [terminalLines]);

    // ===== UPTIME =====
    useEffect(() => {
        if (someRunning && uptimeRef.current === null) {
            let seconds = 0;
            setUptime('00:00:00');
            uptimeRef.current = setInterval(() => {
                seconds++;
                const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
                const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
                const s = String(seconds % 60).padStart(2, '0');
                setUptime(`${h}:${m}:${s}`);
            }, 1000);
        } else if (!someRunning && uptimeRef.current !== null) {
            clearInterval(uptimeRef.current);
            uptimeRef.current = null;
            setUptime(null);
        }
        return () => { };
    }, [someRunning]);

    // ===== SYSTEM INFO =====
    useEffect(() => {
        const id = setInterval(() => {
            setMemoryUsage(`${(Math.random() * 200 + 100).toFixed(0)} MB`);
        }, 5000);
        setMemoryUsage(`${(Math.random() * 200 + 100).toFixed(0)} MB`);
        return () => clearInterval(id);
    }, []);

    // ===== SERVICE ACTIONS =====
    const toggleService = useCallback(async (name, start) => {
        if (start) {
            // Seamless check on-demand
            if (window.require) {
                try {
                    const res = await window.require('electron').ipcRenderer.invoke('check-service-status', name);
                    setInstallationStatus(prev => ({ ...prev, [name]: res.installed }));

                    if (!res.installed) {
                        addToast(`${activeServices[name].name} is not installed. Please install it first or check bin/ folder.`, 'warning');
                        return;
                    }
                } catch (err) {
                    addToast(`Failed to check ${activeServices[name].name} status: ${err.message}`, 'error');
                    return;
                }
            }
        }

        const svc = activeServices[name];

        if (window.require) {
            try {
                addTermLine(`[${getTimestamp()}] ${start ? 'Starting' : 'Stopping'} ${svc.name}...`, 'info');
                await window.require('electron').ipcRenderer.invoke('run-service', name, start);
            } catch (error) {
                addTermLine(`[${getTimestamp()}] Failed to ${start ? 'start' : 'stop'} ${svc.name}: ${error.message}`, 'error');
                addToast(`Error: ${error.message}`, 'error');
                return;
            }
        }

        setServices((prev) => ({ ...prev, [name]: start }));
        if (start) {
            addTermLine(`[${getTimestamp()}] ${svc.name} is running on port ${svc.port}`, 'success');
            addToast(`${svc.name} started!`, 'success');
        } else {
            addTermLine(`[${getTimestamp()}] ${svc.name} stopped.`, 'warning');
            addToast(`${svc.name} stopped.`, 'warning');
        }
    }, [addTermLine, addToast, installationStatus, activeServices]);

    const startAll = useCallback(async () => {
        const names = Object.keys(activeServices);
        addToast('Starting all services...', 'info');
        addTermLine(`[${getTimestamp()}] Starting all services...`, 'info');

        for (const name of names) {
            try {
                await toggleService(name, true);
            } catch (err) {
                addTermLine(`[${getTimestamp()}] Failed to start ${activeServices[name]?.name || name}: ${err.message}`, 'error');
                addToast(`Failed to start ${activeServices[name]?.name || name}`, 'error');
            }
        }

        addTermLine(`[${getTimestamp()}] Start all completed.`, 'success');
    }, [toggleService, activeServices, addToast, addTermLine]);

    const stopAll = useCallback(async () => {
        const names = Object.keys(activeServices);
        addToast('Stopping all services...', 'warning');
        addTermLine(`[${getTimestamp()}] Stopping all services...`, 'info');

        for (const name of names) {
            try {
                await toggleService(name, false);
            } catch (err) {
                addTermLine(`[${getTimestamp()}] Failed to stop ${activeServices[name]?.name || name}: ${err.message}`, 'error');
                addToast(`Failed to stop ${activeServices[name]?.name || name}`, 'error');
            }
        }

        addTermLine(`[${getTimestamp()}] Stop all completed.`, 'success');
    }, [toggleService, activeServices, addToast, addTermLine]);

    const reloadAll = useCallback(() => {
        addTermLine(`[${getTimestamp()}] Reloading all services...`, 'info');
        addToast('Reloading all services...', 'info');
        Object.entries(services).forEach(([name, running]) => {
            if (running) {
                setTimeout(() => addTermLine(`[${getTimestamp()}] ${activeServices[name].name} reloaded.`, 'success'), Math.random() * 500 + 200);
            }
        });
        setTimeout(() => addToast('All services reloaded!', 'success'), 1000);
    }, [services, addTermLine, addToast]);

    // ===== TERMINAL COMMANDS =====
    const handleTerminalCommand = (input) => {
        addTermLine(`❯ ${input}`, 'user-cmd');
        const parts = input.toLowerCase().split(' ');
        const cmd = parts[0];
        const arg = parts.slice(1).join(' ');

        switch (cmd) {
            case 'help':
                addTermLine('Available Commands:', 'info');
                addTermLine('  help          — Show this help message', '');
                addTermLine('  status        — Show service status', '');
                addTermLine('  start [service] — Start a service (nginx, mysql, php)', '');
                addTermLine('  stop [service]  — Stop a service', '');
                addTermLine('  restart [svc]   — Restart a service', '');
                addTermLine('  start all     — Start all services', '');
                addTermLine('  stop all      — Stop all services', '');
                addTermLine('  clear         — Clear terminal', '');
                addTermLine('  version       — Show version info', '');
                break;
            case 'status':
                addTermLine('Service Status:', 'info');
                Object.entries(activeServices).forEach(([key, svc]) => {
                    const running = services[key];
                    addTermLine(`  ${svc.name.padEnd(12)} ${running ? '● Running' : '○ Stopped'}  Port: ${svc.port}`, running ? 'success' : '');
                });
                break;
            case 'version':
                addTermLine('Nodus Panel v1.0.0', 'info');
                addTermLine('Electron-based local development environment', '');
                break;
            case 'clear':
                setTerminalLines([]);
                break;
            case 'start':
                if (arg === 'all') startAll();
                else if (activeServices[arg]) toggleService(arg, true);
                else addTermLine(`Unknown service: "${arg}". Use: nginx, mysql, php`, 'error');
                break;
            case 'stop':
                if (arg === 'all') stopAll();
                else if (activeServices[arg]) toggleService(arg, false);
                else addTermLine(`Unknown service: "${arg}". Use: nginx, mysql, php`, 'error');
                break;
            case 'restart':
                if (activeServices[arg]) {
                    toggleService(arg, false);
                    setTimeout(() => toggleService(arg, true), 500);
                } else {
                    addTermLine(`Unknown service: "${arg}". Use: nginx, mysql, php`, 'error');
                }
                break;
            default:
                addTermLine(`Command not found: "${cmd}". Type 'help' for available commands.`, 'error');
        }
    };

    // ===== KEYBOARD SHORTCUTS =====
    useEffect(() => {
        const handler = (e) => {
            if (e.ctrlKey && e.key >= '1' && e.key <= '5') {
                e.preventDefault();
                const tabs = ['dashboard', 'services', 'projects', 'terminal', 'settings'];
                setActiveTab(tabs[parseInt(e.key) - 1]);
            }
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                if (allRunning) stopAll();
                else startAll();
            }
            if (e.key === 'Escape') {
                setShowQuickCreate(false);
                setShowAbout(false);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [allRunning, startAll, stopAll]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = () => setDropdownOpen(false);
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, []);

    // ===== DROPDOWN ACTIONS =====
    const handleDropdownAction = (action) => {
        setDropdownOpen(false);
        switch (action) {
            case 'preferences': setActiveTab('settings'); break;
            case 'www': addToast('Opening Document Root...', 'info'); break;
            case 'about': setShowAbout(true); break;
            case 'quit':
                if (window.require) window.require('electron').ipcRenderer.send('app-quit');
                else window.close();
                break;
        }
    };

    // ===== QUICK CREATE =====
    const handleQuickCreate = async (name, framework) => {
        setShowQuickCreate(false);
        addTermLine(`[${getTimestamp()}] Creating project "${name}" with ${framework}...`, 'info');
        addToast(`Creating project "${name}"...`, 'info');

        if (!window.require) return;
        const { ipcRenderer } = window.require('electron');

        try {
            // 1. Prepare Paths and Domain
            // Use the name exactly as provided for the domain
            const domain = name;
            const docRoot = settings.docRoot || 'www';
            // Nginx prefers forward slashes even on Windows
            const projectRoot = `${docRoot}/${name}`.replace(/\\/g, '/');

            // 2. Build Nginx Config Content
            const nginxConfig = `server {
    listen       80;
    server_name  ${domain} www.${domain};

    root   ${projectRoot};
    index  index.php index.html index.htm;

    access_log  logs/${name}.access.log;
    error_log   logs/${name}.error.log;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \\.php$ {
        include        fastcgi_params;
        fastcgi_pass   127.0.0.1:9000;
        fastcgi_index  index.php;
        fastcgi_param  SCRIPT_FILENAME  $document_root$fastcgi_script_name;
    }

    location ~ /\\.ht {
        deny all;
    }
}`;

            // 3. Create Nginx Config File via IPC
            const configResult = await ipcRenderer.invoke('create-nginx-config', {
                filename: name,
                content: nginxConfig,
                projectPath: projectRoot,
                domain: domain
            });

            if (!configResult.success) {
                throw new Error(configResult.error || 'Failed to create Nginx config');
            }

            // 4. Update projects.json via IPC
            const projects = await ipcRenderer.invoke('get-projects') || [];
            const fw = FRAMEWORKS.find(f => f.id === framework) || { name: framework, icon: 'fas fa-file-code' };

            const newProject = {
                name: name,
                framework: fw.name,
                url: `http://${domain}`,
                iconClass: fw.icon,
                colorClass: framework,
                path: projectRoot,
                createdAt: new Date().toISOString()
            };

            const saveResult = await ipcRenderer.invoke('save-projects', [...projects, newProject]);
            if (!saveResult.success) {
                throw new Error(saveResult.error || 'Failed to save projects data');
            }

            if (configResult.warning) {
                addToast(configResult.warning, 'warning');
                addTermLine(`[${getTimestamp()}] Warning: ${configResult.warning}`, 'warning');
            }

            addTermLine(`[${getTimestamp()}] Project "${name}" created successfully!`, 'success');
            addToast(`Project "${name}" created!`, 'success');

            // Refresh project tab if currently active (it will remount if we toggle or just wait for it to be visited)
            // But since ProjectsTab loads in useEffect on mount, it will show the new data when the user switches to it.

        } catch (error) {
            console.error('Quick Create Error:', error);
            addTermLine(`[${getTimestamp()}] Error: ${error.message}`, 'error');
            addToast(`Failed: ${error.message}`, 'error');
        }
    };

    // ===== NAV ITEMS =====
    const navItems = [
        { id: 'dashboard', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
        { id: 'services', icon: 'fas fa-server', label: 'Services' },
        { id: 'projects', icon: 'fas fa-project-diagram', label: 'Projects' },
        { id: 'terminal', icon: 'fas fa-terminal', label: 'Terminal' },
        { id: 'settings', icon: 'fas fa-cog', label: 'Settings' },
    ];

    return (
        <>
            {/* ===== TITLE BAR ===== */}
            <div className="titlebar" id="titlebar">
                <div className="titlebar-left">
                    <div className="titlebar-logo">
                        <i className="fas fa-cube" />
                        <span>Nodus Panel</span>
                    </div>
                </div>
                <div className="titlebar-center drag-region" />
                <div className="titlebar-menu">
                    <button className="menu-btn" id="menuBtn" onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}>
                        <i className="fas fa-ellipsis-v" />
                    </button>
                    <div className={`dropdown-menu ${dropdownOpen ? 'active' : ''}`} id="dropdownMenu">
                        <div className="dropdown-item" onClick={() => handleDropdownAction('preferences')}>
                            <i className="fas fa-cog" /> Preferences
                        </div>
                        <div className="dropdown-item" onClick={() => handleDropdownAction('www')}>
                            <i className="fas fa-folder-open" /> Document Root
                        </div>
                        <div className="dropdown-divider" />
                        <div className="dropdown-item" onClick={() => handleDropdownAction('about')}>
                            <i className="fas fa-info-circle" /> About
                        </div>
                        <div className="dropdown-item" onClick={() => handleDropdownAction('quit')}>
                            <i className="fas fa-power-off" /> Quit
                        </div>
                    </div>
                </div>
                <div className="titlebar-controls">
                    <button className="titlebar-btn minimize-btn" id="minimizeBtn" title="Minimize" onClick={handleMinimize}>
                        <i className="fas fa-minus" />
                    </button>
                    <button className="titlebar-btn maximize-btn" id="maximizeBtn" title="Maximize" onClick={handleMaximize}>
                        <i className="far fa-square" />
                    </button>
                    <button className="titlebar-btn close-btn" id="closeBtn" title="Close" onClick={handleClose}>
                        <i className="fas fa-times" />
                    </button>
                </div>
            </div>

            {/* ===== MAIN CONTAINER ===== */}
            <div className="main-container">
                {/* Sidebar */}
                <aside className="sidebar" id="sidebar">
                    <nav className="sidebar-nav">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                                data-tab={item.id}
                                onClick={() => setActiveTab(item.id)}
                            >
                                <i className={item.icon} />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>
                    <div className="sidebar-footer">
                        <div className="version-info">
                            <span>v1.0.0</span>
                        </div>
                    </div>
                </aside>

                {/* Content */}
                <main className="content" id="content">

                    {/* ========== DASHBOARD ========== */}
                    {activeTab === 'dashboard' && (
                        <section className="tab-content active" id="tabDashboard">

                            {/* Status Banner */}
                            <div className={`status-banner ${someRunning ? 'running' : 'stopped'}`} id="statusBanner">
                                <div className="status-pulse" />
                                <div className="status-info">
                                    <h2 id="statusTitle">
                                        {!someRunning
                                            ? 'All services are stopped'
                                            : allRunning
                                                ? 'All services are running'
                                                : `${runningCount} of ${totalCount} services running`}
                                    </h2>
                                    <p id="statusSubtitle">
                                        {!someRunning
                                            ? 'Click "Start All" to begin development'
                                            : allRunning
                                                ? 'Your development environment is ready'
                                                : 'Some services are stopped'}
                                    </p>
                                </div>
                                <div className="status-actions">
                                    {!someRunning && (
                                        <button type="button" className="btn btn-start" id="btnStartAll" onClick={startAll}>
                                            <i className="fas fa-play" /><span>Start All</span>
                                        </button>
                                    )}
                                    {someRunning && (
                                        <>
                                            <button type="button" className="btn btn-stop" id="btnStopAll" onClick={stopAll}>
                                                <i className="fas fa-stop" /><span>Stop All</span>
                                            </button>
                                            <button type="button" className="btn btn-reload" id="btnReloadAll" onClick={reloadAll}>
                                                <i className="fas fa-sync-alt" /><span>Reload</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Service Cards */}
                            <div className="section-header">
                                <h3><i className="fas fa-cubes" /> Services</h3>
                            </div>
                            <div className="service-grid" id="serviceGrid">
                                {Object.entries(activeServices).map(([key, svc]) => (
                                    <ServiceCard
                                        key={key}
                                        serviceKey={key}
                                        svc={svc}
                                        running={services[key]}
                                        installationStatus={installationStatus[key]}
                                        installing={installing[key]}
                                        handleInstallService={handleInstallService}
                                        toggleService={toggleService}
                                    />
                                ))}
                            </div>

                            {/* Quick Actions */}
                            <div className="section-header">
                                <h3><i className="fas fa-bolt" /> Quick Actions</h3>
                            </div>
                            <div className="quick-actions">
                                <QuickActionButton
                                    id="btnWeb"
                                    title="Open localhost"
                                    label="Web"
                                    icon="fas fa-globe"
                                    onClick={() => {
                                        if (window.require) {
                                            window.require('electron').ipcRenderer.invoke('open-nginx-web');
                                        } else {
                                            addToast('Opening localhost...', 'info');
                                        }
                                    }}
                                />
                                <QuickActionButton
                                    id="btnDatabase"
                                    title="Database Manager"
                                    label="Database"
                                    icon="fas fa-database"
                                    onClick={() => {
                                        if (window.require) {
                                            window.require('electron').ipcRenderer.invoke('open-mysql-db');
                                        } else {
                                            addToast('Opening Database Manager...', 'info');
                                        }
                                    }}
                                />
                                <QuickActionButton
                                    id="btnOpenTerminal"
                                    title="Terminal"
                                    label="Terminal"
                                    icon="fas fa-terminal"
                                    onClick={() => { setActiveTab('terminal'); setTimeout(() => terminalInputRef.current?.focus(), 100); }}
                                />
                                <QuickActionButton
                                    id="btnDocRoot"
                                    title="Document Root"
                                    label="Root"
                                    icon="fas fa-folder-open"
                                    onClick={() => addToast('Opening Document Root...', 'info')}
                                />
                                <QuickActionButton
                                    id="btnQuickCreate"
                                    title="Quick Create Project"
                                    label="Create"
                                    icon="fas fa-plus-circle"
                                    onClick={() => setShowQuickCreate(true)}
                                />
                                <QuickActionButton
                                    id="btnShare"
                                    title="Share via Ngrok"
                                    label="Share"
                                    icon="fas fa-share-alt"
                                    onClick={() => addToast('Quick Share via Ngrok coming soon!', 'info')}
                                />
                            </div>
                        </section>
                    )}

                    {/* ========== SERVICES TAB ========== */}
                    {activeTab === 'services' && (
                        <section className="tab-content active" id="tabServices">
                            <div className="section-header">
                                <h3><i className="fas fa-server" /> Service Management</h3>
                            </div>
                            <div className="services-list">
                                {Object.entries(activeServices).map(([key, svc]) => {
                                    const running = services[key];
                                    return (
                                        <div key={key} className="service-row">
                                            <div className={`service-row-icon ${svc.colorClass}`}>
                                                <i className={svc.icon} />
                                            </div>
                                            <div className="service-row-info">
                                                <h4>{svc.fullName}</h4>
                                                <div className="service-meta">
                                                    <span className="badge badge-version">{svc.version}</span>
                                                    {svc.ports.map((p, i) => (
                                                        <span key={i} className="badge badge-port">{p}</span>
                                                    ))}
                                                    <span className={`badge badge-status ${running ? 'running' : 'stopped'}`}>
                                                        {running ? 'Running' : 'Stopped'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="service-row-actions">
                                                {!running && (
                                                    <button className="btn-sm btn-start" onClick={() => toggleService(key, true)}>
                                                        <i className="fas fa-play" /> Start
                                                    </button>
                                                )}
                                                {running && (
                                                    <>
                                                        <button className="btn-sm btn-stop" onClick={() => toggleService(key, false)}>
                                                            <i className="fas fa-stop" /> Stop
                                                        </button>
                                                        <button className="btn-sm btn-restart" onClick={() => { toggleService(key, false); setTimeout(() => toggleService(key, true), 500); }}>
                                                            <i className="fas fa-redo" /> Restart
                                                        </button>
                                                    </>
                                                )}
                                                <button className="btn-sm btn-outline" title="Config"><i className="fas fa-cog" /></button>
                                                <button className="btn-sm btn-outline" title="Logs"><i className="fas fa-file-alt" /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* ========== PROJECTS TAB ========== */}
                    {activeTab === 'projects' && (
                        <ProjectsTab setShowQuickCreate={setShowQuickCreate} />
                    )}

                    {/* ========== TERMINAL TAB ========== */}
                    {activeTab === 'terminal' && (
                        <section className="tab-content active" id="tabTerminal">
                            <div className="section-header">
                                <h3><i className="fas fa-terminal" /> Terminal</h3>
                                <div className="terminal-tabs-bar">
                                    <button className="terminal-tab active" id="termTab1">
                                        <i className="fas fa-terminal" /> Terminal 1
                                    </button>
                                    <button className="terminal-tab-add" id="addTermTab" title="New tab">
                                        <i className="fas fa-plus" />
                                    </button>
                                </div>
                            </div>
                            <div className="terminal-container" id="terminalContainer">
                                <div className="terminal-output" id="terminalOutput" ref={terminalOutputRef}>
                                    {terminalLines.map((line, i) => (
                                        <div key={i} className={`term-line ${line.type ? 'term-' + line.type : ''}`}>
                                            {line.jsx || line.text}
                                        </div>
                                    ))}
                                </div>
                                <div className="terminal-input-container">
                                    <span className="terminal-prompt-symbol">❯</span>
                                    <input
                                        ref={terminalInputRef}
                                        type="text"
                                        className="terminal-input"
                                        id="terminalInput"
                                        placeholder="Enter command..."
                                        autoComplete="off"
                                        spellCheck={false}
                                        value={terminalInput}
                                        onChange={(e) => setTerminalInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && terminalInput.trim()) {
                                                handleTerminalCommand(terminalInput.trim());
                                                setTerminalInput('');
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {/* ========== SETTINGS TAB ========== */}
                    {activeTab === 'settings' && (
                        <section className="tab-content active" id="tabSettings">
                            <div className="section-header">
                                <h3><i className="fas fa-cog" /> Settings</h3>
                            </div>
                            <div className="settings-container">
                                {/* General */}
                                <div className="settings-group">
                                    <h4 className="settings-group-title"><i className="fas fa-sliders-h" /> General</h4>
                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <label>Auto-start services on launch</label>
                                            <p>Automatically start all services when Nodus Panel opens</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={settings.autoStart} onChange={(e) => updateSetting('autoStart', e.target.checked)} />
                                            <span className="toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <label>Start minimized to tray</label>
                                            <p>Hide window on startup and show in system tray</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={settings.minToTray} onChange={(e) => updateSetting('minToTray', e.target.checked)} />
                                            <span className="toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <label>Auto-create virtual hosts</label>
                                            <p>Automatically configure .test domains for new projects</p>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={settings.autoVhost} onChange={(e) => updateSetting('autoVhost', e.target.checked)} />
                                            <span className="toggle-slider" />
                                        </label>
                                    </div>
                                </div>

                                {/* Paths */}
                                <div className="settings-group">
                                    <h4 className="settings-group-title"><i className="fas fa-folder" /> Paths</h4>
                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <label>Document Root</label>
                                            <p>Directory where your projects are stored</p>
                                        </div>
                                        <div className="setting-path">
                                            <input type="text" className="path-input" value={settings.docRoot} readOnly />
                                            <button className="btn-browse"><i className="fas fa-folder-open" /></button>
                                        </div>
                                    </div>
                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <label>Data Directory</label>
                                            <p>Storage for databases and configuration</p>
                                        </div>
                                        <div className="setting-path">
                                            <input type="text" className="path-input" value={settings.dataDir} readOnly />
                                            <button className="btn-browse"><i className="fas fa-folder-open" /></button>
                                        </div>
                                    </div>
                                    <div className="setting-item">
                                        <div className="setting-info">
                                            <label>Binaries Directory</label>
                                            <p>Storage for service executables (Nginx, MySQL, PHP)</p>
                                        </div>
                                        <div className="setting-path">
                                            <input type="text" className="path-input" value={settings.binDir} readOnly />
                                            <button className="btn-browse"><i className="fas fa-folder-open" /></button>
                                        </div>
                                    </div>
                                </div>

                                {/* Versions */}
                                <div className="settings-group">
                                    <h4 className="settings-group-title"><i className="fas fa-tag" /> Versions</h4>
                                    <div className="ports-grid">
                                        <div className="port-item">
                                            <label>Nginx</label>
                                            <input type="text" className="port-input" style={{ width: '80px' }} value={settings.versionNginx} onChange={(e) => updateSetting('versionNginx', e.target.value)} />
                                        </div>
                                        <div className="port-item">
                                            <label>MySQL</label>
                                            <input type="text" className="port-input" style={{ width: '80px' }} value={settings.versionMysql} onChange={(e) => updateSetting('versionMysql', e.target.value)} />
                                        </div>
                                        <div className="port-item">
                                            <label>PHP</label>
                                            <input type="text" className="port-input" style={{ width: '80px' }} value={settings.versionPhp} onChange={(e) => updateSetting('versionPhp', e.target.value)} />
                                        </div>

                                    </div>
                                </div>

                                {/* Ports */}
                                <div className="settings-group">
                                    <h4 className="settings-group-title"><i className="fas fa-plug" /> Ports</h4>
                                    <div className="ports-grid">
                                        <div className="port-item">
                                            <label>Nginx HTTP</label>
                                            <input type="number" className="port-input" value={settings.portNginxHttp} onChange={(e) => updateSetting('portNginxHttp', e.target.value)} />
                                        </div>
                                        <div className="port-item">
                                            <label>Nginx SSL</label>
                                            <input type="number" className="port-input" value={settings.portNginxSsl} onChange={(e) => updateSetting('portNginxSsl', e.target.value)} />
                                        </div>
                                        <div className="port-item">
                                            <label>MySQL</label>
                                            <input type="number" className="port-input" value={settings.portMysql} onChange={(e) => updateSetting('portMysql', e.target.value)} />
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                </main>
            </div>

            {/* ===== STATUS BAR ===== */}
            <div className="statusbar" id="statusbar">
                <div className="statusbar-left">
                    <span className="statusbar-item" id="sbStatus">
                        <i className={`fas fa-circle status-dot-sm ${someRunning ? 'running' : 'stopped'}`} /> {someRunning ? 'Running' : 'Stopped'}
                    </span>
                    <span className="statusbar-separator">|</span>
                    <span className="statusbar-item" id="sbUptime">
                        <i className="fas fa-clock" /> Uptime: {uptime || '--:--:--'}
                    </span>
                </div>
                <div className="statusbar-right">
                    <span className="statusbar-item">
                        <i className="fas fa-hdd" /> <span id="sbDisk">125 GB free</span>
                    </span>
                    <span className="statusbar-separator">|</span>
                    <span className="statusbar-item">
                        <i className="fas fa-memory" /> <span id="sbMemory">{memoryUsage}</span>
                    </span>
                </div>
            </div>

            {/* ===== MODALS ===== */}
            {showQuickCreate && (
                <QuickCreateModal
                    onClose={() => setShowQuickCreate(false)}
                    onConfirm={handleQuickCreate}
                    frameworks={FRAMEWORKS}
                />
            )}
            {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

            {/* ===== TOASTS ===== */}
            <Toast toasts={toasts} onDismiss={dismissToast} />
        </>
    );
}
