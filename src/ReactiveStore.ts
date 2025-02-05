
import { useEventEmitter, EventCallback, EventPattern, useKeyBasedEventEmitter } from "./EventEmitter";
import { reactiveState } from "./ReactiveState";


export type ExtendMode = 'override' | 'keep' | 'error';

export type EventTypes = 'change' | `change-${string}`;
export type ReactiveStoreContext<TState = Record<string, any>> = {
    state: TState,
    [key: string]: any
}

type OmitFirstParam<F> = F extends (ctx: any, ...args: infer P) => infer R
    ? (...args: P) => R
    : never;

type GetterRecord<State> = Record<string, (ctx: ReactiveStoreContext<State>, ...args: any[]) => any>;
type ActionsRecord<State> = Record<string, (ctx: ReactiveStoreContext<State>, ...args: any[]) => void>;
type GlobalsRecord = Record<string, (...args: any[]) => void>;


type InternalContext<State, Getters, Actions, Globals> = {
    actions: Actions,
    getters: Getters,
    state: State,
    globals: Globals
}


export type Namespace = { state: string, getters: string, actions: string, global: string }

export type ReactiveStoreParam<State, Getters = GetterRecord<State>, Actions = ActionsRecord<State>, Globals = GlobalsRecord> = {
    state?: State,
    getters?: Getters,
    actions?: Actions,
    global?: Globals,
    namespace?: Namespace
}

export type ExtendParam<State> = ReactiveStoreParam<State> & {

};

export type Store<State, Getters, Actions, Globals> = {
    state: State,
    $on(event: string, callback: EventCallback): void,
    $on(event: string, pattern: EventPattern, callback: EventCallback): void,
    $on(event: string, callbackOrPattern: EventCallback | EventPattern, callback?: EventCallback),
    $emit: (eventName: string, ...args: any[]) => void,
} & {
    [K in keyof Getters]: OmitFirstParam<Getters[K]>
} & {
    [K in keyof Actions]: OmitFirstParam<Actions[K]>
} & Globals & {
    $extend: <
        NewState extends Record<string, any>,
        NewGetters extends Record<string, (ctx: any, ...args: any[]) => any>,
        NewActions extends Record<string, (ctx: any, ...args: any[]) => any>,
        NewGlobals extends Record<string, (...args: any[]) => any>
    >(
        config: ReactiveStoreParam<NewState, NewGetters, NewActions, NewGlobals>,
        mode?: ExtendMode
    ) => Store<
        State & NewState,
        Getters & NewGetters,
        Actions & { [K in keyof NewActions]: OmitFirstParam<NewActions[K]> },
        Globals & NewGlobals
    >;
};


function useStateDependencies() {
    const dependencies = {};
    const dependenciesReverse = {};
    let callStack: string[] = [];

    function isCalledWhileComputedIsEvaluated() {
        return callStack.length > 0;
    }

    function addPossibleDependency(key) {
        if (!isCalledWhileComputedIsEvaluated())
            return;

        let currentStackKey = callStack[callStack.length - 1];

        addDependency(key, currentStackKey);


        dependenciesReverse[currentStackKey] = dependenciesReverse[currentStackKey] || [];

        if (!dependenciesReverse[currentStackKey].includes(key))
            dependenciesReverse[currentStackKey].push(key);
    }

    function startDependencyTracking(key) {
        callStack.push(key);
    }
    function finishDependencyTracking(key) {
        let dependenciesOfKey = dependenciesReverse[key] || [];


        let subDependencies;
        for (let subkey of dependenciesOfKey) {
            subDependencies = dependenciesReverse[subkey] || [];
            if (subkey == key)
                continue;

            for (let subdep of subDependencies) {
                if (subdep == key)
                    continue;

                if (subdep == subkey)
                    continue;

                addDependency(subdep, key);
            }
        }

        callStack.pop();
    }

    function addDependency(key, dependantKey) {
        dependencies[key] = dependencies[key] || [];
        dependenciesReverse[dependantKey] = dependenciesReverse[dependantKey] || [];

        if (!dependencies[key].includes(dependantKey))
            dependencies[key].push(dependantKey);

        if (!dependenciesReverse[dependantKey].includes(key))
            dependenciesReverse[dependantKey].push(key);
    }

    function getDependenciesOf(key) {
        return dependencies[key] || []
    }

    return {
        addPossibleDependency,
        startDependencyTracking,
        finishDependencyTracking,
        getDependenciesOf
    }
}

