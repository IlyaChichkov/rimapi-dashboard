// src/components/FactionRelationsCard.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Responsive, LayoutItem } from 'react-grid-layout'; // Import LayoutItem, not Layout
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Faction } from '../types';
import { rimworldApi } from '../services/rimworldApi';
import './FactionRelationsCard.css';

// Use LayoutItem as the base type
interface FactionLayoutItem extends LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isResizable?: boolean;
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

  // Initialize with empty array if no settings
  const [currentLayout, setCurrentLayout] = useState<FactionLayoutItem[]>(
    settings?.layout || []
  );

  const [width, setWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

        setWidth(prev => {
          if (Math.abs(prev - newWidth) < 5) return prev;
          return newWidth;
        });
      });
    });

    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

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
    if (factions.length === 0) return;

    // Only generate layout if we don't have one already
    if (currentLayout.length === 0) {
      const itemsPerRow = 4;
      const newLayout: FactionLayoutItem[] = factions.map((faction, index) => ({
        i: faction.load_id.toString(),
        x: (index % itemsPerRow),
        y: Math.floor(index / itemsPerRow),
        w: 1,
        h: 1,
        isResizable: false
      }));

      setCurrentLayout(newLayout);

      if (onSettingsChange) {
        onSettingsChange({ layout: newLayout });
      }
    }
  }, [factions, currentLayout.length, onSettingsChange]);

  // Correct handler signature
  const handleLayoutChange = useCallback((
    layout: LayoutItem[], // Array of LayoutItems
    allLayouts: Record<string, LayoutItem[]> // Record of arrays
  ) => {
    const cleanLayout: FactionLayoutItem[] = layout.map(l => ({
      i: l.i,
      x: l.x,
      y: l.y,
      w: l.w,
      h: l.h,
      isResizable: false
    }));

    setCurrentLayout(cleanLayout);
    if (onSettingsChange) {
      onSettingsChange({ layout: cleanLayout });
    }
  }, [onSettingsChange]);

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
        {/* Check both width and layout */}
        {width > 100 && currentLayout.length > 0 && (
          <Responsive
            className="faction-inner-grid"
            layouts={{ lg: currentLayout }}
            breakpoints={{ lg: 0 }}
            cols={{ lg: 4 }}
            rowHeight={80}
            width={width}
            margin={[10, 10]}
            onLayoutChange={handleLayoutChange as any}
            // Remove all drag event handlers - let the library handle them
            dragConfig={{
              enabled: true,
              handle: '.faction-item',
            }}
            resizeConfig={{ enabled: false }}
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
                  <div
                    className="drag-handle drag-indicator"
                  >
                    ⋮⋮
                  </div>
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