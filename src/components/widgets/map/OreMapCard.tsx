import React, { useEffect, useRef, useState, useMemo } from 'react';
import { rimworldApi } from '@/services/rimworldApi';
import { MapOresData } from '@/types';
import { ORE_COLORS, DEFAULT_COLOR } from './TerrainColors';
import DashboardCard from '../common/DashboardCard';

const OreMapCard: React.FC = () => {
    const [data, setData] = useState<MapOresData | null>(null);
    const [loading, setLoading] = useState(true);
    const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number, name: string } | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Fetch Data
    useEffect(() => {
        let mounted = true;
        rimworldApi.getMapOres(0).then(response => {
            if (mounted && response?.success) {
                setData(response.data);
            }
            if (mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, []);

    // Draw Map
    useEffect(() => {
        if (!data || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 1. Determine Map Size
        // The API gives us Width. We assume Height is same (Square) or derive from max index.
        const width = data.mapWidth;
        // Find max index to deduce height if needed, but RimWorld maps are usually square (250x250, etc)
        // Let's assume height = width for now, or calculate:
        let maxIdx = 0;
        Object.values(data.ores).forEach(g => {
            if (g.cells.length > 0) maxIdx = Math.max(maxIdx, ...g.cells);
        });
        const height = Math.max(width, Math.ceil((maxIdx + 1) / width));

        canvas.width = width;
        canvas.height = height;

        // 2. Clear & Background
        ctx.fillStyle = '#111'; // Dark background for "Scanner" look
        ctx.fillRect(0, 0, width, height);

        // 3. Create Image Buffer
        const imgData = ctx.getImageData(0, 0, width, height);
        const pixels = imgData.data;

        // 4. Draw Ores
        Object.entries(data.ores).forEach(([defName, group]) => {
            const [r, g, b] = ORE_COLORS[defName] || DEFAULT_COLOR;

            // Draw every cell in this group
            for (const cellIndex of group.cells) {
                // Determine X, Y
                // Index = (z * width) + x  ->  z = floor(index/width), x = index % width
                // Note: RimWorld Z is "Up" on screen. Canvas Y is "Down".
                // To match game view, we usually invert Y: canvasY = height - 1 - z
                const z = Math.floor(cellIndex / width);
                const x = cellIndex % width;
                const canvasY = height - 1 - z;

                const pos = (canvasY * width + x) * 4;

                pixels[pos] = r;
                pixels[pos + 1] = g;
                pixels[pos + 2] = b;
                pixels[pos + 3] = 255; // Alpha
            }
        });

        ctx.putImageData(imgData, 0, 0);

    }, [data]);

    // Simple Hit Test for Tooltip
    // Since we don't have a grid, we search the ore lists.
    // This is O(Num_Ore_Types), which is very fast (~20 iterations).
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!data || !canvasRef.current || !containerRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const width = data.mapWidth;
        let maxIdx = 0;
        Object.values(data.ores).forEach(g => { if (g.cells.length > 0) maxIdx = Math.max(maxIdx, ...g.cells); });
        const height = Math.max(width, Math.ceil((maxIdx + 1) / width));

        // Canvas Scale
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;

        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        // Convert Canvas X/Y back to Game Index
        // canvasY = height - 1 - z  =>  z = height - 1 - canvasY
        const z = height - 1 - y;
        const targetIndex = (z * width) + x;

        let foundName = null;

        // Check which ore group contains this index
        for (const [defName, group] of Object.entries(data.ores)) {
            // Using includes is O(N) per group. Total O(Total_Ore_Cells).
            // For 10k ore cells, this might be slightly laggy on mousemove if not optimized.
            // But usually fast enough. Optimization: Use a Set or 2D array if laggy.
            if (group.cells.includes(targetIndex)) {
                foundName = defName;
                break;
            }
        }

        if (foundName) {
            let displayName = foundName.replace('Mineable', '').replace('_Rough', '');
            displayName = displayName.replace(/([A-Z])/g, ' $1').trim();
            setHoverInfo({ x: e.clientX - rect.left, y: e.clientY - rect.top, name: displayName });
        } else {
            setHoverInfo(null);
        }
    };

    return (
        <DashboardCard title="Ore Map">
            <div
                ref={containerRef}
                className="wm-scene-container"
                style={{ background: '#000', cursor: 'crosshair', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoverInfo(null)}
            >
                {loading && <div style={{ color: '#666' }}>Scanning...</div>}

                <canvas
                    ref={canvasRef}
                    style={{
                        width: '100%',
                        height: '100%',
                        imageRendering: 'pixelated',
                        objectFit: 'contain'
                    }}
                />

                {hoverInfo && (
                    <div style={{
                        position: 'absolute',
                        left: hoverInfo.x + 10,
                        top: hoverInfo.y + 10,
                        background: 'rgba(0,0,0,0.85)',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        pointerEvents: 'none',
                        border: '1px solid #444',
                        zIndex: 10
                    }}>
                        {hoverInfo.name}
                    </div>
                )}
            </div>
        </DashboardCard>
    );
};

export default OreMapCard;