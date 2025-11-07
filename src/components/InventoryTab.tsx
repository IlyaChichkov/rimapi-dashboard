// src/components/InventoryTab.tsx
import React from 'react';
import './InventoryTab.css';

interface InventoryTabProps {

}

const InventoryTab: React.FC<InventoryTabProps> = ({

}) => {

    return (
        <div className="inventory-tab">
            <div className="inventory-tab-header">
                <h3>🎒 Inventory</h3>
            </div>
        </div>
    );
};

export default InventoryTab;