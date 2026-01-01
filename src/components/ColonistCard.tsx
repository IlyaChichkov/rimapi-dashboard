// src/components/ColonistCard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Colonist, ColonistDetailed } from '../types';
import { rimworldApi, getApiBaseUrl, selectAndViewColonist } from '../services/rimworldApi';
import './ColonistCard.css';

interface ColonistCardProps {
    colonistId: number;
    size: { w: number; h: number };
    onSelectColonist?: (colonistId: number) => void;
    onViewHealth?: (colonistName: string) => void;
    onViewSkills?: (colonistName: string) => void;
}

const ColonistCard: React.FC<ColonistCardProps> = ({
    colonistId,
    size,
    onSelectColonist,
    onViewHealth,
    onViewSkills,
}) => {
    const [colonist, setColonist] = useState<ColonistDetailed | null>(null);
    const [imageUrl, setImageUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isSelecting, setIsSelecting] = useState(false);

    useEffect(() => {
        const fetchColonistData = async () => {
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

                // Fetch colonist image
                const imageResponse = await rimworldApi.getPawnPortraitImage(colonistId.toString());
                if (imageResponse?.image_base64) {
                    setImageUrl(`data:image/png;base64,${imageResponse.image_base64}`);
                }
            } catch (error) {
                console.error('Error fetching colonist data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (colonistId) {
            fetchColonistData();
        }
    }, [colonistId]);

    const handleSelectColonist = (newColonistId: number) => {
        if (onSelectColonist) {
            onSelectColonist(newColonistId);
        }
        setIsSelecting(false);
    };

    const colonistInfo = colonist?.colonist;
    const medicalInfo = colonist?.colonist_medical_info;

    if (!colonistInfo) {
        return (
            <div className="colonist-card error">
                <p>Colonist not found</p>
                <button className="select-colonist-btn" onClick={() => setIsSelecting(true)}>
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
        <div className={`colonist-card size-${isSmall ? 'small' : isMedium ? 'medium' : 'large'}`}>
            <div className="colonist-card-header">
                {isSelecting ? (
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
                                </div>
                            )}
                            <div className="colonist-name-mood">
                                <h3>{colonistInfo.name}</h3>
                                <div className="colonist-mood">
                                    <span className="mood-label">Mood:</span>
                                    <span className={`mood-value ${(colonistInfo.mood || 0) > 50 ? 'good' : 'bad'}`}>
                                        {colonistInfo.mood || 'N/A'}%
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

            <div className="colonist-card-content">
                {isSmall ? (
                    // Small card: Just basic info
                    <div className="colonist-small-view">
                        <div className="colonist-stats-small">
                            <div className="stat-item">
                                <span className="stat-label">Health:</span>
                                <span className="stat-value">
                                    {medicalInfo?.health || 'N/A'}%
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Age:</span>
                                <span className="stat-value">{colonistInfo.age || 'N/A'}</span>
                            </div>
                        </div>
                        {onViewHealth && (
                            <button
                                className="action-btn small"
                                onClick={() => onViewHealth(colonistInfo.name)}
                            >
                                View Health
                            </button>
                        )}
                    </div>
                ) : isMedium ? (
                    // Medium card: More details
                    <div className="colonist-medium-view">
                        <div className="colonist-details">
                            <div className="detail-row">
                                <span className="detail-label">Gender:</span>
                                <span className="detail-value">{colonistInfo.gender || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Age:</span>
                                <span className="detail-value">{colonistInfo.age || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Health:</span>
                                <span className="detail-value">{medicalInfo?.health || 'N/A'}%</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Mood:</span>
                                <span className="detail-value">{colonistInfo.mood || 'N/A'}%</span>
                            </div>
                        </div>
                        <div className="colonist-actions">
                            {onViewHealth && (
                                <button
                                    className="action-btn"
                                    onClick={() => onViewHealth(colonistInfo.name)}
                                >
                                    🩺 Health
                                </button>
                            )}
                            {onViewSkills && (
                                <button
                                    className="action-btn"
                                    onClick={() => onViewSkills(colonistInfo.name)}
                                >
                                    📚 Skills
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    // Large card: Full details
                    <div className="colonist-large-view">
                        <div className="colonist-full-details">
                            <div className="details-section">
                                <h4>Basic Info</h4>
                                <div className="details-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">Gender:</span>
                                        <span className="detail-value">{colonistInfo.gender || 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Age:</span>
                                        <span className="detail-value">{colonistInfo.age || 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Mood:</span>
                                        <span className="detail-value">{colonistInfo.mood || 'N/A'}%</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Health:</span>
                                        <span className="detail-value">{medicalInfo?.health || 'N/A'}%</span>
                                    </div>
                                </div>
                            </div>

                            {medicalInfo && (
                                <div className="details-section">
                                    <h4>Medical Status</h4>
                                    <div className="details-grid">
                                        <div className="detail-item">
                                            <span className="detail-label">Blood Pumping:</span>
                                            <span className="detail-value">{medicalInfo.blood_pumping || 'N/A'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Breathing:</span>
                                            <span className="detail-value">{medicalInfo.breathing || 'N/A'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Consciousness:</span>
                                            <span className="detail-value">{medicalInfo.consciousness || 'N/A'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Blood Loss:</span>
                                            <span className="detail-value">{medicalInfo.blood_loss || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="colonist-actions-full">
                                {onViewHealth && (
                                    <button
                                        className="action-btn"
                                        onClick={() => onViewHealth(colonistInfo.name)}
                                    >
                                        🩺 View Full Health
                                    </button>
                                )}
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
            <div className="colonist-list">
                {filteredColonists.length === 0 ? (
                    <div className="no-results">No colonists found</div>
                ) : (
                    filteredColonists.map(col => (
                        <div
                            key={col.id}
                            className={`colonist-item ${currentColonistId === col.id ? 'selected' : ''}`}
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