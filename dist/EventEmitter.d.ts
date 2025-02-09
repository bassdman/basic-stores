export type EventCallback = (...args: any[]) => void;
export type EventPattern = string;
export type EventKey = string | Symbol;
export interface EventEntry {
    callback: EventCallback;
    pattern: EventPattern;
}
export declare function useEventEmitter(): {
    on: (event: string, callback: EventCallback) => void;
    emit: (event: string, ...args: any[]) => void;
};
export declare function useKeyBasedEventEmitter(): {
    on: {
        (event: string, callback: EventCallback): void;
        (event: string, pattern: EventPattern, callback: EventCallback): void;
    };
    emit: (event: string, key: EventKey, ...args: any[]) => void;
};
export declare function usePatternBasedEventEmitter<EventMap extends Record<string, (...args: any[]) => any>>(): {
    on: {
        <EventName extends keyof EventMap>(event: EventMap, callback: EventMap[EventName]): void;
        <EventName extends keyof EventMap>(event: EventMap, pattern: EventPattern, callback: (...args: Parameters<EventMap[EventName]>) => ReturnType<EventMap[EventName]>): void;
    };
    emit: <EventName extends keyof EventMap>(event: EventName, key: EventKey, ...args: Parameters<EventMap[EventName]>) => ReturnType<EventMap[EventName]> | void;
};
export type EventEmitter = ReturnType<typeof useEventEmitter>;
export type KeyBasedEventEmitter = ReturnType<typeof useKeyBasedEventEmitter>;
export type PatternBasedEventEmitter = ReturnType<typeof usePatternBasedEventEmitter>;
//# sourceMappingURL=EventEmitter.d.ts.map