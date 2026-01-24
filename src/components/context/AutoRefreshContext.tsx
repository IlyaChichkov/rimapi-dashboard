import React, { createContext, useContext, useState, useCallback } from 'react';

interface AutoRefreshContextType {
    isAutoRefreshEnabled: boolean;
    toggleAutoRefresh: () => void;
    refreshSignal: number;
    triggerManualRefresh: () => void;
}

const AutoRefreshContext = createContext<AutoRefreshContextType | undefined>(undefined);

export const AutoRefreshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // 1. INITIALIZE FROM LOCAL STORAGE
    const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(() => {
        const saved = localStorage.getItem('rimworld_auto_refresh');
        // If nothing is saved, default to true. Otherwise parse "true"/"false"
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [refreshSignal, setRefreshSignal] = useState(0);

    // 2. SAVE TO LOCAL STORAGE ON TOGGLE
    const toggleAutoRefresh = useCallback(() => {
        setIsAutoRefreshEnabled((prev: boolean) => {
            const newValue = !prev;
            localStorage.setItem('rimworld_auto_refresh', JSON.stringify(newValue));
            return newValue;
        });
    }, []);

    const triggerManualRefresh = useCallback(() => {
        setRefreshSignal(prev => prev + 1);
    }, []);

    return (
        <AutoRefreshContext.Provider value={{
            isAutoRefreshEnabled,
            toggleAutoRefresh,
            refreshSignal,
            triggerManualRefresh
        }}>
            {children}
        </AutoRefreshContext.Provider>
    );
};

export const useAutoRefresh = () => {
    const context = useContext(AutoRefreshContext);
    if (!context) {
        throw new Error('useAutoRefresh must be used within an AutoRefreshProvider');
    }
    return context;
};