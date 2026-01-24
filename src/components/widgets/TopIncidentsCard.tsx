import React, { useEffect, useState, useCallback } from 'react';
import DashboardCard from './common/DashboardCard';
import './TopIncidentsCard.css';
import { rimworldApi } from '@/services/rimworldApi';
import { IncidentDef } from '@/types';

interface TopIncidentsCardProps {
    autoRefresh: boolean;
}

const TopIncidentsCard: React.FC<TopIncidentsCardProps> = ({ autoRefresh }) => {
    const [incidents, setIncidents] = useState<IncidentDef[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        try {
            if (incidents.length === 0) setLoading(true);
            const data = await rimworldApi.getTopIncidents(10);
            setIncidents(data);
            setError('');
        } catch (err) {
            console.error(err);
            setError('Failed to fetch incidents');
        } finally {
            setLoading(false);
        }
    }, [incidents.length]);

    // Initial fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Auto Refresh
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchData]);

    // Calculate max weight for the bar charts
    const maxWeight = incidents.length > 0 ? Math.max(...incidents.map(i => i.current_weight)) : 100;

    return (
        <DashboardCard
            title="Next Event Probabilities"
            headerAction={loading ? <span style={{ fontSize: '0.8em', opacity: 0.7 }}>Updating...</span> : null}
        >
            <div className="top-incidents-content">
                {error && <div className="error-msg">{error}</div>}

                {!error && incidents.length === 0 && !loading && (
                    <div className="empty-msg">No incidents found.</div>
                )}

                <div className="incidents-list">
                    {incidents.map((inc) => (
                        <div key={inc.def_name} className="incident-row">
                            <div className="incident-info">
                                <span className="incident-label">{inc.label}</span>
                                <span className="incident-category">{inc.category}</span>
                            </div>
                            <div className="incident-value-container">
                                <span className="incident-weight">{inc.current_weight.toFixed(1)}</span>
                                <div className="weight-bar-bg">
                                    <div
                                        className="weight-bar-fill"
                                        style={{ width: `${(inc.current_weight / maxWeight) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardCard>
    );
};

export default TopIncidentsCard;