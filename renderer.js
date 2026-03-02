// ==========================================
// NODUS PANEL - Renderer Process
// Interactive Logic & Service Management
// ==========================================

const { ipcRenderer, shell } = require('electron');

// ===== STATE =====
const state = {
    services: {
        mysql: { running: false, name: 'MySQL', port: '3306' },
        php: { running: false, name: 'PHP', port: 'FastCGI' },
        node: { running: false, name: 'Node.js', port: '3000' },
    },
    allRunning: false,
    uptime: 0,
    uptimeInterval: null,
};

// ===== WINDOW CONTROLS =====
document.getElementById('minimizeBtn').addEventListener('click', () => {
    ipcRenderer.send('window-minimize');
});

document.getElementById('maximizeBtn').addEventListener('click', () => {
    ipcRenderer.send('window-maximize');
});

document.getElementById('closeBtn').addEventListener('click', () => {
    ipcRenderer.send('window-close');
});

// ===== DROPDOWN MENU =====
const menuBtn = document.getElementById('menuBtn');
const dropdownMenu = document.getElementById('dropdownMenu');

menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('active');
});

document.addEventListener('click', () => {
    dropdownMenu.classList.remove('active');
});

document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
        const action = item.dataset.action;
        dropdownMenu.classList.remove('active');

        switch (action) {
            case 'preferences':
                switchTab('settings');
                break;
            case 'www':
                showToast('Opening Document Root...', 'info');
                break;
            case 'about':
                showAboutDialog();
                break;
            case 'quit':
                ipcRenderer.send('app-quit');
                break;
        }
    });
});

// ===== SIDEBAR NAVIGATION =====
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

function switchTab(tabName) {
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });

    tabContents.forEach(tab => {
        tab.classList.remove('active');
    });

    const targetTab = document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
    if (targetTab) {
        targetTab.classList.add('active');
    }
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        switchTab(item.dataset.tab);
    });
});

// ===== SERVICE MANAGEMENT =====
function updateServiceUI(serviceName, running) {
    state.services[serviceName].running = running;

    // Update dashboard card
    const card = document.querySelector(`.service-card[data-service="${serviceName}"]`);
    if (card) {
        card.classList.toggle('running', running);
    }

    // Update status dot on dashboard
    const statusDot = document.getElementById(`${serviceName}StatusDot`);
    if (statusDot) {
        statusDot.classList.toggle('stopped', !running);
        statusDot.classList.toggle('running', running);
    }

    // Update toggle button on dashboard
    const toggleBtn = document.getElementById(`${serviceName}Toggle`);
    if (toggleBtn) {
        toggleBtn.classList.toggle('running', running);
        toggleBtn.innerHTML = running
            ? '<i class="fas fa-stop"></i>'
            : '<i class="fas fa-play"></i>';
    }

    // Update services tab badge status
    const badgeStatus = document.getElementById(`${serviceName}BadgeStatus`);
    if (badgeStatus) {
        badgeStatus.classList.toggle('stopped', !running);
        badgeStatus.classList.toggle('running', running);
        badgeStatus.textContent = running ? 'Running' : 'Stopped';
    }

    // Update services tab buttons
    const startBtn = document.getElementById(`${serviceName}StartBtn`);
    const stopBtn = document.getElementById(`${serviceName}StopBtn`);
    const restartBtn = document.getElementById(`${serviceName}RestartBtn`);

    if (startBtn) startBtn.classList.toggle('hidden', running);
    if (stopBtn) stopBtn.classList.toggle('hidden', !running);
    if (restartBtn) restartBtn.classList.toggle('hidden', !running);

    // Update overall status
    updateOverallStatus();
}

