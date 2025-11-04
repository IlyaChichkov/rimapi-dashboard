// src/components/ResourcesDashboard.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { rimworldApi, selectItem } from '../services/rimworldApi';
import { ResourcesData, ResourceItem } from '../types';
import './ResourcesDashboard.css';

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

interface ResourceGroup {
    def_name: string;
    label: string;
    category: string;
    totalCount: number;
    totalValue: number;
    minDurability: number;
    maxDurability: number;
    hasDurability: boolean;
    sampleItem: ResourceItem;
    items: (ResourceItem & { category: string })[];
    filteredCount?: number;
    filteredValue?: number;
    filteredItems?: (ResourceItem & { category: string })[];
    filteredMinDurability?: number;
    filteredMaxDurability?: number;
    filteredHasDurability?: boolean;
}


const cleanResourceName = (name: string): string => {
    // Remove patterns like " x75", " x100", etc. (quantity indicators)
    let cleaned = name.replace(/\s*x\d+\s*$/, '');

    // Remove quality indicators in parentheses like "(normal)", "(great)", etc.
    cleaned = cleaned.replace(/\s*\([^)]+\)\s*$/, '');

    // Trim any extra spaces
    cleaned = cleaned.trim();

    return cleaned;
};

// Union type for combined display
type DisplayItem =
    | { type: 'group'; data: ResourceGroup; label: string; category: string; totalCount: number; totalValue: number; }
    | { type: 'individual'; data: ResourceItem & { category: string }; label: string; category: string; totalCount: number; totalValue: number; };

