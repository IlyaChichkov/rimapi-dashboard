// src/components/CaravanListCard.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
// Ensure these are imported from the file we just updated
import { Caravan, CaravanPawn, CaravanItem } from '../types';
import { rimworldApi } from '../services/rimworldApi';
import './CaravanListCard.css';

// --- Helper Components ---

interface CaravanModalProps {
    caravan: Caravan;
    onClose: () => void;
}

const CaravanDetailModal: React.FC<CaravanModalProps> = ({ caravan, onClose }) => {
    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return createPortal(
        <div className="caravan-modal-overlay" onClick={onClose}>
            <div className="caravan-modal-content" onClick={e => e.stopPropagation()}>
                <div className="caravan-modal-header">
                    <h2>{caravan.name}</h2>
                    <button className="modal-close-btn" onClick={onClose}>×</button>
                </div>

                <div className="caravan-modal-body">
                    {/* Top Stats Grid */}
                    <div className="modal-stats-grid">
                        <div className="modal-stat-box">
                            <span className="label">Location</span>
                            <span className="value">Tile {caravan.tile}</span>
                        </div>
                        <div className="modal-stat-box">
                            <span className="label">Visibility</span>
                            <span className="value">{caravan.visibility}</span>
                        </div>
                        <div className="modal-stat-box">
                            <span className="label">Forageability</span>
                            <span className="value">{caravan.forageability}</span>
                        </div>
                        <div className="modal-stat-box full-width">
                            <div className="mass-header">
                                <span className="label">Mass Usage</span>
                                <span className="value">{caravan.mass_usage.toFixed(1)} / {caravan.mass_capacity.toFixed(1)} kg</span>
                            </div>
                            <div className="modal-mass-bar">
                                <div
                                    className="modal-mass-fill"
                                    style={{ width: `${Math.min((caravan.mass_usage / caravan.mass_capacity) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-split-view">
                        {/* Members Column */}
                        <div className="modal-column">
                            <h3>👥 Members ({caravan.pawns.length})</h3>
                            <div className="modal-list">
                                {caravan.pawns.map((p: CaravanPawn) => (
                                    <div key={p.id} className="modal-list-item member">
                                        <div className="member-avatar">
                                            {/* Fallback avatar/icon logic could go here */}
                                            👤
                                        </div>
                                        <div className="member-info">
                                            <span className="member-name">
                                                {p.name.replace(/<[^>]*>/g, '').split(',')[0]}
                                            </span>
                                            <span className="member-role">
                                                {p.name.includes(',') ? p.name.split(',')[1].replace(/<[^>]*>/g, '') : 'Colonist'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Inventory Column */}
                        <div className="modal-column">
                            <h3>📦 Inventory ({caravan.items.length})</h3>
                            <div className="modal-list">
                                {caravan.items.length === 0 ? (
                                    <div className="empty-list-msg">Empty Inventory</div>
                                ) : (
                                    caravan.items.map((item: CaravanItem, idx: number) => (
                                        <div key={`${item.thing_id}-${idx}`} className="modal-list-item inventory">
                                            <span className="item-name">{item.label}</span>
                                            <div className="item-meta">
                                                <span className="item-price">${item.market_value.toFixed(0)}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- Main Component ---

const CaravanListCard: React.FC = () => {
    const [caravans, setCaravans] = useState<Caravan[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // New state for selected modal
    const [selectedCaravan, setSelectedCaravan] = useState<Caravan | null>(null);

    const fetchCaravans = async () => {
        try {
            if (caravans.length === 0) setLoading(true);
            const data = await rimworldApi.fetchCaravans();
            if (data) {
                setCaravans(data.filter((c: Caravan) => c.is_player_controlled));
                setError(null);
            } else {
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

    if (loading && caravans.length === 0) {
        return (
            <div className="caravan-card">
                <div className="card-header"><h3>Active Caravans</h3></div>
                <div className="caravan-loading">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="caravan-card">
                <div className="card-header"><h3>Active Caravans</h3></div>
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
                        <div
                            key={caravan.id}
                            className={`caravan-item ${selectedCaravan?.id === caravan.id ? 'active' : ''} layout-drag-ignore`}
                            onClick={() => setSelectedCaravan(caravan)}
                        >
                            <div className="caravan-item-header">
                                <div className="caravan-title-row">
                                    <span className="caravan-icon">🐫</span>
                                    <span className="caravan-name">{caravan.name}</span>
                                    <span className="caravan-tile">Tile: {caravan.tile}</span>
                                </div>

                                <div className="caravan-stats-row">
                                    <div className="stat-badge">
                                        👥 {caravan.pawns.length}
                                    </div>
                                    <div className="stat-badge">
                                        📦 {caravan.items.length}
                                    </div>
                                    <div className="mass-bar-container">
                                        <div
                                            className="mass-bar-fill"
                                            style={{ width: `${Math.min((caravan.mass_usage / caravan.mass_capacity) * 100, 100)}%` }}
                                        />
                                        <span className="mass-text">{caravan.mass_usage.toFixed(0)}kg</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Render Modal if selected */}
            {selectedCaravan && (
                <CaravanDetailModal
                    caravan={selectedCaravan}
                    onClose={() => setSelectedCaravan(null)}
                />
            )}
        </div>
    );
};

export default CaravanListCard;