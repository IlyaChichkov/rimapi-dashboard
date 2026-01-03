// src/services/sseService.ts

type SseListener = (event: MessageEvent) => void;
type StatusListener = (status: 'connecting' | 'connected' | 'disconnected') => void;
type EventCountListener = (count: number) => void;

class SseService {
    private static instance: SseService;
    private eventSource: EventSource | null = null;
    
    // Stores the user callbacks
    private listeners: { [event: string]: SseListener[] } = {};
    
    // Stores the actual wrapper functions attached to the EventSource (to prevent duplicates)
    private eventSourceListeners: { [event: string]: (e: MessageEvent) => void } = {};
    
    private statusListeners: StatusListener[] = [];
    private eventCountListeners: EventCountListener[] = [];
    
    private connectionStatus: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
    private eventCount = 0;
    private apiUrl = "http://localhost:8765/api/v1";

    private constructor() {
        // Singleton
    }

    public static getInstance(): SseService {
        if (!SseService.instance) {
            SseService.instance = new SseService();
        }
        return SseService.instance;
    }

    public setApiUrl(url: string) {
        this.apiUrl = url.replace(/\/+$/, ""); // trim trailing slash
    }

    public getApiUrl(): string {
        return this.apiUrl;
    }

    public getReadyState(): number {
        return this.eventSource?.readyState ?? -1;
    }

    public disconnect() {
        if (this.eventSource) {
            console.log("[SSE] Disconnecting...");
            this.eventSource.close();
            this.eventSource = null;
        }
        this.eventSourceListeners = {};
        this.setConnectionStatus('disconnected');
    }

    public connect() {
        if (!this.apiUrl) {
            console.warn("[SSE] API URL not set, connection aborted.");
            return;
        }

        if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
            return;
        }

        this.setConnectionStatus('connecting');
        const sseUrl = `${this.apiUrl}/events`;
        
        console.log(`[SSE] Connecting to ${sseUrl}...`);

        try {
            this.eventSource = new EventSource(sseUrl);
        } catch (e) {
            console.error("[SSE] Failed to create EventSource:", e);
            this.setConnectionStatus('disconnected');
            return;
        }

        this.eventSource.onopen = () => {
            console.log("[SSE] Connected!");
            this.setConnectionStatus('connected');
        };

        // 1. CRITICAL FIX: Handle generic messages (events without a name)
        this.eventSource.onmessage = (e) => {
            // console.log("[SSE] Generic message received", e.data);
            this.incrementEventCount();
            this.internalDispatch('message', e);
        };

        this.eventSource.onerror = (error) => {
            console.error('[SSE] Connection error:', error);
            this.setConnectionStatus('disconnected');
            this.eventSource?.close();
            this.eventSource = null;
            this.eventSourceListeners = {};
            
            // Retry logic
            setTimeout(() => {
                console.log("[SSE] Attempting reconnect...");
                this.connect();
            }, 5000);
        };

        // Re-attach all native listeners to the new EventSource instance
        Object.keys(this.listeners).forEach(event => {
            this.attachListenerToEventSource(event);
        });
    }

    private attachListenerToEventSource(event: string) {
        // 'message' is handled by .onmessage above, so we skip it here
        if (event === 'message' || !this.eventSource || this.eventSourceListeners[event]) {
            return;
        }

        // Create a wrapper that acts as the bridge between native EventSource and our listeners
        const handler = (e: MessageEvent) => {
            console.log(`[SSE] Received named event: ${event}`);
            this.incrementEventCount();
            this.internalDispatch(event, e);
        };

        // Store it so we don't attach it twice for the same event type
        this.eventSourceListeners[event] = handler;
        this.eventSource.addEventListener(event, handler);
    }

    private setConnectionStatus(status: 'connecting' | 'connected' | 'disconnected') {
        if (this.connectionStatus !== status) {
            this.connectionStatus = status;
            this.statusListeners.forEach(listener => listener(status));
        }
    }

    private incrementEventCount() {
        this.eventCount++;
        this.eventCountListeners.forEach(listener => {
            try {
                listener(this.eventCount);
            } catch (e) {
                console.error('[SSE] Error in event count listener:', e);
            }
        });
    }

    private internalDispatch(event: string, messageEvent: MessageEvent) {
        const listeners = this.listeners[event];
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(messageEvent);
                } catch (e) {
                    console.error(`[SSE] Error in listener for event "${event}":`, e);
                }
            });
        }
    }

    // --- Public API ---

    public addEventListener(event: string, listener: SseListener) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);

        // If connected, immediately tell EventSource to listen for this specific event string
        if (event !== 'message' && this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
            this.attachListenerToEventSource(event);
        }
    }

    public removeEventListener(event: string, listener: SseListener) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(l => l !== listener);
            
            // Optional: If no listeners remain for this event, we could remove the native listener 
            // from EventSource to save memory, but it's not strictly necessary.
        }
    }

    public addStatusListener(listener: StatusListener) {
        this.statusListeners.push(listener);
        listener(this.connectionStatus);
    }

    public removeStatusListener(listener: StatusListener) {
        this.statusListeners = this.statusListeners.filter(l => l !== listener);
    }

    public getStatus(): 'connecting' | 'connected' | 'disconnected' {
        return this.connectionStatus;
    }

    public getEventCount(): number {
        return this.eventCount;
    }

    public addEventCountListener(listener: EventCountListener) {
        this.eventCountListeners.push(listener);
        listener(this.eventCount);
    }

    public removeEventCountListener(listener: EventCountListener) {
        this.eventCountListeners = this.eventCountListeners.filter(l => l !== listener);
    }

    public testIncrementCount() {
        this.incrementEventCount();
    }
}

export const sseService = SseService.getInstance();