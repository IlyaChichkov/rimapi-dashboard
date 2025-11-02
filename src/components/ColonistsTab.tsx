// src/components/ColonistsTab.tsx
import React from 'react';
import ColonistsOverview from './ColonistsOverview';
import './ColonistsTab.css';
import ColonistsSkillsDashboard from './ColonistsSkillsDashboard';

interface ColonistsTabProps {
    colonistsDetailed?: any[];
    loading?: boolean;
    onViewHealth?: (colonistName: string) => void;
}

type ColonistsSubTab = 'overview' | 'skills' | 'work' | 'inventory';

const ColonistsTab: React.FC<ColonistsTabProps> = (props) => {
    const [activeSubTab, setActiveSubTab] = React.useState<ColonistsSubTab>('overview');

    const renderSubTabContent = () => {
        switch (activeSubTab) {
            case 'overview':
                return <ColonistsOverview {...props} />;
            case 'skills':
                return <ColonistsSkillsDashboard {...props} />;
            case 'work':
                return <WorkTabPlaceholder />;
            case 'inventory':
                return <InventoryTabPlaceholder />;
            default:
                return <ColonistsOverview {...props} />;
        }
    };

    return (
        <div className="colonists-tab">
            {/* Sub-tabs Navigation */}
            <div className="colonists-subtabs">
                <button
                    className={`subtab-button ${activeSubTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('overview')}
                >
                    📊 Overview
                </button>
                <button
                    className={`subtab-button ${activeSubTab === 'skills' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('skills')}
                >
                    🎯 Skills
                </button>
                <button
                    className={`subtab-button ${activeSubTab === 'work' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('work')}
                >
                    ⚙️ Work
                </button>
                <button
                    className={`subtab-button ${activeSubTab === 'inventory' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('inventory')}
                >
                    🎒 Inventory
                </button>
            </div>

            {/* Sub-tab Content */}
            <div className="colonists-subtab-content">
                {renderSubTabContent()}
            </div>
        </div>
    );
};

// Placeholder components for work and inventory
const WorkTabPlaceholder: React.FC = () => (
    <div className="tab-placeholder">
        <div className="placeholder-icon">⚙️</div>
        <h3>Work Priorities Management</h3>
        <p>Work assignment and priority management coming soon!</p>
    </div>
);

const InventoryTabPlaceholder: React.FC = () => (
    <div className="tab-placeholder">
        <div className="placeholder-icon">🎒</div>
        <h3>Inventory Management</h3>
        <p>Equipment and inventory management coming soon!</p>
    </div>
);

export default ColonistsTab;