// contexts/ImageCacheContext.tsx
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { rimworldApi } from '../services/rimworldApi';

interface ImageCacheContextType {
    imageCache: Record<string, string>;
    // Colonist images
    fetchColonistImage: (colonistId: string) => Promise<void>;
    getColonistImage: (colonistId: string) => string | null;
    // Item images
    fetchItemImage: (defName: string) => Promise<void>;
    getItemImage: (defName: string) => string | null;
    // Batch operations
    preloadItemImages: (defNames: string[]) => Promise<void>;
    preloadColonistImages: (colonistIds: string[]) => Promise<void>;
    // Utility
    clearCache: () => void;
    removeFromCache: (key: string) => void;
}

const ImageCacheContext = createContext<ImageCacheContextType | undefined>(undefined);

export const ImageCacheProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [imageCache, setImageCache] = useState<Record<string, string>>({});

    // Colonist images
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
            console.warn(`Failed to fetch colonist image for ${colonistId}:`, err);
        }
    };

    const getColonistImage = (colonistId: string): string | null => {
        return imageCache[colonistId] || null;
    };

    // Item images
    const fetchItemImage = async (defName: string): Promise<void> => {
        if (imageCache[defName]) return;

        try {
            const imageData = await rimworldApi.getItemImage(defName);
            if (imageData.result === 'success' && imageData.image_base64) {
                setImageCache(prev => ({
                    ...prev,
                    [defName]: `data:image/png;base64,${imageData.image_base64}`
                }));
            }
        } catch (err) {
            console.warn(`Failed to fetch item image for ${defName}:`, err);
        }
    };

    const getItemImage = (defName: string): string | null => {
        return imageCache[defName] || null;
    };

    // Batch operations with concurrency control
    const preloadItemImages = useCallback(async (defNames: string[]): Promise<void> => {
        const uniqueDefNames = Array.from(new Set(defNames)).filter(defName => !imageCache[defName]);

        if (uniqueDefNames.length === 0) return;

        // Process in batches to avoid overwhelming the API
        const batchSize = 5;
        for (let i = 0; i < uniqueDefNames.length; i += batchSize) {
            const batch = uniqueDefNames.slice(i, i + batchSize);
            const promises = batch.map(defName => fetchItemImage(defName));

            await Promise.allSettled(promises);

            // Small delay between batches
            if (i + batchSize < uniqueDefNames.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }, [imageCache]);

    const preloadColonistImages = useCallback(async (colonistIds: string[]): Promise<void> => {
        const uniqueIds = Array.from(new Set(colonistIds)).filter(id => !imageCache[id]);

        if (uniqueIds.length === 0) return;

        // Process in batches
        const batchSize = 3; // Smaller batch size for colonists as they might be larger images
        for (let i = 0; i < uniqueIds.length; i += batchSize) {
            const batch = uniqueIds.slice(i, i + batchSize);
            const promises = batch.map(id => fetchColonistImage(id));

            await Promise.allSettled(promises);

            if (i + batchSize < uniqueIds.length) {
                await new Promise(resolve => setTimeout(resolve, 150));
            }
        }
    }, [imageCache]);

    // Utility functions
    const clearCache = useCallback((): void => {
        setImageCache({});
    }, []);

    const removeFromCache = useCallback((key: string): void => {
        setImageCache(prev => {
            const { [key]: removed, ...rest } = prev;
            return rest;
        });
    }, []);

    const value: ImageCacheContextType = {
        imageCache,
        fetchColonistImage,
        getColonistImage,
        fetchItemImage,
        getItemImage,
        preloadItemImages,
        preloadColonistImages,
        clearCache,
        removeFromCache
    };

    return (
        <ImageCacheContext.Provider value={value}>
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