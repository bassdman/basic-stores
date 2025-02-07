
import { createCachedStore } from "./CachedStore";
import { useEventEmitter, EventCallback, EventPattern, useKeyBasedEventEmitter } from "./EventEmitter";
import { createRecursiveProxy } from "./lib/lib";
import { createReactiveObject } from "./ReactiveObject";
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
    const emitter = useEventEmitter();
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
        emitter.emit('start-dependency-tracking',{dependencies,dependenciesReverse,callStack,key,'action':'start'});
    }
    function finishDependencyTracking(key) {
        emitter.emit('stop-dependency-tracking',{dependencies,dependenciesReverse,callStack,key,'action':'stop'});

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

    function getReverseDependenciesOf(key) {
        return dependencies[key] || []
    }

    return {
        dependencies(){return Object.assign({},dependencies)},
        dependenciesReverse(){return Object.assign({},dependenciesReverse)},
        on: emitter.on,
        addPossibleDependency,
        startDependencyTracking,
        finishDependencyTracking,
        getDependenciesOf,
        getReverseDependenciesOf,
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
    const namespace = initNamespace(initialConfig.namespace);
    const resultCache = {};
    const cachedStore = createCachedStore();

    const ctxInternal = {
        state: stateInternal.state,
        actions: {},
        getters: {},
        globals: {}
    } as InternalContext<RState, RGetters, RActions, RGlobals>;

    stateDependencies.on('start-dependency-tracking',(data)=>{
        eventEmitter.emit('dependencies','start',data);
    });
    stateDependencies.on('stop-dependency-tracking',(data)=>{
        eventEmitter.emit('dependencies','stop',data);
    });

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
                for (let key in config.actions) {
                    let action = config.actions[key];
                    if (key in store) {
                        handleConflict('action', key, mode);
                    }
                    ctxInternal.actions[key] = action;
                    store[key] = (...args: any[]) => {
                        const prev = stateModificationsAllowed;
                        stateModificationsAllowed = true;

                        action(ctxInternal, ...args);

                        stateModificationsAllowed = prev;
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
    } as unknown as Store<RState, RGetters, RActions, RGlobals>;

    const ctx = createRecursiveProxy(ctxData, {
        get(target, key: string) {
            if (ctxInternal.state[key] != undefined) {
                stateDependencies.addPossibleDependency(key);
                return ctxInternal.state[key];
            }



            let gettersFn = ctxInternal.getters[key];

            if (gettersFn != undefined) {
                stateDependencies.addPossibleDependency(key);

                if (gettersFn.length <= 1) {
                    stateDependencies.startDependencyTracking(key);

                    const result = cachedStore.execute(key,gettersFn,ctx)

                    stateDependencies.finishDependencyTracking(key);

                    cachedStore.updateDependencies(stateDependencies.dependencies());

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
                    actionFn(ctx, ...args);
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
            if (stateModificationsAllowed) {
                target[key as keyof typeof target] = value;
            }else {
                console.warn('stateModification is not allowed. did you change the state outside of an action?')
            }
            

            return true;
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
   
   stateInternal.on('change', (event) => {
       stateModificationsAllowed = false;

       cachedStore.set(event.key,event.value);

       emitOnChange(event);
   });
   return ctx;
}