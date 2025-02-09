export type EventCallback = (...args: any[]) => void;
export type EventPattern = string;
export type EventKey = string | Symbol;

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


export function usePatternBasedEventEmitter<EventMap extends Record<string, (...args: any[]) => any>>(){
    type EventCallback<T extends any[] = any[], R = void> = (...args: T) => R;
    
    interface EventEntry<T extends any[] = any[], R = void> {
      pattern: string;
      callback: EventCallback<T, R>;
    }
  
    const events = new Map<keyof EventMap, EventEntry<any[], any>[]>();

    function on<EventName extends keyof EventMap>(event: EventMap, callback: EventMap[EventName]): void
    function on<EventName extends keyof EventMap>(event: EventMap, pattern: EventPattern, callback: EventCallback<Parameters<EventMap[EventName]>, ReturnType<EventMap[EventName]>>): void
    function on<EventName extends keyof EventMap>(event: EventName, callbackOrPattern: EventCallback<Parameters<EventMap[EventName]>, ReturnType<EventMap[EventName]>> | EventPattern, callback?: EventCallback<Parameters<EventMap[EventName]>, ReturnType<EventMap[EventName]>>): void {

        const _pattern = arguments.length == 2 ? '' : callbackOrPattern as EventPattern;
        const _callback = arguments.length == 2 ? callbackOrPattern as EventMap[keyof EventMap] : callback as EventMap[keyof EventMap];

        if(!events.has(event)){
            events.set(event, []);
        }

        events.get(event)!.push({ callback: _callback, pattern: _pattern });
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

    function emit<EventName extends keyof EventMap>(event: EventName, key:EventKey, ...args: Parameters<EventMap[EventName]>): ReturnType<EventMap[EventName]> | void {
        let patternMatches = false;
        if (events.has(event)) {
            for(let eventEntry of events.get(event)!){
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
export type PatternBasedEventEmitter = ReturnType<typeof usePatternBasedEventEmitter>;
