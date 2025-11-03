// src/components/ResourcesDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { rimworldApi } from '../services/rimworldApi';
import './ResourcesDashboard.css';

// Type definitions based on API response
interface ResourceItem {
    thing_id: number;
    def_name: string;
    label: string;
    categories: string[];
    position: {
        x: number;
        y: number;
        z: number;
    };
    stack_count: number;
    market_value: number;
    is_forbidden: boolean;
    quality: string | null;
    hit_points: number;
    max_hit_points: number;
}

interface ResourcesData {
    resources_raw: ResourceItem[];
    armor_headgear: ResourceItem[];
    apparel_armor: ResourceItem[];
    stone_chunks: ResourceItem[];
    weapons_melee: ResourceItem[];
    weapons_ranged?: ResourceItem[];
    apparel?: ResourceItem[];
    medicine?: ResourceItem[];
    food?: ResourceItem[];
    [key: string]: ResourceItem[] | undefined;
}

interface ResourceCategory {
    key: string;
    label: string;
    icon: string;
    color: string;
}

export const ResourcesDashboard: React.FC = () => {
    const [resourcesData, setResourcesData] = useState<ResourcesData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageCache, setImageCache] = useState<Record<string, string>>({});
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Resource categories with metadata
    const resourceCategories: ResourceCategory[] = [
        { key: 'resources_raw', label: 'Raw Materials', icon: '⛏️', color: '#8B4513' },
        { key: 'armor_headgear', label: 'Headgear', icon: '⛑️', color: '#4dabf7' },
        { key: 'apparel_armor', label: 'Armor', icon: '🛡️', color: '#495057' },
        { key: 'weapons_melee', label: 'Melee Weapons', icon: '⚔️', color: '#e03131' },
        { key: 'weapons_ranged', label: 'Ranged Weapons', icon: '🏹', color: '#f08c00' },
        { key: 'apparel', label: 'Clothing', icon: '👕', color: '#74b816' },
        { key: 'medicine', label: 'Medicine', icon: '💊', color: '#ff6b6b' },
        { key: 'food', label: 'Food', icon: '🍎', color: '#ffa94d' },
        { key: 'stone_chunks', label: 'Stone Blocks', icon: '🧱', color: '#868e96' },
    ];

    // Fetch resources data
    const fetchResources = async () => {
        try {
            setLoading(true);
            const data = await rimworldApi.getResourcesStored();
            setResourcesData(data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch resources data');
            console.error('Error fetching resources:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch item image
    const fetchItemImage = async (defName: string) => {
        if (imageCache[defName]) return;

        try {
            const imageData = await rimworldApi.getItemImage(defName);
            if (imageData.result === 'Success' && imageData.image_base64) {
                setImageCache(prev => ({
                    ...prev,
                    [defName]: `data:image/png;base64,${imageData.image_base64}`
                }));
            }
        } catch (err) {
            console.warn(`Failed to fetch image for ${defName}:`, err);
        }
    };

    // Process and aggregate resource data
    const processedResources = useMemo(() => {
        if (!resourcesData) return [];

        const allResources: (ResourceItem & { category: string })[] = [];

        Object.entries(resourcesData).forEach(([category, items]) => {
            if (Array.isArray(items)) {
                items.forEach(item => {
                    allResources.push({
                        ...item,
                        category
                    });
                });
            }
        });

        // Filter by active category and search term
        let filtered = allResources;

        if (activeCategory !== 'all') {
            filtered = filtered.filter(resource => resource.category === activeCategory);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(resource =>
                resource.label.toLowerCase().includes(term) ||
                resource.def_name.toLowerCase().includes(term)
            );
        }

        return filtered;
    }, [resourcesData, activeCategory, searchTerm]);

    // Calculate total value and items
    const stats = useMemo(() => {
        if (!resourcesData) return { totalValue: 0, totalItems: 0, categoriesCount: 0 };

        let totalValue = 0;
        let totalItems = 0;
        let categoriesCount = 0;

        Object.values(resourcesData).forEach(items => {
            if (Array.isArray(items)) {
                categoriesCount++;
                items.forEach(item => {
                    totalValue += item.market_value * item.stack_count;
                    totalItems += item.stack_count;
                });
            }
        });

        return { totalValue, totalItems, categoriesCount };
    }, [resourcesData]);

    // Initial data fetch
    useEffect(() => {
        fetchResources();
        const interval = setInterval(fetchResources, 10000); // Update every 10 seconds
        return () => clearInterval(interval);
    }, []);

    // Prefetch images for visible items
    useEffect(() => {
        if (processedResources.length > 0) {
            processedResources.slice(0, 12).forEach(resource => {
                fetchItemImage(resource.def_name);
            });
        }
    }, [processedResources]);

    if (loading && !resourcesData) {
        return (
            <div className="resources-dashboard loading">
                <div className="loading-spinner">🔄</div>
                <p>Loading colony resources...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="resources-dashboard error">
                <div className="error-icon">⚠️</div>
                <p>{error}</p>
                <button onClick={fetchResources} className="retry-button">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="resources-dashboard">
            {/* Header with Stats */}
            <div className="resources-header">
                <div className="resources-stats">
                    <h2>📦 Colony Resources</h2>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-value">{stats.totalItems}</span>
                            <span className="stat-label">Total Items</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">${stats.totalValue.toFixed(0)}</span>
                            <span className="stat-label">Total Value</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{stats.categoriesCount}</span>
                            <span className="stat-label">Categories</span>
                        </div>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="resources-controls">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Search resources..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <span className="search-icon">🔍</span>
                    </div>
                </div>
            </div>

            {/* Category Filter */}
            <div className="category-filters">
                <button
                    className={`category-filter ${activeCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveCategory('all')}
                >
                    📋 All Resources
                </button>
                {resourceCategories.map(category => (
                    <button
                        key={category.key}
                        className={`category-filter ${activeCategory === category.key ? 'active' : ''}`}
                        onClick={() => setActiveCategory(category.key)}
                        style={{ borderLeftColor: category.color }}
                    >
                        {category.icon} {category.label}
                    </button>
                ))}
            </div>

            {/* Resources Grid */}
            <div className="resources-grid">
                {processedResources.length === 0 ? (
                    <div className="no-resources">
                        <div className="no-resources-icon">📭</div>
                        <p>No resources found</p>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="clear-search"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    processedResources.slice(0, 12).map((resource, index) => (
                        <ResourceCard
                            key={`${resource.thing_id}-${index}`}
                            resource={resource}
                            imageUrl={imageCache[resource.def_name]}
                            categoryInfo={resourceCategories.find(cat => cat.key === resource.category)}
                        />
                    ))
                )}
            </div>

            {/* Pagination Info */}
            {processedResources.length > 12 && (
                <div className="resources-footer">
                    <p>Showing 12 of {processedResources.length} resources</p>
                    <button className="view-all-button">
                        View All Resources
                    </button>
                </div>
            )}

            {/* Refresh Button */}
            <button
                onClick={fetchResources}
                className="refresh-button"
                disabled={loading}
            >
                {loading ? '🔄' : '🔄'} Refresh
            </button>
        </div>
    );
};

// Individual Resource Card Component
interface ResourceCardProps {
    resource: ResourceItem & { category: string };
    imageUrl?: string;
    categoryInfo?: ResourceCategory;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, imageUrl, categoryInfo }) => {
    const getQualityColor = (quality: string | null) => {
        if (!quality) return '#6c757d';

        const qualityMap: Record<string, string> = {
            'awful': '#e03131',
            'poor': '#f08c00',
            'normal': '#74b816',
            'good': '#22b8cf',
            'excellent': '#7950f2',
            'masterwork': '#f783ac',
            'legendary': '#fab005'
        };

        return qualityMap[quality.toLowerCase()] || '#6c757d';
    };

    const getDurabilityPercent = () => {
        if (resource.max_hit_points === 0) return 100;
        return (resource.hit_points / resource.max_hit_points) * 100;
    };

    const durabilityPercent = getDurabilityPercent();
    const durabilityColor = durabilityPercent > 75 ? '#74b816' :
        durabilityPercent > 25 ? '#f08c00' : '#e03131';

    return (
        <div className={`resource-card ${resource.is_forbidden ? 'forbidden' : ''}`}>
            {/* Item Image */}
            <div className="resource-image">
                {imageUrl ? (
                    <img src={imageUrl} alt={resource.def_name} />
                ) : (
                    <div className="image-placeholder">
                        {categoryInfo?.icon || '📦'}
                    </div>
                )}
                {resource.stack_count > 1 && (
                    <div className="stack-count">
                        ×{resource.stack_count}
                    </div>
                )}
            </div>

            {/* Resource Info */}
            <div className="resource-info">
                <h3 className="resource-name" title={resource.label}>
                    {resource.label}
                </h3>

                <div className="resource-meta">
                    {/* Quality */}
                    {resource.quality && (
                        <div className="quality-badge" style={{ color: getQualityColor(resource.quality) }}>
                            {resource.quality}
                        </div>
                    )}

                    {/* Market Value */}
                    <div className="value-badge">
                        ${(resource.market_value * resource.stack_count).toFixed(0)}
                    </div>
                </div>

                {/* Durability Bar */}
                {resource.max_hit_points > 0 && (
                    <div className="durability-bar">
                        <div
                            className="durability-fill"
                            style={{
                                width: `${durabilityPercent}%`,
                                backgroundColor: durabilityColor
                            }}
                        />
                        <span className="durability-text">
                            {resource.hit_points}/{resource.max_hit_points}
                        </span>
                    </div>
                )}

                {/* Category and Position */}
                <div className="resource-details">
                    <span className="resource-category">
                        {categoryInfo?.icon} {categoryInfo?.label || resource.category}
                    </span>
                    {!resource.is_forbidden && (
                        <span className="resource-position">
                            ({resource.position.x}, {resource.position.z})
                        </span>
                    )}
                </div>

                {/* Forbidden Indicator */}
                {resource.is_forbidden && (
                    <div className="forbidden-indicator">
                        🔒 Forbidden
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResourcesDashboard;