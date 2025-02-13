
import { createCachedStore } from "./CachedStore";
import { EventCallback, EventPattern, usePatternBasedEventEmitter } from "./EventEmitter";
import { createReactiveObject, EmitParameterGetAndSet } from "./ReactiveObject";


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

export type ReactiveStoreParam<State, Getters = GetterRecord<State>, Actions = ActionsRecord<State>, Globals = GlobalsRecord> = {
    state?: State,
    getters?: Getters,
    actions?: Actions,
    global?: Globals,
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
    [A in keyof Actions]: OmitFirstParam<Actions[A]>
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
        Actions & NewActions,
        Globals & NewGlobals
    >;
};

function useEditPermissionStore() {
    let permissions = new Map<string, boolean>();
    let blockedPermissions = new Map<string, boolean>();

    function addBlockingPermission(permission: string) {
        blockedPermissions.set(permission, true);
    }
    function deleteBlockingPermission(permission: string) {
        blockedPermissions.delete(permission);
    }

    function allow(permission: string) {
        permissions.set(permission, true);
    }

    function reject(permission: string) {
        permissions.delete(permission)
    }

    function isAllowed(): boolean {
        return blockedPermissions.size == 0 && permissions.size > 0;
    }

    function allowedPermissions() {
        return permissions.keys();
    }

    return {
        allow,
        reject,
        isAllowed,
        allowedPermissions,
        addBlockingPermission,
        deleteBlockingPermission
    }
}

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

    function getReverseDependenciesOf(key) {
        return dependencies[key] || []
    }

    return {
        dependencies() { return Object.assign({}, dependencies) },
        dependenciesReverse() { return Object.assign({}, dependenciesReverse) },
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

type ReactiveStoreEmitter = {
    "change-getter": (data: { key: any, value: any, target: Record<string, any>, totalTarget: any }) => void;
    "change": (data: { fullPath: string, key: any, keyIncludingGetters: any, value: any, target: Record<string, any>, totalTarget: any }) => void;
    get: (data:EmitParameterGetAndSet)=>void;
    set: (data:EmitParameterGetAndSet)=>void
};

export function useReactiveStore<
    RState extends Record<string, any>,
    RGetters extends Record<string, (ctx: any, ...args: any[]) => any>,
    RActions extends Record<string, (ctx: any, ...args: any[]) => any>,
    RGlobals extends Record<string, (...args: any[]) => any>>(initialConfig: ReactiveStoreParam<RState, RGetters, RActions, RGlobals> = {}) {

    const eventEmitter = usePatternBasedEventEmitter<ReactiveStoreEmitter>();
    const stateDependencies = useStateDependencies();

    const cachedStore = createCachedStore();
    const editGlobalPermissionStore = useEditPermissionStore();
    const editStatePermissionStore = useEditPermissionStore();


    const stateInternal = createReactiveObject({ state: {} }, {
        set(event) {
            if (!editStatePermissionStore.isAllowed()) {
                throw new Error(`State-modification is only allowed inside of an action. You tried to change the state ${JSON.stringify(event.target)} with ${String(event.key)}=${event.value} outside.`)
            }
            eventEmitter.emit('set', event.key, event);

            return true;
        },
        get(event) {
            if (event.value == undefined)
                return;

            eventEmitter.emit('get', event.key, event);

            stateDependencies.addPossibleDependency(event.key);
        },
        change(event) {
            stateDependencies.addPossibleDependency(event.key);
            cachedStore.set(event.key, event.value);

            const dependencies = stateDependencies.getDependenciesOf(event.key);
            const totalTarget = { ...stateInternal.state };
            let keyIncludingGetters = [event.key];
    
            for (let dep of dependencies) {
                keyIncludingGetters.push(dep);
                eventEmitter.emit('change-getter', dep, { key: dep, value: totalTarget[dep], target: event.target, totalTarget });
            }

            eventEmitter.emit('change', event.key, { fullPath:event.fullPath, key:event.key, keyIncludingGetters, value:event.value, target: stateInternal.state, totalTarget });
        }
    });

    const ctxInternal = {
        state: stateInternal.state,
        actions: {},
        getters: {},
        globals: {}
    } as InternalContext<RState, RGetters, RActions, RGlobals>;

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
            editGlobalPermissionStore.allow('extend');

            if (config.state) {
                editStatePermissionStore.allow('extend');
                for (const key of Object.keys(config.state)) {
                    if (key in ctxInternal.state) {
                        handleConflict('state', key, mode);
                    }
                    stateInternal.state[key] = config.state[key];
                }
                editStatePermissionStore.reject('extend');
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
                        editStatePermissionStore.allow('action');
                        action(ctxInternal, ...args);
                        editStatePermissionStore.reject('action');
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

            editGlobalPermissionStore.reject('extend');

            return store as any;
        };
    }

    const ctxData = {
        state: ctxInternal.state,
        $on: eventEmitter.on,
        $emit: eventEmitter.emit,
    } as unknown as Store<RState, RGetters, RActions, RGlobals>;

    const ctx = new Proxy(ctxData, {
        get(target, key: string) {
            let gettersFn = ctxInternal.getters[key];

            if (gettersFn != undefined) {
                stateDependencies.addPossibleDependency(key);

                if (gettersFn.length <= 1) {
                    stateDependencies.startDependencyTracking(key);
                    editStatePermissionStore.addBlockingPermission('getter-' + key);

                    const result = cachedStore.execute(key, gettersFn, ctx)

                    editStatePermissionStore.deleteBlockingPermission('getter-' + key);
                    stateDependencies.finishDependencyTracking(key);

                    cachedStore.updateDependencies(stateDependencies.dependencies());

                    return result;
                }
                else {
                    return (...args: any[]) => {
                        stateDependencies.startDependencyTracking(key);
                        editStatePermissionStore.addBlockingPermission('global-' + key);

                        const result = gettersFn(ctx, ...args);

                        editStatePermissionStore.deleteBlockingPermission('global-' + key);
                        stateDependencies.finishDependencyTracking(key);
                        return result;
                    };
                }
            }

            const actionFn = ctxInternal.actions[key];
            if (actionFn !== undefined) {
                return function (...args: any[]) {
                    editStatePermissionStore.allow('action');
                    actionFn(ctx, ...args);
                    editStatePermissionStore.reject('action');
                }
            }

            const globalsFn = ctxInternal.globals[key];
            if (globalsFn !== undefined) {
                return globalsFn;
            }

            return target[key];
        },
        set(target, key, value) {
            if (editGlobalPermissionStore.isAllowed()) {
                target[key as keyof typeof target] = value;
            }
            else {
                console.warn('stateModification is not allowed. did you change the state outside of an action?')
            }

            return true;
        }
    });

    ctxData.$extend = createExtendMethod(ctx, ctxInternal, stateInternal);

    return ctxData.$extend(initialConfig);
}