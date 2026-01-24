// src/components/ColonistCard.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Colonist, ColonistDetailed } from '../../types';
import { rimworldApi, getApiBaseUrl, selectAndViewColonist } from '../../services/rimworldApi';
import './ColonistCard.css';
import DashboardCard from './common/DashboardCard';
import { useAutoRefresh } from '../context/AutoRefreshContext';

interface ColonistCardProps {
    colonistId: number;
    size: { w: number; h: number };
    onSelectColonist?: (colonistId: number) => void;
    onViewSkills?: (colonistName: string) => void;
    autoRefresh?: boolean;
    lastUpdated?: Date | null;
}

const ColonistCard: React.FC<ColonistCardProps> = ({
    colonistId,
    size,
    onSelectColonist,
    onViewSkills,
    lastUpdated,
}) => {
    const { isAutoRefreshEnabled, refreshSignal } = useAutoRefresh();
    const [colonist, setColonist] = useState<ColonistDetailed | null>(null);
    const [imageUrl, setImageUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isSelecting, setIsSelecting] = useState(false);

    // Track the last fetched ID to prevent image flickering on auto-refresh
    const lastFetchedIdRef = useRef<number | null>(null);

    const fetchColonistData = useCallback(async () => {
        if (!colonistId) {
            setColonist(null);
            setImageUrl('');
            setLoading(false);
            return;
        }

        const isIdChanged = lastFetchedIdRef.current !== colonistId;

        try {
            // Only set loading true. Do NOT clear data here.
            // This prevents the "Old -> Empty -> New" blink.
            // The User sees "Old" until "New" arrives.
            setLoading(true);

            // 1. Fetch Detailed Stats
            const response = await fetch(`${getApiBaseUrl()}/colonists/detailed`);
            if (response.ok) {
                const data = await response.json();
                const detailedData = data.data;
                const foundColonist = detailedData.find(
                    (c: any) => c.colonist?.id === colonistId
                );
                // React will batch this update with the image update if they happen close enough,
                // or update sequentially.
                setColonist(foundColonist || null);
            }

            // 2. Fetch Image
            // We force fetch if the ID changed, OR if we randomly refresh (10% chance)
            // This ensures when we switch pawn, we definitely get the new face.
            if (isIdChanged || !imageUrl || Math.random() < 0.1) {
                const imageResponse = await rimworldApi.getPawnPortraitImage(colonistId.toString());
                if (imageResponse?.image_base64) {
                    setImageUrl(`data:image/png;base64,${imageResponse.image_base64}`);
                }
            }

            lastFetchedIdRef.current = colonistId;

        } catch (error) {
            console.error('Error fetching colonist data:', error);
        } finally {
            setLoading(false);
        }
    }, [colonistId, imageUrl]);

    // Initial Fetch & Watchers
    useEffect(() => {
        fetchColonistData();
    }, [fetchColonistData]);

    useEffect(() => {
        if (!isAutoRefreshEnabled) return;
        const interval = setInterval(fetchColonistData, 5000);
        return () => clearInterval(interval);
    }, [isAutoRefreshEnabled, fetchColonistData]);

    useEffect(() => {
        if ((lastUpdated && colonistId) || refreshSignal > 0) {
            fetchColonistData();
        }
    }, [lastUpdated, colonistId, fetchColonistData, refreshSignal]);

    // HANDLE SELECTION
    const handleSelectColonist = (newColonistId: number) => {
        if (onSelectColonist) {
            onSelectColonist(newColonistId);
        }
        setIsSelecting(false);
        // Note: We don't manually clear state here; we let the useEffect/fetch 
        // handle the transition naturally to avoid layout shifts.
    };

    const colonistInfo = colonist?.colonist;
    const needsInfo = colonist;
    const moodPercentage = colonistInfo?.mood ? Math.round(colonistInfo.mood * 100) : 0;
    const hunger = needsInfo?.colonist.hunger ? Math.round(needsInfo.colonist.hunger * 100) : 0;
    const joy = needsInfo?.joy ? Math.round(needsInfo.joy * 100) : 0;
    const sleep = needsInfo?.sleep ? Math.round(needsInfo.sleep * 100) : 0;

    const getNeedColor = (value: number) => {
        if (value >= 70) return 'good';
        if (value >= 40) return 'medium';
        return 'bad';
    };

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

    const isSmall = size.w <= 3 || size.h <= 1;

    // --- RENDER ---
    return (
        <DashboardCard>
            <div className="dashboard-card-content-wrapper" style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>

                {/* 1. SELECTION OVERLAY */}
                {isSelecting ? (
                    <div className="colonist-selector-full-overlay layout-drag-ignore">
                        <div className="overlay-header">
                            <h3>Select Colonist</h3>
                            <button className="close-btn" onClick={() => setIsSelecting(false)}>✕</button>
                        </div>
                        <ColonistSelector
                            currentColonistId={colonistId}
                            onSelect={handleSelectColonist}
                            onCancel={() => setIsSelecting(false)}
                        />
                    </div>
                ) : (
                    /* 2. VIEW MODES */
                    <>
                        {/* A. EMPTY STATE (No ID assigned) */}
                        {!colonistId ? (
                            <div className="colonist-empty-state layout-drag-ignore">
                                <div className="empty-icon">👤</div>
                                <p>No colonist assigned</p>
                                <button
                                    className="select-pawn-btn"
                                    onClick={() => setIsSelecting(true)}
                                >
                                    Select Colonist
                                </button>
                            </div>
                        ) : colonistInfo ? (
                            /* B. SUCCESS STATE (Data loaded) */
                            <div style={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'opacity 0.2s',
                                opacity: loading ? 0.7 : 1
                            }}>
                                <div className="colonist-card-header">
                                    <div className="colonist-basic-info">
                                        <div className="colonist-portrait">
                                            {imageUrl ? (
                                                <img src={imageUrl} alt={colonistInfo.name} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.05)' }} />
                                            )}
                                            {isAutoRefreshEnabled && <div className="refresh-indicator"></div>}
                                        </div>

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
                                        className="change-colonist-btn layout-drag-ignore"
                                        onClick={(e) => { e.stopPropagation(); setIsSelecting(true); }}
                                        title="Change colonist"
                                    >
                                        🔄
                                    </button>
                                </div>

                                <div className="colonist-card-content">
                                    {isSmall ? (
                                        <div className="colonist-small-view">
                                            <div className="colonist-needs-small">
                                                <div className="need-item">
                                                    <span className="need-icon">🍽️</span>
                                                    <span className="need-label">Hunger:</span>
                                                    <span className={`need-value ${getNeedColor(hunger)}`}>{hunger}%</span>
                                                </div>
                                                <div className="need-item">
                                                    <span className="need-icon">🎳</span>
                                                    <span className="need-label">Joy:</span>
                                                    <span className={`need-value ${getNeedColor(joy)}`}>{joy}%</span>
                                                </div>
                                                <div className="need-item">
                                                    <span className="need-icon">😴</span>
                                                    <span className="need-label">Sleep:</span>
                                                    <span className={`need-value ${getNeedColor(sleep)}`}>{sleep}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="colonist-large-view">
                                            <div className="mood-breakdown">
                                                <div className="mood-gauge">
                                                    <div className="mood-bar">
                                                        <div className="mood-bar-fill" style={{ width: `${moodPercentage}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="needs-grid">
                                                <div className="need-card">
                                                    <div className="need-card-header">
                                                        <span className="need-card-icon">{getNeedEmoji(hunger, 'hunger')}</span>
                                                        <h5>Hunger</h5>
                                                    </div>
                                                    <div className="need-card-bar">
                                                        <div className={`need-card-fill ${getNeedColor(hunger)}`} style={{ width: `${hunger}%` }}></div>
                                                    </div>
                                                    <div className="need-card-stats">
                                                        <span className={`need-card-value ${getNeedColor(hunger)}`}>{hunger}%</span>
                                                    </div>
                                                </div>

                                                <div className="need-card">
                                                    <div className="need-card-header">
                                                        <span className="need-card-icon">{getNeedEmoji(joy, 'joy')}</span>
                                                        <h5>Joy</h5>
                                                    </div>
                                                    <div className="need-card-bar">
                                                        <div className={`need-card-fill ${getNeedColor(joy)}`} style={{ width: `${joy}%` }}></div>
                                                    </div>
                                                    <div className="need-card-stats">
                                                        <span className={`need-card-value ${getNeedColor(joy)}`}>{joy}%</span>
                                                    </div>
                                                </div>

                                                <div className="need-card">
                                                    <div className="need-card-header">
                                                        <span className="need-card-icon">{getNeedEmoji(sleep, 'sleep')}</span>
                                                        <h5>Sleep</h5>
                                                    </div>
                                                    <div className="need-card-bar">
                                                        <div className={`need-card-fill ${getNeedColor(sleep)}`} style={{ width: `${sleep}%` }}></div>
                                                    </div>
                                                    <div className="need-card-stats">
                                                        <span className={`need-card-value ${getNeedColor(sleep)}`}>{sleep}%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="colonist-actions-full">
                                                {onViewSkills && (
                                                    <button className="action-btn layout-drag-ignore" onClick={() => onViewSkills(colonistInfo.name)}>
                                                        📚 View Skills
                                                    </button>
                                                )}
                                                <button className="action-btn layout-drag-ignore" onClick={() => selectAndViewColonist(colonistId, colonistInfo.name)}>
                                                    👁️ View in Game
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* C. ERROR / LOADING STATE (ID exists, but data is missing) */
                            <div className="colonist-empty-state layout-drag-ignore">
                                {loading ? (
                                    <>
                                        <div className="empty-icon">⏳</div>
                                        <p>Loading colonist...</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="empty-icon">👻</div>
                                        <p>Colonist unavailable</p>
                                        <button
                                            className="select-pawn-btn"
                                            onClick={() => setIsSelecting(true)}
                                        >
                                            Select Another
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </DashboardCard>
    );
};

// --- SELECTOR COMPONENT ---
interface ColonistSelectorProps {
    currentColonistId: number;
    onSelect: (colonistId: number) => void;
    onCancel: () => void;
}

const ColonistSelector: React.FC<ColonistSelectorProps> = ({ currentColonistId, onSelect, onCancel }) => {
    const [colonists, setColonists] = useState<Colonist[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchColonists = async () => {
            try {
                const data = await rimworldApi.getPawns();
                if (Array.isArray(data)) {
                    setColonists(data);
                }
            } catch (error) { console.error(error); }
        };
        fetchColonists();
    }, []);

    const filteredColonists = useMemo(() => {
        return colonists.filter(col => col.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [colonists, searchTerm]);

    return (
        <div className="colonist-selector layout-drag-ignore">
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
                {filteredColonists.length > 0 ? (
                    filteredColonists.map(col => (
                        <div
                            key={col.id}
                            className={`colonist-item ${currentColonistId === col.id ? 'selected' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent bubbling issues
                                onSelect(col.id);
                            }}
                        >
                            <span className="colonist-name">{col.name}</span>
                            <span className="colonist-age">{col.age} yo</span>
                        </div>
                    ))
                ) : (
                    <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
                        No colonists found.
                    </div>
                )}
            </div>
            <div className="selector-actions" style={{ marginTop: 10, textAlign: 'right' }}>
                <button className="action-btn small" onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
};

export default ColonistCard;