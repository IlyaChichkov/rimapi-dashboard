// src/components/DashboardCard.tsx
import React, { ReactNode } from 'react';
import './DashboardCard.css';

interface DashboardCardProps {
    title: string;
    children: ReactNode;
    onOpenSettings?: () => void;
    className?: string;
    headerAction?: ReactNode; // Optional extra button in header
}

const DashboardCard: React.FC<DashboardCardProps> = ({
    title, children, onOpenSettings, className = '', headerAction
}) => {
    return (
        <div className={`dashboard-card ${className}`}>
            <div className="dashboard-card-header">
                <h3 className="dashboard-card-title">{title}</h3>
                <div className="dashboard-card-actions">
                    {headerAction}
                    {onOpenSettings && (
                        <button
                            className="card-settings-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                // We use onMouseDown to prevent drag events from stealing the click
                                onOpenSettings();
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            ⚙️
                        </button>
                    )}
                </div>
            </div>
            <div className="dashboard-card-body">
                {children}
            </div>
        </div>
    );
};

export default DashboardCard;