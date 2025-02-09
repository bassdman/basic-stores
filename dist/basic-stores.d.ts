type EventCallback = (...args: any[]) => void;
type EventPattern = string;
type EventKey = string | Symbol;
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

type EmitParameterGet = {
    key: string | symbol;
    pathAsArray: string[];
    fullPath: string;
    target: Record<string, any>;
};
type EmitParameterSet = EmitParameterGet & {
    value: unknown;
};
type EmitParameterChange = EmitParameterSet & {
    oldValue: unknown;
};
type Callbacks = {
    get?: (emitParameter: EmitParameterGet) => void;
    set?: (emitParameter: EmitParameterSet) => void;
    change?: (emitParameter: EmitParameterChange) => void;
    modificationsAllowed?: (emitParameter: EmitParameterSet) => boolean;
};
declare function createReactiveObject(input: Record<string, any>, callbacks?: Callbacks): Record<string, any>;

declare function reactiveState(input: Record<string, any>, callbacks?: Callbacks): {
    state: Record<string, any>;
    on: {
        (event: string, callback: EventCallback): void;
        (event: string, pattern: EventPattern, callback: EventCallback): void;
    };
};
type ReactiveState = ReturnType<typeof reactiveState>;

type ExtendMode = 'override' | 'keep' | 'error';
type EventTypes = 'change' | `change-${string}`;
type ReactiveStoreContext<TState = Record<string, any>> = {
    state: TState;
    [key: string]: any;
};
type OmitFirstParam<F> = F extends (ctx: any, ...args: infer P) => infer R ? (...args: P) => R : never;
type GetterRecord<State> = Record<string, (ctx: ReactiveStoreContext<State>, ...args: any[]) => any>;
type ActionsRecord<State> = Record<string, (ctx: ReactiveStoreContext<State>, ...args: any[]) => void>;
type GlobalsRecord = Record<string, (...args: any[]) => void>;
type ReactiveStoreParam<State, Getters = GetterRecord<State>, Actions = ActionsRecord<State>, Globals = GlobalsRecord> = {
    state?: State;
    getters?: Getters;
    actions?: Actions;
    global?: Globals;
};
type ExtendParam<State> = ReactiveStoreParam<State> & {};
type Store<State, Getters, Actions, Globals> = {
    state: State;
    $on(event: string, callback: EventCallback): void;
    $on(event: string, pattern: EventPattern, callback: EventCallback): void;
    $on(event: string, callbackOrPattern: EventCallback | EventPattern, callback?: EventCallback): any;
    $emit: (eventName: string, ...args: any[]) => void;
} & {
    [K in keyof Getters]: OmitFirstParam<Getters[K]>;
} & {
    [A in keyof Actions]: OmitFirstParam<Actions[A]>;
} & Globals & {
    $extend: <NewState extends Record<string, any>, NewGetters extends Record<string, (ctx: any, ...args: any[]) => any>, NewActions extends Record<string, (ctx: any, ...args: any[]) => any>, NewGlobals extends Record<string, (...args: any[]) => any>>(config: ReactiveStoreParam<NewState, NewGetters, NewActions, NewGlobals>, mode?: ExtendMode) => Store<State & NewState, Getters & NewGetters, Actions & NewActions, Globals & NewGlobals>;
};
declare function useReactiveStore<RState extends Record<string, any>, RGetters extends Record<string, (ctx: any, ...args: any[]) => any>, RActions extends Record<string, (ctx: any, ...args: any[]) => any>, RGlobals extends Record<string, (...args: any[]) => any>>(initialConfig?: ReactiveStoreParam<RState, RGetters, RActions, RGlobals>): Store<RState, RGetters, RActions, RGlobals>;

export { type EventCallback, type EventEmitter, type EventEntry, type EventKey, type EventPattern, type EventTypes, type ExtendMode, type ExtendParam, type KeyBasedEventEmitter, type ReactiveState, type ReactiveStoreContext, type Store, createReactiveObject, reactiveState, useEventEmitter, useKeyBasedEventEmitter, useReactiveStore };
