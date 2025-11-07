import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './InventoryTab.css';
import { rimworldApi } from '../services/rimworldApi';
import { ColonistDetailed, Position } from '../types';
import { useImageCache } from './ImageCacheContext';

export interface InventoryItem {
    thing_id: number;
    def_name: string;
    label: string;
    categories: string[];
    position: Position;
    stack_count: number;
    market_value: number;
    is_forbidden: boolean;
    quality: number | null;
    hit_points: number;
    max_hit_points: number;
}

export type ItemCategory =
    | 'weapons_melee'
    | 'weapons_ranged'
    | 'apparel'
    | 'apparel_armor'
    | 'armor_headgear'
    | 'medicine'
    | 'food'
    | 'resources_raw'
    | 'stone_chunks'
    | 'all';

export type ItemRarity = 'awful' | 'poor' | 'normal' | 'good' | 'excellent' | 'masterwork' | 'legendary';

export type SortField = 'name' | 'market_value' | 'stack_count' | 'quality';
export type SortDirection = 'asc' | 'desc';

export interface InventoryFilters {
    searchTerm: string;
    category: ItemCategory;
    minQuality: number;
    showForbidden: boolean;
}

interface InventoryTabProps {
    colonistsDetailed: ColonistDetailed[];
    selectedColonist?: ColonistDetailed;
    setSelectedColonist: (colonist: ColonistDetailed) => void;
}

// Skeleton loading component
const InventorySkeleton: React.FC = () => (
    <div className="skeleton-container">
        {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="inventory-item-skeleton">
                <div className="skeleton-image"></div>
                <div className="skeleton-text"></div>
            </div>
        ))}
    </div>
);

