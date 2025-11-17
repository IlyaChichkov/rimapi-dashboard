// src/components/DevTab.tsx
import React from 'react';
import ModsTab from './ModsTab';
import './DevTab.css';
import { rimworldApi } from '../services/rimworldApi';

type DevSubTab = 'mods' | 'console' | 'debug' | 'texture';
type TextureKind = 'item' | 'building' | 'plant' | 'other' | 'def' | 'linked';
type TextureDirection = 'north' | 'west' | 'east' | 'south';

interface DevTabProps {
    modsInfo?: any[];
    loading?: boolean;
}

const DevTab: React.FC<DevTabProps> = ({ modsInfo = [], loading = false }) => {
    const [activeSubTab, setActiveSubTab] = React.useState<DevSubTab>('mods');

    const renderSubTabContent = () => {
        switch (activeSubTab) {
            case 'mods':
                return <ModsTab modsInfo={modsInfo} loading={loading} />;
            case 'console':
                return <DevConsole />;
            case 'debug':
                return <DebugActions />;
            case 'texture':
                return <SetTexture />;
            default:
                return <ModsTab modsInfo={modsInfo} loading={loading} />;
        }
    };

    return (
        <div className="dev-tab">
            <div className="dev-subtabs">
                <button
                    className={`dev-subtab-button ${activeSubTab === 'mods' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('mods')}
                >
                    ⚙️ Mods
                </button>
                <button
                    className={`dev-subtab-button ${activeSubTab === 'console' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('console')}
                >
                    💻 Console
                </button>
                <button
                    className={`dev-subtab-button ${activeSubTab === 'texture' ? 'active' : ''}`}
                    onClick={() => setActiveSubTab('texture')}
                >
                    🖼️ Set Texture
                </button>
            </div>

            <div className="dev-subtab-content">
                {renderSubTabContent()}
            </div>
        </div>
    );
};

export default DevTab;

const DevConsole: React.FC = () => {
    type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'other';

    interface LogEntry {
        id: number;
        time: string;
        level: LogLevel;
        message: string;
        jsonPretty?: string;
    }

    const [lines, setLines] = React.useState<LogEntry[]>([
        {
            id: 0,
            time: new Date().toLocaleTimeString(),
            level: 'info',
            message: 'Debug log ready. Listening to SSE stream…',
        },
    ]);

    const [status, setStatus] = React.useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const [autoScroll, setAutoScroll] = React.useState<boolean>(true);

    // level filter state
    const [enabledLevels, setEnabledLevels] = React.useState<Record<LogLevel, boolean>>({
        info: true,
        warn: true,
        error: true,
        debug: true,
        other: true,
    });

    const nextIdRef = React.useRef(1);
    const outputRef = React.useRef<HTMLDivElement>(null);

    const classifyLevelFromText = (msg: string): LogLevel => {
        const m = msg.toLowerCase();
        if (m.includes('exception') || m.includes('error') || m.includes('stacktrace') || m.includes('fatal')) return 'error';
        if (m.includes('warn')) return 'warn';
        if (m.includes('debug')) return 'debug';
        if (m.includes('info')) return 'info';
        return 'other';
    };

    const normalizeLevelFromServer = (lvl: string | undefined): LogLevel | undefined => {
        if (!lvl) return undefined;
        const norm = lvl.toLowerCase();    // "info" | "warning" | "error"
        if (norm.startsWith('err')) return 'error';
        if (norm.startsWith('warn')) return 'warn';
        if (norm.startsWith('deb')) return 'debug';
        if (norm.startsWith('info')) return 'info';
        return 'other';
    };

    // Try to find the first substring that is valid JSON ("{...}" or "[...]")
    const findJsonStart = (msg: string): number => {
        for (let i = 0; i < msg.length; i++) {
            const ch = msg[i];
            if (ch === '{' || ch === '[') {
                const candidate = msg.slice(i);
                try {
                    JSON.parse(candidate);
                    return i;
                } catch {
                    // keep scanning
                }
            }
        }
        return -1;
    };

    const extractJsonPretty = (msg: string): { clean: string; jsonPretty?: string } => {
        const idx = findJsonStart(msg);
        if (idx === -1) {
            return { clean: msg };
        }

        const prefix = msg.slice(0, idx).trimEnd();
        const candidate = msg.slice(idx);

        try {
            const parsed = JSON.parse(candidate);
            const pretty = JSON.stringify(parsed, null, 2);
            return {
                clean: prefix || msg,
                jsonPretty: pretty,
            };
        } catch {
            return { clean: msg };
        }
    };

    const appendLog = React.useCallback((raw: any, explicitLevel?: LogLevel) => {
        let text: string;
        let level: LogLevel | undefined = explicitLevel;

        // raw is the SSE event.data (string)
        if (typeof raw === 'string') {
            const trimmed = raw.trim();
            let parsedOuter: any | null = null;

            // your SSE payload: { level: "Info" | "Warning" | "Error", message: text, ticks: ... }
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try {
                    parsedOuter = JSON.parse(trimmed);
                } catch {
                    parsedOuter = null;
                }
            }

            if (
                parsedOuter &&
                typeof parsedOuter === 'object' &&
                ('message' in parsedOuter || 'msg' in parsedOuter || 'text' in parsedOuter)
            ) {
                const outer = parsedOuter as { level?: string; message?: string; msg?: string; text?: string };
                if (!level && outer.level) {
                    level = normalizeLevelFromServer(outer.level);
                }
                text = String(outer.message ?? outer.msg ?? outer.text ?? '');
            } else {
                text = raw;
            }
        } else if (raw && typeof raw === 'object') {
            text = (raw.message ?? raw.msg ?? raw.text ?? JSON.stringify(raw)) as string;
            if (!level) {
                level = normalizeLevelFromServer(raw.level ?? raw.severity ?? raw.type);
            }
        } else {
            text = String(raw);
        }

        if (!level) {
            level = classifyLevelFromText(text);
        }

        const { clean, jsonPretty } = extractJsonPretty(text);
        const id = nextIdRef.current++;
        const time = new Date().toLocaleTimeString();
        const finalLevel: LogLevel = level ?? 'info';

        setLines(prev => [
            ...prev,
            {
                id,
                time,
                level: finalLevel,
                message: clean,
                jsonPretty,
            },
        ]);
    }, []);

    // SSE hookup
    React.useEffect(() => {
        let es: EventSource | null = null;

        try {
            setStatus('connecting');
            es = new EventSource('http://localhost:8765/api/v1/events');

            es.onopen = () => setStatus('connected');

            es.addEventListener('log_message', (ev: MessageEvent) => {
                try {
                    appendLog(ev.data);
                } catch (err) {
                    console.error('log_message handler error', err);
                    appendLog(ev.data);
                }
            });

            es.onerror = () => {
                setStatus('disconnected');
                if (es) {
                    es.close();
                    es = null;
                }
            };
        } catch (err) {
            console.error('SSE setup error', err);
            setStatus('disconnected');
        }

        return () => {
            if (es) {
                es.close();
                es = null;
            }
        };
    }, [appendLog]);

    // Auto-scroll (respect toggle)
    React.useEffect(() => {
        if (!autoScroll) return;
        const el = outputRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [lines.length, autoScroll]);

    const toggleLevel = (lvl: LogLevel) => {
        setEnabledLevels(prev => ({
            ...prev,
            [lvl]: !prev[lvl],
        }));
    };

    const enableAllLevels = () => {
        setEnabledLevels({
            info: true,
            warn: true,
            error: true,
            debug: true,
            other: true,
        });
    };

    const disableAllLevels = () => {
        setEnabledLevels({
            info: false,
            warn: false,
            error: false,
            debug: false,
            other: false,
        });
    };

    const filteredLines = lines.filter(entry => enabledLevels[entry.level]);

    return (
        <div className="dev-console">
            <div className="dev-console-header">
                <div className="dev-console-title">Debug log</div>
                <div className="dev-console-header-right">
                    <div className="dev-console-filters">
                        <span className="filter-label">Levels:</span>
                        {(['error', 'warn', 'info'] as LogLevel[]).map(lvl => (
                            <button
                                key={lvl}
                                type="button"
                                className={`level-filter-pill level-pill-${lvl} ${enabledLevels[lvl] ? 'on' : 'off'}`}
                                onClick={() => toggleLevel(lvl)}
                            >
                                {lvl.toUpperCase()}
                            </button>
                        ))}
                        <button
                            type="button"
                            className="level-filter-quick all"
                            onClick={enableAllLevels}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            className="level-filter-quick none"
                            onClick={disableAllLevels}
                        >
                            None
                        </button>
                    </div>

                    <button
                        type="button"
                        className={`dev-console-autoscroll ${autoScroll ? 'on' : 'off'}`}
                        onClick={() => setAutoScroll(prev => !prev)}
                    >
                        Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
                    </button>

                    <div className={`dev-console-status status-${status}`}>
                        {status === 'connecting' && 'Connecting…'}
                        {status === 'connected' && 'Connected'}
                        {status === 'disconnected' && 'Disconnected'}
                    </div>
                </div>
            </div>

            <div className="dev-console-output" role="log" ref={outputRef}>
                {filteredLines.map(entry => (
                    <div
                        key={entry.id}
                        className={`dev-console-line level-${entry.level}`}
                    >
                        <div className="dev-console-meta">
                            <span className="log-time">{entry.time}</span>
                            <span className={`log-level-badge level-${entry.level}`}>
                                {entry.level.toUpperCase()}
                            </span>
                        </div>

                        {entry.message && (
                            <div className="dev-console-message">
                                {entry.message}
                            </div>
                        )}

                        {entry.jsonPretty && (
                            <pre className="dev-console-json">
                                {entry.jsonPretty}
                            </pre>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};


const DebugActions: React.FC = () => {
    const [status, setStatus] = React.useState<string>('');
    const run = async (label: string, action: () => Promise<void> | void) => {
        try {
            setStatus(`Running: ${label}…`);
            await action();
            setStatus(`✅ Done: ${label}`);
        } catch (e: any) {
            setStatus(`❌ Failed: ${label} — ${e?.message || e}`);
        }
    };
    return (
        <div className="debug-actions">
            <div className="debug-actions-grid">
                <button className="debug-btn" onClick={() => run('Spawn Item', async () => { })}>Spawn item</button>
            </div>
            {status && <div className="debug-status">{status}</div>}
        </div>
    );
};
const SetTexture: React.FC = () => {
    const [itemName, setItemName] = React.useState('');
    const [kind, setKind] = React.useState<TextureKind>('item');
    const [imageIndex, setImageIndex] = React.useState('-1');
    const [useDirection, setUseDirection] = React.useState(false);
    const [direction, setDirection] = React.useState<TextureDirection>('north');

    const [file, setFile] = React.useState<File | null>(null);
    const [preview, setPreview] = React.useState<string | null>(null);
    const [dragOver, setDragOver] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [progress, setProgress] = React.useState<number>(0);
    const [log, setLog] = React.useState<string[]>([]);

    const appendLog = (s: string) =>
        setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${s}`]);

    const onPick = (f: File) => {
        setFile(f);
        if (preview) URL.revokeObjectURL(preview);
        const url = URL.createObjectURL(f);
        setPreview(url);
        appendLog(`Selected file: ${f.name} (${Math.round(f.size / 1024)} KB)`);
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onPick(f);
    };

    const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) onPick(f);
    };

    const onUpload = async () => {
        if (!itemName.trim()) {
            appendLog('⚠️ Enter DefName first.');
            return;
        }
        if (!file) {
            appendLog('⚠️ Pick an image first.');
            return;
        }
        try {
            setBusy(true);
            setProgress(0);
            setLog([]);
            appendLog(
                `Uploading texture for "${itemName.trim()}" as ${kind}` +
                (useDirection ? ` (${direction})` : '')
            );
            appendLog(`Reading file: ${file.name} (${Math.round(file.size / 1024)} KB)`);

            await rimworldApi.uploadItemTextureFile(itemName.trim(), file, {
                kind,
                direction: useDirection ? direction : undefined,
                imageIndex,
                onProgress: (p, sent, total, idx) => {
                    setProgress(p);
                    if (idx === 0 || p === 100 || p % 10 === 0) {
                        appendLog(`Progress ${p}% (${Math.round(sent / 1024)} / ${Math.round(total / 1024)} KB)`);
                    }
                }
            });

            appendLog('✅ Upload complete and finalized (final:true).');
        } catch (err: any) {
            console.error(err);
            appendLog(`❌ Upload failed: ${err?.message || err}`);
        } finally {
            setBusy(false);
        }
    };

    const onClear = () => {
        setItemName('');
        setKind('item');
        setImageIndex('-1');
        setUseDirection(false);
        setDirection('north');
        setFile(null);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        setProgress(0);
        setLog([]);
    };

    // ─────────────────────────────────────────
    // Stuff color form state & handlers
    // ─────────────────────────────────────────
    const [stuffName, setStuffName] = React.useState('');
    const [stuffHex, setStuffHex] = React.useState('#aa00ff');
    const [stuffBusy, setStuffBusy] = React.useState(false);
    const [stuffLog, setStuffLog] = React.useState<string[]>([]);

    const appendStuffLog = (s: string) =>
        setStuffLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${s}`]);

    const onSetStuffColor = async () => {
        if (!stuffName.trim()) {
            appendStuffLog('⚠️ Enter stuff DefName first.');
            return;
        }
        if (!stuffHex.trim()) {
            appendStuffLog('⚠️ Choose a color.');
            return;
        }

        try {
            setStuffBusy(true);
            const cleanHex = stuffHex.replace(/^#/, '');
            appendStuffLog(`Setting color for ${stuffName.trim()} → ${cleanHex}`);
            await rimworldApi.setStuffColor(stuffName.trim(), cleanHex);
            appendStuffLog('✅ Stuff color updated.');
        } catch (err: any) {
            console.error(err);
            appendStuffLog(`❌ Failed to set stuff color: ${err?.message || err}`);
        } finally {
            setStuffBusy(false);
        }
    };

    const onClearStuff = () => {
        setStuffName('');
        setStuffHex('#aa00ff');
        setStuffLog([]);
    };

    // ─────────────────────────────────────────
    // Materials atlas state & handlers
    // ─────────────────────────────────────────
    const [atlasMaterials, setAtlasMaterials] = React.useState<string[]>([]);
    const [atlasLoading, setAtlasLoading] = React.useState(false);
    const [atlasError, setAtlasError] = React.useState<string | null>(null);
    const [clearingAtlas, setClearingAtlas] = React.useState(false);

    const loadAtlas = async () => {
        try {
            setAtlasLoading(true);
            setAtlasError(null);
            const res = await rimworldApi.fetchMaterialsAtlas();
            setAtlasMaterials(res.materials || []);
        } catch (err: any) {
            console.error(err);
            setAtlasError(err?.message || 'Failed to load materials atlas');
        } finally {
            setAtlasLoading(false);
        }
    };

    const onClearAtlas = async () => {
        try {
            setClearingAtlas(true);
            await rimworldApi.clearMaterialsAtlas();
            await loadAtlas();
        } catch (err: any) {
            console.error(err);
            setAtlasError(err?.message || 'Failed to clear atlas');
        } finally {
            setClearingAtlas(false);
        }
    };

    React.useEffect(() => {
        // Load materials atlas once when opening this subtab
        loadAtlas().catch(() => void 0);
    }, []);

    return (
        <div className="set-texture">
            {/* ───────── Texture upload form ───────── */}
            <div className="texture-form">

                {/* Target type */}
                <div className="form-row type-row">
                    <label>Target Type</label>
                    <div className="segmented-toggle">
                        {(['item', 'building', 'plant', 'other', 'def', 'linked'] as TextureKind[]).map(k => (
                            <button
                                key={k}
                                type="button"
                                className={`segmented-btn ${kind === k ? 'active' : ''}`}
                                onClick={() => setKind(k)}
                                disabled={busy}
                            >
                                {k === 'item' && 'Item'}
                                {k === 'building' && 'Building'}
                                {k === 'plant' && 'Plant'}
                                {k === 'other' && 'Other'}
                                {k === 'def' && 'Def'}
                                {k === 'linked' && 'Linked'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* DefName */}
                <div className="form-row">
                    <label htmlFor="itemDefName">DefName</label>
                    <input
                        id="itemDefName"
                        className="texture-input"
                        placeholder="e.g. ComponentIndustrial"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        disabled={busy}
                    />
                </div>

                {/* Image Index */}
                <div className="form-row">
                    <label htmlFor="itemImageIndex">Image Index</label>
                    <input
                        id="itemImageIndex"
                        className="texture-input"
                        placeholder=""
                        value={imageIndex}
                        onChange={(e) => setImageIndex(e.target.value)}
                        disabled={busy}
                    />
                </div>

                {/* Direction controls */}
                <div className="form-row direction-row">
                    <label>Direction</label>
                    <div className="direction-controls">
                        <label className="direction-toggle">
                            <input
                                type="checkbox"
                                checked={useDirection}
                                onChange={(e) => setUseDirection(e.target.checked)}
                                disabled={busy}
                            />
                            <span>Use specific direction</span>
                        </label>
                        <select
                            className="direction-select"
                            disabled={!useDirection || busy}
                            value={direction}
                            onChange={(e) => setDirection(e.target.value as TextureDirection)}
                        >
                            <option value="north">North</option>
                            <option value="west">West</option>
                            <option value="east">East</option>
                            <option value="south">South</option>
                        </select>
                    </div>
                    <div className="direction-hint">
                        Optional: define a directional variant (north / west / east / south).
                    </div>
                </div>

                {/* Dropzone */}
                <div
                    className={`dropzone ${dragOver ? 'dragover' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                >
                    {preview ? (
                        <img className="preview-img" src={preview} alt="preview" />
                    ) : (
                        <div className="dropzone-hint">
                            <div className="big-icon">📥</div>
                            <div>Drag & drop an image here</div>
                            <div className="muted">or click to choose a file</div>
                        </div>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        className="file-input"
                        onChange={onFileInput}
                        disabled={busy}
                        title=""
                    />
                </div>

                {/* Actions */}
                <div className="actions">
                    <button
                        className="upload-btn"
                        onClick={onUpload}
                        disabled={busy || !file || !itemName.trim()}
                    >
                        {busy ? 'Uploading…' : 'Upload Texture'}
                    </button>
                    <button
                        className="clear-btn"
                        onClick={onClear}
                        disabled={busy && !!file}
                    >
                        Clear
                    </button>
                </div>

                {/* Progress + log */}
                <div className="progress-row" aria-hidden={!busy && progress === 0}>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="progress-text">{progress}%</span>
                </div>

                <div className="log-box" role="log" aria-live="polite">
                    {log.map((l, i) => <div key={i} className="log-line">{l}</div>)}
                </div>

                <div className="hint">
                    <strong>Note:</strong> Currently only items are actually applied on the server.
                    Client splits Base64 into chunks and the last request is marked with <code>final: true</code>.
                    <br />
                    Extra fields <code>kind</code> and <code>direction</code> are sent so the backend can support
                    buildings/plants and directional textures later.
                </div>
            </div>

            {/* ───────── Divider ───────── */}
            <div className="dev-section-divider" />

            {/* ───────── Stuff color form ───────── */}
            <div className="stuff-color-form">
                <h3 className="dev-section-title">🎨 Set Stuff Color</h3>

                <div className="form-row">
                    <label htmlFor="stuffDefName">Stuff DefName</label>
                    <input
                        id="stuffDefName"
                        className="texture-input"
                        placeholder="e.g. WoodLog"
                        value={stuffName}
                        onChange={(e) => setStuffName(e.target.value)}
                        disabled={stuffBusy}
                    />
                </div>

                <div className="stuff-color-row">
                    <div className="stuff-color-picker">
                        <label>Color</label>
                        <div className="stuff-color-inputs">
                            <input
                                type="color"
                                value={stuffHex}
                                onChange={(e) => setStuffHex(e.target.value)}
                                disabled={stuffBusy}
                                className="stuff-color-field"
                            />
                            <input
                                type="text"
                                value={stuffHex}
                                onChange={(e) => setStuffHex(e.target.value)}
                                disabled={stuffBusy}
                                className="stuff-hex-input"
                                placeholder="#aa00ff"
                            />
                        </div>
                    </div>
                </div>

                <div className="actions">
                    <button
                        className="upload-btn"
                        onClick={onSetStuffColor}
                        disabled={stuffBusy || !stuffName.trim()}
                    >
                        {stuffBusy ? 'Applying…' : 'Apply Color'}
                    </button>
                    <button
                        className="clear-btn"
                        onClick={onClearStuff}
                        disabled={stuffBusy}
                    >
                        Clear
                    </button>
                </div>

                <div className="log-box small" role="log" aria-live="polite">
                    {stuffLog.map((l, i) => (
                        <div key={i} className="log-line">{l}</div>
                    ))}
                </div>

                <div className="hint">
                    Sends <code>{'{ name: "WoodLog", hex: "aa00ff" }'}</code> to <code>/stuff/color</code>.
                </div>
            </div>

            {/* ───────── Divider ───────── */}
            <div className="dev-section-divider" />

            {/* ───────── Materials atlas form ───────── */}
            <div className="atlas-form">
                <h3 className="dev-section-title">🧱 Materials Atlas Pool</h3>

                <div className="atlas-actions">
                    <button
                        className="upload-btn"
                        onClick={loadAtlas}
                        disabled={atlasLoading || clearingAtlas}
                    >
                        {atlasLoading ? 'Loading…' : 'Refresh'}
                    </button>
                    <button
                        className="clear-btn warning"
                        onClick={onClearAtlas}
                        disabled={atlasLoading || clearingAtlas}
                    >
                        {clearingAtlas ? 'Clearing…' : 'Clear Atlas Pool'}
                    </button>
                </div>

                {atlasError && (
                    <div className="atlas-error">
                        ❌ {atlasError}
                    </div>
                )}

                <div className="atlas-summary">
                    {atlasLoading
                        ? 'Loading materials…'
                        : `${atlasMaterials.length} materials in atlas pool`}
                </div>

                <div className="atlas-list">
                    {atlasMaterials.length === 0 && !atlasLoading ? (
                        <div className="atlas-empty">No materials in atlas.</div>
                    ) : (
                        atlasMaterials.map((m, i) => (
                            <div key={`${m}-${i}`} className="atlas-item">
                                {m}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
