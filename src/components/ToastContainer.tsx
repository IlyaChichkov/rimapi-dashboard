// src/components/ToastContainer.tsx
import React from 'react';
import { useToast } from './ToastContext';
import { Toast } from './Toast';
import './Toast.css';

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    toast={toast}
                    onClose={removeToast}
                />
            ))}
        </div>
    );
};