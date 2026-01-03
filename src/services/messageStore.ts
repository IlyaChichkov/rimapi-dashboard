// src/services/messageStore.ts
import { sseService } from './sseService';

export interface Message {
    id: string;
    type: 'letter' | 'message';
    text: string;
    label: string;
    tags: string[];
    timestamp: number;
}

type MessageListener = (messages: Message[]) => void;

class MessageStore {
    private static instance: MessageStore;
    private messages: Message[] = [];
    private listeners: MessageListener[] = [];
    private nextId = 0;

    private constructor() {
        sseService.addEventListener('letter_received', this.handleLetterReceived);
        sseService.addEventListener('message_received', this.handleMessageReceived);
        
        sseService.addEventListener('game_loaded', this.handleGameStateReceived);
        sseService.addEventListener('new_game_created', this.handleGameStateReceived);
        sseService.addEventListener('exit_to_menu', this.handleGameStateReceived);
        sseService.addEventListener('game_saved', this.handleGameStateReceived);
        sseService.addEventListener('settings_changed', this.handleGameStateReceived);
        sseService.addEventListener('storyteller_changed', this.handleGameStateReceived);
    }

    public static getInstance(): MessageStore {
        if (!MessageStore.instance) {
            MessageStore.instance = new MessageStore();
        }
        return MessageStore.instance;
    }

    private handleLetterReceived = (event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);
            console.log('Letter: ', data)
            const newMessage: Message = {
                id: `msg-${this.nextId++}`,
                type: 'letter',
                label: data.label || 'Letter',
                text: data.letter.label || JSON.stringify(data),
                tags: [data.letter.def],
                timestamp: Date.now(),
            };

            if (newMessage.text.startsWith('Hostile:')) {
                const factionName = newMessage.text.split(':')[1];
                newMessage.text = `Relationship with ${factionName} faction has changed to hostile`;
            }
            this.addMessage(newMessage);
        } catch (error) {
            console.error('Error handling letter_received event:', error);
        }
    };

    private handleMessageReceived = (event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);
            console.log('Message: ', data)
            const newMessage: Message = {
                id: `msg-${this.nextId++}`,
                type: 'message',
                label: data.label || 'Message',
                text: data.message.text || JSON.stringify(data),
                tags: [data.letter.def],
                timestamp: Date.now(),
            };
            this.addMessage(newMessage);
        } catch (error) {
            console.error('Error handling message_received event:', error);
        }
    };


    private handleGameStateReceived = (event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);
            console.log('Message: ', data)
            const newMessage: Message = {
                id: `msg-${this.nextId++}`,
                type: 'message',
                label: data.label || 'Message',
                text: data.message.text || JSON.stringify(data),
                tags: [],
                timestamp: Date.now(),
            };
            this.addMessage(newMessage);
        } catch (error) {
            console.error('Error handling message_received event:', error);
        }
    };

    private addMessage(message: Message) {
        this.messages = [message, ...this.messages];
        // Optional: Limit the number of messages
        if (this.messages.length > 100) {
            this.messages.pop();
        }
        this.notifyListeners();
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.messages));
    }

    public addListener(listener: MessageListener) {
        this.listeners.push(listener);
        listener(this.messages); // Immediately notify with current messages
    }

    public removeListener(listener: MessageListener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    public getMessages(): Message[] {
        return this.messages;
    }
}

export const messageStore = MessageStore.getInstance();
