import { useCallback } from 'react';
import { getTimestamp } from '../utils/helpers';

/**
 * Hook untuk menangani aksi umum pada layanan (start, stop, reload)
 */
export function useServiceActions({
    services,
    setServices,
    activeServices,
    installationStatus,
    setInstallationStatus,
    addTermLine,
    addToast
}) {
    // Menjalankan atau menghentikan satu layanan
    const toggleService = useCallback(async (name, start) => {
        if (start) {
            // Cek status instalasi sebelum memulai
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
    }, [addTermLine, addToast, installationStatus, activeServices, setServices, setInstallationStatus]);

    // Memulai semua layanan
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

    // Menghentikan semua layanan
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

    // Memuat ulang semua konfigurasi layanan
    const reloadAll = useCallback(async () => {
        addTermLine(`[${getTimestamp()}] Reloading all services...`, 'info');
        addToast('Reloading all services...', 'info');

        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            const runningNames = Object.entries(services)
                .filter(([_, running]) => running)
                .map(([name, _]) => name);

            try {
                const results = await ipcRenderer.invoke('reload-all-services', runningNames);
                results.forEach(res => {
                    const svcName = activeServices[res.serviceId]?.name || res.serviceId;
                    if (res.success) {
                        addTermLine(`[${getTimestamp()}] ${svcName} reloaded successfully.`, 'success');
                    } else {
                        addTermLine(`[${getTimestamp()}] Failed to reload ${svcName}: ${res.error}`, 'error');
                    }
                });
                addToast('All running services reloaded!', 'success');
            } catch (error) {
                addTermLine(`[${getTimestamp()}] Global reload failure: ${error.message}`, 'error');
                addToast('Failed to reload services', 'error');
            }
        } else {
            // Mock reload
            Object.entries(services).forEach(([name, running]) => {
                if (running) {
                    setTimeout(() => addTermLine(`[${getTimestamp()}] ${activeServices[name].name} reloaded (simulated).`, 'success'), 500);
                }
            });
            setTimeout(() => addToast('All services reloaded!', 'success'), 1000);
        }
    }, [services, activeServices, addTermLine, addToast]);

    return { toggleService, startAll, stopAll, reloadAll };
}