function updateOverallStatus() {
    const services = Object.values(state.services);
    const runningCount = services.filter(s => s.running).length;
    const allRunning = runningCount === services.length;
    const someRunning = runningCount > 0;

    state.allRunning = allRunning;

    const banner = document.getElementById('statusBanner');
    const statusTitle = document.getElementById('statusTitle');
    const statusSubtitle = document.getElementById('statusSubtitle');
    const btnStartAll = document.getElementById('btnStartAll');
    const btnStopAll = document.getElementById('btnStopAll');
    const btnReloadAll = document.getElementById('btnReloadAll');
    const sbStatus = document.getElementById('sbStatus');

    if (someRunning) {
        banner.classList.remove('stopped');
        banner.classList.add('running');
        statusTitle.textContent = allRunning
            ? 'All services are running'
            : `${runningCount} of ${services.length} services running`;
        statusSubtitle.textContent = allRunning
            ? 'Your development environment is ready'
            : 'Some services are stopped';
        btnStartAll.classList.add('hidden');
        btnStopAll.classList.remove('hidden');
        btnReloadAll.classList.remove('hidden');
        sbStatus.innerHTML = '<i class="fas fa-circle status-dot-sm running"></i> Running';
    } else {
        banner.classList.add('stopped');
        banner.classList.remove('running');
        statusTitle.textContent = 'All services are stopped';
        statusSubtitle.textContent = 'Click "Start All" to begin development';
        btnStartAll.classList.remove('hidden');
        btnStopAll.classList.add('hidden');
        btnReloadAll.classList.add('hidden');
        sbStatus.innerHTML = '<i class="fas fa-circle status-dot-sm stopped"></i> Stopped';

        // Reset uptime
        clearInterval(state.uptimeInterval);
        state.uptime = 0;
        document.getElementById('sbUptime').innerHTML = '<i class="fas fa-clock"></i> Uptime: --:--:--';
    }
}

// Start/Stop all services
document.getElementById('btnStartAll').addEventListener('click', () => {
    startAllServices();
});

document.getElementById('btnStopAll').addEventListener('click', () => {
    stopAllServices();
});

document.getElementById('btnReloadAll').addEventListener('click', () => {
    reloadAllServices();
});

function startAllServices() {
    const serviceNames = Object.keys(state.services);
    let delay = 0;

    serviceNames.forEach(name => {
        setTimeout(() => {
            updateServiceUI(name, true);
            addTerminalLine(`[${getTimestamp()}] Starting ${state.services[name].name}...`, 'info');
            setTimeout(() => {
                addTerminalLine(`[${getTimestamp()}] ${state.services[name].name} started on port ${state.services[name].port}`, 'success');
            }, 300);
        }, delay);
        delay += 400;
    });

    setTimeout(() => {
        showToast('All services started successfully!', 'success');
        startUptime();
    }, delay);
}

function stopAllServices() {
    const serviceNames = Object.keys(state.services);

    serviceNames.forEach(name => {
        updateServiceUI(name, false);
        addTerminalLine(`[${getTimestamp()}] Stopping ${state.services[name].name}...`, 'info');
    });

    setTimeout(() => {
        addTerminalLine(`[${getTimestamp()}] All services stopped.`, 'warning');
        showToast('All services stopped.', 'warning');
    }, 300);
}

function reloadAllServices() {
    addTerminalLine(`[${getTimestamp()}] Reloading all services...`, 'info');
    showToast('Reloading all services...', 'info');

    const serviceNames = Object.keys(state.services);
    serviceNames.forEach(name => {
        if (state.services[name].running) {
            setTimeout(() => {
                addTerminalLine(`[${getTimestamp()}] ${state.services[name].name} reloaded.`, 'success');
            }, Math.random() * 500 + 200);
        }
    });

    setTimeout(() => {
        showToast('All services reloaded!', 'success');
    }, 1000);
}

// Individual service toggle on dashboard
document.querySelectorAll('.btn-service-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const service = btn.dataset.service;
        const isRunning = state.services[service].running;
        toggleService(service, !isRunning);
    });
});

// Individual service buttons on services tab
['mysql', 'php', 'node'].forEach(service => {
    const startBtn = document.getElementById(`${service}StartBtn`);
    const stopBtn = document.getElementById(`${service}StopBtn`);
    const restartBtn = document.getElementById(`${service}RestartBtn`);

    if (startBtn) {
        startBtn.addEventListener('click', () => toggleService(service, true));
    }
    if (stopBtn) {
        stopBtn.addEventListener('click', () => toggleService(service, false));
    }
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            toggleService(service, false);
            setTimeout(() => toggleService(service, true), 500);
        });
    }
});

function toggleService(name, start) {
    updateServiceUI(name, start);

    if (start) {
        addTerminalLine(`[${getTimestamp()}] Starting ${state.services[name].name}...`, 'info');
        setTimeout(() => {
            addTerminalLine(`[${getTimestamp()}] ${state.services[name].name} is running on port ${state.services[name].port}`, 'success');
            showToast(`${state.services[name].name} started!`, 'success');
        }, 300);

        // Start uptime if first service
        const runningCount = Object.values(state.services).filter(s => s.running).length;
        if (runningCount === 1) startUptime();
    } else {
        addTerminalLine(`[${getTimestamp()}] ${state.services[name].name} stopped.`, 'warning');
        showToast(`${state.services[name].name} stopped.`, 'warning');
    }
}

