import React from 'react';
import { Layout } from 'react-grid-layout';
import { RimWorldData } from '@/types';
import { CardSettings } from '@/types/dashboardTypes';

// Charts & Cards
import { ColonistStatsChart, ResourcesChart, PowerChart, PopulationChart } from './RimWorldCharts';
import CaravanListCard from '../CaravanListCard';
import ColonySummary from '../ColonySummary';
import ColonistCard from '../ColonistCard';
import IncidentChanceCard from '../TopIncidentsCard';
import SseStatusCard from '../SseStatusCard';
import DashboardResearchCard from '../DashboardResearchCard';
import MessageFeedCard from '../MessageFeedCard';
import FactionRelationsCard from '../FactionRelationsCard';
import DashboardCard from './DashboardCard';
import { GameInfoCard } from '../GameInfoCard';
import WorldMapCard from '../worldMap/WorldMapCard';
import OreListCard from '../map/OreListCard';
import TopIncidentsCard from '../TopIncidentsCard';
import TimeControlsCard from '../controls/TimeControlsCard';

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
                <DashboardCard
                    title="Colonist Mood"
                    headerAction={
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
                    }
                >
                    <div className="chart-container">
                        {colonists.length > 0 ?
                            <ColonistStatsChart colonists={getSortedColonists(colonists, sortBy)} />
                            : <div className="no-data">No colonist data available</div>
                        }
                    </div>
                </DashboardCard>
            );

        case 'resources':
            return (
                <DashboardCard
                    title="Storages"
                    headerAction={<div className="resource-total">Total: {resources.total_items || 0} items</div>}>
                    <div className="chart-card-content">
                        <div className="chart-container">
                            {resources.categories?.length > 0 ?
                                <ResourcesChart resources={resources} /> :
                                <div className="no-data">No resource data available</div>
                            }
                        </div>
                    </div>
                </DashboardCard>
            );

        case 'topIncidents':
            return (
                <TopIncidentsCard
                    autoRefresh={autoRefresh}
                />
            );

        case 'power':
            return (
                <DashboardCard
                    title="Power Management"
                    headerAction={
                        <div className="power-header-controls">
                            <div className="power-status">
                                Net: {(power.current_power || 0) - (power.total_consumption || 0)}W
                                {(power.total_consumption || 0) > (power.current_power || 0) && (
                                    <span className="power-warning-icon" title="Power consumption exceeds production!">⚠️</span>
                                )}
                            </div>
                        </div>
                    }
                >
                    <div className="chart-container"><PowerChart power={power} /></div>
                </DashboardCard>
            );

        case 'population':
            return (
                <DashboardCard
                    title="Population Overview">
                    <div className="chart-container"><PopulationChart creatures={creatures} /></div>
                </DashboardCard>
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
                <div style={{ height: '100%', width: '100%' }}> {/* Simple container, no style */}
                    <ColonistCard
                        colonistId={settings.colonistId || 0}
                        size={{ w: item.w, h: item.h }}
                        onSelectColonist={(id) => onSettingsChange(item.i, { ...settings, colonistId: id })}
                        autoRefresh={autoRefresh}
                        lastUpdated={new Date()}
                    />
                </div>);

        case 'sseStatus': return <SseStatusCard />;
        case 'currentResearch': return (
            <DashboardCard>
                <DashboardResearchCard />
            </DashboardCard>);
        case 'messageFeed': return <MessageFeedCard />;
        case 'gameInfo':
            return (
                <DashboardCard>
                    <GameInfoCard
                        map_datetime={data?.map_datetime || {}}
                        weather={data?.weather || {}}
                        gameState={data?.gameState || {}}
                    />
                </DashboardCard>
            );

        case 'globalMap':
            return (
                <DashboardCard
                    title="World Map"
                >
                    <WorldMapCard />
                </DashboardCard>
            );
        case 'oreScanner':
            return <OreListCard />;

        case 'timeControls':
            return <TimeControlsCard />;

        case 'factionRelations':
            return (
                <FactionRelationsCard
                    settings={settings}
                    onSettingsChange={(newS) => onSettingsChange(item.i, newS)}
                    autoRefresh={autoRefresh}
                    lastUpdated={new Date()}
                />
            );

        default:
            return <div className="chart-card"><h3>{cardId}</h3><p>Not implemented.</p></div>;
    }
};