import React from 'react';

const ServiceCard = ({
    serviceKey,
    svc,
    running,
    installationStatus,
    installing,
    handleInstallService,
    toggleService
}) => {
    return (
        <div className={`service-card ${running ? 'running' : ''}`} data-service={serviceKey}>
            <div className="service-card-header">
                <div className={`service-icon ${svc.colorClass}`}>
                    <i className={svc.icon} />
                </div>
                <div className={`service-status-dot ${running ? 'running' : 'stopped'}`} />
            </div>

            {/* Tampilkan jika layananb belum terinstall */}
            <div className="service-card-body">
                <h4>{svc.name}</h4>
                <p className="service-version">{svc.version}</p>
                {!installationStatus && !installing && (
                    <button
                        className="btn btn-primary btn-sm"
                        style={{ marginTop: '8px', width: '100%' }}
                        onClick={() => handleInstallService(serviceKey)}
                    >
                        <i className="fas fa-download" /> Install
                    </button>
                )}
                {installing && (
                    <div className="install-progress-container" style={{ marginTop: '12px' }}>
                        <div className="install-progress-bar">
                            <div
                                className="install-progress-fill"
                                style={{ width: `${installing.status === 'completed' ? 100 : (installing.progress || 0)}%` }}
                            />
                        </div>
                        {installing.status === 'downloading' && (
                            <div className="install-status-text" style={{ justifyContent: 'center', fontSize: '10px', opacity: 0.9 }}>
                                {installing.downloadedMB}MB / {installing.totalMB}MB
                            </div>
                        )}
                    </div>
                )}
                {(installationStatus || installationStatus === undefined) && <p className="service-port">Port: {svc.port}</p>}
            </div>

            {/* Tombol Layanan - Hanya tampilkan jika sudah terinstall */}
            {installationStatus && (
                <div className="service-card-footer">
                    <button
                        className={`btn-service-toggle ${running ? 'running' : ''}`}
                        data-service={serviceKey}
                        onClick={() => toggleService(serviceKey, !running)}
                    >
                        <i className={`fas fa-${running ? 'stop' : 'play'}`} />
                    </button>
                    <button className="btn-service-config" title="Configuration">
                        <i className="fas fa-cog" />
                    </button>
                    <button className="btn-service-log" title="View Logs">
                        <i className="fas fa-file-alt" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ServiceCard;