// src/components/GameInfoCard.tsx
import React from 'react';
import './GameInfoCard.css';

interface WeatherData {
    weather?: string;
    temperature?: number;
}

interface MapDatetimeData {
    datetime?: string;
}

interface GameStateData {
    storyteller?: string;
}

interface GameInfoCardProps {
    map_datetime: MapDatetimeData;
    weather: WeatherData;
    gameState: GameStateData;
}

// Helper to parse "15th of Aprimay, 5500, 9h"
const formatRimWorldDate = (dateStr: string | undefined) => {
    if (!dateStr) return <span className="info-value">Unknown</span>;

    // Regex to match "Date, Year, Time" format
    // Captures: 1=Day/Season, 2=Year, 3=Time
    const match = dateStr.match(/^(.+?),\s*(\d+),\s*(\d+h)$/);

    if (match) {
        return (
            <div className="info-split-value">
                <span className="info-main">{match[1]}</span>
                <span className="info-sub">Year {match[2]} • {match[3]}</span>
            </div>
        );
    }

    // Fallback if format is different
    return <span className="info-value">{dateStr}</span>;
};

export const GameInfoCard: React.FC<GameInfoCardProps> = ({
    map_datetime,
    weather,
    gameState,
}) => {
    return (
        <div className="game-info-card">
            {/* Date Section */}
            <div className="info-item">
                <div className="info-icon">📅</div>
                <div className="info-text-group">
                    <span className="info-label">Date & Time</span>
                    {formatRimWorldDate(map_datetime.datetime)}
                </div>
            </div>

            <div className="info-separator"></div>

            {/* Weather Section */}
            <div className="info-item">
                <div className="info-icon">🌤️</div>
                <div className="info-text-group">
                    <span className="info-label">Environment</span>
                    <div className="info-split-value">
                        <span className="info-main">{weather.weather || 'Unknown'}</span>
                        <span className="info-sub temperature">
                            {Math.round(weather.temperature || 0)}°C
                        </span>
                    </div>
                </div>
            </div>

            <div className="info-separator"></div>

            {/* Storyteller Section */}
            <div className="info-item">
                <div className="info-icon">📖</div>
                <div className="info-text-group">
                    <span className="info-label">Storyteller</span>
                    <span className="info-value">{gameState.storyteller || 'Unknown'}</span>
                </div>
            </div>
        </div>
    );
};