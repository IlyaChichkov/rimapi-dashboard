import React, { useState, useEffect } from 'react';
import { ResearchProgress } from '@/types';
import { rimworldApi } from '@/services/rimworldApi';
import './DashboardResearchCard.css';
import { useAutoRefresh } from '@/components/context/AutoRefreshContext'; // <--- IMPORT

const formatResearchName = (name: string) => {
    if (!name || name === 'None') return 'None';
    return name.replace(/_/g, ' ').replace(/Research/g, '').trim();
};

const DashboardResearchCard: React.FC = () => {
    // 1. Consume Context
    const { isAutoRefreshEnabled, refreshSignal } = useAutoRefresh();

    const [research, setResearch] = useState<ResearchProgress | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchResearch = async () => {
        try {
            // Only set loading if no data exists yet (prevents flickering)
            if (!research) setLoading(true);

            const data = await rimworldApi.fetchResearchProgress();

            if (!data || !data.name || data.name === 'None') {
                // Fallback for idle state
                setResearch({
                    name: 'None',
                    label: 'None',
                    description: 'No research project selected.',
                    progress_percent: 0,
                    is_finished: false,
                    tech_level: 'N/A',
                    research_points: 0,
                    can_start_now: true,
                    player_has_any_appropriate_research_bench: true
                } as ResearchProgress);
            } else {
                setResearch(data);
            }

            setError(null);
        } catch (err) {
            console.error("Research fetch error:", err);
            setError('Failed to load research');
        } finally {
            setLoading(false);
        }
    };

    // 2. Initial Load
    useEffect(() => {
        fetchResearch();
    }, []);

    // 3. Auto Refresh Logic
    useEffect(() => {
        if (!isAutoRefreshEnabled) return;
        const interval = setInterval(fetchResearch, 5000);
        return () => clearInterval(interval);
    }, [isAutoRefreshEnabled]);

    // 4. Manual Refresh Logic
    useEffect(() => {
        if (refreshSignal > 0) {
            setLoading(true);
            fetchResearch();
        }
    }, [refreshSignal]);

    // ... (Rendering logic remains mostly unchanged) ...

    if (error && !research) return <div className="dash-research-card error">{error}</div>;
    if (!research) return <div className="dash-research-card error">Processing...</div>;

    const hasActiveResearch = research.name && research.name !== 'None' && !research.is_finished;
    const isFinished = research.is_finished;
    const canStart = research.can_start_now && research.player_has_any_appropriate_research_bench;

    const getStatusColor = () => {
        if (isFinished) return 'finished';
        if (hasActiveResearch) return 'active';
        if (canStart) return 'available';
        return 'idle';
    };

    const statusText = isFinished ? 'Complete' : hasActiveResearch ? 'In Progress' : 'Idle';

    return (
        <div className={`dash-research-card ${getStatusColor()}`}>
            {/* ... Rest of your JSX (Header, Progress Bar, etc.) ... */}
            <div className="card-header standard-header">
                <h3>Current Research</h3>
                <span className={`status-badge ${getStatusColor()}`}>
                    {statusText}
                </span>
            </div>

            <div className="research-body">
                {hasActiveResearch || isFinished ? (
                    <div className="active-project-container">
                        <div className="compact-header">
                            <span className="compact-title">Research</span>
                            <span className={`compact-badge ${getStatusColor()}`}>{statusText}</span>
                        </div>

                        <div className="project-content-wrapper">
                            <div className="project-icon">
                                {research.tech_level === 'Industrial' ? '🏭' : research.tech_level === 'Spacer' ? '🚀' : '🔬'}
                            </div>

                            <div className="project-info">
                                <h4 className="project-title" title={research.label}>{research.label || formatResearchName(research.name)}</h4>
                                <span className="project-tech-level">{research.tech_level} Tech</span>

                                <p className="project-description">{research.description}</p>

                                {!isFinished && (
                                    <div className="dashboard-progress-container">
                                        <div className="progress-labels">
                                            <span>Progress</span>
                                            <span>{Math.round(research.progress_percent * 100)}%</span>
                                        </div>
                                        <div className="dash-progress-bar">
                                            <div
                                                className="dash-progress-fill"
                                                style={{ width: `${research.progress_percent * 100}%` }}
                                            />
                                        </div>
                                        <div className="points-remaining">
                                            {(research.research_points * (1 - research.progress_percent)).toFixed(0)} pts left
                                        </div>
                                    </div>
                                )}

                                {isFinished && (
                                    <div className="finished-message">Ready for next project</div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="empty-state-research">
                        <div className="compact-header">
                            <span className="compact-title">Research</span>
                        </div>
                        <div className="empty-content-wrapper">
                            <span className="empty-icon">💤</span>
                            <p>No active project</p>
                            {!research.player_has_any_appropriate_research_bench && (
                                <span className="warning-text">⚠️ No Bench</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardResearchCard;