// src/components/CaravanListCard.tsx
import React, { useState, useEffect } from 'react';
// Ensure these are imported from the file we just updated
import { Caravan, CaravanPawn, CaravanItem } from '../types';
import { rimworldApi } from '../services/rimworldApi';
import './CaravanListCard.css';

const CaravanListCard: React.FC = () => {
    const [caravans, setCaravans] = useState<Caravan[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const fetchCaravans = async () => {
        try {
            // Don't set loading on every refresh, causes flicker
            // only if we have no data yet
            if (caravans.length === 0) setLoading(true);

            const data = await rimworldApi.fetchCaravans();

            // FIX 1: Null check for data
            if (data) {
                setCaravans(data.filter((c: Caravan) => c.is_player_controlled));
                setError(null);
            } else {
                // If data is null/undefined but no error thrown, treat as empty
                setCaravans([]);
            }
        } catch (err) {
            setError('Failed to load caravans');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCaravans();
        const interval = setInterval(fetchCaravans, 10000);
        return () => clearInterval(interval);
    }, []);

    const toggleExpand = (id: number) => {
        setExpandedId(expandedId === id ? null : id);
    };

    if (loading && caravans.length === 0) {
        return (
            <div className="caravan-card">
                <div className="card-header">
                    <h3>Active Caravans</h3>
                </div>
                <div className="caravan-loading">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="caravan-card">
                <div className="card-header">
                    <h3>Active Caravans</h3>
                </div>
                <div className="caravan-error">{error}</div>
            </div>
        );
    }

    return (
        <div className="caravan-card">
            <div className="card-header">
                <h3>Active Caravans</h3>
                <span className="caravan-count">({caravans.length})</span>
            </div>

            <div className="caravan-list">
                {caravans.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">🐫</span>
                        <p>No active caravans</p>
                    </div>
                ) : (
                    caravans.map((caravan) => (
                        <div key={caravan.id} className={`caravan-item ${expandedId === caravan.id ? 'expanded' : ''}`}>
                            <div className="caravan-item-header" onClick={() => toggleExpand(caravan.id)}>
                                <div className="caravan-title-row">
                                    <span className="caravan-icon">🐫</span>
                                    <span className="caravan-name">{caravan.name}</span>
                                    <span className="caravan-tile">Tile: {caravan.tile}</span>
                                </div>

                                <div className="caravan-stats-row">
                                    <div className="stat-badge">
                                        {/* FIX 2: Explicitly type 'p' */}
                                        👥 {caravan.pawns.filter((p: CaravanPawn) => !p.name.includes('Human')).length + caravan.pawns.filter((p: CaravanPawn) => p.name.includes('Human')).length}
                                    </div>
                                    <div className="stat-badge">
                                        📦 {caravan.items.length}
                                    </div>
                                    <div className="mass-bar-container" title={`Mass: ${caravan.mass_usage.toFixed(1)} / ${caravan.mass_capacity.toFixed(1)} kg`}>
                                        <div
                                            className="mass-bar-fill"
                                            style={{ width: `${Math.min((caravan.mass_usage / caravan.mass_capacity) * 100, 100)}%` }}
                                        />
                                        <span className="mass-text">{caravan.mass_usage.toFixed(0)}kg</span>
                                    </div>
                                </div>
                            </div>

                            {expandedId === caravan.id && (
                                <div className="caravan-details">
                                    <div className="detail-row">
                                        <span>Visibility: <span className="val">{caravan.visibility}</span></span>
                                        <span>Forage: <span className="val">{caravan.forageability}</span></span>
                                    </div>

                                    <div className="detail-section">
                                        <h4>Members</h4>
                                        <div className="member-list">
                                            {/* FIX 3: Explicitly type 'p' */}
                                            {caravan.pawns.map((p: CaravanPawn) => (
                                                <span key={p.id} className="member-tag">
                                                    {p.name.replace(/<[^>]*>/g, '').split(',')[0]}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {caravan.items.length > 0 && (
                                        <div className="detail-section">
                                            <h4>Inventory</h4>
                                            <div className="inventory-list">
                                                {/* FIX 4: Explicitly type 'item' and 'idx' */}
                                                {caravan.items.map((item: CaravanItem, idx: number) => (
                                                    <div key={`${item.thing_id}-${idx}`} className="inventory-item">
                                                        <span className="item-label">{item.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CaravanListCard;