// contexts/ImageCacheContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { rimworldApi } from '../services/rimworldApi';

interface ImageCacheContextType {
    imageCache: Record<string, string>;
    fetchColonistImage: (colonistId: string) => Promise<void>;
    getColonistImage: (colonistId: string) => string | null;
}

const ImageCacheContext = createContext<ImageCacheContextType | undefined>(undefined);

export const ImageCacheProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [imageCache, setImageCache] = useState<Record<string, string>>({});

    const fetchColonistImage = async (colonistId: string): Promise<void> => {
        if (imageCache[colonistId]) return;

        try {
            const imageData = await rimworldApi.getPawnPortraitImage(colonistId);
            if (imageData.result === 'success' && imageData.image_base64) {
                setImageCache(prev => ({
                    ...prev,
                    [colonistId]: `data:image/png;base64,${imageData.image_base64}`
                }));
            }
        } catch (err) {
            console.warn(`Failed to fetch image for ${colonistId}:`, err);
        }
    };

    const getColonistImage = (colonistId: string): string | null => {
        return imageCache[colonistId] || null;
    };

    return (
        <ImageCacheContext.Provider value={{ imageCache, fetchColonistImage, getColonistImage }}>
            {children}
        </ImageCacheContext.Provider>
    );
};

export const useImageCache = (): ImageCacheContextType => {
    const context = useContext(ImageCacheContext);
    if (context === undefined) {
        throw new Error('useImageCache must be used within an ImageCacheProvider');
    }
    return context;
};