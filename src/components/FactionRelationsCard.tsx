// src/components/FactionRelationsCard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Responsive } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
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
}

/**
 * Calculates the grid layout based on the container's available pixel dimensions.
 * * @param width - The current pixel width of the container
 * @param height - The current pixel height of the container
 * @param factions - The data items to layout
 * @param currentLayout - The existing layout (to preserve positions if needed)
 */
export const calculateLayout = (
  width: number,
  height: number,
  factions: Faction[],
  currentLayout: FactionLayoutItem[]
): FactionLayoutItem[] => {
  const GRID_COLUMNS = 4;
  const MIN_CARD_PIXEL_WIDTH = 150; // Reduced for more items per row

  // Calculate how many items can physically fit
  const maxItemsPerRow = Math.floor(width / MIN_CARD_PIXEL_WIDTH) || 1;

  // For 1032px width and 150px min: maxItemsPerRow = 6

  // We want to fill the grid efficiently
  let itemsPerRow: number;
  let itemW: number;

  if (maxItemsPerRow >= 4) {
    // Use 4 items per row to fill all columns
    itemsPerRow = 4;
    itemW = 1; // Each takes 1 column
  } else if (maxItemsPerRow >= 2) {
    itemsPerRow = 2;
    itemW = 2; // Each takes 2 columns
  } else {
    itemsPerRow = 1;
    itemW = 4; // Full width
  }

  console.log(`Width: ${width}, ItemsPerRow: ${itemsPerRow}, ItemW: ${itemW}`);

  const newLayout: FactionLayoutItem[] = factions.map((faction, index) => {
    const existing = currentLayout.find(l => l.i === faction.load_id.toString());
    if (existing) return existing;

    const row = Math.floor(index / itemsPerRow);
    const col = index % itemsPerRow;
    const x = col * itemW;

    // Set height to be proportional to width for better appearance
    const itemH = itemW === 1 ? 1 : 1.5; // Taller for wider items

    return {
      i: faction.load_id.toString(),
      x: x,
      y: row,
      w: itemW,
      h: itemH, // Use dynamic height
      isResizable: false
    };
  });

  return newLayout;
};

interface FactionRelationsCardProps {
  settings?: { layout?: FactionLayoutItem[] };
  onSettingsChange?: (newSettings: { layout: FactionLayoutItem[] }) => void;
}

