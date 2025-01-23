type EventCallback = (...args: any[]) => void;
type EventPattern = string;
type EventKey = string;
interface EventEntry {
    callback: EventCallback;
    pattern: EventPattern;
}
declare function useEventEmitter(): {
    on: (event: string, callback: EventCallback) => void;
    emit: (event: string, ...args: any[]) => void;
};
declare function useKeyBasedEventEmitter(): {
    on: {
        (event: string, callback: EventCallback): void;
        (event: string, pattern: EventPattern, callback: EventCallback): void;
    };
    emit: (event: string, key: EventKey, ...args: any[]) => void;
};
type EventEmitter = ReturnType<typeof useEventEmitter>;
type KeyBasedEventEmitter = ReturnType<typeof useKeyBasedEventEmitter>;

declare function createReactiveObject(input: Record<string, any>, eventEmitter: KeyBasedEventEmitter, path?: string[], modificationsAllowedCallback?: (key: any, value: any, target: any) => boolean): Record<string, any>;

declare function reactiveState(input: Record<string, any>, modificationsAllowedCallback?: (key: any, value: any, target: any) => boolean): {
    state: Record<string, any>;
    on: {
        (event: string, callback: EventCallback): void;
        (event: string, pattern: EventPattern, callback: EventCallback): void;
    };
};
type ReactiveState = ReturnType<typeof reactiveState>;

type EventTypes = 'change' | `change-${string}`;
interface ReactiveStoreContext<TState = Record<string, any>> {
    state: TState;
    [key: string]: any;
}
interface Namespace {
    state: string;
    getters: string;
    actions: string;
    global: string;
}
interface ReactiveStoreParam<State> {
    state?: State;
    getters?: Record<string, (ctx: ReactiveStoreContext<State>) => any>;
    actions?: Record<string, (ctx: ReactiveStoreContext<State>, ...args: any[]) => void>;
    global?: Record<string, (...args: any[]) => void>;
    namespace?: Namespace;
}
type ExtendMode = 'override' | 'keep' | 'error';
interface ExtendParam<State> extends ReactiveStoreParam<State> {
    mode?: ExtendMode;
}
interface Store<State> {
    state: State;
    $on(event: string, callback: EventCallback): void;
    $on(event: string, pattern: EventPattern, callback: EventCallback): void;
    $on(event: string, callbackOrPattern: EventCallback | EventPattern, callback?: EventCallback): any;
    $emit: (eventName: string, ...args: any[]) => void;
    $extend: (param: ExtendParam<State>) => void;
    [name: string]: any;
}
declare function useReactiveStore(initialConfig?: ReactiveStoreParam<any>): Store<any>;

export { type EventCallback, type EventEmitter, type EventEntry, type EventKey, type EventPattern, type EventTypes, type ExtendMode, type ExtendParam, type KeyBasedEventEmitter, type ReactiveState, type ReactiveStoreContext, type Store, createReactiveObject, reactiveState, useEventEmitter, useKeyBasedEventEmitter, useReactiveStore };
