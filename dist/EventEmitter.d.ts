export type EventCallback = (...args: any[]) => void;
export type EventPattern = string;
export type EventKey = string;
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
export type EventEmitter = ReturnType<typeof useEventEmitter>;
export type KeyBasedEventEmitter = ReturnType<typeof useKeyBasedEventEmitter>;
//# sourceMappingURL=EventEmitter.d.ts.map