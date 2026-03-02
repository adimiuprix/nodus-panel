import { useState } from 'react';

export default function QuickCreateModal({ onClose, onConfirm, frameworks }) {
    const [projectName, setProjectName] = useState('');
    const [selectedFramework, setSelectedFramework] = useState('laravel');

    const handleConfirm = () => {
        if (!projectName.trim()) return;
        onConfirm(projectName.trim(), selectedFramework);
        setProjectName('');
    };

    return (
        <div className="modal-overlay" id="modalOverlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" id="quickCreateModal">
                <div className="modal-header">
                    <h3><i className="fas fa-magic" /> Quick Create</h3>
                    <button className="modal-close" onClick={onClose}><i className="fas fa-times" /></button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <label>Project Name</label>
                        <input
                            type="text"
                            className="form-input"
                            id="projectNameInput"
                            placeholder="my-awesome-project"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                        />
                    </div>
                    <div className="form-group">
                        <label>Framework</label>
                        <div className="framework-grid">
                            {frameworks.map((fw) => (
                                <button
                                    key={fw.id}
                                    className={`framework-option ${selectedFramework === fw.id ? 'selected' : ''}`}
                                    data-framework={fw.id}
                                    onClick={() => setSelectedFramework(fw.id)}
                                >
                                    <i className={fw.icon} />
                                    <span>{fw.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type='button' className="btn btn-outline" onClick={onClose}>Cancel</button>
                    <button type='button' className="btn btn-primary" onClick={handleConfirm}>
                        <i className="fas fa-rocket" /> Create Project
                    </button>
                </div>
            </div>
        </div>
    );
}