// ===== UPTIME COUNTER =====
function startUptime() {
    clearInterval(state.uptimeInterval);
    state.uptime = 0;

    state.uptimeInterval = setInterval(() => {
        state.uptime++;
        const hours = String(Math.floor(state.uptime / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((state.uptime % 3600) / 60)).padStart(2, '0');
        const seconds = String(state.uptime % 60).padStart(2, '0');
        document.getElementById('sbUptime').innerHTML =
            `<i class="fas fa-clock"></i> Uptime: ${hours}:${minutes}:${seconds}`;
    }, 1000);
}

// ===== QUICK ACTIONS =====
document.getElementById('btnWeb').addEventListener('click', () => {
    shell.openExternal('http://localhost');
    showToast('Opening localhost in browser...', 'info');
});

document.getElementById('btnDatabase').addEventListener('click', () => {
    showToast('Opening Database Manager...', 'info');
});

document.getElementById('btnOpenTerminal').addEventListener('click', () => {
    switchTab('terminal');
    document.getElementById('terminalInput').focus();
});

document.getElementById('btnDocRoot').addEventListener('click', () => {
    showToast('Opening Document Root...', 'info');
});

document.getElementById('btnQuickCreate').addEventListener('click', () => {
    openQuickCreateModal();
});

document.getElementById('btnShare').addEventListener('click', () => {
    showToast('Quick Share via Ngrok coming soon!', 'info');
});

// ===== QUICK CREATE MODAL =====
const modalOverlay = document.getElementById('modalOverlay');

function openQuickCreateModal() {
    modalOverlay.classList.remove('hidden');
}

function closeQuickCreateModal() {
    modalOverlay.classList.add('hidden');
}

document.getElementById('modalClose').addEventListener('click', closeQuickCreateModal);
document.getElementById('btnCancelCreate').addEventListener('click', closeQuickCreateModal);
document.getElementById('addProjectCard').addEventListener('click', openQuickCreateModal);
document.getElementById('btnNewProject').addEventListener('click', openQuickCreateModal);

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeQuickCreateModal();
});

// Framework selection
document.querySelectorAll('.framework-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.framework-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
    });
});

document.getElementById('btnConfirmCreate').addEventListener('click', () => {
    const name = document.getElementById('projectNameInput').value.trim();
    const framework = document.querySelector('.framework-option.selected')?.dataset.framework;

    if (!name) {
        showToast('Please enter a project name!', 'error');
        return;
    }

    closeQuickCreateModal();
    addTerminalLine(`[${getTimestamp()}] Creating project "${name}" with ${framework}...`, 'info');
    showToast(`Creating project "${name}"...`, 'info');

    setTimeout(() => {
        addTerminalLine(`[${getTimestamp()}] Project "${name}" created successfully!`, 'success');
        showToast(`Project "${name}" created!`, 'success');
    }, 2000);
});

// ===== TERMINAL =====
const terminalInput = document.getElementById('terminalInput');
const terminalOutput = document.getElementById('terminalOutput');

const commands = {
    help: () => {
        return [
            { text: 'Available Commands:', type: 'info' },
            { text: '  help          — Show this help message', type: '' },
            { text: '  status        — Show service status', type: '' },
            { text: '  start [service] — Start a service (mysql, php, node)', type: '' },
            { text: '  stop [service]  — Stop a service', type: '' },
            { text: '  restart [svc]   — Restart a service', type: '' },
            { text: '  start all     — Start all services', type: '' },
            { text: '  stop all      — Stop all services', type: '' },
            { text: '  clear         — Clear terminal', type: '' },
            { text: '  version       — Show version info', type: '' },
        ];
    },
    status: () => {
        const lines = [{ text: 'Service Status:', type: 'info' }];
        for (const [key, service] of Object.entries(state.services)) {
            const status = service.running ? '● Running' : '○ Stopped';
            const color = service.running ? 'success' : '';
            lines.push({ text: `  ${service.name.padEnd(12)} ${status.padEnd(12)} Port: ${service.port}`, type: color });
        }
        return lines;
    },
    version: () => {
        return [
            { text: 'Nodus Panel v1.0.0', type: 'info' },
            { text: 'Electron-based local development environment', type: '' },
        ];
    },
    clear: () => {
        terminalOutput.innerHTML = '';
        return [];
    },
};

terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const input = terminalInput.value.trim();
        if (!input) return;

        terminalInput.value = '';
        addTerminalLine(`❯ ${input}`, 'user-cmd');

        const parts = input.toLowerCase().split(' ');
        const cmd = parts[0];
        const arg = parts.slice(1).join(' ');

        if (commands[cmd]) {
            const results = commands[cmd]();
            results.forEach(line => addTerminalLine(line.text, line.type));
        } else if (cmd === 'start') {
            if (arg === 'all') {
                startAllServices();
            } else if (state.services[arg]) {
                toggleService(arg, true);
            } else {
                addTerminalLine(`Unknown service: "${arg}". Use: mysql, php, node`, 'error');
            }
        } else if (cmd === 'stop') {
            if (arg === 'all') {
                stopAllServices();
            } else if (state.services[arg]) {
                toggleService(arg, false);
            } else {
                addTerminalLine(`Unknown service: "${arg}". Use: mysql, php, node`, 'error');
            }
        } else if (cmd === 'restart') {
            if (state.services[arg]) {
                toggleService(arg, false);
                setTimeout(() => toggleService(arg, true), 500);
            } else {
                addTerminalLine(`Unknown service: "${arg}". Use: mysql, php, node`, 'error');
            }
        } else {
            addTerminalLine(`Command not found: "${cmd}". Type 'help' for available commands.`, 'error');
        }
    }
});

function addTerminalLine(text, type) {
    const line = document.createElement('div');
    line.className = `term-line ${type ? 'term-' + type : ''}`;
    line.textContent = text;
    terminalOutput.appendChild(line);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');

    const iconMap = {
        success: 'fas fa-check-circle',
        error: 'fas fa-times-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle',
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
    <i class="toast-icon ${iconMap[type]}"></i>
    <span class="toast-message">${message}</span>
    <button class="toast-close"><i class="fas fa-times"></i></button>
  `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => dismissToast(toast));

    setTimeout(() => dismissToast(toast), 4000);
}

function dismissToast(toast) {
    if (!toast.parentNode) return;
    toast.classList.add('toast-exit');
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 250);
}

// ===== ABOUT DIALOG =====
function showAboutDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
    <div class="modal" style="width: 380px;">
      <div class="modal-header">
        <h3><i class="fas fa-info-circle"></i> About</h3>
        <button class="modal-close" id="aboutClose"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="about-content">
          <div class="about-logo"><i class="fas fa-cube"></i></div>
          <div class="about-name">Nodus Panel</div>
          <div class="about-version">Version 1.0.0</div>
          <p class="about-desc">
            Nodus Panel adalah environment pengembangan lokal yang powerful dan mudah digunakan. 
            Kelola web server, database, dan tools development Anda dari satu tempat.
          </p>
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);

    overlay.querySelector('#aboutClose').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

// ===== SYSTEM INFO (Simulated) =====
function updateSystemInfo() {
    const memUsed = (Math.random() * 200 + 100).toFixed(0);
    document.getElementById('sbMemory').textContent = `${memUsed} MB`;
    document.getElementById('sbDisk').textContent = '125 GB free';
}

updateSystemInfo();
setInterval(updateSystemInfo, 5000);

// ===== TRAY ACTIONS =====
ipcRenderer.on('tray-action', (event, action) => {
    switch (action) {
        case 'start-all':
            startAllServices();
            break;
        case 'stop-all':
            stopAllServices();
            break;
    }
});

// ===== UTILITY =====
function getTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('id-ID', { hour12: false });
}

// ===== TERMINAL SUCCESS/WARNING STYLES =====
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .term-success { color: #10b981; }
  .term-warning { color: #f59e0b; }
  .term-user-cmd { color: #f59e0b; font-weight: 500; }
`;
document.head.appendChild(styleSheet);

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    // Ctrl+1-5 for tab switching
    if (e.ctrlKey && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const tabs = ['dashboard', 'services', 'projects', 'terminal', 'settings'];
        switchTab(tabs[parseInt(e.key) - 1]);
    }

    // Ctrl+Shift+S to start all
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (state.allRunning) {
            stopAllServices();
        } else {
            startAllServices();
        }
    }

    // Escape to close modals
    if (e.key === 'Escape') {
        closeQuickCreateModal();
        const aboutOverlay = document.querySelector('.modal-overlay:not(#modalOverlay)');
        if (aboutOverlay) aboutOverlay.remove();
    }
});

console.log('Nodus Panel renderer loaded successfully.');
