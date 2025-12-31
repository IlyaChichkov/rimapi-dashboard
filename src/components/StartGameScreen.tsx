import React, { useState, useEffect } from 'react';
import './StartGameScreen.css';

interface StartGameScreenProps {
    onStartQuickGame: () => void;
    onLoadGame: (saveName: string) => void;
}

const StartGameScreen: React.FC<StartGameScreenProps> = ({ onStartQuickGame, onLoadGame }) => {
    const [saveName, setSaveName] = useState('');

    useEffect(() => {
        const savedSaveName = localStorage.getItem('rimworldSaveName');
        if (savedSaveName) {
            setSaveName(savedSaveName);
        }
    }, []);

    const handleSaveNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSaveName(e.target.value);
        localStorage.setItem('rimworldSaveName', e.target.value);
    };

    const handleLoadGameClick = () => {
        if (saveName) {
            onLoadGame(saveName);
        }
    };

    return (
        <div className="start-game-screen">
            <div className="start-game-container">
                <h1 className="title">Welcome to RimWorld Dashboard</h1>
                <p className="subtitle">Your game is running, but no colony is loaded.</p>
                <div className="actions">
                    <button className="action-btn start-btn" onClick={onStartQuickGame}>
                        🚀 Start Quick Game
                    </button>
                    <div className="load-game-action">
                        <input
                            type="text"
                            value={saveName}
                            onChange={handleSaveNameChange}
                            placeholder="Enter save name"
                            className="save-name-input"
                        />
                        <button className="action-btn load-btn" onClick={handleLoadGameClick} disabled={!saveName}>
                            📂 Load Game
                        </button>
                    </div>
                </div>
                <p className="info">
                    Select an option to begin monitoring your colony.
                </p>
            </div>
        </div>
    );
};

export default StartGameScreen;