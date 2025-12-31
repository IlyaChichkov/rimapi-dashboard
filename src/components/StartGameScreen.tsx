import React from 'react';
import './StartGameScreen.css';

interface StartGameScreenProps {
    onStartQuickGame: () => void;
    onLoadGame: () => void;
}

const StartGameScreen: React.FC<StartGameScreenProps> = ({ onStartQuickGame, onLoadGame }) => {
    return (
        <div className="start-game-screen">
            <div className="start-game-container">
                <h1 className="title">Welcome to RimWorld Dashboard</h1>
                <p className="subtitle">Your game is running, but no colony is loaded.</p>
                <div className="actions">
                    <button className="action-btn start-btn" onClick={onStartQuickGame}>
                        🚀 Start Quick Game
                    </button>
                    <button className="action-btn load-btn" onClick={onLoadGame}>
                        📂 Load Game
                    </button>
                </div>
                <p className="info">
                    Select an option to begin monitoring your colony.
                </p>
            </div>
        </div>
    );
};

export default StartGameScreen;
