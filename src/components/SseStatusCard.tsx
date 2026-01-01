// src/components/SseStatusCard.tsx
import React, { useState, useEffect } from 'react';
import { sseService } from '../services/sseService';
import './SseStatusCard.css';

const SseStatusCard: React.FC = () => {
    const [status, setStatus] = useState(sseService.getStatus());
    const [eventCount, setEventCount] = useState(sseService.getEventCount());
    const [apiUrl, setApiUrl] = useState(sseService.getApiUrl());

    useEffect(() => {
        const handleStatusChange = (newStatus: 'connecting' | 'connected' | 'disconnected') => {
            setStatus(newStatus);
        };

        const handleEventCountChange = (newEventCount: number) => {
            setEventCount(newEventCount);
        };

        // This component might mount before the URL is set, so we re-check it on status change.
        // A better approach might be a dedicated URL listener in the service.
        if (status === 'connected' || status === 'connecting') {
            setApiUrl(sseService.getApiUrl());
        }

        sseService.addStatusListener(handleStatusChange);
        sseService.addEventCountListener(handleEventCountChange);

        return () => {
            sseService.removeStatusListener(handleStatusChange);
            sseService.removeEventCountListener(handleEventCountChange);
        };
    }, [status]);

    return (
        <div className="sse-status-card">
            <div className="chart-header">
                <h3>SSE Status</h3>
            </div>
            <div className="sse-status-content">
                <div className="sse-status-item">
                    <span className="sse-status-label">URL:</span>
                    <span className="sse-status-value">{apiUrl}/events</span>
                </div>
                <div className="sse-status-item">
                    <span className="sse-status-label">Connection:</span>
                    <span className={`sse-status-value status-${status}`}>{status}</span>
                </div>
                <div className="sse-status-item">
                    <span className="sse-status-label">Events Received:</span>
                    <span className="sse-status-value">{eventCount}</span>
                </div>
            </div>
        </div>
    );
};

export default SseStatusCard;