function useDirtyStateStore() {
    const dirtyResults: Set<string> = new Set([]);
    const calledFunctions: Set<string> = new Set([]);
    const emitter = useEventEmitter();

    let trackDirtyness = false;

    function startTracking(key) {
        calledFunctions.add(key);
        trackDirtyness = true;
        emitter.emit('start-tracking', key, { dirtyResults, calledFunctions, key });
    }
    function stopTracking(key) {
        trackDirtyness = false;
        calledFunctions.delete(key);

        emitter.emit('stop-tracking', key, { dirtyResults, calledFunctions, key, clear: !calledFunctions.size });

        if (!calledFunctions.size)
            dirtyResults.clear();
    }

    function setDirtyIfAllowed(key) {
        if (trackDirtyness) {
            dirtyResults.add(key);
        }
    }

    function isDirty() {
        return dirtyResults.size > 0;
    }

    return {
        startTracking,
        stopTracking,
        setDirtyIfAllowed,
        isDirty,
        on: emitter.on
    }
}

function handleConflict(type: string, key: string, mode: ExtendMode) {
    const message = `Conflict on ${type} '${key}'`;
    if (mode === 'error') throw new Error(message);
    if (mode === 'keep') console.warn(`${message} - keeping existing`);
}




export function useReactiveStore<
    RState extends Record<string, any>,
    RGetters extends Record<string, (ctx: any, ...args: any[]) => any>,
    RActions extends Record<string, (ctx: any, ...args: any[]) => any>,
    RGlobals extends Record<string, (...args: any[]) => any>>(initialConfig: ReactiveStoreParam<RState, RGetters, RActions, RGlobals> = {}) {
    let storeModificationsAllowed = false;
    let stateModificationsAllowed = false;
    const stateInternal = reactiveState({}, stateModificationHandler);
    const eventEmitter = useKeyBasedEventEmitter();
    const stateDependencies = useStateDependencies();
    const dirtyState = useDirtyStateStore();
    const namespace = initNamespace(initialConfig.namespace);
    const resultCache = {};

    const ctxInternal = {
        state: stateInternal.state,
        actions: {},
        getters: {},
        globals: {}
    } as InternalContext<RState, RGetters, RActions, RGlobals>;

    dirtyState.on('dirty-state',(...args)=>{
        eventEmitter.emit('dirty-state','dirtystate',args)
      })

    function stateModificationHandler(key, value, target) {
        if (!stateModificationsAllowed) {
            throw new Error(`State-modification is only allowed inside of an action. You tried to change the state ${JSON.stringify(target)} with ${key}=${value} outside.`)
        }
        return true;
    }

    function createExtendMethod(store: any, ctxInternal: any, stateInternal: any) {
        return function extend<
            NewState extends Record<string, any>,
            NewGetters extends Record<string, (ctx: any, ...args: any[]) => any>,
            NewActions extends Record<string, (ctx: any, ...args: any[]) => any>,
            NewGlobals extends Record<string, (...args: any[]) => any>
        >(
            config: ReactiveStoreParam<NewState, NewGetters, NewActions, NewGlobals>,
            mode: ExtendMode = 'error'
        ) {
            stateModificationsAllowed = true;

            if (config.state) {
                for (const key of Object.keys(config.state)) {
                    if (key in ctxInternal.state) {
                        handleConflict('state', key, mode);
                    }
                    stateInternal.state[key] = config.state[key];
                }
            }

            // Getters handling
            if (config.getters) {
                for (const [key, getter] of Object.entries(config.getters)) {
                    if (key in store) {
                        handleConflict('getter', key, mode);
                    }
                }
                ctxInternal.getters = config.getters;
            }

            // Actions handling
            if (config.actions) {
                for (const [key, action] of Object.entries(config.actions)) {
                    if (key in store) {
                        handleConflict('action', key, mode);
                    }
                    ctxInternal.actions[key] = action;
                    store[key] = (...args: any[]) => {
                        const prev = stateInternal._modificationsAllowed;
                        stateInternal._modificationsAllowed = true;
                        action(ctxInternal, ...args);
                        stateInternal._modificationsAllowed = prev;
                    };
                }
            }

            // Globals handling
            if (config.global) {
                for (const [key, fn] of Object.entries(config.global)) {
                    if (key in store) {
                        handleConflict('global', key, mode);
                    }
                    store[key] = fn;
                }
            }

            stateModificationsAllowed = false;

            return store as any;
        };
    }

    const ctxData = {
        state: ctxInternal.state,
        $on: eventEmitter.on,
        $emit: eventEmitter.emit,
        dirtyState
    } as unknown as Store<RState, RGetters, RActions, RGlobals>;

    const ctx = new Proxy(ctxData, {
        get(target, key: string) {
            dirtyState.setDirtyIfAllowed(key);

            if (ctxInternal.state[key] != undefined) {
                stateDependencies.addPossibleDependency(key);
                return ctxInternal.state[key];
            }

            let gettersFn = ctxInternal.getters[key];

            if (gettersFn != undefined) {

                if (gettersFn.length <= 1) {
                    stateDependencies.startDependencyTracking(key);

                    let result;
                    if (dirtyState.isDirty() || !resultCache[key]) {
                        result = gettersFn(ctx);
                        resultCache[key] = result;
                    }
                    else {
                        result = resultCache[key];
                        //result = gettersFn(ctx);
                    }

                    stateDependencies.finishDependencyTracking(key);

                    return result;
                }
                else {
                    return (...args: any[]) => {
                        stateDependencies.startDependencyTracking(key);
                        const result = gettersFn(ctx, ...args);
                        stateDependencies.finishDependencyTracking(key);
                        return result;
                    };
                }
            }

            const actionFn = ctxInternal.actions[key];
            if (actionFn !== undefined) {
                return function (...args: any[]) {
                    stateModificationsAllowed = true;
                    dirtyState.startTracking(key);
                    actionFn(ctx, ...args);
                    setTimeout(() => {
                        dirtyState.stopTracking(key)
                    }, 0);
                    stateModificationsAllowed = false;
                }
            }

            const globalsFn = ctxInternal.globals[key];
            if (globalsFn !== undefined) {
                return globalsFn;
            }

            return target[key];
        },
        set(target, key, value) {
            if (storeModificationsAllowed) {
                target[key as keyof typeof target] = value;
                return true;
            }
            else if (!target[key as keyof typeof target]) {
                console.error(`error when modifing the state. it does not exist...;`)
                console.log('xxx',target,key)
                return true;
            }

            return false;
        }
    });

    function initNamespace(namespaceParam?: string | Namespace): Namespace {
        if (!namespaceParam) {
            return { state: 'state', getters: '', actions: '', global: '' };
        }
        if (typeof namespaceParam == 'string') {
            return { state: namespaceParam, getters: namespaceParam, actions: namespaceParam, global: namespaceParam };
        }
        return namespaceParam;
    }

    function emitOnChange({ key, value, target, fullPath }) {
        const dependencies = stateDependencies.getDependenciesOf(key);
        const totalTarget = { ...stateInternal.state, ...resultCache };
        let keyIncludingGetters = [key];

        for (let dep of dependencies) {
            keyIncludingGetters.push(dep);
            eventEmitter.emit('change-getter', dep, { key: dep, value: totalTarget[dep], target, totalTarget });
        }
        eventEmitter.emit('change', key, { fullPath, key, keyIncludingGetters, value, target: stateInternal.state, totalTarget });
    }

    ctxData.$extend = createExtendMethod(ctx, ctxInternal, stateInternal);

    ctxData.$extend(initialConfig);

    setTimeout(() => {
        for (let key of Object.keys(ctxInternal.getters)) {
            ctx[key];
        }

    }, 0);

    stateInternal.on('change', (event) => {
        stateModificationsAllowed = false;
        emitOnChange(event);
    });

    return ctx;
}