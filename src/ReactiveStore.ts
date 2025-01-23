
import { useEventEmitter, EventCallback, EventPattern, useKeyBasedEventEmitter } from "./EventEmitter";
import { reactiveState } from "./ReactiveState";

export type EventTypes = 'change' | `change-${string}`;
export interface ReactiveStoreContext<TState = Record<string, any>> {
    state: TState,
    [key:string]:any
}

interface InternalContext {
    actions: Record<string, (...args: any[]) => void>
    getters: Record<string, Function>,
    state: Record<string, any>,
    globals: Record<string, any>
}

export interface Namespace {state:string,getters:string,actions:string,global:string}

export interface ReactiveStoreParam<State> {
    state?: State,
    getters?: Record<string, (ctx: ReactiveStoreContext<State>) => any>,
    actions?: Record<string, (ctx: ReactiveStoreContext<State>, ...args: any[]) => void>,
    global?: Record<string, (...args: any[]) => void>,
    namespace?: Namespace
}

export type ExtendMode = 'override' | 'keep' | 'error';
export interface ExtendParam<State> extends ReactiveStoreParam<State> {
    mode?: ExtendMode
};

export interface Store<State> {
    state: State,
    $on(event: string, callback: EventCallback): void,
    $on(event: string, pattern: EventPattern, callback: EventCallback): void,
    $on(event: string, callbackOrPattern: EventCallback | EventPattern, callback?: EventCallback),
    $emit: (eventName: string, ...args: any[]) => void,
    $extend: (param: ExtendParam<State>) => void,
    [name: string]: any,

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

    return {
        addPossibleDependency,
        startDependencyTracking,
        finishDependencyTracking,
        getDependenciesOf
    }
}

function useDirtyStateStore() {
    const dirtyResults: Set<string> = new Set([]);
    const calledFunctions :Set<string> = new Set([]);
    const emitter = useEventEmitter();

    let trackDirtyness = false;

    function startTracking(key) {
        calledFunctions.add(key);
        trackDirtyness = true;
        emitter.emit('start-tracking',key,{dirtyResults,calledFunctions,key});
    }
    function stopTracking(key) {
        trackDirtyness = false;
        calledFunctions.delete(key);

        emitter.emit('stop-tracking',key,{dirtyResults,calledFunctions,key, clear: !calledFunctions.size});

        if(!calledFunctions.size)
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
        on:emitter.on
    }
}



export function useReactiveStore(initialConfig: ReactiveStoreParam<any> = {}) {
    let storeModificationsAllowed = false;
    let stateModificationsAllowed = false;
    const stateInternal = reactiveState({},stateModificationHandler);
    const eventEmitter = useKeyBasedEventEmitter();
    const stateDependencies = useStateDependencies();
    const dirtyState = useDirtyStateStore();
    const namespace = initNamespace(initialConfig.namespace);
    const resultCache = {};

    const ctxInternal: InternalContext = {
        state: stateInternal.state,
        actions: {},
        getters: {},
        globals: {}
    };

    function stateModificationHandler(key,value, target){
        if(!stateModificationsAllowed){
            throw new Error(`State-modification is only allowed inside of an action. You tried to change the state ${JSON.stringify(target)} with ${key}=${value} outside.`)
        }
        return true;
    }

    function $extend({ state = {}, actions = {}, getters = {}, global = {}, mode = 'error' }: ExtendParam<any>): void {
        storeModificationsAllowed = true;

        for (let key of Object.keys(state)) {

            if (stateInternal.state[key]) {
                if (mode == 'error') {
                    throw new Error(`store.extend({state,actions,getters}) failed: Attribute ${key} already exists as state and can not be overwritten by extend.`);
                }
                else if (mode == 'keep') {
                    continue;
                }
            }
            stateModificationsAllowed = true;
            stateInternal.state[key] = state[key];
            stateModificationsAllowed = false;
        }

        for (let action of Object.keys(actions)) {
            if (ctx[action]) {
                if (mode == 'error') {
                    throw new Error(`store.extend({state,actions,getters}) failed: Attribute ${action} already exists and can not be overwritten by extend.`);
                }
                else if (mode == 'keep') {
                    continue;
                }
            }

            ctxInternal.actions[action] = actions[action];
        }

        for (let key of Object.keys(getters)) {
            if (ctx[key]) {
                if (mode == 'error') {
                    throw new Error(`store.extend({state,actions,getters}) failed: Attribute ${key} already exists and can not be overwritten by extend.`);
                }
                else if (mode == 'keep') {
                    continue;
                }
            }

            ctxInternal.getters[key] = getters[key];

        }

        for (let key of Object.keys(global)) {
            if (ctx[key]) {
                if (mode == 'error') {
                    throw new Error(`store.extend({state,actions,getters}) failed: Attribute ${key} already exists as a getter and can not be overwritten by extend, because mode=='error'.`);
                }
                else if (mode == 'keep') {
                    continue;
                }
            }

            ctx[key] = global[key];
        }

        storeModificationsAllowed = false;
    }

    const ctxData: Store<any> = {
        state:ctxInternal.state,
        $on: eventEmitter.on,
        $emit: eventEmitter.emit,
        $extend,
        dirtyState
    }

    const ctx = new Proxy(ctxData, {
        get(target, key: string) {
            dirtyState.setDirtyIfAllowed(key);
            
            if (ctxInternal.state[key] != undefined) {
                stateDependencies.addPossibleDependency(key);
                return ctxInternal.state[key];
            }

            let gettersFn = ctxInternal.getters[key as keyof typeof target];

            if (gettersFn != undefined) {
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

            const actionFn = ctxInternal.actions[key as keyof typeof target];
            if(actionFn !== undefined){
                return function(...args:any[]){
                    stateModificationsAllowed = true;
                    dirtyState.startTracking(key);
                    actionFn(ctx,...args);
                    setTimeout(()=>{
                        dirtyState.stopTracking(key)
                    },0);
                    stateModificationsAllowed = false;
                }
            }

            const globalsFn = ctxInternal.globals[key as keyof typeof target];
            if(globalsFn !== undefined){
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
                console.error(`error when modifing the state. it does not exist...`)
                return true;
            }

            return false;
        }
    });

    function initNamespace(namespaceParam?:string|Namespace): Namespace{
        if(!namespaceParam){
            return {state:'state',getters:'',actions:'',global:''}; 
        }
        if(typeof namespaceParam == 'string'){
            return {state:namespaceParam,getters:namespaceParam,actions:namespaceParam, global:namespaceParam};
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

    $extend(initialConfig) ;

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