// src/components/ResourcesDashboard.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { rimworldApi, selectItem } from '../services/rimworldApi';
import { ResourcesData, ResourceItem } from '../types';
import './ResourcesDashboard.css';

// Types
interface SortOption {
    field: 'name' | 'amount' | 'value' | 'quality' | 'hitPoints' | 'category';
    direction: 'asc' | 'desc';
}

interface FilterSet {
    search: string;
    categories: string[];
    qualities: string[];
    amountRange: [number, number];
    valueRange: [number, number];
    hitPointsRange: [number, number];
    allowedOnly: boolean | null;
}

interface PaginationState {
    currentPage: number;
    itemsPerPage: number;
    showAll: boolean;
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

    // New state management
    const [sortOption, setSortOption] = useState<SortOption>({ field: 'name', direction: 'asc' });
    const [filters, setFilters] = useState<FilterSet>({
        search: '',
        categories: [],
        qualities: [],
        amountRange: [0, 1000],
        valueRange: [0, 10000],
        hitPointsRange: [0, 100],
        allowedOnly: null
    });
    const [pagination, setPagination] = useState<PaginationState>({
        currentPage: 0,
        itemsPerPage: 20,
        showAll: false
    });
    const [showFilters, setShowFilters] = useState(false);

    // Resource categories with metadata
    const resourceCategories: ResourceCategory[] = [
        { key: 'resources_raw', label: 'Raw Materials', icon: '⛏️', color: '#8B4513' },
        { key: 'apparel_misc', label: 'Apparel', icon: '👕', color: '#daf735ff' },
        { key: 'armor_headgear', label: 'Headgear', icon: '⛑️', color: '#4dabf7' },
        { key: 'apparel_armor', label: 'Armor', icon: '🛡️', color: '#495057' },
        { key: 'weapons_melee', label: 'Melee Weapons', icon: '⚔️', color: '#e03131' },
        { key: 'weapons_ranged', label: 'Ranged Weapons', icon: '🏹', color: '#f08c00' },
        { key: 'apparel', label: 'Clothing', icon: '👕', color: '#74b816' },
        { key: 'medicine', label: 'Medicine', icon: '💊', color: '#ff6b6b' },
        { key: 'food', label: 'Food', icon: '🍎', color: '#ffa94d' },
        { key: 'stone_chunks', label: 'Stone Blocks', icon: '🧱', color: '#868e96' },
    ];

    // Available quality options
    const qualityOptions = ['awful', 'poor', 'normal', 'good', 'excellent', 'masterwork', 'legendary'];

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
    const allResources = useMemo(() => {
        if (!resourcesData) return [];

        const resources: (ResourceItem & { category: string })[] = [];
        Object.entries(resourcesData).forEach(([category, items]) => {
            if (Array.isArray(items)) {
                items.forEach(item => {
                    resources.push({
                        ...item,
                        category
                    });
                });
            }
        });
        return resources;
    }, [resourcesData]);


    // Helper function for quality sorting
    const getQualityLabel = (quality: number | null): string => {
        const qualityValues: Record<number, string> = {
            0: 'awful',
            1: 'poor',
            2: 'normal',
            3: 'good',
            4: 'excellent',
            5: 'masterwork',
            6: 'legendary'
        };
        return quality ? qualityValues[quality] : 'none';
    };

    // Filter resources
    const filteredResources = useMemo(() => {
        let filtered = allResources;

        // Search filter
        if (filters.search) {
            const term = filters.search.toLowerCase();
            filtered = filtered.filter(resource =>
                resource.label.toLowerCase().includes(term) ||
                resource.def_name.toLowerCase().includes(term)
            );
        }

        // Category filter
        if (filters.categories.length > 0) {
            filtered = filtered.filter(resource =>
                filters.categories.includes(resource.category)
            );
        }

        // Quality filter
        if (filters.qualities.length > 0) {
            filtered = filtered.filter(resource =>
                resource.quality && filters.qualities.includes(getQualityLabel(resource.quality).toLowerCase())
            );
        }

        // Amount filter
        filtered = filtered.filter(resource =>
            resource.stack_count >= filters.amountRange[0] &&
            resource.stack_count <= filters.amountRange[1]
        );

        // Value filter
        filtered = filtered.filter(resource =>
            (resource.market_value * resource.stack_count) >= filters.valueRange[0] &&
            (resource.market_value * resource.stack_count) <= filters.valueRange[1]
        );

        // Hit points filter
        filtered = filtered.filter(resource => {
            if (resource.max_hit_points === 0) return true;
            const durabilityPercent = (resource.hit_points / resource.max_hit_points) * 100;
            return durabilityPercent >= filters.hitPointsRange[0] &&
                durabilityPercent <= filters.hitPointsRange[1];
        });

        // Allowed filter
        if (filters.allowedOnly !== null) {
            filtered = filtered.filter(resource =>
                filters.allowedOnly ? !resource.is_forbidden : resource.is_forbidden
            );
        }

        return filtered;
    }, [allResources, filters]);

