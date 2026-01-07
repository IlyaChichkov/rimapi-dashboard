import React from 'react';
import { Layout } from 'react-grid-layout';
import { RimWorldData } from '@/types';
import { CardSettings } from '@/types/dashboardTypes';

// Charts & Cards
import { ColonistStatsChart, ResourcesChart, PowerChart, PopulationChart } from './RimWorldCharts';
import CaravanListCard from '../CaravanListCard';
import ColonySummary from '../ColonySummary';
import ColonistCard from '../ColonistCard';
import SseStatusCard from '../SseStatusCard';
import DashboardResearchCard from '../DashboardResearchCard';
import MessageFeedCard from '../MessageFeedCard';
import FactionRelationsCard from '../FactionRelationsCard';
import DashboardCard from './DashboardCard';
import { GameInfoCard } from '../GameInfoCard';
import WorldMapCard from '../worldMap/WorldMapCard';

interface CardRegistryProps {
    item: Layout[number];
    data: RimWorldData;
    cardSettings: CardSettings;
    onSettingsChange: (id: string, settings: any) => void;
    onOpenSettings: (id: string) => void;
    // Helpers
    colonists: any[];
    resources: any;
    power: any;
    creatures: any;
    autoRefresh: boolean;
    getSortedColonists: (cols: any[], sort: 'name' | 'mood') => any[];
}

export const DashboardCardRegistry: React.FC<CardRegistryProps> = ({
    item, data, cardSettings, onSettingsChange, onOpenSettings,
    colonists, resources, power, creatures, getSortedColonists,
    autoRefresh
}) => {

    const cardId = item.i.split('_')[0];
    const settings = cardSettings[item.i] || {};
    const handleOpenSettings = () => onOpenSettings(item.i);

    // Local state for sorting (could be moved up if needed globally)
    const [sortBy, setSortBy] = React.useState<'name' | 'mood'>('name');

    switch (cardId) {
        case 'caravanList':
            return <CaravanListCard />;

        case 'colonists':
            return (
                <div className="chart-card-content">
                    <div className="chart-header">
                        <h3>Mood</h3>
                        <div className="chart-corner-container">
                            <div className="colonist-count-badge">{colonists.length} Colonists</div>
                            <div className="sort-controls">
                                <span className="sort-label">Sort by:</span>
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="sort-select">
                                    <option className="filter-option" value="name">Name</option>
                                    <option className="filter-option" value="mood">Mood</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="chart-container">
                        {colonists.length > 0 ?
                            <ColonistStatsChart colonists={getSortedColonists(colonists, sortBy)} />
                            : <div className="no-data">No colonist data available</div>
                        }
                    </div>
                </div>
            );

        case 'resources':
            return (
                <div className="chart-card-content">
                    <div className="chart-header">
                        <h3>Resource Distribution</h3>
                        <div className="resource-total">Total: {resources.total_items || 0} items</div>
                    </div>
                    <div className="chart-container">
                        {resources.categories?.length > 0 ?
                            <ResourcesChart resources={resources} /> :
                            <div className="no-data">No resource data available</div>
                        }
                    </div>
                </div>
            );

        case 'power':
            return (
                <div className="chart-card-content">
                    <div className="chart-header">
                        <div className="chart-header-top">
                            <h3>Power Management</h3>
                            <div className="power-header-controls">
                                <div className="power-status">
                                    Net: {(power.current_power || 0) - (power.total_consumption || 0)}W
                                    {(power.total_consumption || 0) > (power.current_power || 0) && (
                                        <span className="power-warning-icon" title="Power consumption exceeds production!">⚠️</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="chart-container"><PowerChart power={power} /></div>
                </div>
            );

        case 'population':
            return (
                <div className="chart-card-content">
                    <div className="chart-header"><h3>Population Overview</h3></div>
                    <div className="chart-container"><PopulationChart creatures={creatures} /></div>
                </div>
            );

        case 'colonySummary':
            const summarySettings = settings.showColonists !== undefined ? settings : { showColonists: true, showAnimals: true, showItems: true, showWealth: true };
            return (
                <ColonySummary
                    data={data}
                    settings={summarySettings}
                    onSettingsChange={(newS) => onSettingsChange(item.i, newS)}
                    onOpenSettings={() => onOpenSettings(item.i)}
                />
            );

        case 'colonist':
            return (
                <div className="colonist-card-wrapper">
                    <ColonistCard
                        colonistId={settings.colonistId || 0}
                        size={{ w: item.w, h: item.h }}
                        onSelectColonist={(id) => onSettingsChange(item.i, { ...settings, colonistId: id })}
                        autoRefresh={autoRefresh}
                        lastUpdated={new Date()} // Passed from parent ideally
                    />
                </div>
            );

        case 'sseStatus': return <SseStatusCard />;
        case 'currentResearch': return <DashboardResearchCard />;
        case 'messageFeed': return <MessageFeedCard />;
        case 'gameInfo':
            return (
                <GameInfoCard
                    map_datetime={data?.map_datetime || {}}
                    weather={data?.weather || {}}
                    gameState={data?.gameState || {}}
                />
            );

        case 'globalMap':
            return (
                <div className="chart-card-content">
                    <div className="chart-header"><h3>World Map</h3></div>
                    <WorldMapCard />
                </div>
            );

        case 'factionRelations':
            return (
                <div className="faction-card-wrapper">
                    <FactionRelationsCard
                        settings={settings}
                        onSettingsChange={(newS) => onSettingsChange(item.i, newS)}
                        autoRefresh={autoRefresh}
                        lastUpdated={new Date()}
                    />
                </div>
            );

        default:
            return <div className="chart-card"><h3>{cardId}</h3><p>Not implemented.</p></div>;
    }
};