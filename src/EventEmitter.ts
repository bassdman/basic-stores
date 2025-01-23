export type EventCallback = (...args: any[]) => void;
export type EventPattern = string;
export type EventKey = string;

export interface EventEntry {
    callback: EventCallback,
    pattern: EventPattern
}

export function useEventEmitter(){
    const events: { [event: string]: EventCallback[] } = {};

    // Registriert eine Callback-Funktion für ein Event
    function on(event: string, callback: EventCallback): void {
        if (!events[event]) {
            events[event] = [];
        }
        events[event].push(callback);
    }

    // Löst ein Event aus und ruft alle zugehörigen Callback-Funktionen auf
    function emit(event: string, ...args: any[]): void {
        if (events[event]) {
            for (const callback of events[event]) {
                callback(...args);
            }
        }
    }

    return {
        on,
        emit
    }
}

export function useKeyBasedEventEmitter(){
    const events: { [event: string]: EventEntry[] } = {};

    function on(event: string, callback: EventCallback): void
    function on(event: string, pattern: EventPattern, callback: EventCallback): void
    function on(event: string, callbackOrPattern: EventCallback | EventPattern, callback?: EventCallback): void {
        const _pattern = arguments.length == 2 ? '' : callbackOrPattern as EventPattern;
        const _callback = arguments.length == 2 ? callbackOrPattern as EventCallback : callback as EventCallback;

        if (!events[event]) {
            events[event] = [];
        }
        events[event].push({ callback: _callback, pattern: _pattern });
    }

    function evaluatePattern(callbackPattern, key): boolean {
        if (!callbackPattern)
            return true;

        if (callbackPattern == '*')
            return true;

        if (key.startsWith(callbackPattern))
            return true;

        return false;
    }

    function emit(event: string, key:EventKey, ...args: any[]): void {
        let patternMatches = false;
        if (events[event]) {
            for (const eventEntry of events[event]) {
                patternMatches = evaluatePattern(eventEntry.pattern, key);
                if(patternMatches){
                    eventEntry.callback(...args);
                }
            }
        }
    }

    return {
        on,
        emit
    }
}

export type EventEmitter = ReturnType<typeof useEventEmitter>;
export type KeyBasedEventEmitter = ReturnType<typeof useKeyBasedEventEmitter>;
