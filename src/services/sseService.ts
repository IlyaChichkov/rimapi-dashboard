// src/services/sseService.ts

type SseListener = (event: MessageEvent) => void;
type StatusListener = (status: 'connecting' | 'connected' | 'disconnected') => void;
type EventCountListener = (count: number) => void;

class SseService {
    private static instance: SseService;
    private eventSource: EventSource | null = null;
    private listeners: { [event: string]: SseListener[] } = {};
    private eventSourceListeners: { [event: string]: (e: MessageEvent) => void } = {};
    private statusListeners: StatusListener[] = [];
    private eventCountListeners: EventCountListener[] = [];
    private connectionStatus: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
    private eventCount = 0;
    private apiUrl = "http://localhost:8765/api/v1";

    private constructor() {
        // The connection will be initiated by the first component that needs it.
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

    public connect() {
    if (!this.apiUrl) {
        console.warn("SSE service API URL not set, connection aborted.");
        return;
    }

    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
        return;
    }

    this.setConnectionStatus('connecting');
    const sseUrl = `${this.apiUrl}/events`;
    
    try {
        this.eventSource = new EventSource(sseUrl);
    } catch (e) {
        console.error("Failed to create EventSource:", e);
        this.setConnectionStatus('disconnected');
        return;
    }

    this.eventSource.onopen = () => {
        this.setConnectionStatus('connected');
    };

    this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        this.setConnectionStatus('disconnected');
        this.eventSource?.close();
        this.eventSource = null;
        this.eventSourceListeners = {};
        setTimeout(() => this.connect(), 5000);
    };

    // Re-attach all existing listeners
    Object.keys(this.listeners).forEach(event => {
        this.attachListenerToEventSource(event);
    });
}

    private attachListenerToEventSource(event: string) {
        // Skip for 'message' since we handle it in onmessage
        if (event === 'message' || !this.eventSource || this.eventSourceListeners[event]) {
            return;
        }

        const handler = (e: MessageEvent) => {
            this.incrementEventCount();
            this.internalDispatch(event, e);
        };

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
                console.error('Error in event count listener:', e);
            }
        });
    }

    private internalDispatch(event: string, messageEvent: MessageEvent) {
        this.listeners[event]?.forEach(listener => {
            try {
                listener(messageEvent);
            } catch (e) {
                console.error(`Error in SSE listener for event "${event}":`, e);
            }
        });
    }

    public addEventListener(event: string, listener: SseListener) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);

        // If we're already connected, attach this listener to the event source
        // (except for 'message' which is handled by onmessage)
        if (event !== 'message' && this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
            this.attachListenerToEventSource(event);
        }
    }

    public removeEventListener(event: string, listener: SseListener) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(l => l !== listener);
        }
    }

    public addStatusListener(listener: StatusListener) {
        this.statusListeners.push(listener);
        listener(this.connectionStatus); // Immediately notify with current status
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
        listener(this.eventCount); // Immediately notify with current count
    }

    public removeEventCountListener(listener: EventCountListener) {
        this.eventCountListeners = this.eventCountListeners.filter(l => l !== listener);
    }

    // Method to manually increment count for testing
    public testIncrementCount() {
        this.incrementEventCount();
    }
}

export const sseService = SseService.getInstance();