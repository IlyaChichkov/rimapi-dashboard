// src/components/Toast.tsx
import React from 'react';
import { Toast as ToastType } from './ToastContext';
import './Toast.css';

interface ToastProps {
    toast: ToastType;
    onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    const getIcon = () => {
        switch (toast.type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '📢';
        }
    };

    const getClassName = () => {
        return `toast toast-${toast.type}`;
    };

    return (
        <div className={getClassName()}>
            <div className="toast-icon">{getIcon()}</div>
            <div className="toast-content">
                <div className="toast-title">{toast.title}</div>
                {toast.message && <div className="toast-message">{toast.message}</div>}
            </div>
            <button
                className="toast-close"
                onClick={() => onClose(toast.id)}
                aria-label="Close notification"
            >
                ×
            </button>
        </div>
    );
};