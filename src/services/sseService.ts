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

    public connect() {
        if (!this.apiUrl) {
            console.warn("SSE service API URL not set, connection aborted.");
            return;
        }

        if (this.eventSource && this.eventSource.readyState !== this.eventSource.CLOSED) {
            return;
        }

        this.setConnectionStatus('connecting');
        const sseUrl = `${this.apiUrl}/events`;
        this.eventSource = new EventSource(sseUrl);

        this.eventSource.onopen = () => {
            this.setConnectionStatus('connected');
        };

        this.eventSource.onerror = () => {
            this.setConnectionStatus('disconnected');
            this.eventSource?.close();
            this.eventSource = null;
            // Clear the attached listeners so they can be re-added on reconnect
            this.eventSourceListeners = {};
            setTimeout(() => this.connect(), 5000);
        };

        this.eventSource.onmessage = (event) => {
            this.internalDispatch('message', event);
        };

        // Re-attach all existing listeners
        Object.keys(this.listeners).forEach(event => {
            this.attachListenerToEventSource(event);
        });
    }

    private attachListenerToEventSource(event: string) {
        if (event === 'message' || !this.eventSource || this.eventSourceListeners[event]) {
            return;
        }

        const handler = (e: MessageEvent) => {
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
        this.eventCountListeners.forEach(listener => listener(this.eventCount));
    }

    private internalDispatch(event: string, messageEvent: MessageEvent) {
        this.incrementEventCount();
        this.listeners[event]?.forEach(listener => listener(messageEvent));
    }

    public addEventListener(event: string, listener: SseListener) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);

        this.attachListenerToEventSource(event);
    }

    public removeEventListener(event: string, listener: SseListener) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(l => l !== listener);
            // Note: We are not removing the event listener from the EventSource itself
            // to keep it simple. This means the service will continue to receive these events
            // even if there are no active listeners in the components.
            // If all listeners for an event are removed, we could also remove the EventSource listener.
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
        listener(this.eventCount);
    }

    public removeEventCountListener(listener: EventCountListener) {
        this.eventCountListeners = this.eventCountListeners.filter(l => l !== listener);
    }
}

export const sseService = SseService.getInstance();
