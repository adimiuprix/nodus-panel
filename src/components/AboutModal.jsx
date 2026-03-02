export default function AboutModal({ onClose }) {
    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ width: 380 }}>
                <div className="modal-header">
                    <h3><i className="fas fa-info-circle" /> About</h3>
                    <button className="modal-close" onClick={onClose}><i className="fas fa-times" /></button>
                </div>
                <div className="modal-body">
                    <div className="about-content">
                        <div className="about-logo"><i className="fas fa-cube" /></div>
                        <div className="about-name">Nodus Panel</div>
                        <div className="about-version">Version 1.0.0</div>
                        <p className="about-desc">
                            Nodus Panel adalah environment pengembangan lokal yang powerful dan mudah digunakan.
                            Kelola web server, database, dan tools development Anda dari satu tempat.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
