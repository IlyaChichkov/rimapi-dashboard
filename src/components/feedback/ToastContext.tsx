// src/contexts/ToastContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
    clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const logToastToConsole = (toast: Omit<Toast, 'id'>) => {
    const styles = {
        success: 'color: #74b816; font-weight: bold;',
        error: 'color: #e03131; font-weight: bold;',
        warning: 'color: #f08c00; font-weight: bold;',
        info: 'color: #4dabf7; font-weight: bold;',
    };

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
    };

    const timestamp = new Date().toLocaleTimeString();
    const message = toast.message ? ` - ${toast.message}` : '';

    console.log(
        `%c[${timestamp}] ${icons[toast.type]} ${toast.title}${message}`,
        styles[toast.type]
    );

    // Also log as plain object for easier debugging
    console.log('Toast details:', {
        type: toast.type,
        title: toast.title,
        message: toast.message,
        duration: toast.duration,
        timestamp: timestamp
    });
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast: Toast = {
            id,
            duration: 5000,
            ...toast
        };

        logToastToConsole(toast);
        setToasts(prev => [...prev, newToast]);

        // Auto remove after duration
        if (newToast.duration && newToast.duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, newToast.duration);
        }
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const clearToasts = useCallback(() => {
        setToasts([]);
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};