// Colonist card component
const ColonistCard: React.FC<{
    colonist: ColonistDetailed;
    isSelected: boolean;
    onClick: () => void;
    portraitUrl: string;
}> = React.memo(({ colonist, isSelected, onClick, portraitUrl }) => (
    <div
        className={`colonist-card ${isSelected ? 'selected' : ''}`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={`Select colonist ${colonist.colonist.name}`}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
        <div className="colonist-portrait-container">
            <img
                src={portraitUrl || '/default-colonist.png'}
                alt={colonist.colonist.name}
                className="colonist-portrait"
                loading="lazy"
            />
        </div>
        <div className="colonist-info">
            <span className="colonist-name">{colonist.colonist.name}</span>
            <span className="colonist-details">
                {colonist.colonist.age}y • {colonist.colonist.gender}
            </span>
        </div>
    </div>
));

// Inventory item component
const InventoryItemCard: React.FC<{
    item: InventoryItem;
    imageUrl: string;
}> = React.memo(({ item, imageUrl }) => {
    const getRarity = (quality: number | null): ItemRarity => {
        if (quality === null) return 'normal';
        if (quality >= 6) return 'legendary';
        if (quality >= 5) return 'masterwork';
        if (quality >= 4) return 'excellent';
        if (quality >= 3) return 'good';
        if (quality >= 2) return 'normal';
        if (quality >= 1) return 'poor';
        return 'awful';
    };

    const rarity = getRarity(item.quality);
    const isDamaged = item.hit_points < item.max_hit_points;
    const durabilityPercent = Math.round((item.hit_points / item.max_hit_points) * 100);

    const tooltipContent = (
        <div className="item-tooltip-content">
            <div className="item-tooltip-header">
                <span className="item-name">{item.label}</span>
                {item.quality && (
                    <span className={`item-rarity rarity-${rarity}`}>
                        {rarity}
                    </span>
                )}
            </div>

            <div className="item-tooltip-details">
                <div className="item-detail">
                    <span className="detail-label">Value:</span>
                    <span className="detail-value">${item.market_value}</span>
                </div>

                {item.stack_count > 1 && (
                    <div className="item-detail">
                        <span className="detail-label">Stack:</span>
                        <span className="detail-value">{item.stack_count}</span>
                    </div>
                )}

                {isDamaged && (
                    <div className="item-detail">
                        <span className="detail-label">Durability:</span>
                        <span className="detail-value durability-warning">
                            {durabilityPercent}%
                        </span>
                    </div>
                )}

                {item.is_forbidden && (
                    <div className="item-detail">
                        <span className="detail-label forbidden">Forbidden</span>
                    </div>
                )}
            </div>

            {item.categories.length > 0 && (
                <div className="item-categories">
                    {item.categories.slice(0, 3).map(category => (
                        <span key={category} className="item-category-tag">
                            {category.replace('_', ' ')}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <Tooltip content={tooltipContent}>
            <div className={`inventory-item rarity-${rarity} ${isDamaged ? 'damaged' : ''}`}>
                <div className="item-icon-container">
                    <img
                        src={imageUrl || '/default-item.png'}
                        alt={item.label}
                        className="item-icon"
                        loading="lazy"
                    />
                    {item.stack_count > 1 && (
                        <div className="item-stack">{item.stack_count}</div>
                    )}
                    {isDamaged && (
                        <div className="item-damage-indicator"></div>
                    )}
                    {item.is_forbidden && (
                        <div className="item-forbidden-indicator">🚫</div>
                    )}
                </div>
                <div className="item-label">
                    {item.label.length > 12
                        ? `${item.label.substring(0, 12)}...`
                        : item.label
                    }
                </div>
            </div>
        </Tooltip>
    );
});


const InventoryTab: React.FC<InventoryTabProps> = ({
    colonistsDetailed,
    selectedColonist,
    setSelectedColonist
}) => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Search and filter states
    const [colonistSearch, setColonistSearch] = useState('');
    const [inventorySearch, setInventorySearch] = useState('');
    const [colonistSort, setColonistSort] = useState<'name' | 'age' | 'gender' | 'health'>('name');
    const [inventorySort, setInventorySort] = useState<{ field: SortField; direction: SortDirection }>({
        field: 'name',
        direction: 'asc'
    });
    const [selectedCategory, setSelectedCategory] = useState<ItemCategory>('all');

    const { imageCache, fetchItemImage, getItemImage, getColonistImage } = useImageCache();

    // Filter and sort colonists
    const filteredColonists = useMemo(() => {
        return colonistsDetailed
            .filter(colonist =>
                colonist.colonist.name.toLowerCase().includes(colonistSearch.toLowerCase()) ||
                colonist.colonist.gender.toLowerCase().includes(colonistSearch.toLowerCase())
            )
            .sort((a, b) => {
                switch (colonistSort) {
                    case 'name':
                        return a.colonist.name.localeCompare(b.colonist.name);
                    case 'age':
                        return a.colonist.age - b.colonist.age;
                    case 'gender':
                        return a.colonist.gender.localeCompare(b.colonist.gender);
                    case 'health':
                        return a.colonist.health - b.colonist.health;
                    default:
                        return 0;
                }
            });
    }, [colonistsDetailed, colonistSearch, colonistSort]);

    // Fetch inventory when colonist changes
    useEffect(() => {
        if (selectedColonist) {
            const fetchInventory = async () => {
                setLoading(true);
                setError(null);
                try {
                    const items = await rimworldApi.fetchColonistInventory(selectedColonist.colonist.id);
                    setInventory(items);

                    // Pre-fetch item images
                    items.forEach(item => {
                        if (!getItemImage(item.def_name)) {
                            fetchItemImage(item.def_name);
                        }
                    });
                } catch (err) {
                    console.error('Error fetching inventory:', err);
                    setError('Failed to load inventory');
                } finally {
                    setLoading(false);
                }
            };
            fetchInventory();
        } else {
            setInventory([]);
        }
    }, [selectedColonist, getItemImage, fetchItemImage, colonistsDetailed]);

    // Pre-fetch colonist portraits
    useEffect(() => {
        colonistsDetailed.forEach(colonist => {
            if (!imageCache[colonist.colonist.id]) {
                getColonistImage(colonist.colonist.id.toString());
            }
        });
    }, [colonistsDetailed, imageCache, getColonistImage]);

    const [currentPage, setCurrentPage] = useState(1);
    const colonistsPerPage = 6; // 2 columns × 2 rows = 4 colonists per page

    // The rest of the pagination logic remains the same
    const totalPages = Math.ceil(filteredColonists.length / colonistsPerPage);
    const startIndex = (currentPage - 1) * colonistsPerPage;
    const endIndex = startIndex + colonistsPerPage;
    const currentColonists = filteredColonists.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [colonistSearch, colonistSort]);

    // Pagination controls component
    const PaginationControls: React.FC = () => {
        if (totalPages <= 1) return null;

        const pageNumbers = [];
        const maxVisiblePages = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        return (
            <div className="pagination-controls">
                <button
                    className="pagination-button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    aria-label="First page"
                >
                    «
                </button>

                <button
                    className="pagination-button"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                >
                    ‹
                </button>

                {startPage > 1 && (
                    <>
                        <button
                            className="pagination-button"
                            onClick={() => setCurrentPage(1)}
                        >
                            1
                        </button>
                        {startPage > 2 && <span className="pagination-ellipsis">...</span>}
                    </>
                )}

                {pageNumbers.map(page => (
                    <button
                        key={page}
                        className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                    >
                        {page}
                    </button>
                ))}

                {endPage < totalPages && (
                    <>
                        {endPage < totalPages - 1 && <span className="pagination-ellipsis">...</span>}
                        <button
                            className="pagination-button"
                            onClick={() => setCurrentPage(totalPages)}
                        >
                            {totalPages}
                        </button>
                    </>
                )}

                <button
                    className="pagination-button"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                >
                    ›
                </button>

                <button
                    className="pagination-button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    aria-label="Last page"
                >
                    »
                </button>
            </div>
        );
    };

    // Filter and sort inventory
    const filteredInventory = useMemo(() => {
        let filtered = inventory.filter(item => {
            const matchesSearch = item.label.toLowerCase().includes(inventorySearch.toLowerCase());
            const matchesCategory = selectedCategory === 'all' ||
                item.categories.includes(selectedCategory);
            return matchesSearch && matchesCategory;
        });

        // Sort inventory
        filtered.sort((a, b) => {
            let aValue: any, bValue: any;

            switch (inventorySort.field) {
                case 'market_value':
                    aValue = a.market_value;
                    bValue = b.market_value;
                    break;
                case 'stack_count':
                    aValue = a.stack_count;
                    bValue = b.stack_count;
                    break;
                case 'quality':
                    aValue = a.quality || 0;
                    bValue = b.quality || 0;
                    break;
                case 'name':
                default:
                    aValue = a.label;
                    bValue = b.label;
            }

            if (typeof aValue === 'string') {
                return inventorySort.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            } else {
                return inventorySort.direction === 'asc'
                    ? aValue - bValue
                    : bValue - aValue;
            }
        });

        return filtered;
    }, [inventory, inventorySearch, selectedCategory, inventorySort]);

    // Calculate inventory summary
    const inventorySummary = useMemo(() => {
        return {
            totalValue: filteredInventory.reduce((sum, item) => sum + (item.market_value * item.stack_count), 0),
            uniqueItems: filteredInventory.length
        };
    }, [filteredInventory]);

    // Virtual scrolling for colonists (simple pagination for now)
    const [visibleColonists, setVisibleColonists] = useState(6);
    const loadMoreColonists = useCallback(() => {
        setVisibleColonists(prev => Math.min(prev + 20, filteredColonists.length));
    }, [filteredColonists.length]);

    const handleSortInventory = useCallback((field: SortField) => {
        setInventorySort(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    }, []);

    const categoryTabs: { key: ItemCategory; label: string; count?: number }[] = [
        { key: 'all', label: 'All Items' },
    ];

    return (
        <div className="inventory-tab">
            <div className="inventory-tab-header">
                <h3>🎒 Inventory Management</h3>
                {selectedColonist && (
                    <div className="inventory-summary">
                        <span>Items: {inventorySummary.uniqueItems}</span>
                        <span>Value: ${Math.round(inventorySummary.totalValue)}</span>
                    </div>
                )}
            </div>

            <div className="inventory-tab-content">
                {/* Left Column: Colonist List */}
                <div className="colonist-list-section">
                    <div className="section-header">
                        <h4>Colonists ({filteredColonists.length})</h4>
                    </div>

                    <div className="colonist-controls">
                        <input
                            type="text"
                            placeholder="Search colonists..."
                            value={colonistSearch}
                            onChange={(e) => setColonistSearch(e.target.value)}
                            className="search-input"
                            aria-label="Search colonists"
                        />

                        <select
                            value={colonistSort}
                            onChange={(e) => setColonistSort(e.target.value as any)}
                            className="sort-dropdown"
                            aria-label="Sort colonists by"
                        >
                            <option value="name">Sort by Name</option>
                            <option value="age">Sort by Age</option>
                            <option value="gender">Sort by Gender</option>
                        </select>
                    </div>

                    <div className="colonist-list scrollbar-container">
                        {currentColonists.map((colonist) => (
                            <ColonistCard
                                key={colonist.colonist.id}
                                colonist={colonist}
                                isSelected={selectedColonist?.colonist.id === colonist.colonist.id}
                                onClick={() => setSelectedColonist(colonist)}
                                portraitUrl={imageCache[colonist.colonist.id]}
                            />
                        ))}

                        {currentColonists.length === 0 && (
                            <div className="empty-colonist-list">
                                <div className="empty-icon">👥</div>
                                <p>No colonists found</p>
                                <small>Try adjusting your search</small>
                            </div>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {filteredColonists.length > colonistsPerPage && (
                        <div className="pagination-section">
                            <div className="pagination-info">
                                Showing {startIndex + 1}-{Math.min(endIndex, filteredColonists.length)} of {filteredColonists.length} colonists
                            </div>
                            <PaginationControls />
                        </div>
                    )}
                </div>

                {/* Right Column: Inventory */}
                <div className="inventory-section">
                    {selectedColonist ? (
                        <>
                            <div className="section-header">
                                <h4>{selectedColonist.colonist.name}'s Inventory</h4>
                                <div className="inventory-controls">
                                    <input
                                        type="text"
                                        placeholder="Search inventory..."
                                        value={inventorySearch}
                                        onChange={(e) => setInventorySearch(e.target.value)}
                                        className="search-input"
                                        aria-label="Search inventory items"
                                    />

                                    <div className="sort-buttons">
                                        <span>Sort by:</span>
                                        {(['name', 'market_value', 'stack_count', 'quality'] as SortField[]).map(field => (
                                            <button
                                                key={field}
                                                className={`sort-button ${inventorySort.field === field ? 'active' : ''
                                                    }`}
                                                onClick={() => handleSortInventory(field)}
                                                aria-label={`Sort by ${field} ${inventorySort.field === field ? inventorySort.direction : ''}`}
                                            >
                                                {field.replace('_', ' ')}
                                                {inventorySort.field === field && (
                                                    <span>{inventorySort.direction === 'asc' ? '↑' : '↓'}</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Category Tabs */}
                            <div className="category-tabs">
                                {categoryTabs.map(tab => (
                                    <button
                                        key={tab.key}
                                        className={`category-tab ${selectedCategory === tab.key ? 'active' : ''}`}
                                        onClick={() => setSelectedCategory(tab.key)}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Inventory Grid */}
                            <div className="inventory-container">
                                {loading ? (
                                    <InventorySkeleton />
                                ) : error ? (
                                    <div className="error-state">
                                        <div className="error-icon">⚠️</div>
                                        <p>{error}</p>
                                        <button
                                            onClick={() => window.location.reload()}
                                            className="retry-button"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                ) : filteredInventory.length > 0 ? (
                                    <div className="inventory-grid">
                                        {filteredInventory.map((item) => (
                                            <InventoryItemCard
                                                key={`${item.thing_id}-${item.stack_count}`}
                                                item={item}
                                                imageUrl={getItemImage(item.def_name) ?? "none"}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <div className="empty-icon">🎒</div>
                                        <p>No items found</p>
                                        <small>Try changing your search or filters</small>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="placeholder-section">
                            <div className="placeholder-icon">👥</div>
                            <h4>Select a Colonist</h4>
                            <p>Choose a colonist from the list to view their inventory</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Fixed Tooltip component with absolute positioning relative to wrapper
const Tooltip: React.FC<{
    content: React.ReactNode;
    children: React.ReactElement;
}> = ({ content, children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const wrapperRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const updateTooltipPosition = useCallback((e: React.MouseEvent) => {
        if (!wrapperRef.current) return;

        const tooltip = tooltipRef.current;
        if (!tooltip) return;
        const wrapperRect = wrapperRef.current.getBoundingClientRect();
        const mouseX = e.clientX - wrapperRect.left;
        const mouseY = e.clientY - wrapperRect.top;

        const tooltipWidth = tooltip.offsetWidth;
        let tooltipLeft = mouseX + 10; // 10px right of cursor
        if (e.clientX > window.innerWidth / 2) {
            tooltipLeft = mouseX - 10 - tooltipWidth;
        }

        console.log(e.clientX, window.innerWidth / 2)

        // Position tooltip relative to mouse cursor within the wrapper
        // We'll position it above and to the right of the cursor
        const tooltipTop = mouseY + 10; // 10px above cursor

        setPosition({ top: tooltipTop, left: tooltipLeft });
    }, []);

    return (
        <div
            ref={wrapperRef}
            className="tooltip-wrapper"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onMouseMove={updateTooltipPosition}
        >
            {children}
            {isVisible && (
                <div
                    className="tooltip"
                    ref={tooltipRef}
                    style={{
                        top: `${position.top}px`,
                        left: `${position.left}px`,
                    }}
                >
                    {content}
                </div>
            )}
        </div>
    );
};

export default InventoryTab;