export const ResourcesDashboard: React.FC = () => {
    const [resourcesData, setResourcesData] = useState<ResourcesData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageCache, setImageCache] = useState<Record<string, string>>({});

    // State management
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

    // New grouping state
    const [groupItems, setGroupItems] = useState<boolean>(true);
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const [previousGroupState, setPreviousGroupState] = useState<{
        groupItems: boolean;
        filters: FilterSet;
        sortOption: SortOption;
    } | null>(null);

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

    // Group items by def_name - only groups with more than 1 item
    const groupedResources = useMemo((): ResourceGroup[] => {
        const groups: Record<string, ResourceGroup> = {};

        allResources.forEach(resource => {
            if (!groups[resource.def_name]) {
                const durabilityPercent = resource.max_hit_points > 0
                    ? (resource.hit_points / resource.max_hit_points) * 100
                    : 100;

                groups[resource.def_name] = {
                    def_name: resource.def_name,
                    label: cleanResourceName(resource.label),
                    category: resource.category,
                    totalCount: resource.stack_count,
                    totalValue: resource.market_value * resource.stack_count,
                    minDurability: durabilityPercent,
                    maxDurability: durabilityPercent,
                    hasDurability: resource.max_hit_points > 0,
                    sampleItem: resource,
                    items: [resource]
                };
            } else {
                const group = groups[resource.def_name];
                const durabilityPercent = resource.max_hit_points > 0
                    ? (resource.hit_points / resource.max_hit_points) * 100
                    : 100;

                group.totalCount += resource.stack_count;
                group.totalValue += resource.market_value * resource.stack_count;
                group.minDurability = Math.min(group.minDurability, durabilityPercent);
                group.maxDurability = Math.max(group.maxDurability, durabilityPercent);
                group.items.push(resource);
            }
        });

        // Only return groups with more than 1 item OR multiple stack items
        return Object.values(groups).filter(group =>
            group.items.length > 1 || group.totalCount > 1
        );
    }, [allResources]);

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

    // Filter resources (individual items)
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

    // Filter groups (for grouped view)
    // Update the filteredGroups useMemo to calculate filtered counts and values
    const filteredGroups = useMemo(() => {
        let filtered = groupedResources;

        // Search filter
        if (filters.search) {
            const term = filters.search.toLowerCase();
            filtered = filtered.filter(group =>
                group.label.toLowerCase().includes(term) ||
                group.def_name.toLowerCase().includes(term)
            );
        }

        // Category filter
        if (filters.categories.length > 0) {
            filtered = filtered.filter(group =>
                filters.categories.includes(group.category)
            );
        }

        // Allowed filter - Only show groups that contain items matching the allowed status
        if (filters.allowedOnly !== null) {
            filtered = filtered.filter(group => {
                const hasMatchingItems = group.items.some(item =>
                    filters.allowedOnly ? !item.is_forbidden : item.is_forbidden
                );
                return hasMatchingItems;
            });
        }

        // Now calculate filtered counts and values for each group
        const groupsWithFilteredData = filtered.map(group => {
            // Filter the group's items based on current filters
            const filteredGroupItems = group.items.filter(item => {
                // Search filter
                if (filters.search) {
                    const term = filters.search.toLowerCase();
                    if (!item.label.toLowerCase().includes(term) && !item.def_name.toLowerCase().includes(term)) {
                        return false;
                    }
                }

                // Category filter
                if (filters.categories.length > 0 && !filters.categories.includes(item.category)) {
                    return false;
                }

                // Quality filter
                if (filters.qualities.length > 0 && (!item.quality || !filters.qualities.includes(getQualityLabel(item.quality).toLowerCase()))) {
                    return false;
                }

                // Amount filter
                if (item.stack_count < filters.amountRange[0] || item.stack_count > filters.amountRange[1]) {
                    return false;
                }

                // Value filter
                const itemValue = item.market_value * item.stack_count;
                if (itemValue < filters.valueRange[0] || itemValue > filters.valueRange[1]) {
                    return false;
                }

                // Hit points filter
                if (item.max_hit_points > 0) {
                    const durabilityPercent = (item.hit_points / item.max_hit_points) * 100;
                    if (durabilityPercent < filters.hitPointsRange[0] || durabilityPercent > filters.hitPointsRange[1]) {
                        return false;
                    }
                }

                // Allowed filter
                if (filters.allowedOnly !== null) {
                    if (filters.allowedOnly && item.is_forbidden) return false;
                    if (!filters.allowedOnly && !item.is_forbidden) return false;
                }

                return true;
            });

            // Calculate filtered totals
            const filteredCount = filteredGroupItems.reduce((sum, item) => sum + item.stack_count, 0);
            const filteredValue = filteredGroupItems.reduce((sum, item) => sum + (item.market_value * item.stack_count), 0);

            // Calculate filtered durability range
            let filteredMinDurability = 100;
            let filteredMaxDurability = 100;
            let filteredHasDurability = false;

            if (filteredGroupItems.length > 0) {
                const durabilityValues = filteredGroupItems
                    .filter(item => item.max_hit_points > 0)
                    .map(item => (item.hit_points / item.max_hit_points) * 100);

                if (durabilityValues.length > 0) {
                    filteredMinDurability = Math.min(...durabilityValues);
                    filteredMaxDurability = Math.max(...durabilityValues);
                    filteredHasDurability = true;
                }
            }

            return {
                ...group,
                filteredCount,
                filteredValue,
                filteredItems: filteredGroupItems,
                filteredMinDurability,
                filteredMaxDurability,
                filteredHasDurability
            };
        });

        // Apply amount and value filters to the filtered counts
        let finalFiltered = groupsWithFilteredData.filter(group => {
            const displayCount = group.filteredCount !== undefined ? group.filteredCount : group.totalCount;
            const displayValue = group.filteredValue !== undefined ? group.filteredValue : group.totalValue;

            return displayCount >= filters.amountRange[0] &&
                displayCount <= filters.amountRange[1] &&
                displayValue >= filters.valueRange[0] &&
                displayValue <= filters.valueRange[1];
        });

        // Apply hit points filter to filtered durability
        finalFiltered = finalFiltered.filter(group => {
            const hasDurability = group.filteredHasDurability !== undefined ? group.filteredHasDurability : group.hasDurability;
            if (!hasDurability) return true;

            const minDurability = group.filteredMinDurability !== undefined ? group.filteredMinDurability : group.minDurability;
            return minDurability >= filters.hitPointsRange[0] &&
                minDurability <= filters.hitPointsRange[1];
        });

        return finalFiltered;
    }, [groupedResources, filters]);


    // Sort resources (individual items)
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

    // Sort groups
    const sortedGroups = useMemo(() => {
        const sorted = [...filteredGroups];

        sorted.sort((a, b) => {
            let aValue: any, bValue: any;

            switch (sortOption.field) {
                case 'name':
                    aValue = a.label.toLowerCase();
                    bValue = b.label.toLowerCase();
                    break;
                case 'amount':
                    aValue = a.totalCount;
                    bValue = b.totalCount;
                    break;
                case 'value':
                    aValue = a.totalValue;
                    bValue = b.totalValue;
                    break;
                case 'hitPoints':
                    aValue = a.hasDurability ? a.minDurability : 100;
                    bValue = b.hasDurability ? b.minDurability : 100;
                    break;
                case 'category':
                    aValue = a.category;
                    bValue = b.category;
                    break;
                default:
                    // For quality, use sample item's quality
                    aValue = a.sampleItem.quality || 0;
                    bValue = b.sampleItem.quality || 0;
                    break;
            }

            if (aValue < bValue) return sortOption.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOption.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [filteredGroups, sortOption]);

    // Determine what to display based on grouping - now includes individual items when grouping is enabled
    const displayData = useMemo((): DisplayItem[] => {
        if (groupItems) {
            // Combine grouped items with individual items that don't need grouping
            const individualItems = allResources.filter(resource => {
                // Find if this item belongs to a group
                const hasGroup = groupedResources.some(group => group.def_name === resource.def_name);
                // Only include if it doesn't belong to any group (single items)
                return !hasGroup;
            });

            // Filter individual items based on current filters
            const filteredIndividualItems = individualItems.filter(resource => {
                // Apply basic filters to individual items
                if (filters.search) {
                    const term = filters.search.toLowerCase();
                    if (!resource.label.toLowerCase().includes(term) && !resource.def_name.toLowerCase().includes(term)) {
                        return false;
                    }
                }

                if (filters.categories.length > 0 && !filters.categories.includes(resource.category)) {
                    return false;
                }

                if (filters.qualities.length > 0 && (!resource.quality || !filters.qualities.includes(getQualityLabel(resource.quality).toLowerCase()))) {
                    return false;
                }

                if (resource.stack_count < filters.amountRange[0] || resource.stack_count > filters.amountRange[1]) {
                    return false;
                }

                const itemValue = resource.market_value * resource.stack_count;
                if (itemValue < filters.valueRange[0] || itemValue > filters.valueRange[1]) {
                    return false;
                }

                if (resource.max_hit_points > 0) {
                    const durabilityPercent = (resource.hit_points / resource.max_hit_points) * 100;
                    if (durabilityPercent < filters.hitPointsRange[0] || durabilityPercent > filters.hitPointsRange[1]) {
                        return false;
                    }
                }

                // Allowed filter - FIXED: Apply the same logic as individual filtering
                if (filters.allowedOnly !== null) {
                    if (filters.allowedOnly && resource.is_forbidden) return false;
                    if (!filters.allowedOnly && !resource.is_forbidden) return false;
                }

                return true;
            });

            // Convert individual items to display format
            const individualItemsForDisplay: DisplayItem[] = filteredIndividualItems.map(resource => ({
                type: 'individual',
                data: resource,
                label: resource.label,
                category: resource.category,
                totalCount: resource.stack_count,
                totalValue: resource.market_value * resource.stack_count
            }));

            // Convert filtered groups to display format
            const groupsForDisplay: DisplayItem[] = filteredGroups.map(group => ({
                type: 'group',
                data: group,
                label: group.label,
                category: group.category,
                totalCount: group.totalCount,
                totalValue: group.totalValue
            }));

            // Combine both types
            const combined = [...groupsForDisplay, ...individualItemsForDisplay];

            // Sort combined array
            combined.sort((a, b) => {
                let aValue: any, bValue: any;

                switch (sortOption.field) {
                    case 'name':
                        aValue = a.label.toLowerCase();
                        bValue = b.label.toLowerCase();
                        break;
                    case 'amount':
                        aValue = a.totalCount;
                        bValue = b.totalCount;
                        break;
                    case 'value':
                        aValue = a.totalValue;
                        bValue = b.totalValue;
                        break;
                    case 'hitPoints':
                        if (a.type === 'group') {
                            aValue = a.data.hasDurability ? a.data.minDurability : 100;
                        } else {
                            aValue = a.data.max_hit_points > 0 ? (a.data.hit_points / a.data.max_hit_points) * 100 : 100;
                        }
                        if (b.type === 'group') {
                            bValue = b.data.hasDurability ? b.data.minDurability : 100;
                        } else {
                            bValue = b.data.max_hit_points > 0 ? (b.data.hit_points / b.data.max_hit_points) * 100 : 100;
                        }
                        break;
                    case 'category':
                        aValue = a.category;
                        bValue = b.category;
                        break;
                    default:
                        // For quality, use appropriate value
                        if (a.type === 'group') {
                            aValue = a.data.sampleItem.quality || 0;
                        } else {
                            aValue = a.data.quality || 0;
                        }
                        if (b.type === 'group') {
                            bValue = b.data.sampleItem.quality || 0;
                        } else {
                            bValue = b.data.quality || 0;
                        }
                        break;
                }

                if (aValue < bValue) return sortOption.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortOption.direction === 'asc' ? 1 : -1;
                return 0;
            });

            return combined;
        } else {
            // Return individual items only for ungrouped view
            return sortedResources.map(resource => ({
                type: 'individual',
                data: resource,
                label: resource.label,
                category: resource.category,
                totalCount: resource.stack_count,
                totalValue: resource.market_value * resource.stack_count
            }));
        }
    }, [groupItems, filteredGroups, sortedResources, allResources, groupedResources, sortOption, filters]);

    // Paginate display data
    const displayedData = useMemo(() => {
        if (pagination.showAll) {
            return displayData;
        }

        const startIndex = pagination.currentPage * pagination.itemsPerPage;
        const endIndex = startIndex + pagination.itemsPerPage;
        return displayData.slice(startIndex, endIndex);
    }, [displayData, pagination]);

    // Calculate total pages
    const totalPages = Math.ceil(displayData.length / pagination.itemsPerPage);

    // Calculate total value and items
    const stats = useMemo(() => {
        if (!resourcesData) return { totalValue: 0, totalItems: 0, categoriesCount: 0, filteredCount: 0 };

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

        const filteredCount = displayData.length;

        return { totalValue, totalItems, categoriesCount, filteredCount };
    }, [resourcesData, displayData.length]);

    // Filter handlers
    const updateFilter = useCallback((key: keyof FilterSet, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, currentPage: 0 }));
        // Clear expanded group when filters change
        setExpandedGroup(null);
        setPreviousGroupState(null);
    }, []);

    const toggleCategory = useCallback((category: string) => {
        setFilters(prev => ({
            ...prev,
            categories: prev.categories.includes(category)
                ? prev.categories.filter(c => c !== category)
                : [...prev.categories, category]
        }));
        setPagination(prev => ({ ...prev, currentPage: 0 }));
        setExpandedGroup(null);
        setPreviousGroupState(null);
    }, []);

    const toggleQuality = useCallback((quality: string) => {
        setFilters(prev => ({
            ...prev,
            qualities: prev.qualities.includes(quality)
                ? prev.qualities.filter(q => q !== quality)
                : [...prev.qualities, quality]
        }));
        setPagination(prev => ({ ...prev, currentPage: 0 }));
        setExpandedGroup(null);
        setPreviousGroupState(null);
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
        setExpandedGroup(null);
        setPreviousGroupState(null);
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

    // Group click handler
    const handleGroupClick = useCallback((defName: string) => {
        // Save current state before changing
        setPreviousGroupState({
            groupItems: true, // We're currently in grouped view
            filters: { ...filters },
            sortOption: { ...sortOption }
        });

        // Add def_name to search filter and disable grouping
        setFilters(prev => ({
            ...prev,
            search: defName
        }));
        setGroupItems(false);
        setExpandedGroup(defName);
        setPagination(prev => ({ ...prev, currentPage: 0 }));
    }, [filters, sortOption]);

    // Back handler
    const handleBackFromGroup = useCallback(() => {
        if (previousGroupState) {
            setGroupItems(previousGroupState.groupItems);
            setFilters(previousGroupState.filters);
            setSortOption(previousGroupState.sortOption);
            setPreviousGroupState(null);
        }
        setExpandedGroup(null);
        setPagination(prev => ({ ...prev, currentPage: 0 }));
    }, [previousGroupState]);

    // Toggle grouping
    const toggleGrouping = useCallback(() => {
        setGroupItems(prev => !prev);
        setPagination(prev => ({ ...prev, currentPage: 0 }));
        setExpandedGroup(null);
        setPreviousGroupState(null);
    }, []);

    // Initial data fetch
    useEffect(() => {
        fetchResources();
        const interval = setInterval(fetchResources, 10000);
        return () => clearInterval(interval);
    }, []);

    // Image loading effect
    useEffect(() => {
        let isMounted = true;

        if (displayedData.length > 0 && isMounted) {
            const defNamesToLoad = new Set<string>();

            displayedData.forEach(item => {
                if (item.type === 'group') {
                    const group = item.data as ResourceGroup;
                    if (!imageCache[group.def_name] && !group.category.includes("corpses")) {
                        defNamesToLoad.add(group.def_name);
                    }
                } else {
                    const resource = item.data as ResourceItem & { category: string };
                    if (!imageCache[resource.def_name] && !resource.category.includes("corpses")) {
                        defNamesToLoad.add(resource.def_name);
                    }
                }
            });

            defNamesToLoad.forEach(defName => {
                fetchItemImage(defName);
            });
        }

        return () => {
            isMounted = false;
        };
    }, [displayedData, imageCache]);

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
                            <span className="stat-label">
                                {groupItems ? 'Items Displayed' : 'Filtered Items'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="resources-controls">
                    <button
                        onClick={toggleGrouping}
                        className={`group-toggle ${groupItems ? 'active' : ''}`}
                        disabled={groupItems && groupedResources.length === 0}
                        title={groupItems && groupedResources.length === 0 ? "No grouped items available" : groupItems ? "Switch to ungrouped view" : "Switch to grouped view"}
                    >
                        {groupItems ? '📦 Grouped' : '📦 Ungrouped'}
                        {groupItems && groupedResources.length === 0 && ' (Empty)'}
                    </button>

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
                        {!groupItems && (
                            <>
                                <option value="quality-desc">Quality Best-Worst</option>
                                <option value="quality-asc">Quality Worst-Best</option>
                            </>
                        )}
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
                        Showing {displayedData.length} of {displayData.length} {groupItems ? 'items' : 'items'}
                    </span>
                </div>
            </div>

            {/* Resources Grid */}
            <div className={`resources-grid ${!pagination.showAll ? 'paged' : 'compact'} ${groupItems ? 'grouped' : ''}`}>
                {/* Back card when showing expanded group */}
                {!groupItems && expandedGroup && (
                    <BackCard
                        onClick={handleBackFromGroup}
                        groupName={expandedGroup}
                    />
                )}

                {displayedData.map((item, index) => {
                    if (item.type === 'group') {
                        const group = item.data as ResourceGroup;
                        return (
                            <GroupCard
                                key={`group-${group.def_name}-${index}`}
                                group={group}
                                imageUrl={imageCache[group.def_name]}
                                categoryInfo={resourceCategories.find(cat => cat.key === group.category)}
                                onClick={() => handleGroupClick(group.def_name)}
                                isExpanded={expandedGroup === group.def_name}
                            />
                        );
                    } else {
                        const resource = item.data as ResourceItem & { category: string };
                        return (
                            <ResourceCard
                                key={`individual-${resource.thing_id}-${index}`}
                                resource={resource}
                                imageUrl={imageCache[resource.def_name]}
                                categoryInfo={resourceCategories.find(cat => cat.key === resource.category)}
                            />
                        );
                    }
                })}
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

// Back Card Component
interface BackCardProps {
    onClick: () => void;
    groupName: string;
}

const BackCard: React.FC<BackCardProps> = ({ onClick, groupName }) => {
    return (
        <div className="resource-card back-card" onClick={onClick}>
            <div className="back-card-content">
                <div className="back-icon">←</div>
                <div className="back-text">
                    <h3>Back to Groups</h3>
                    <p>Return to grouped view</p>
                </div>
            </div>
        </div>
    );
};

// Quality Tag Component
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

// Resource Card Component
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
                    {cleanResourceName(resource.label)}
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

// Group Card Component
interface GroupCardProps {
    group: ResourceGroup;
    imageUrl?: string;
    categoryInfo?: ResourceCategory;
    onClick: () => void;
    isExpanded: boolean;
}

const GroupCard: React.FC<GroupCardProps> = ({ group, imageUrl, categoryInfo, onClick, isExpanded }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Use filtered data if available, otherwise use total data
    const displayCount = group.filteredCount !== undefined ? group.filteredCount : group.totalCount;
    const displayValue = group.filteredValue !== undefined ? group.filteredValue : group.totalValue;
    const displayItems = group.filteredItems || group.items;

    const durabilityRange = (group.filteredHasDurability !== undefined ? group.filteredHasDurability : group.hasDurability)
        ? `${Math.round((group.filteredMinDurability !== undefined ? group.filteredMinDurability : group.minDurability))}-${Math.round((group.filteredMaxDurability !== undefined ? group.filteredMaxDurability : group.maxDurability))}%`
        : 'N/A';

    return (
        <div
            className={`resource-card group-card ${isExpanded ? 'expanded' : ''}`}
            onClick={onClick}
        >
            {/* Group Indicator */}
            <div className="group-indicator" title="Click to view individual items">
                🔍
            </div>

            {/* Item Image - No stack count overlay */}
            <div className="resource-image">
                {imageUrl && !imageError ? (
                    <img
                        src={imageUrl}
                        alt={group.def_name}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                        style={{ opacity: imageLoaded ? 1 : 0 }}
                    />
                ) : (
                    <div className="image-placeholder">
                        {categoryInfo?.icon || '📦'}
                    </div>
                )}
            </div>

            {/* Group Info */}
            <div className="resource-info">
                <h3 className="resource-name" title={group.label}>
                    {group.label}
                </h3>

                <div className="group-meta">
                    <div className="group-stat">
                        <span className="group-stat-label">Total:</span>
                        <span className="group-stat-value">{displayCount}</span>
                    </div>
                    <div className="group-stat">
                        <span className="group-stat-label">Durability:</span>
                        <span className="group-stat-value">{durabilityRange}</span>
                    </div>
                </div>

                {/* Group Details */}
                <div className="resource-details">
                    <span className="resource-category">
                        {categoryInfo?.icon} {categoryInfo?.label || group.category}
                    </span>
                    <div className="value-badge group-value">
                        ${displayValue.toFixed(0)}
                    </div>
                </div>

                {/* Click Hint - Use filtered items count */}
                <div className="group-click-hint">
                    Click to view {displayItems.length} individual items
                </div>
            </div>
        </div>
    );
};


export default ResourcesDashboard;