    // Sort resources
    const sortedResources = useMemo(() => {
        const sorted = [...filteredResources];

        sorted.sort((a, b) => {
            let aValue: any, bValue: any;

            switch (sortOption.field) {
                case 'name':
                    aValue = a.label.toLowerCase();
                    bValue = b.label.toLowerCase();
                    break;
                case 'amount':
                    aValue = a.stack_count;
                    bValue = b.stack_count;
                    break;
                case 'value':
                    aValue = a.market_value * a.stack_count;
                    bValue = b.market_value * b.stack_count;
                    break;
                case 'quality':
                    aValue = (a.quality);
                    bValue = (b.quality);
                    break;
                case 'hitPoints':
                    aValue = a.max_hit_points > 0 ? (a.hit_points / a.max_hit_points) * 100 : 100;
                    bValue = b.max_hit_points > 0 ? (b.hit_points / b.max_hit_points) * 100 : 100;
                    break;
                case 'category':
                    aValue = a.category;
                    bValue = b.category;
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return sortOption.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOption.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [filteredResources, sortOption]);

    // Paginate resources
    const displayedResources = useMemo(() => {
        if (pagination.showAll) {
            return sortedResources;
        }

        const startIndex = pagination.currentPage * pagination.itemsPerPage;
        const endIndex = startIndex + pagination.itemsPerPage;
        return sortedResources.slice(startIndex, endIndex);
    }, [sortedResources, pagination]);

    // Calculate total pages
    const totalPages = Math.ceil(sortedResources.length / pagination.itemsPerPage);

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

        return { totalValue, totalItems, categoriesCount, filteredCount: filteredResources.length };
    }, [resourcesData, filteredResources.length]);

    // Filter handlers
    const updateFilter = useCallback((key: keyof FilterSet, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, currentPage: 0 })); // Reset to first page on filter change
    }, []);

    const toggleCategory = useCallback((category: string) => {
        setFilters(prev => ({
            ...prev,
            categories: prev.categories.includes(category)
                ? prev.categories.filter(c => c !== category)
                : [...prev.categories, category]
        }));
        setPagination(prev => ({ ...prev, currentPage: 0 }));
    }, []);

    const toggleQuality = useCallback((quality: string) => {
        setFilters(prev => ({
            ...prev,
            qualities: prev.qualities.includes(quality)
                ? prev.qualities.filter(q => q !== quality)
                : [...prev.qualities, quality]
        }));
        setPagination(prev => ({ ...prev, currentPage: 0 }));
    }, []);

    const clearAllFilters = useCallback(() => {
        setFilters({
            search: '',
            categories: [],
            qualities: [],
            amountRange: [0, 1000],
            valueRange: [0, 10000],
            hitPointsRange: [0, 100],
            allowedOnly: null
        });
        setPagination(prev => ({ ...prev, currentPage: 0 }));
    }, []);

    // Sort handler
    const handleSortChange = useCallback((field: SortOption['field']) => {
        setSortOption(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    }, []);

    // Pagination handlers
    const goToPage = useCallback((page: number) => {
        setPagination(prev => ({ ...prev, currentPage: page }));
    }, []);

    const toggleShowAll = useCallback(() => {
        setPagination(prev => ({ ...prev, showAll: !prev.showAll, currentPage: 0 }));
    }, []);

    // Initial data fetch
    useEffect(() => {
        fetchResources();
        const interval = setInterval(fetchResources, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let isMounted = true;

        if (displayedResources.length > 0 && isMounted) {
            const validResources = displayedResources.filter(resource =>
                !resource.category.includes("corpses") && !imageCache[resource.def_name]
            );

            validResources.forEach(resource => {
                fetchItemImage(resource.def_name);
            });
        }

        return () => {
            isMounted = false;
        };
    }, [displayedResources, imageCache]);

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
                            <span className="stat-value">{stats.filteredCount}</span>
                            <span className="stat-label">Filtered Items</span>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="resources-controls">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`filter-toggle ${showFilters ? 'active' : ''}`}
                    >
                        🎚️ Filters {filters.categories.length + filters.qualities.length > 0 ?
                            `(${filters.categories.length + filters.qualities.length})` : ''}
                    </button>

                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Search resources..."
                            value={filters.search}
                            onChange={(e) => updateFilter('search', e.target.value)}
                            className="search-input"
                        />
                        <span className="search-icon">🔍</span>
                    </div>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="filters-panel">
                    <div className="filters-header">
                        <h3>Filters</h3>
                        <button onClick={clearAllFilters} className="clear-filters-btn">
                            Clear All
                        </button>
                    </div>

                    <div className="filters-grid">
                        {/* Category Filter */}
                        <div className="filter-group">
                            <label>Categories</label>
                            <div className="filter-chips">
                                {resourceCategories.map(category => (
                                    <button
                                        key={category.key}
                                        className={`filter-chip ${filters.categories.includes(category.key) ? 'active' : ''}`}
                                        onClick={() => toggleCategory(category.key)}
                                        style={{ borderLeftColor: category.color }}
                                    >
                                        {category.icon} {category.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quality Filter */}
                        <div className="filter-group">
                            <label>Quality</label>
                            <div className="filter-chips">
                                {qualityOptions.map(quality => (
                                    <button
                                        key={quality}
                                        className={`filter-chip ${filters.qualities.includes(quality) ? 'active' : ''}`}
                                        onClick={() => toggleQuality(quality)}
                                    >
                                        {quality}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Allowed Filter */}
                        <div className="filter-group">
                            <label>Allowed Status</label>
                            <div className="filter-options">
                                <button
                                    className={`filter-option ${filters.allowedOnly === null ? 'active' : ''}`}
                                    onClick={() => updateFilter('allowedOnly', null)}
                                >
                                    All
                                </button>
                                <button
                                    className={`filter-option ${filters.allowedOnly === true ? 'active' : ''}`}
                                    onClick={() => updateFilter('allowedOnly', true)}
                                >
                                    ✅ Allowed
                                </button>
                                <button
                                    className={`filter-option ${filters.allowedOnly === false ? 'active' : ''}`}
                                    onClick={() => updateFilter('allowedOnly', false)}
                                >
                                    🔒 Forbidden
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sort and Pagination Controls */}
            <div className="view-controls">
                <div className="sort-controls">
                    <span>Sort by:</span>
                    <select
                        value={`${sortOption.field}-${sortOption.direction}`}
                        onChange={(e) => {
                            const [field, direction] = e.target.value.split('-') as [SortOption['field'], 'asc' | 'desc'];
                            setSortOption({ field, direction });
                        }}
                        className="sort-select"
                    >
                        <option value="name-asc">Name A-Z</option>
                        <option value="name-desc">Name Z-A</option>
                        <option value="amount-desc">Amount High-Low</option>
                        <option value="amount-asc">Amount Low-High</option>
                        <option value="value-desc">Value High-Low</option>
                        <option value="value-asc">Value Low-High</option>
                        <option value="quality-desc">Quality Best-Worst</option>
                        <option value="quality-asc">Quality Worst-Best</option>
                        <option value="hitPoints-desc">Durability High-Low</option>
                        <option value="hitPoints-asc">Durability Low-High</option>
                    </select>
                </div>

                <div className="pagination-controls">
                    <button
                        onClick={toggleShowAll}
                        className={`view-toggle ${pagination.showAll ? 'active' : ''}`}
                    >
                        {pagination.showAll ? 'Show Paged' : 'Show All'}
                    </button>

                    {!pagination.showAll && (
                        <div className="page-navigation">
                            <button
                                onClick={() => goToPage(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 0}
                                className="page-btn"
                            >
                                ‹
                            </button>
                            <span className="page-info">
                                Page {pagination.currentPage + 1} of {totalPages}
                            </span>
                            <button
                                onClick={() => goToPage(pagination.currentPage + 1)}
                                disabled={pagination.currentPage >= totalPages - 1}
                                className="page-btn"
                            >
                                ›
                            </button>
                        </div>
                    )}

                    <span className="items-count">
                        Showing {displayedResources.length} of {sortedResources.length} items
                    </span>
                </div>
            </div>

            {/* Resources Grid */}
            <div className={`resources-grid ${!pagination.showAll ? 'paged' : 'compact'}`}>
                {displayedResources.map((resource) => (
                    <ResourceCard
                        key={`${resource.thing_id}-${resource.category}-${resource.stack_count}`}
                        resource={resource}
                        imageUrl={imageCache[resource.def_name]}
                        categoryInfo={resourceCategories.find(cat => cat.key === resource.category)}
                    />
                ))}
            </div>

            {/* Bottom Pagination */}
            {!pagination.showAll && totalPages > 1 && (
                <div className="pagination-bottom">
                    <div className="page-navigation">
                        <button
                            onClick={() => goToPage(0)}
                            disabled={pagination.currentPage === 0}
                            className="page-btn"
                        >
                            «
                        </button>
                        <button
                            onClick={() => goToPage(pagination.currentPage - 1)}
                            disabled={pagination.currentPage === 0}
                            className="page-btn"
                        >
                            ‹
                        </button>

                        {/* Page numbers */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                                pageNum = i;
                            } else if (pagination.currentPage <= 2) {
                                pageNum = i;
                            } else if (pagination.currentPage >= totalPages - 3) {
                                pageNum = totalPages - 5 + i;
                            } else {
                                pageNum = pagination.currentPage - 2 + i;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => goToPage(pageNum)}
                                    className={`page-btn ${pagination.currentPage === pageNum ? 'active' : ''}`}
                                >
                                    {pageNum + 1}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => goToPage(pagination.currentPage + 1)}
                            disabled={pagination.currentPage >= totalPages - 1}
                            className="page-btn"
                        >
                            ›
                        </button>
                        <button
                            onClick={() => goToPage(totalPages - 1)}
                            disabled={pagination.currentPage >= totalPages - 1}
                            className="page-btn"
                        >
                            »
                        </button>
                    </div>
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

interface QualityTagProps {
    resource: ResourceItem & { category: string };
}

const QualityTag: React.FC<QualityTagProps> = ({ resource }) => {
    const getQualityColor = (quality: number | null) => {
        if (!quality) return '#6c757d';

        const qualityMap: Record<string, string> = {
            0: '#e03131',
            1: '#f08c00',
            2: '#74b816',
            3: '#22b8cf',
            4: '#7950f2',
            5: '#f783ac',
            6: '#fab005'
        };

        return qualityMap[quality] || '#6c757d';
    };

    // Helper function for quality sorting
    const getQualityLabel = (quality: number | null): string | null => {
        const qualityValues: Record<number, string> = {
            0: 'awful',
            1: 'poor',
            2: 'normal',
            3: 'good',
            4: 'excellent',
            5: 'masterwork',
            6: 'legendary'
        };
        return quality ? qualityValues[quality] : null;
    };

    const quality = resource.quality;

    if (quality === null || quality === undefined || !getQualityLabel(quality)) {
        return (
            <div className="empty-quality-badge"></div>
        )
    }

    return (
        <div className="quality-badge" style={{ color: getQualityColor(resource.quality) }}>
            {
                getQualityLabel(resource.quality) ?? "None"
            }
        </div>
    )
};

interface ResourceCardProps {
    resource: ResourceItem & { category: string };
    imageUrl?: string;
    categoryInfo?: ResourceCategory;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, imageUrl, categoryInfo }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    const getDurabilityPercent = () => {
        if (resource.max_hit_points === 0) return 100;
        return (resource.hit_points / resource.max_hit_points) * 100;
    };

    // API call placeholder for forbidden toggle
    const handleForbiddenToggle = async (event: React.MouseEvent) => {
        event.stopPropagation();
    };

    const durabilityPercent = getDurabilityPercent();
    const durabilityColor = durabilityPercent > 75 ? '#74b816' :
        durabilityPercent > 25 ? '#f08c00' : '#e03131';

    return (
        <div className={`resource-card ${resource.is_forbidden ? 'forbidden' : ''}`}>
            {/* View Action Button */}
            <button
                className="view-action-btn"
                onClick={() => selectItem(resource.thing_id, resource.position)}
                title="View item details"
            >
                👁️
            </button>

            {/* Item Image */}
            <div className="resource-image">
                {imageUrl && !imageError ? (
                    <img
                        src={imageUrl}
                        alt={resource.def_name}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                        style={{ opacity: imageLoaded ? 1 : 0 }}
                    />
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
                    <QualityTag resource={resource} />
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
                    {/* Market Value Only - removed amount badge from here */}
                    <div className="value-badge">
                        ${(resource.market_value * resource.stack_count).toFixed(0)}
                    </div>
                </div>

                {/* Clickable Forbidden Indicator */}
                {resource.is_forbidden && (
                    <button
                        className="forbidden-indicator clickable"
                        onClick={handleForbiddenToggle}
                        title="Click to allow this item"
                    >
                        🔒 Forbidden
                    </button>
                )}
            </div>
        </div>
    );
};

export default ResourcesDashboard;