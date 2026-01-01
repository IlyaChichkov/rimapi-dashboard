// src/services/sseService.ts

type SseListener = (event: MessageEvent) => void;
type StatusListener = (status: 'connecting' | 'connected' | 'disconnected') => void;

class SseService {
    private static instance: SseService;
    private eventSource: EventSource | null = null;
    private listeners: { [event: string]: SseListener[] } = {};
    private statusListeners: StatusListener[] = [];
    private connectionStatus: 'connecting' | 'connected' | 'disconnected' = 'disconnected';

    private constructor() {
        // The connection will be initiated by the first component that needs it.
    }

    public static getInstance(): SseService {
        if (!SseService.instance) {
            SseService.instance = new SseService();
        }
        return SseService.instance;
    }

    public connect() {
        if (this.eventSource && this.eventSource.readyState !== this.eventSource.CLOSED) {
            return;
        }

        this.setConnectionStatus('connecting');
        this.eventSource = new EventSource('http://localhost:8765/api/v1/events');

        this.eventSource.onopen = () => {
            this.setConnectionStatus('connected');
        };

        this.eventSource.onerror = () => {
            this.setConnectionStatus('disconnected');
            this.eventSource?.close();
            // Implement a reconnection strategy
            setTimeout(() => this.connect(), 5000);
        };

        this.eventSource.onmessage = (event) => {
            this.dispatchEvent('message', event);
        };

        // Re-attach all existing listeners
        Object.keys(this.listeners).forEach(event => {
            this.listeners[event].forEach(listener => {
                this.eventSource?.addEventListener(event, listener);
            });
        });
    }

    private setConnectionStatus(status: 'connecting' | 'connected' | 'disconnected') {
        if (this.connectionStatus !== status) {
            this.connectionStatus = status;
            this.statusListeners.forEach(listener => listener(status));
        }
    }

    private dispatchEvent(event: string, messageEvent: MessageEvent) {
        this.listeners[event]?.forEach(listener => listener(messageEvent));
    }

    public addEventListener(event: string, listener: SseListener) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
        this.eventSource?.addEventListener(event, listener);
    }

    public removeEventListener(event: string, listener: SseListener) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(l => l !== listener);
            this.eventSource?.removeEventListener(event, listener);
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
}

export const sseService = SseService.getInstance();
