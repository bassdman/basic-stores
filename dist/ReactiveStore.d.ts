import { EventCallback, EventPattern } from "./EventEmitter";
export type EventTypes = 'change' | `change-${string}`;
export interface ReactiveStoreContext<TState = Record<string, any>> {
    state: TState;
    [key: string]: any;
}
export interface Namespace {
    state: string;
    getters: string;
    actions: string;
    global: string;
}
export interface ReactiveStoreParam<State> {
    state?: State;
    getters?: Record<string, (ctx: ReactiveStoreContext<State>) => any>;
    actions?: Record<string, (ctx: ReactiveStoreContext<State>, ...args: any[]) => void>;
    global?: Record<string, (...args: any[]) => void>;
    namespace?: Namespace;
}
export type ExtendMode = 'override' | 'keep' | 'error';
export interface ExtendParam<State> extends ReactiveStoreParam<State> {
    mode?: ExtendMode;
}
export interface Store<State> {
    state: State;
    $on(event: string, callback: EventCallback): void;
    $on(event: string, pattern: EventPattern, callback: EventCallback): void;
    $on(event: string, callbackOrPattern: EventCallback | EventPattern, callback?: EventCallback): any;
    $emit: (eventName: string, ...args: any[]) => void;
    $extend: (param: ExtendParam<State>) => void;
    [name: string]: any;
}
export declare function useReactiveStore(initialConfig?: ReactiveStoreParam<any>): Store<any>;
//# sourceMappingURL=ReactiveStore.d.ts.map