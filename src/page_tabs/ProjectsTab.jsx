import React, { useState, useEffect } from 'react';

export default function ProjectsTab({ setShowQuickCreate }) {
    const [projects, setProjects] = useState([]);

    const fetchProjects = () => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('get-projects').then(data => {
                if (data) setProjects(data);
            });
        }
    };

    useEffect(() => {
        fetchProjects();

        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            const handler = () => fetchProjects();
            ipcRenderer.on('projects-updated', handler);
            return () => ipcRenderer.removeListener('projects-updated', handler);
        }
    }, []);

    const handleOpenBrowser = (e, url) => {
        if (e) e.preventDefault();
        if (window.require) {
            const { shell } = window.require('electron');
            const fullUrl = url.startsWith('http') ? url : `http://${url}`;
            shell.openExternal(fullUrl);
        }
    };

    const handleOpenFolder = (path) => {
        if (window.require && path) {
            const { shell } = window.require('electron');
            shell.openPath(path);
        }
    };

    const handleDeleteProject = async (projectName) => {
        if (confirm(`Apakah Anda yakin ingin menghapus proyek "${projectName}"? (File konfigurasi akan dihapus, namun folder proyek akan tetap ada)`)) {
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                const result = await ipcRenderer.invoke('delete-project', projectName);
                if (!result.success) {
                    alert(`Gagal menghapus proyek: ${result.error}`);
                }
            }
        }
    };

    return (
        <section className="tab-content active" id="tabProjects">
            <div className="section-header">
                <h3><i className="fas fa-project-diagram" /> Projects</h3>
                <button className="btn btn-primary btn-sm" id="btnNewProject" onClick={() => setShowQuickCreate(true)}>
                    <i className="fas fa-plus" /> New Project
                </button>
            </div>
            <div className="projects-grid" id="projectsGrid">
                {projects.map((proj, i) => (
                    <div key={i} className="project-card">
                        <div className={`project-card-icon ${proj.colorClass}`}>
                            <i className={proj.iconClass} />
                        </div>
                        <div className="project-card-body">
                            <h4>{proj.name}</h4>
                            <p className="project-framework">{proj.framework}</p>
                            <a
                                href="#"
                                className="project-url"
                                onClick={(e) => handleOpenBrowser(e, proj.url)}
                            >
                                {proj.url}
                            </a>
                        </div>
                        <div className="project-card-actions">
                            <button
                                className="btn-icon"
                                title="Open in browser"
                                onClick={() => handleOpenBrowser(null, proj.url)}
                            >
                                <i className="fas fa-external-link-alt" />
                            </button>
                            <button
                                className="btn-icon"
                                title="Open folder"
                                onClick={() => handleOpenFolder(proj.path)}
                            >
                                <i className="fas fa-folder-open" />
                            </button>
                            <button
                                className="btn-icon"
                                title="Delete"
                                onClick={() => handleDeleteProject(proj.name)}
                            >
                                <i className="fas fa-trash" />
                            </button>
                        </div>
                    </div>
                ))}
                <div className="project-card project-card-add" onClick={() => setShowQuickCreate(true)}>
                    <i className="fas fa-plus-circle" />
                    <span>Add Project</span>
                </div>
            </div>
        </section>
    );
}