const FactionRelationsCard: React.FC<FactionRelationsCardProps> = ({
  settings,
  onSettingsChange
}) => {
  const [factions, setFactions] = useState<Faction[]>([]);
  const [layout, setLayout] = useState<any[]>([]);

  // State for Container Dimensions
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 1. Precise Dimension Tracking
  useEffect(() => {
    if (!wrapperRef.current) return;

    const observer = new ResizeObserver(() => {
      // Wrap in rAF for performance and to avoid loop errors
      window.requestAnimationFrame(() => {
        if (!wrapperRef.current) return;

        const { clientWidth, clientHeight } = wrapperRef.current;

        // Only update if dimensions actually changed
        setDimensions(prev => {
          if (prev.width === clientWidth && prev.height === clientHeight) return prev;
          return { width: clientWidth, height: clientHeight };
        });
      });
    });

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [currentLayout, setCurrentLayout] = useState<FactionLayoutItem[]>(settings?.layout || []);

  // Initialize width to 0 so we don't render a broken layout on first paint
  const [width, setWidth] = useState(500);
  const cardRef = useRef<HTMLDivElement>(null);

  // 1. ROBUST RESIZE OBSERVER
  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    const observer = new ResizeObserver(() => {
      // Wrap in rAF to prevent "ResizeObserver loop limit exceeded"
      window.requestAnimationFrame(() => {
        if (element) {
          // offsetWidth is safer than contentRect for grid containers
          setWidth(element.offsetWidth);
        }
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Fetch Data
  useEffect(() => {
    const fetchFactions = async () => {
      try {
        const response = await rimworldApi.fetchAllFactions();
        if (response) setFactions(response);
      } catch (err) {
        setError('Failed to fetch factions');
      } finally {
        setLoading(false);
      }
    };
    fetchFactions();
  }, []);

  // Sync Factions with Layout
  useEffect(() => {
    if (factions.length === 0) return;

    setCurrentLayout((prevLayout) => {
      const newLayout = [...prevLayout];
      let layoutChanged = false;

      factions.forEach((faction, index) => {
        const exists = newLayout.find(l => l.i === faction.load_id.toString());
        if (!exists) {
          layoutChanged = true;
          newLayout.push({
            i: faction.load_id.toString(),
            x: (index * 2) % 4,
            y: Math.floor(index / 2),
            w: 2,
            h: 1,
            isResizable: false
          });
        }
      });

      if (layoutChanged) {
        if (onSettingsChange) {
          setTimeout(() => onSettingsChange({ layout: newLayout }), 0);
        }
        return newLayout;
      }
      return prevLayout;
    });
  }, [factions, onSettingsChange]);

  useEffect(() => {
    if (dimensions.width === 0 || factions.length === 0) return;

    // Call your function here
    const newLayout = calculateLayout(
      dimensions.width,
      dimensions.height,
      factions,
      layout
    );

    setLayout(newLayout);

    // Notify parent if needed
    if (onSettingsChange) {
      // Debounce this in real app
      setTimeout(() => onSettingsChange({ layout: newLayout }), 0);
    }
  }, [dimensions.width, dimensions.height, factions.length]);

  const handleLayoutChange = (layout: any[]) => {
    const cleanLayout: FactionLayoutItem[] = layout.map(l => ({
      i: l.i, x: l.x, y: l.y, w: l.w, h: l.h, isResizable: false
    }));
    setCurrentLayout(cleanLayout);
    if (onSettingsChange) onSettingsChange({ layout: cleanLayout });
  };

  const getRelationClass = (goodwill: number) => {
    if (goodwill <= -80) return 'hostile';
    if (goodwill > -80 && goodwill < 80) return 'neutral';
    return 'ally';
  };

  return (
    <div className="faction-relations-card">
      <div className="faction-header">
        <h2>Faction Relations</h2>
        <span>({factions.length})</span>
      </div>

      {/* The Wrapper determines the size */}
      <div
        className="faction-grid-wrapper"
        ref={wrapperRef}
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
      >
        {dimensions.width > 0 && (
          <Responsive
            className="faction-inner-grid"
            layouts={{ lg: currentLayout }}
            breakpoints={{ lg: 0 }}
            cols={{ lg: 4 }}  // ← Make sure this is 4
            rowHeight={60}
            width={width}  // ← Make sure width is being passed correctly
            margin={[10, 10]}
            onLayoutChange={handleLayoutChange as any}
            dragConfig={{
              enabled: true,
              handle: '.drag-handle'
            }}
            resizeConfig={{ enabled: false }}
            // Add containerPadding if needed
            containerPadding={[0, 0]}
          >
            {factions.map((faction) => {
              const relClass = getRelationClass(faction.goodwill);
              return (
                <div key={faction.load_id} className={`faction-item ${relClass}`}>
                  <div className="faction-item-content">
                    <div className="faction-details">
                      <span className="faction-name" title={faction.name}>{faction.name}</span>
                      <span className="faction-relation-text">{faction.relation}</span>
                    </div>
                    <div className="faction-goodwill">
                      <span className="faction-goodwill-label">Goodwill</span>
                      <span className="faction-value">
                        {faction.goodwill > 0 ? '+' : ''}{faction.goodwill}
                      </span>
                    </div>
                  </div>
                  <div className="drag-handle drag-indicator">⋮⋮</div>
                </div>
              );
            })}
          </Responsive>
        )}
      </div>
    </div>
  );
};

export default FactionRelationsCard;