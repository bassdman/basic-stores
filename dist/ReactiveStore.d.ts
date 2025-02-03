import { EventCallback, EventPattern } from "./EventEmitter";
export type ExtendMode = 'override' | 'keep' | 'error';
export type EventTypes = 'change' | `change-${string}`;
export type ReactiveStoreContext<TState = Record<string, any>> = {
    state: TState;
    [key: string]: any;
};
type OmitFirstParam<F> = F extends (ctx: any, ...args: infer P) => infer R ? (...args: P) => R : never;
type GetterRecord<State> = Record<string, (ctx: ReactiveStoreContext<State>, ...args: any[]) => any>;
type ActionsRecord<State> = Record<string, (ctx: ReactiveStoreContext<State>, ...args: any[]) => void>;
type GlobalsRecord = Record<string, (...args: any[]) => void>;
export type Namespace = {
    state: string;
    getters: string;
    actions: string;
    global: string;
};
export type ReactiveStoreParam<State, Getters = GetterRecord<State>, Actions = ActionsRecord<State>, Globals = GlobalsRecord> = {
    state?: State;
    getters?: Getters;
    actions?: Actions;
    global?: Globals;
    namespace?: Namespace;
};
export type ExtendParam<State> = ReactiveStoreParam<State> & {};
export type Store<State, Getters, Actions, Globals> = {
    state: State;
    $on(event: string, callback: EventCallback): void;
    $on(event: string, pattern: EventPattern, callback: EventCallback): void;
    $on(event: string, callbackOrPattern: EventCallback | EventPattern, callback?: EventCallback): any;
    $emit: (eventName: string, ...args: any[]) => void;
} & {
    [K in keyof Getters]: OmitFirstParam<Getters[K]>;
} & {
    [K in keyof Actions]: OmitFirstParam<Actions[K]>;
} & Globals & {
    $extend: <NewState extends Record<string, any>, NewGetters extends Record<string, (ctx: any, ...args: any[]) => any>, NewActions extends Record<string, (ctx: any, ...args: any[]) => any>, NewGlobals extends Record<string, (...args: any[]) => any>>(config: ReactiveStoreParam<NewState, NewGetters, NewActions, NewGlobals>, mode?: ExtendMode) => Store<State & NewState, Getters & NewGetters, Actions & {
        [K in keyof NewActions]: OmitFirstParam<NewActions[K]>;
    }, Globals & NewGlobals>;
};
export declare function useReactiveStore<RState extends Record<string, any>, RGetters extends Record<string, (ctx: any, ...args: any[]) => any>, RActions extends Record<string, (ctx: any, ...args: any[]) => any>, RGlobals extends Record<string, (...args: any[]) => any>>(initialConfig?: ReactiveStoreParam<RState, RGetters, RActions, RGlobals>): Store<RState, RGetters, RActions, RGlobals>;
export {};
//# sourceMappingURL=ReactiveStore.d.ts.map