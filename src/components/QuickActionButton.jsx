import React from 'react';

const QuickActionButton = ({ label, icon, onClick, id, title }) => {
    return (
        <button className="quick-action-btn" id={id} title={title} onClick={onClick}>
            <i className={icon} /><span>{label}</span>
        </button>
    );
};

export default QuickActionButton;
