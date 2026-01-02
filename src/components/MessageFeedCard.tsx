// src/components/MessageFeedCard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { messageStore, Message } from '../services/messageStore';
import './MessageFeedCard.css';

const MessageFeedCard: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>(messageStore.getMessages());
    const [hoveredMessage, setHoveredMessage] = useState<Message | null>(null);
    const [cursorY, setCursorY] = useState(0);

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
        setCursorY(e.clientY);
        setHoveredMessage(message);
    };

    const handleMouseLeave = () => {
        setHoveredMessage(null);
    };

    // 1. Logic to determine CSS class based on tags
    const getSeverityClass = (tags: string[]): string => {
        if (tags.includes('NegativeEvent')) return 'severity-negative';
        if (tags.includes('PositiveEvent')) return 'severity-positive';
        if (tags.includes('NeutralEvent')) return 'severity-neutral';
        return ''; // Default fallback
    };

    // 2. Updated Icon logic to reflect tags
    const getMessageIcon = (message: Message) => {
        const tags = message.tags || [];

        if (tags.includes('NegativeEvent')) return '💀'; // or ⚔️ or ⚠️
        if (tags.includes('PositiveEvent')) return '🎉'; // or 💰 or ✅
        if (tags.includes('NeutralEvent')) return 'ℹ️';

        // Fallback to type-based icons
        switch (message.type) {
            case 'letter': return '📨';
            default: return '💬';
        }
    };

    const renderTooltip = () => {
        if (!hoveredMessage) return null;

        // Apply same severity color to tooltip header
        const severityClass = getSeverityClass(hoveredMessage.tags);

        return createPortal(
            <div
                className={`message-hover-tooltip ${severityClass}`}
                style={{ top: Math.min(cursorY - 20, window.innerHeight - 250) }}
            >
                <div className="detail-header">
                    <h4>{getMessageIcon(hoveredMessage)} {hoveredMessage.label}</h4>
                </div>
                <div className="detail-content">
                    {/* Optional: Show tags in tooltip */}
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
        <div className="message-feed-card">
            <div className="card-header">
                <div className="header-left">
                    <h3>Message Feed</h3>
                    <span className="message-count">({messages.length})</span>
                </div>
                {messages.length > 0 && (
                    <button className="clear-btn" onClick={clearAllMessages}>
                        Clear
                    </button>
                )}
            </div>

            <div className="message-list">
                {messages.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📭</div>
                        <p>No messages yet</p>
                    </div>
                ) : (
                    messages.map((message) => {
                        // Get the class for this specific message
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
        </div>
    );
};

export default MessageFeedCard;