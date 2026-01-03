// src/components/ColonistCard.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Colonist, ColonistDetailed } from '../../types';
import { rimworldApi, getApiBaseUrl, selectAndViewColonist } from '../../services/rimworldApi';
import './ColonistCard.css';

interface ColonistCardProps {
    colonistId: number;
    size: { w: number; h: number };
    onSelectColonist?: (colonistId: number) => void;
    onViewHealth?: (colonistName: string) => void;
    onViewSkills?: (colonistName: string) => void;
    autoRefresh?: boolean;
    lastUpdated?: Date | null;
}

const ColonistCard: React.FC<ColonistCardProps> = ({
    colonistId,
    size,
    onSelectColonist,
    onViewSkills,
    autoRefresh = true,
    lastUpdated,
}) => {
    const [colonist, setColonist] = useState<ColonistDetailed | null>(null);
    const [imageUrl, setImageUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isSelecting, setIsSelecting] = useState(false);

    // Function to fetch colonist data
    const fetchColonistData = useCallback(async () => {
        if (!colonistId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            // Fetch detailed colonist data
            const response = await fetch(`${getApiBaseUrl()}/colonists/detailed`);
            if (response.ok) {
                const data = await response.json();
                const detailedData = data.data;
                const foundColonist = detailedData.find(
                    (c: any) => c.colonist?.id === colonistId
                );
                setColonist(foundColonist || null);
            }

            // Fetch colonist image (less frequently to reduce load)
            if (!imageUrl || Math.random() < 0.2) { // Only refresh image 20% of the time
                const imageResponse = await rimworldApi.getPawnPortraitImage(colonistId.toString());
                if (imageResponse?.image_base64) {
                    setImageUrl(`data:image/png;base64,${imageResponse.image_base64}`);
                }
            }
        } catch (error) {
            console.error('Error fetching colonist data:', error);
        } finally {
            setLoading(false);
        }
    }, [colonistId, imageUrl]);

    // Initial fetch and auto-refresh
    useEffect(() => {
        fetchColonistData();

        if (autoRefresh) {
            // Refresh every 5 seconds (matching dashboard auto-refresh)
            const intervalId = setInterval(() => {
                fetchColonistData();
            }, 5000);

            return () => clearInterval(intervalId);
        }
    }, [fetchColonistData, autoRefresh]);

    // Also refresh when lastUpdated prop changes (from parent)
    useEffect(() => {
        if (lastUpdated && colonistId) {
            fetchColonistData();
        }
    }, [lastUpdated, colonistId, fetchColonistData]);

    const handleSelectColonist = (newColonistId: number) => {
        if (onSelectColonist) {
            onSelectColonist(newColonistId);
        }
        setIsSelecting(false);
    };

    const colonistInfo = colonist?.colonist;
    const medicalInfo = colonist?.colonist_medical_info;
    const needsInfo = colonist; // Assuming this exists in your data structure

    // Convert mood from decimal (0.59) to percentage (59%)
    const moodPercentage = colonistInfo?.mood ? Math.round(colonistInfo.mood * 100) : 0;

    // Get needs values (assuming they're in decimal 0-1 format)
    const hunger = needsInfo?.colonist.hunger ? Math.round(needsInfo.colonist.hunger * 100) : 0;
    const joy = needsInfo?.joy ? Math.round(needsInfo.joy * 100) : 0;
    const sleep = needsInfo?.sleep ? Math.round(needsInfo.sleep * 100) : 0;

    // Helper function to get color based on need value
    const getNeedColor = (value: number) => {
        if (value >= 70) return 'good';
        if (value >= 40) return 'medium';
        return 'bad';
    };

    // Helper function to get emoji based on need value
    const getNeedEmoji = (value: number, type: string) => {
        if (value >= 70) {
            switch (type) {
                case 'hunger': return '🍗';
                case 'joy': return '🛋️';
                case 'sleep': return '😴';
                default: return '✅';
            }
        } else if (value >= 40) {
            switch (type) {
                case 'hunger': return '🍽️';
                case 'joy': return '🪑';
                case 'sleep': return '😴';
                default: return '⚠️';
            }
        } else {
            switch (type) {
                case 'hunger': return '🥩';
                case 'joy': return '💺';
                case 'sleep': return '😵';
                default: return '❌';
            }
        }
    };

    if (!colonistInfo && !isSelecting) {
        return (
            <div className="colonist-card-wrapper empty">
                <p>Select a colonist to display</p>
                <button className="select-colonist-btn layout-drag-ignore" onClick={() => setIsSelecting(true)}>
                    Select Colonist
                </button>
            </div>
        );
    }

    // Determine card size category
    const isSmall = size.w <= 3 || size.h <= 1;
    const isMedium = (size.w <= 6 && size.w > 3) || (size.h <= 2 && size.h > 1);
    const isLarge = size.w > 6 || size.h > 2;

    return (
        <div className={`colonist-card-wrapper size-${isSmall ? 'small' : isMedium ? 'medium' : 'large'}`}>
            <div className="colonist-card-header">
                {isSelecting || !colonistInfo ? (
                    <ColonistSelector
                        currentColonistId={colonistId}
                        onSelect={handleSelectColonist}
                        onCancel={() => setIsSelecting(false)}
                    />
                ) : (
                    <>
                        <div className="colonist-basic-info">
                            {imageUrl && (
                                <div className="colonist-portrait">
                                    <img src={imageUrl} alt={colonistInfo.name} />
                                    {autoRefresh && <div className="refresh-indicator"></div>}
                                </div>
                            )}
                            <div className="colonist-name-mood">
                                <h3>{colonistInfo.name}</h3>
                                <div className="colonist-mood">
                                    <span className="mood-label">Mood:</span>
                                    <span className={`mood-value ${moodPercentage > 50 ? 'good' : 'bad'}`}>
                                        {moodPercentage}%
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            className="change-colonist-btn"
                            onClick={() => setIsSelecting(true)}
                            title="Change colonist"
                        >
                            🔄
                        </button>
                    </>
                )}
            </div>

            {colonistInfo && !isSelecting && (
                <div className="colonist-card-content">
                    {isSmall ? (
                        // Small card: Just mood and basic needs
                        <div className="colonist-small-view">
                            <div className="colonist-needs-small">
                                <div className="need-item">
                                    <span className="need-icon">🍽️</span>
                                    <span className="need-label">Hunger:</span>
                                    <span className={`need-value ${getNeedColor(hunger)}`}>
                                        {hunger}%
                                    </span>
                                </div>
                                <div className="need-item">
                                    <span className="need-icon">🎳</span>
                                    <span className="need-label">Recreation:</span>
                                    <span className={`need-value ${getNeedColor(joy)}`}>
                                        {joy}%
                                    </span>
                                </div>
                                <div className="need-item">
                                    <span className="need-icon">😴</span>
                                    <span className="need-label">Sleep:</span>
                                    <span className={`need-value ${getNeedColor(sleep)}`}>
                                        {sleep}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : isMedium ? (
                        // Medium card: More detailed needs
                        <div className="colonist-medium-view">
                            <div className="colonist-needs-medium">
                                <div className="need-row">
                                    <div className="need-header">
                                        <span className="need-icon-large">{getNeedEmoji(hunger, 'hunger')}</span>
                                        <span className="need-title">Hunger</span>
                                    </div>
                                    <div className="need-bar">
                                        <div
                                            className={`need-bar-fill ${getNeedColor(hunger)}`}
                                            style={{ width: `${hunger}%` }}
                                        ></div>
                                    </div>
                                    <span className={`need-percentage ${getNeedColor(hunger)}`}>{hunger}%</span>
                                </div>
                                <div className="need-row">
                                    <div className="need-header">
                                        <span className="need-icon-large">{getNeedEmoji(joy, 'joy')}</span>
                                        <span className="need-title">Comfort</span>
                                    </div>
                                    <div className="need-bar">
                                        <div
                                            className={`need-bar-fill ${getNeedColor(joy)}`}
                                            style={{ width: `${joy}%` }}
                                        ></div>
                                    </div>
                                    <span className={`need-percentage ${getNeedColor(joy)}`}>{joy}%</span>
                                </div>
                                <div className="need-row">
                                    <div className="need-header">
                                        <span className="need-icon-large">{getNeedEmoji(sleep, 'sleep')}</span>
                                        <span className="need-title">Sleep</span>
                                    </div>
                                    <div className="need-bar">
                                        <div
                                            className={`need-bar-fill ${getNeedColor(sleep)}`}
                                            style={{ width: `${sleep}%` }}
                                        ></div>
                                    </div>
                                    <span className={`need-percentage ${getNeedColor(sleep)}`}>{sleep}%</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Large card: Full details with mood breakdown
                        <div className="colonist-large-view">
                            <div className="colonist-needs-large">
                                <div className="mood-breakdown">
                                    <h4>Mood Breakdown</h4>
                                    <div className="mood-gauge">
                                        <div className="mood-bar">
                                            <div
                                                className="mood-bar-fill"
                                                style={{ width: `${moodPercentage}%` }}
                                            ></div>
                                        </div>
                                        <div className="mood-labels">
                                            <span className="mood-min">😠 0%</span>
                                            <span className="mood-current">{moodPercentage}%</span>
                                            <span className="mood-max">😊 100%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="needs-grid">
                                    <div className="need-card">
                                        <div className="need-card-header">
                                            <span className="need-card-icon">🍽️</span>
                                            <h5>Hunger</h5>
                                        </div>
                                        <div className="need-card-content">
                                            <div className="need-card-bar">
                                                <div
                                                    className={`need-card-fill ${getNeedColor(hunger)}`}
                                                    style={{ width: `${hunger}%` }}
                                                ></div>
                                            </div>
                                            <div className="need-card-stats">
                                                <span className="need-card-value">{hunger}%</span>
                                                <span className="need-card-status">
                                                    {hunger >= 70 ? 'Full' : hunger >= 40 ? 'Hungry' : 'Starving'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="need-card">
                                        <div className="need-card-header">
                                            <span className="need-card-icon">🛋️</span>
                                            <h5>Comfort</h5>
                                        </div>
                                        <div className="need-card-content">
                                            <div className="need-card-bar">
                                                <div
                                                    className={`need-card-fill ${getNeedColor(joy)}`}
                                                    style={{ width: `${joy}%` }}
                                                ></div>
                                            </div>
                                            <div className="need-card-stats">
                                                <span className="need-card-value">{joy}%</span>
                                                <span className="need-card-status">
                                                    {joy >= 70 ? 'Comfortable' : joy >= 40 ? 'Neutral' : 'Uncomfortable'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="need-card">
                                        <div className="need-card-header">
                                            <span className="need-card-icon">😴</span>
                                            <h5>Sleep</h5>
                                        </div>
                                        <div className="need-card-content">
                                            <div className="need-card-bar">
                                                <div
                                                    className={`need-card-fill ${getNeedColor(sleep)}`}
                                                    style={{ width: `${sleep}%` }}
                                                ></div>
                                            </div>
                                            <div className="need-card-stats">
                                                <span className="need-card-value">{sleep}%</span>
                                                <span className="need-card-status">
                                                    {sleep >= 70 ? 'Rested' : sleep >= 40 ? 'Tired' : 'Exhausted'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="colonist-actions-full">
                                    {onViewSkills && (
                                        <button
                                            className="action-btn"
                                            onClick={() => onViewSkills(colonistInfo.name)}
                                        >
                                            📚 View Skills
                                        </button>
                                    )}
                                    <button
                                        className="action-btn"
                                        onClick={() => selectAndViewColonist(colonistId, colonistInfo.name)}
                                    >
                                        👁️ View in Game
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

interface ColonistSelectorProps {
    currentColonistId: number;
    onSelect: (colonistId: number) => void;
    onCancel: () => void;
}

const ColonistSelector: React.FC<ColonistSelectorProps> = ({
    currentColonistId,
    onSelect,
    onCancel,
}) => {
    const [colonists, setColonists] = useState<Colonist[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchColonists = async () => {
            try {
                const data = await rimworldApi.getPawns();
                setColonists(data);
            } catch (error) {
                console.error('Error fetching colonists:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchColonists();
    }, []);

    const filteredColonists = useMemo(() => {
        return colonists.filter(col =>
            col.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [colonists, searchTerm]);

    return (
        <div className="colonist-selector">
            <div className="selector-header">
                <h4>Select Colonist</h4>
                <button className="close-btn" onClick={onCancel}>×</button>
            </div>
            <div className="search-box">
                <input
                    type="text"
                    placeholder="Search colonists..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>
            <div className="colonist-selector-list">
                {filteredColonists.length === 0 ? (
                    <div className="no-results">No colonists found</div>
                ) : (
                    filteredColonists.map(col => (
                        <div
                            key={col.id}
                            className={`colonist-item ${currentColonistId === col.id ? 'selected' : ''} layout-drag-ignore`}
                            onClick={() => onSelect(col.id)}
                        >
                            <span className="colonist-name">{col.name}</span>
                            <span className="colonist-age">{col.age}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ColonistCard;