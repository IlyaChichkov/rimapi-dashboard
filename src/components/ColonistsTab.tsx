// src/components/ColonistsTab.tsx
import React from 'react';
import ColonistsOverview from './ColonistsOverview';
import './ColonistsTab.css';
import ColonistsSkillsDashboard from './ColonistsSkillsDashboard';
import WorkTab from './WorkTab';
import { ColonistDetailed } from '../types';

interface ColonistsTabProps {
    colonistsDetailed?: any[];
    loading?: boolean;
    onViewHealth?: (colonistName: string) => void;
    selectedColonist?: any; // Add this line
}


type ColonistsSubTab = 'overview' | 'skills' | 'work' | 'inventory' | 'analyze';

const ColonistsTab: React.FC<ColonistsTabProps> = (props) => {
    const [activeSubTab, setActiveSubTab] = React.useState<ColonistsSubTab>('overview');
    const [skillsFilterColonist, setSkillsFilterColonist] = React.useState<string>('');
    const [selectedColonist, setSelectedColonist] = React.useState<ColonistDetailed | undefined>();

    const renderSubTabContent = () => {
        switch (activeSubTab) {
            case 'work':
                return (
                    <WorkTab
                        colonistsDetailed={props.colonistsDetailed}
                        loading={props.loading}
                        selectedColonist={selectedColonist}
                        onClearFilter={handleClearSelectedColonist}
                    />
                );
            case 'overview':
                return (
                    <ColonistsOverview
                        colonistsDetailed={props.colonistsDetailed}
                        loading={props.loading}
                        onViewHealth={props.onViewHealth}
                        onViewSkills={handleOpenSkillsWithFilter}
                        onViewWork={(colonist) => {
                            setSelectedColonist(colonist);
                            setActiveSubTab('work');
                        }}
                        onViewInventory={(colonist) => {
                            setSelectedColonist(colonist);
                            setActiveSubTab('inventory');
                        }}
                    />
                );
            case 'skills':
                return (
                    <ColonistsSkillsDashboard
                        colonistsDetailed={props.colonistsDetailed}
                        loading={props.loading}
                        filterColonist={skillsFilterColonist}
                        onClearFilter={handleClearSkillsFilter}
                    />
                );
            case 'inventory':
                return <InventoryTabPlaceholder />;
            case 'analyze':
                return <AnalyzeTabPlaceholder />;
            default:
                return <ColonistsOverview {...props} />;
        }
    };

    // Add function to handle opening skills tab with filter
    const handleOpenSkillsWithFilter = (colonistName: string) => {
        setSkillsFilterColonist(colonistName);
        setActiveSubTab('skills');
    };

    // Add function to clear skills filter
    const handleClearSkillsFilter = () => {
        setSkillsFilterColonist('');
    };

    const handleClearSelectedColonist = () => {
        setSelectedColonist(undefined);
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
                <button
                    className={`subtab-button ${activeSubTab === 'analyze' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('analyze')}
                >
                    🔬 Analyze
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

const AnalyzeTabPlaceholder: React.FC = () => (
    <div className="tab-placeholder">
        <div className="placeholder-icon">🔬</div>
        <h3>Analyze Colonists</h3>
        <p>Find suitable roles for colonists. Find nessesary tools/weapons/apparels and assign. Coming soon!</p>
    </div>
);

export default ColonistsTab;