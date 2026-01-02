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

interface FactionRelationsCardProps {
  settings?: { layout?: FactionLayoutItem[] };
  onSettingsChange?: (newSettings: { layout: FactionLayoutItem[] }) => void;
}

const FactionRelationsCard: React.FC<FactionRelationsCardProps> = ({
  settings,
  onSettingsChange
}) => {
  const [factions, setFactions] = useState<Faction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [breakpoint, setBreakpoint] = useState<string>('lg');
  const [cols, setCols] = useState<number>(4);

  // Initialize with empty array if no settings
  const [currentLayout, setCurrentLayout] = useState<FactionLayoutItem[]>(
    settings?.layout || []
  );

  const [layouts, setLayouts] = useState<Record<string, FactionLayoutItem[]>>({
    lg: settings?.layout || [],
    md: [],
    sm: [],
    xs: []
  });

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

  // Fetch Data
  useEffect(() => {
    const fetchFactions = async () => {
      try {
        const response = await rimworldApi.fetchAllFactions();
        if (response) {
          setFactions(response);
        }
      } catch (err) {
        setError('Failed to fetch factions');
      } finally {
        setLoading(false);
      }
    };
    fetchFactions();
  }, []);

  // Generate initial layout when factions are loaded
  useEffect(() => {
    if (factions.length === 0 || currentLayout.length > 0) return;

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

        factions.forEach((faction, index) => {
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

      if (onSettingsChange) {
        onSettingsChange({ layout: newLayouts.lg });
      }
    };

    generateResponsiveLayouts();
  }, [factions, currentLayout.length, onSettingsChange]);

  // Handle layout change for all breakpoints
  const handleLayoutChange = useCallback((
    layout: FactionLayoutItem[],
    allLayouts: Record<string, FactionLayoutItem[]>
  ) => {
    setCurrentLayout(layout);
    setLayouts(allLayouts);

    if (onSettingsChange) {
      onSettingsChange({ layout });
    }
  }, [onSettingsChange]);

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
        <span className="faction-count">({factions.length})</span>
      </div>

      <div className="faction-grid-wrapper">
        {containerWidth > 0 && currentLayout.length > 0 && factions.length > 0 && (
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
            {factions.map((faction) => {
              const relClass = getRelationClass(faction.goodwill);
              return (
                <div
                  key={faction.load_id}
                  className={`faction-item ${relClass}`}
                >
                  <div className="faction-item-content">
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