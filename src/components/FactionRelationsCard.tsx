// src/components/FactionRelationsCard.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ResponsiveGridLayout } from 'react-grid-layout';
import { Faction } from '../types';
import { rimworldApi } from '../services/rimworldApi';
import './FactionRelationsCard.css';

interface FactionLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isResizable?: boolean;
  isDraggable?: boolean;
  static?: boolean;
}

type SortType = 'default' | 'goodwill-asc' | 'goodwill-desc' | 'name-asc' | 'name-desc';

interface FactionRelationsCardProps {
  settings?: {
    layout?: FactionLayoutItem[];
    layouts?: Record<string, FactionLayoutItem[]>;
    sortType?: SortType;
  };
  onSettingsChange?: (newSettings: {
    layout?: FactionLayoutItem[];
    layouts?: Record<string, FactionLayoutItem[]>;
    sortType?: SortType;
  }) => void;
  autoRefresh?: boolean;
  lastUpdated?: Date | null;
}

const FactionRelationsCard: React.FC<FactionRelationsCardProps> = ({
  settings,
  onSettingsChange,
  autoRefresh = false,
  lastUpdated = null
}) => {
  const [factions, setFactions] = useState<Faction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [breakpoint, setBreakpoint] = useState<string>('lg');
  const [cols, setCols] = useState<number>(4);
  const [sortType, setSortType] = useState<SortType>(settings?.sortType || 'default');
  const [sortedFactions, setSortedFactions] = useState<Faction[]>([]);

  // Initialize with saved settings or empty arrays
  const [currentLayout, setCurrentLayout] = useState<FactionLayoutItem[]>(
    settings?.layout || []
  );

  const [layouts, setLayouts] = useState<Record<string, FactionLayoutItem[]>>(
    settings?.layouts || {
      lg: settings?.layout || [],
      md: [],
      sm: [],
      xs: []
    }
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // SINGLE ResizeObserver
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let rafId: number;
    const observer = new ResizeObserver((entries) => {
      cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        if (!entries[0]) return;
        const newWidth = entries[0].contentRect.width;
        setContainerWidth(newWidth);
      });
    });

    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Update breakpoint and columns based on container width
  useEffect(() => {
    if (containerWidth === 0) return;

    let newBreakpoint = 'lg';
    let newCols = 4;

    if (containerWidth >= 1200) {
      newBreakpoint = 'lg';
      newCols = 5;
    } else if (containerWidth >= 900) {
      newBreakpoint = 'md';
      newCols = 4;
    } else if (containerWidth >= 600) {
      newBreakpoint = 'sm';
      newCols = 3;
    } else {
      newBreakpoint = 'xs';
      newCols = 2;
    }

    setBreakpoint(newBreakpoint);
    setCols(newCols);
  }, [containerWidth]);

  const fetchFactions = useCallback(async (isBackgroundRefresh = false) => {
    try {
      // Only show loading spinner on first load
      if (!isBackgroundRefresh && factions.length === 0) {
        setLoading(true);
      }

      const response = await rimworldApi.fetchAllFactions();
      if (response) {
        setFactions(response);
        setError(null);
      }
    } catch (err: any) {
      // THE FIX: Check if the error is an AbortError and ignore it
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        console.log('Faction fetch aborted (component unmounted or updated)');
        return;
      }

      // Only show visual error if it's not a background refresh
      if (!isBackgroundRefresh) {
        // You can uncomment this if you want to see the error in the UI
        // setError('Failed to fetch factions');
        console.error('Failed to fetch factions:', err);
      }
    } finally {
      // Only turn off loading if the component is still mounted (React handles state update safety usually, but good practice)
      setLoading(false);
    }
  }, [factions.length]);

  // Fetch Data
  useEffect(() => {
    fetchFactions();
  }, []);

  // Sort factions based on sortType
  const sortFactions = useCallback((factionsToSort: Faction[], type: SortType): Faction[] => {
    const sorted = [...factionsToSort];

    switch (type) {
      case 'goodwill-asc':
        return sorted.sort((a, b) => a.goodwill - b.goodwill);

      case 'goodwill-desc':
        return sorted.sort((a, b) => b.goodwill - a.goodwill);

      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));

      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));

      case 'default':
      default:
        // Default sorting: allies first, then neutral, then hostile
        return sorted.sort((a, b) => {
          const getPriority = (goodwill: number) => {
            if (goodwill >= 80) return 1; // Ally - highest priority
            if (goodwill > -80 && goodwill < 80) return 2; // Neutral
            return 3; // Hostile - lowest priority
          };

          const priorityDiff = getPriority(a.goodwill) - getPriority(b.goodwill);
          if (priorityDiff !== 0) return priorityDiff;

          // If same priority, sort by name
          return a.name.localeCompare(b.name);
        });
    }
  }, []);

  useEffect(() => {
    if (autoRefresh && lastUpdated) {
      fetchFactions();
    }
  }, [lastUpdated, autoRefresh, fetchFactions]);

  // Update sorted factions when factions or sortType changes
  useEffect(() => {
    if (factions.length === 0) return;
    const newSortedFactions = sortFactions(factions, sortType);
    setSortedFactions(newSortedFactions);
  }, [factions, sortType, sortFactions]);

  // Generate layout when sorted factions change OR when sortType changes
  useEffect(() => {
    if (sortedFactions.length === 0) return;

    // Check if we should regenerate layout
    const shouldRegenerateLayout = !settings?.layout ||
      (settings?.sortType !== sortType) ||
      currentLayout.length === 0 ||
      currentLayout.length !== sortedFactions.length;

    if (!shouldRegenerateLayout) return;

    const generateResponsiveLayouts = () => {
      // Generate layouts for each breakpoint
      const newLayouts: Record<string, FactionLayoutItem[]> = {
        lg: [],
        md: [],
        sm: [],
        xs: []
      };

      // Generate for each breakpoint
      Object.keys(newLayouts).forEach(bp => {
        const bpCols = bp === 'lg' ? 5 : bp === 'md' ? 4 : bp === 'sm' ? 3 : 2;

        sortedFactions.forEach((faction, index) => {
          newLayouts[bp].push({
            i: faction.load_id.toString(),
            x: index % bpCols,
            y: Math.floor(index / bpCols),
            w: 1,
            h: 1,
            isResizable: false,
            isDraggable: true,
            static: false
          });
        });
      });

      setLayouts(newLayouts);
      setCurrentLayout(newLayouts.lg);

      // Save layouts and sort type to settings
      if (onSettingsChange) {
        onSettingsChange({
          layout: newLayouts.lg,
          layouts: newLayouts,
          sortType
        });
      }
    };

    generateResponsiveLayouts();
  }, [sortedFactions, sortType, settings?.layout, settings?.sortType, currentLayout.length, onSettingsChange]);

  // Handle layout change for all breakpoints
  const handleLayoutChange = useCallback((
    layout: FactionLayoutItem[],
    allLayouts: Record<string, FactionLayoutItem[]>
  ) => {
    setCurrentLayout(layout);
    setLayouts(allLayouts);

    // Save both current layout and all layouts to settings
    if (onSettingsChange) {
      onSettingsChange({
        layout: layout,
        layouts: allLayouts,
        sortType
      });
    }
  }, [onSettingsChange, sortType]);

  const handleBreakpointChange = useCallback((
    newBreakpoint: string,
    newCols: number
  ) => {
    setBreakpoint(newBreakpoint);
    setCols(newCols);

    // Update current layout when breakpoint changes
    if (layouts[newBreakpoint]) {
      setCurrentLayout(layouts[newBreakpoint]);
    }
  }, [layouts]);

  // Handle sort type change
  const handleSortChange = useCallback((newSortType: SortType) => {
    setSortType(newSortType);

    // When sort type changes, we'll regenerate layout in the useEffect above
  }, []);

  // Cycle through sort types
  const handleSortButtonClick = useCallback(() => {
    const sortOrder: SortType[] = ['default', 'goodwill-asc', 'goodwill-desc', 'name-asc', 'name-desc'];
    const currentIndex = sortOrder.indexOf(sortType);
    const nextIndex = (currentIndex + 1) % sortOrder.length;
    handleSortChange(sortOrder[nextIndex]);
  }, [sortType, handleSortChange]);

  // Get sort button icon based on current sort type
  const getSortIcon = () => {
    switch (sortType) {
      case 'default':
        return '↕️';
      case 'goodwill-asc':
        return '↑❤️';
      case 'goodwill-desc':
        return '↓❤️';
      case 'name-asc':
        return '↑A';
      case 'name-desc':
        return '↓A';
      default:
        return '↕️';
    }
  };

  // Get sort button title/tooltip
  const getSortTitle = () => {
    switch (sortType) {
      case 'default':
        return 'Sort by: Default (Ally → Neutral → Hostile) - Click to change';
      case 'goodwill-asc':
        return 'Sort by: Goodwill (Low to High) - Click to change';
      case 'goodwill-desc':
        return 'Sort by: Goodwill (High to Low) - Click to change';
      case 'name-asc':
        return 'Sort by: Name (A to Z) - Click to change';
      case 'name-desc':
        return 'Sort by: Name (Z to A) - Click to change';
      default:
        return 'Sort factions - Click to change';
    }
  };

  const getRelationClass = (goodwill: number) => {
    if (goodwill <= -80) return 'hostile';
    if (goodwill > -80 && goodwill < 80) return 'neutral';
    return 'ally';
  };

  if (error) return <div className="faction-card-error">{error}</div>;

  return (
    <div className="faction-relations-card" ref={containerRef}>
      <div className="faction-header">
        <h2>Faction Relations</h2>
        <div>
          <span className="faction-count">({sortedFactions.length})</span>
          <button
            onClick={handleSortButtonClick}
            className="sort-button layout-drag-ignore"
            title={getSortTitle()}
          >
            <span className="sort-icon">{getSortIcon()}</span>
            <span className="sort-text">Sort</span>
          </button>
        </div>
      </div>

      <div className="faction-grid-wrapper">
        {containerWidth > 0 && currentLayout.length > 0 && sortedFactions.length > 0 && (
          <ResponsiveGridLayout
            className={`faction-inner-grid breakpoint-${breakpoint}`}
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 900, sm: 600, xs: 0 }}
            cols={{ lg: 5, md: 4, sm: 3, xs: 2 }}
            rowHeight={80}
            width={containerWidth}
            margin={[10, 10]}
            containerPadding={[10, 10]}
            onLayoutChange={handleLayoutChange as any}
            onBreakpointChange={handleBreakpointChange}
            dragConfig={{
              enabled: true,
              handle: '.drag-handle',
              threshold: 3
            }}
            resizeConfig={{ enabled: false }}
            autoSize={true}
            maxRows={Infinity}
            compactor={{ type: 'vertical', allowOverlap: false, compact: (layout, cols) => layout }}
          >
            {sortedFactions.map((faction) => {
              const relClass = getRelationClass(faction.goodwill);
              return (
                <div
                  key={faction.load_id}
                  className={`faction-item ${relClass}`}
                >
                  <div className="faction-item-content layout-drag-ignore">
                    <div className="faction-details">
                      <span className="faction-name" title={faction.name}>
                        {faction.name}
                      </span>
                      <span className="faction-relation-text">
                        {faction.relation}
                      </span>
                    </div>
                    <div className="faction-goodwill">
                      <span className="faction-goodwill-label">Goodwill</span>
                      <span className="faction-value">
                        {faction.goodwill > 0 ? '+' : ''}{faction.goodwill}
                      </span>
                    </div>
                  </div>
                  <div className="drag-handle drag-indicator" title="Drag to rearrange">
                    ⋮⋮
                  </div>
                </div>
              );
            })}
          </ResponsiveGridLayout>
        )}
      </div>
    </div>
  );
};

export default FactionRelationsCard;