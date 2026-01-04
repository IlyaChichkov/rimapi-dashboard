// src/components/widgets/SseStatusCard.tsx
import React, { useState, useEffect } from 'react';
import { sseService } from '@/services/sseService';
import './SseStatusCard.css';

const SseStatusCard: React.FC = () => {
    const [status, setStatus] = useState(sseService.getStatus());
    const [eventCount, setEventCount] = useState(sseService.getEventCount());
    const [apiUrl, setApiUrl] = useState(sseService.getApiUrl());
    const [readyState, setReadyState] = useState(sseService.getReadyState());
    const [lastEvent, setLastEvent] = useState<string>('No events yet');
    const [eventLog, setEventLog] = useState<string[]>([]);

    useEffect(() => {
        const handleStatusChange = (newStatus: 'connecting' | 'connected' | 'disconnected') => {
            setStatus(newStatus);
        };

        const handleEventCountChange = (newEventCount: number) => {
            setEventCount(newEventCount);
        };

        const handleMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                setLastEvent(`${data.level}: ${data.message.substring(0, 50)}...`);
                setEventLog(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${data.level}: ${data.message.substring(0, 50)}...`]);
            } catch {
                setLastEvent(event.data.substring(0, 50));
                setEventLog(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${event.data.substring(0, 50)}...`]);
            }
        };

        // Add this listener
        sseService.addEventListener('log_message', handleMessage);

        sseService.addEventListener('game_loaded', handleMessage);
        sseService.addEventListener('new_game_created', handleMessage);
        sseService.addEventListener('exit_to_menu', handleMessage);
        sseService.addEventListener('game_saved', handleMessage);
        sseService.addEventListener('settings_changed', handleMessage);
        sseService.addEventListener('storyteller_changed', handleMessage);

        const handleLogEvent = (event: MessageEvent) => {
            setLastEvent(`Log: ${event.data.substring(0, 50)}`);
        };

        // Add listeners
        sseService.addStatusListener(handleStatusChange);
        sseService.addEventCountListener(handleEventCountChange);

        const intervalId = setInterval(() => {
            setReadyState(sseService.getReadyState());
            setApiUrl(sseService.getApiUrl());
        }, 1000);

        return () => {
            sseService.removeStatusListener(handleStatusChange);
            sseService.removeEventCountListener(handleEventCountChange);
            clearInterval(intervalId);
        };
    }, []);

    const readyStateText = () => {
        switch (readyState) {
            case 0: return 'CONNECTING';
            case 1: return 'OPEN';
            case 2: return 'CLOSED';
            default: return 'UNKNOWN';
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'connected': return '#4CAF50';
            case 'connecting': return '#FFC107';
            case 'disconnected': return '#F44336';
            default: return '#9E9E9E';
        }
    };

    return (
        <div className="sse-status-card">
            <div className="chart-header">
                <h3>SSE Status</h3>
                <div className="sse-status-indicator" style={{ backgroundColor: getStatusColor() }}></div>
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
                    <span className="sse-status-label">Ready State:</span>
                    <span className="sse-status-value">{readyState} ({readyStateText()})</span>
                </div>
                <div className="sse-status-item">
                    <span className="sse-status-label">Events Received:</span>
                    <span className="sse-status-value">{eventCount}</span>
                </div>
                <div className="sse-event-log">
                    <h4>Recent Events:</h4>
                    <div className="event-log-content">
                        {eventLog.length === 0 ? (
                            <div className="no-events">No events received yet...</div>
                        ) : (
                            eventLog.map((log, index) => (
                                <div key={index} className="event-log-item">
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SseStatusCard;