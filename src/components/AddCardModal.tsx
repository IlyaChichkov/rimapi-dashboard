import React from 'react';
import './AddCardModal.css';

// Define the structure for our card metadata
export interface CardDefinition {
    id: string;
    title: string;
    description: string;
    icon: string;
}

interface AddCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (cardId: string) => void;
    availableCards: CardDefinition[];
}

const AddCardModal: React.FC<AddCardModalProps> = ({ isOpen, onClose, onAdd, availableCards }) => {
    if (!isOpen) return null;

    return (
        <div className="add-card-modal-overlay" onClick={onClose}>
            <div className="add-card-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="add-card-header">
                    <h2>Add Widget</h2>
                    <button className="add-card-close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="add-card-grid">
                    {availableCards.map((card) => (
                        <button
                            key={card.id}
                            className="card-selection-item"
                            onClick={() => {
                                onAdd(card.id);
                                onClose();
                            }}
                        >
                            <div className="card-select-icon">{card.icon}</div>
                            <div className="card-select-info">
                                <h3>{card.title}</h3>
                                <p>{card.description}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AddCardModal;