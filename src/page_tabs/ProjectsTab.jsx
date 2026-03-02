import React, { useState, useEffect } from 'react';

export default function ProjectsTab({ setShowQuickCreate }) {
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.invoke('get-projects').then(data => {
                if (data) setProjects(data);
            });
        }
    }, []);

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
                            <a href="#" className="project-url">{proj.url}</a>
                        </div>
                        <div className="project-card-actions">
                            <button className="btn-icon" title="Open in browser"><i className="fas fa-external-link-alt" /></button>
                            <button className="btn-icon" title="Open folder"><i className="fas fa-folder-open" /></button>
                            <button className="btn-icon" title="Terminal"><i className="fas fa-terminal" /></button>
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
