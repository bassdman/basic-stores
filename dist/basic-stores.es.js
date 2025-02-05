function useEventEmitter() {
    const events = {};
    // Registriert eine Callback-Funktion für ein Event
    function on(event, callback) {
        if (!events[event]) {
            events[event] = [];
        }
        events[event].push(callback);
    }
    // Löst ein Event aus und ruft alle zugehörigen Callback-Funktionen auf
    function emit(event, ...args) {
        if (events[event]) {
            for (const callback of events[event]) {
                callback(...args);
            }
        }
    }
    return {
        on,
        emit
    };
}
function useKeyBasedEventEmitter() {
    const events = {};
    function on(event, callbackOrPattern, callback) {
        const _pattern = arguments.length == 2 ? '' : callbackOrPattern;
        const _callback = arguments.length == 2 ? callbackOrPattern : callback;
        if (!events[event]) {
            events[event] = [];
        }
        events[event].push({ callback: _callback, pattern: _pattern });
    }
    function evaluatePattern(callbackPattern, key) {
        if (!callbackPattern)
            return true;
        if (callbackPattern == '*')
            return true;
        if (key.startsWith(callbackPattern))
            return true;
        return false;
    }
    function emit(event, key, ...args) {
        let patternMatches = false;
        if (events[event]) {
            for (const eventEntry of events[event]) {
                patternMatches = evaluatePattern(eventEntry.pattern, key);
                if (patternMatches) {
                    eventEntry.callback(...args);
                }
            }
        }
    }
    return {
        on,
        emit
    };
}

function createReactiveObject(input, eventEmitter, path = [], modificationsAllowedCallback) {
    return new Proxy(input, {
        get(target, key) {
            const value = target[key];
            if (typeof value === 'object' && value !== null) {
                // Rekursiv einen Proxy erstellen
                return createReactiveObject(value, eventEmitter, [...path, key]);
            }
            return value;
        },
        set(target, key, value) {
            let isAllowed = !modificationsAllowedCallback || modificationsAllowedCallback(key, value, target);
            if (!isAllowed)
                return false;
            const oldValue = target[key];
            if (oldValue !== value) {
                target[key] = value;
                // Event mit vollständigem Pfad auslösen
                const fullPath = [...path, key].join('.');
                eventEmitter.emit('change', fullPath, { key, fullPath, value, oldValue, target });
            }
            return true;
        }
    });
}

function reactiveState(input, modificationsAllowedCallback) {
    const eventEmitter = useKeyBasedEventEmitter();
    const state = createReactiveObject(input, eventEmitter, [], modificationsAllowedCallback);
    return {
        state,
        on: eventEmitter.on,
    };
}

function useStateDependencies() {
    const dependencies = {};
    const dependenciesReverse = {};
    let callStack = [];
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
        return dependencies[key] || [];
    }
    return {
        addPossibleDependency,
        startDependencyTracking,
        finishDependencyTracking,
        getDependenciesOf
    };
}
function useDirtyStateStore() {
    const dirtyResults = new Set([]);
    const calledFunctions = new Set([]);
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
    };
}
function handleConflict(type, key, mode) {
    const message = `Conflict on ${type} '${key}'`;
    if (mode === 'error')
        throw new Error(message);
    if (mode === 'keep')
        console.warn(`${message} - keeping existing`);
}
function useReactiveStore(initialConfig = {}) {
    let stateModificationsAllowed = false;
    const stateInternal = reactiveState({}, stateModificationHandler);
    const eventEmitter = useKeyBasedEventEmitter();
    const stateDependencies = useStateDependencies();
    const dirtyState = useDirtyStateStore();
    initNamespace(initialConfig.namespace);
    const resultCache = {};
    const ctxInternal = {
        state: stateInternal.state,
        actions: {},
        getters: {},
        globals: {}
    };
    dirtyState.on('dirty-state', (...args) => {
        eventEmitter.emit('dirty-state', 'dirtystate', args);
    });
    function stateModificationHandler(key, value, target) {
        if (!stateModificationsAllowed) {
            throw new Error(`State-modification is only allowed inside of an action. You tried to change the state ${JSON.stringify(target)} with ${key}=${value} outside.`);
        }
        return true;
    }
    function createExtendMethod(store, ctxInternal, stateInternal) {
        return function extend(config, mode = 'error') {
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
                    store[key] = (...args) => {
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
            return store;
        };
    }
    const ctxData = {
        state: ctxInternal.state,
        $on: eventEmitter.on,
        $emit: eventEmitter.emit,
        dirtyState
    };
    const ctx = new Proxy(ctxData, {
        get(target, key) {
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
                    return (...args) => {
                        stateDependencies.startDependencyTracking(key);
                        const result = gettersFn(ctx, ...args);
                        stateDependencies.finishDependencyTracking(key);
                        return result;
                    };
                }
            }
            const actionFn = ctxInternal.actions[key];
            if (actionFn !== undefined) {
                return function (...args) {
                    stateModificationsAllowed = true;
                    dirtyState.startTracking(key);
                    actionFn(ctx, ...args);
                    setTimeout(() => {
                        dirtyState.stopTracking(key);
                    }, 0);
                    stateModificationsAllowed = false;
                };
            }
            const globalsFn = ctxInternal.globals[key];
            if (globalsFn !== undefined) {
                return globalsFn;
            }
            return target[key];
        },
        set(target, key, value) {
            if (!target[key]) {
                console.error(`error when modifing the state. it does not exist...;`);
                return true;
            }
            return false;
        }
    });
    function initNamespace(namespaceParam) {
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

export { createReactiveObject, reactiveState, useEventEmitter, useKeyBasedEventEmitter, useReactiveStore };
