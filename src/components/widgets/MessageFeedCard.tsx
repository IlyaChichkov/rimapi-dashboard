// src/components/MessageFeedCard.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { messageStore, Message } from '../../services/messageStore';
import './MessageFeedCard.css';
import DashboardCard from './common/DashboardCard';

const MessageFeedCard: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>(messageStore.getMessages());
    const [hoveredMessage, setHoveredMessage] = useState<Message | null>(null);

    // CHANGED: Track both X and Y coordinates
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMessagesChange = (newMessages: Message[]) => {
            setMessages([...newMessages]);
        };

        messageStore.addListener(handleMessagesChange);

        return () => {
            messageStore.removeListener(handleMessagesChange);
        };
    }, []);

    const clearAllMessages = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMessages([]);
        if ('clear' in messageStore && typeof (messageStore as any).clear === 'function') {
            (messageStore as any).clear();
        } else if ('clearMessages' in messageStore && typeof (messageStore as any).clearMessages === 'function') {
            (messageStore as any).clearMessages();
        }
    };

    const handleMouseEnter = (e: React.MouseEvent, message: Message) => {
        // CHANGED: Capture X and Y
        setCursorPos({ x: e.clientX, y: e.clientY });
        setHoveredMessage(message);
    };

    const handleMouseLeave = () => {
        setHoveredMessage(null);
    };

    const getSeverityClass = (tags: string[]): string => {
        // 1. Critical Priority
        if (tags.includes('ThreatBig')) return 'severity-threat-big';
        if (tags.includes('Death')) return 'severity-death';
        if (tags.includes('GameEnded')) return 'severity-death'; // Treat Game Over like Death

        // 2. High Priority
        if (tags.includes('ThreatSmall')) return 'severity-threat-small';

        // 3. Specific Positive/Neutral Variants
        if (tags.includes('AcceptVisitors') || tags.includes('AcceptJoiner')) return 'severity-positive';
        if (tags.includes('RitualOutcomePositive')) return 'severity-gold';

        // 4. Standard Categories
        if (tags.includes('NegativeEvent') || tags.includes('RitualOutcomeNegative')) return 'severity-negative';
        if (tags.includes('PositiveEvent')) return 'severity-positive';
        if (tags.includes('NeutralEvent')) return 'severity-neutral';

        // 5. Fallback
        return '';
    };

    const getMessageIcon = (message: Message) => {
        const tags = message.tags || [];

        if (tags.includes('NegativeEvent')) return '💀';
        if (tags.includes('PositiveEvent')) return '🎉';
        if (tags.includes('NeutralEvent')) return 'ℹ️';

        switch (message.type) {
            case 'letter': return '📨';
            default: return '💬';
        }
    };

    const renderTooltip = () => {
        if (!hoveredMessage) return null;

        const severityClass = getSeverityClass(hoveredMessage.tags);

        // CHANGED: Dynamic Positioning Logic
        const tooltipWidth = 320; // Matches CSS width
        const viewportWidth = window.innerWidth;

        // Determine if we should show to the Left or Right of the cursor
        // If cursor is on the right half of the screen, show tooltip to the Left
        const showOnLeft = cursorPos.x > (viewportWidth / 2);

        const style: React.CSSProperties = {
            // Keep vertical clamp logic
            top: Math.min(cursorPos.y - 20, window.innerHeight - 300),
            // Dynamic Horizontal positioning
            left: showOnLeft ? 'auto' : cursorPos.x + 20,
            right: showOnLeft ? (viewportWidth - cursorPos.x + 20) : 'auto'
        };

        return createPortal(
            <div
                className={`message-hover-tooltip ${severityClass}`}
                style={style}
            >
                <div className="detail-header">
                    <h4>{getMessageIcon(hoveredMessage)} {hoveredMessage.label}</h4>
                </div>
                <div className="detail-content">
                    {hoveredMessage.tags.length > 0 && (
                        <div className="detail-tags">
                            {hoveredMessage.tags.map(tag => (
                                <span key={tag} className="tag-badge">{tag}</span>
                            ))}
                        </div>
                    )}
                    <div className="detail-text">
                        {hoveredMessage.text}
                    </div>
                    <span className="meta-time">
                        {new Date(hoveredMessage.timestamp).toLocaleString()}
                    </span>
                </div>
            </div>,
            document.body
        );
    };

    return (
        <DashboardCard
            title="Message Feed"
            headerAction={
                <div>
                    {messages.length > 0 && (
                        <button className="clear-btn" onClick={clearAllMessages}>
                            Clear
                        </button>
                    )}
                </div>
            }
        >
            <div className="message-list">
                {messages.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📭</div>
                        <p>No messages yet</p>
                    </div>
                ) : (
                    messages.map((message) => {
                        const severityClass = getSeverityClass(message.tags);
                        const isHovered = hoveredMessage?.id === message.id;

                        return (
                            <div
                                key={message.id}
                                className={`message-item ${severityClass} ${isHovered ? 'hovered' : ''}`}
                                onMouseEnter={(e) => handleMouseEnter(e, message)}
                                onMouseLeave={handleMouseLeave}
                            >
                                <div className="message-icon">
                                    {getMessageIcon(message)}
                                </div>
                                <div className="message-content">
                                    <div className="message-title">
                                        <span className="message-label">{message.label}</span>
                                        <span className="message-time">
                                            {new Date(message.timestamp).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <div className="message-preview">
                                        {message.text}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            {renderTooltip()}
        </DashboardCard>
    );
};

export default MessageFeedCard;