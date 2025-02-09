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
function usePatternBasedEventEmitter() {
    const events = new Map();
    function on(event, callbackOrPattern, callback) {
        const _pattern = arguments.length == 2 ? '' : callbackOrPattern;
        const _callback = arguments.length == 2 ? callbackOrPattern : callback;
        if (!events.has(event)) {
            events.set(event, []);
        }
        events.get(event).push({ callback: _callback, pattern: _pattern });
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
        if (events.has(event)) {
            for (let eventEntry of events.get(event)) {
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

function createReactiveObject(input, callbacks = {}) {
    return createReactiveObjectInnerPart(input, [], callbacks);
}
function createReactiveObjectInnerPart(input, pathAsArray = [], callbacks = {}) {
    return new Proxy(input, {
        get(target, key) {
            const fullPath = [...pathAsArray, key].join('.');
            const value = target[key];
            if (typeof value === 'object' && value !== null) {
                return createReactiveObjectInnerPart(value, [...pathAsArray, key], callbacks);
            }
            callbacks.get?.({ pathAsArray, fullPath, target, key, value });
            return value;
        },
        set(target, key, value) {
            const fullPath = [...pathAsArray, key].join('.');
            callbacks.set?.({ pathAsArray, fullPath, key, target, value });
            const oldValue = target[key];
            if (oldValue !== value) {
                target[key] = value;
                callbacks.change?.({ pathAsArray, fullPath, key, target, value, oldValue });
            }
            return true;
        }
    });
}

const emptyCachedStoreParam = {
    dependencies: {}
};
function createCachedStore({ dependencies = {} } = emptyCachedStoreParam) {
    const cache = new Map();
    const dirtyEntries = new Map();
    let _dependencies = dependencies;
    function updateDependencies(dependencies) {
        _dependencies = dependencies;
    }
    function isDirty(key) {
        const isDirty = dirtyEntries.get(key);
        return isDirty;
    }
    /**
     * Erzeugt einen eindeutigen Schlüssel basierend auf der Funktion und ihren Argumenten.
     * @param fn Die Funktion, die ausgeführt werden soll.
     * @param args Die Argumente, mit denen die Funktion aufgerufen wird.
     * @returns Ein eindeutiger String, der als Cache-Schlüssel dient.
     */
    function getCacheKey(fn, args) {
        // Verwende den Funktionsnamen (oder toString als Fallback) und die serialisierten Argumente.
        const functionId = fn.name || fn.toString();
        return `${functionId}_${JSON.stringify(args)}`;
    }
    /**
     * Führt eine Funktion mit den angegebenen Argumenten aus und speichert das Ergebnis im Cache.
     * Optional kann ein eigener Schlüssel als erster Parameter übergeben werden.
     *
     * Beispiel ohne eigenen Schlüssel (automatische Schlüsselgenerierung):
     *   store.execute(add, 2, 3);
     *
     * Beispiel mit eigenem Schlüssel:
     *   store.execute("meineAddition", add, 2, 3);
     *
     * @param params Entweder [fn, ...args] oder [key, fn, ...args].
     * @returns Das Ergebnis der Funktion, entweder aus dem Cache oder frisch berechnet.
     */
    function execute(...params) {
        let key;
        let fn;
        let fnArgs;
        if (typeof params[0] === "string") {
            key = params[0];
            fn = params[1];
            fnArgs = params.slice(2);
        }
        else {
            fn = params[0];
            fnArgs = params.slice(1);
            key = getCacheKey(fn, fnArgs);
        }
        if (cache.has(key) && !dirtyEntries.get(key)) {
            return cache.get(key);
        }
        const result = fn(...fnArgs);
        cache.set(key, result);
        dirtyEntries.set(key, false);
        return result;
    }
    function set(key, value) {
        cache.set(key, value);
        dirtyEntries.set(key, false);
        let dependenciesOfKey = _dependencies[key] || [];
        for (let dependency of dependenciesOfKey) {
            dirtyEntries.set(dependency, true);
        }
    }
    /**
     * Leert den gesamten Cache.
     */
    function clearCache() {
        cache.clear();
        console.log("Cache geleert");
    }
    return {
        set,
        isDirty,
        execute,
        clearCache,
        updateDependencies
    };
}

function useEditPermissionStore() {
    let permissions = new Map();
    let blockedPermissions = new Map();
    function addBlockingPermission(permission) {
        blockedPermissions.set(permission, true);
    }
    function deleteBlockingPermission(permission) {
        blockedPermissions.delete(permission);
    }
    function allow(permission) {
        permissions.set(permission, true);
    }
    function reject(permission) {
        permissions.delete(permission);
    }
    function isAllowed() {
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
    function getReverseDependenciesOf(key) {
        return dependencies[key] || [];
    }
    return {
        dependencies() { return Object.assign({}, dependencies); },
        dependenciesReverse() { return Object.assign({}, dependenciesReverse); },
        addPossibleDependency,
        startDependencyTracking,
        finishDependencyTracking,
        getDependenciesOf,
        getReverseDependenciesOf,
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
    const eventEmitter = usePatternBasedEventEmitter();
    const stateDependencies = useStateDependencies();
    const resultCache = {};
    const cachedStore = createCachedStore();
    const editGlobalPermissionStore = useEditPermissionStore();
    const editStatePermissionStore = useEditPermissionStore();
    const stateInternal = createReactiveObject({ state: {} }, {
        set({ key, value, target }) {
            if (!editStatePermissionStore.isAllowed()) {
                throw new Error(`State-modification is only allowed inside of an action. You tried to change the state ${JSON.stringify(target)} with ${String(key)}=${value} outside.`);
            }
            return true;
        },
        get(event) {
            if (event.value == undefined)
                return;
            stateDependencies.addPossibleDependency(event.key);
        },
        change(event) {
            stateDependencies.addPossibleDependency(event.key);
            cachedStore.set(event.key, event.value);
            emitOnChange(event);
        }
    });
    const ctxInternal = {
        state: stateInternal.state,
        actions: {},
        getters: {},
        globals: {}
    };
    function createExtendMethod(store, ctxInternal, stateInternal) {
        return function extend(config, mode = 'error') {
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
                    store[key] = (...args) => {
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
            return store;
        };
    }
    const ctxData = {
        state: ctxInternal.state,
        $on: eventEmitter.on,
        $emit: eventEmitter.emit,
    };
    const ctx = new Proxy(ctxData, {
        get(target, key) {
            if (ctxInternal.state[key] != undefined) {
                stateDependencies.addPossibleDependency(key);
                return ctxInternal.state[key];
            }
            let gettersFn = ctxInternal.getters[key];
            if (gettersFn != undefined) {
                stateDependencies.addPossibleDependency(key);
                if (gettersFn.length <= 1) {
                    stateDependencies.startDependencyTracking(key);
                    editStatePermissionStore.addBlockingPermission('getter-' + key);
                    const result = cachedStore.execute(key, gettersFn, ctx);
                    editStatePermissionStore.deleteBlockingPermission('getter-' + key);
                    stateDependencies.finishDependencyTracking(key);
                    cachedStore.updateDependencies(stateDependencies.dependencies());
                    return result;
                }
                else {
                    return (...args) => {
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
                return function (...args) {
                    editStatePermissionStore.allow('action');
                    actionFn(ctx, ...args);
                    editStatePermissionStore.reject('action');
                };
            }
            const globalsFn = ctxInternal.globals[key];
            if (globalsFn !== undefined) {
                return globalsFn;
            }
            return target[key];
        },
        set(target, key, value) {
            if (editGlobalPermissionStore.isAllowed()) {
                target[key] = value;
            }
            else {
                console.warn('stateModification is not allowed. did you change the state outside of an action?');
            }
            return true;
        }
    });
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
    return ctxData.$extend(initialConfig);
}

export { createReactiveObject, useEventEmitter, useReactiveStore };
