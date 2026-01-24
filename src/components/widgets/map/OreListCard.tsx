import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { rimworldApi } from '@/services/rimworldApi';
import { MapOresData } from '@/types';
import { decodeFogGrid } from '@/utils/gridUtils';
import { ORE_COLORS } from './TerrainColors';
import { useAutoRefresh } from '@/components/context/AutoRefreshContext';
import DashboardCard from '../common/DashboardCard';
import './OreListCard.css';

ChartJS.register(ArcElement, Tooltip, Legend);

// Define what counts as "Precious"
const PRECIOUS_IDS = [
    'gold', 'silver', 'jade', 'uranium', 'plasteel', 'mineablegold',
    'mineablesilver', 'mineablejade', 'mineableuranium', 'mineableplasteel',
    'industrial', 'steel'
];

const OreListCard: React.FC = () => {
    const { isAutoRefreshEnabled, refreshSignal } = useAutoRefresh();
    const [oreData, setOreData] = useState<MapOresData | null>(null);
    const [fogGrid, setFogGrid] = useState<Uint8Array | null>(null);
    const [loading, setLoading] = useState(true);
    const [showHidden, setShowHidden] = useState(false);

    // Fetch Logic
    const loadData = useCallback(async () => {
        try {
            if (!oreData) setLoading(true);
            const [oreRes, fogRes] = await Promise.all([
                rimworldApi.getMapOres(0),
                rimworldApi.getFogGrid(0)
            ]);

            if (oreRes?.success) setOreData(oreRes.data);

            if (fogRes?.success && fogRes.data.fog_data) {
                const totalCells = fogRes.data.width * fogRes.data.height;
                setFogGrid(decodeFogGrid(fogRes.data.fog_data, totalCells));
            } else {
                setFogGrid(null);
            }
        } catch (e) {
            console.error("Failed to load ore data", e);
        } finally {
            setLoading(false);
        }
    }, [oreData]);

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        if (!isAutoRefreshEnabled) return;
        const interval = setInterval(loadData, 10000);
        return () => clearInterval(interval);
    }, [isAutoRefreshEnabled, loadData]);

    useEffect(() => {
        if (refreshSignal > 0) { setLoading(true); loadData(); }
    }, [refreshSignal, loadData]);

    // Data Processing for Split Charts
    // 1. Data Processing with Minimum Size Logic
    const chartsData = useMemo(() => {
        if (!oreData || !oreData.ores) return { precious: null, common: null };

        // Temporary storage
        const preciousRaw = { labels: [], data: [], bg: [], border: [] };
        const commonRaw = { labels: [], data: [], bg: [], border: [] };

        // --- A. Gather Raw Data ---
        Object.entries(oreData.ores).forEach(([defName, group]) => {
            let count = 0;
            if (showHidden || !fogGrid) {
                count = group.cells.length;
            } else {
                for (let i = 0; i < group.cells.length; i++) {
                    if (fogGrid[group.cells[i]] === 0) count++;
                }
            }

            if (count > 0) {
                let name = defName.replace(/(Mineable_|mineable_|_Rough|_)/gi, ' ').trim();
                name = name.charAt(0).toUpperCase() + name.slice(1);

                const colorKey = defName.toLowerCase().replace('mineable_', '');
                const rgb = ORE_COLORS[colorKey] || [150, 150, 150];

                const target = PRECIOUS_IDS.some(id => defName.toLowerCase().includes(id)) ? preciousRaw : commonRaw;

                // @ts-ignore
                target.labels.push(name);
                // @ts-ignore
                target.data.push(count);
                // @ts-ignore
                target.bg.push(`rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.8)`);
            }
        });

        // --- B. Transform for Min Size (3%) ---
        const buildOptimizedChart = (dataset: typeof preciousRaw) => {
            const total = dataset.data.reduce((a, b) => a + b, 0);
            const minVal = total * 0.03; // Set min size to 3% of total

            // Create visual data array where small items are bumped up
            const visualData = dataset.data.map(v => (v < minVal ? minVal : v));

            return {
                labels: dataset.labels,
                datasets: [{
                    data: visualData,       // Used for rendering size
                    realData: dataset.data, // Custom prop for Tooltips
                    backgroundColor: dataset.bg,
                    borderWidth: 2,
                    hoverOffset: 10,
                }]
            };
        };

        return {
            precious: preciousRaw.data.length > 0 ? buildOptimizedChart(preciousRaw) : null,
            common: commonRaw.data.length > 0 ? buildOptimizedChart(commonRaw) : null
        };
    }, [oreData, fogGrid, showHidden]);

    // 2. Tooltip Config to use Real Data
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'nearest' as const,
            intersect: false,
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                titleColor: '#ffd700',
                bodyFont: { size: 13 },
                padding: 10,
                cornerRadius: 4,
                displayColors: true,
                callbacks: {
                    label: function (context: any) {
                        // --- CRITICAL CHANGE ---
                        // 1. Access the 'realData' array we created above
                        const realData = context.dataset.realData;
                        const index = context.dataIndex;

                        // 2. Get the actual value and calculate real percentage
                        const realValue = realData[index];
                        const realTotal = realData.reduce((a: number, b: number) => a + b, 0);
                        const pct = ((realValue / realTotal) * 100).toFixed(1) + '%';

                        return ` ${context.label}: ${realValue.toLocaleString()} (${pct})`;
                    }
                }
            }
        },
        cutout: '60%',
        layout: { padding: 10 },
        animation: { animateScale: true, animateRotate: true }
    };

    // Helper to sum real data for center text
    const getRealTotal = (chartData: any) => {
        return chartData.datasets[0].realData.reduce((a: number, b: number) => a + b, 0).toLocaleString();
    };

    const hasData = chartsData.precious || chartsData.common;

    return (
        <DashboardCard
            title="Resource Scanner"
            headerAction={
                <button
                    onClick={(e) => { e.stopPropagation(); if (fogGrid) setShowHidden(!showHidden); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={!fogGrid}
                    className={`ore-scanner-toggle-btn layout-drag-ignore ${showHidden ? 'active' : ''} ${!fogGrid ? 'disabled' : ''}`}
                    title={!fogGrid ? "Fog data unavailable" : showHidden ? "Hide undiscovered resources" : "Reveal all resources"}
                >
                    {!fogGrid ? '⚠️ No Fog Data' : showHidden ? '👁️ All Visible' : '🙈 Fogged'}
                </button>
            }
        >
            <div className="dashboard-card-chart-container">
                {loading && !oreData ? (
                    <div className="ore-list-state">Scanning geological data...</div>
                ) : !hasData ? (
                    <div className="ore-list-state">No resources detected</div>
                ) : (
                    <div className="ore-charts-row">
                        {/* Precious Chart */}
                        {chartsData.precious && (
                            <div className="chart-section">
                                <h4 className="chart-label-top">Precious</h4>
                                <div className="chart-wrapper">
                                    <Doughnut data={chartsData.precious} options={options} />
                                    <div className="chart-center-text">
                                        <strong>{chartsData.precious.datasets[0].data.reduce((a, b) => a + b, 0).toLocaleString()}</strong>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Common Chart */}
                        {chartsData.common && (
                            <div className="chart-section">
                                <h4 className="chart-label-top">Common</h4>
                                <div className="chart-wrapper">
                                    <Doughnut data={chartsData.common} options={options} />
                                    <div className="chart-center-text">
                                        <strong>{chartsData.common.datasets[0].data.reduce((a, b) => a + b, 0).toLocaleString()}</strong>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardCard>
    );
};

export default OreListCard;