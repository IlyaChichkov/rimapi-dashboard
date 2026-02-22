import React, { useState } from 'react';
import DashboardCard from '../common/DashboardCard';
import './TimeControlsCard.css';
import { rimworldApi } from '@/services/rimworldApi';

const TimeControlsCard: React.FC = () => {
    // Note: If your fetchGameState() returns the actual current game speed, 
    // you could initialize this state from props instead of defaulting to 1.
    const [currentSpeed, setCurrentSpeed] = useState<number>(1);
    const [loading, setLoading] = useState(false);

    const handleSetSpeed = async (speed: number) => {
        setLoading(true);
        try {
            await rimworldApi.setGameSpeed(speed);
            setCurrentSpeed(speed);
        } catch (error) {
            console.error("Failed to update game speed", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardCard
            title="Time Controls"
            headerAction={loading ? <span style={{ fontSize: '0.8em', opacity: 0.7 }}>Setting...</span> : null}
        >
            <div className="time-controls-container layout-drag-ignore">
                <button
                    className={`time-btn ${currentSpeed === 0 ? 'active' : ''}`}
                    onClick={() => handleSetSpeed(0)}
                    disabled={loading}
                    title="Pause (0)"
                >
                    ⏸
                </button>
                <button
                    className={`time-btn ${currentSpeed === 1 ? 'active' : ''}`}
                    onClick={() => handleSetSpeed(1)}
                    disabled={loading}
                    title="Normal Speed (1)"
                >
                    ▶
                </button>
                <button
                    className={`time-btn ${currentSpeed === 2 ? 'active' : ''}`}
                    onClick={() => handleSetSpeed(2)}
                    disabled={loading}
                    title="Fast Speed (2)"
                >
                    ▶▶
                </button>
                <button
                    className={`time-btn ${currentSpeed === 3 ? 'active' : ''}`}
                    onClick={() => handleSetSpeed(3)}
                    disabled={loading}
                    title="Super Fast Speed (3)"
                >
                    ▶▶▶
                </button>
                <button
                    className={`time-btn dev-btn ${currentSpeed === 4 ? 'active' : ''}`}
                    onClick={() => handleSetSpeed(4)}
                    disabled={loading}
                    title="Ultra Fast / Dev Mode (4)"
                >
                    🚀
                </button>
            </div>
        </DashboardCard>
    );
};

export default TimeControlsCard;