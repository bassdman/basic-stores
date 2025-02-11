type Key = string | symbol;

export type EmitParameterGetAndSet = {
    key: Key,
    pathAsArray: string[],
    fullPath: string,
    target: Record<string, any>,
    value: unknown,
}

export type EmitParameterChange = EmitParameterGetAndSet & {
    oldValue: unknown
}

export type Callbacks = {
    get?: (emitParameter: EmitParameterGetAndSet) => void;
    set?: (emitParameter: EmitParameterGetAndSet) => void;
    change?: (emitParameter: EmitParameterChange) => void;
};

export function createReactiveObject(
    input: Record<Key, any>,
    callbacks: Callbacks = {}
) {
    return createReactiveObjectInnerPart(input, [], callbacks);
}


function createReactiveObjectInnerPart(
    input: Record<Key, any>,
    pathAsArray: string[] = [],
    callbacks: Callbacks = {}
) {

    return new Proxy(input, {
        get(target, key) {
            const fullPath = [...pathAsArray, key].join('.');
            const value = target[key as keyof typeof target];

            if (typeof value === 'object' && value !== null) {
                return createReactiveObjectInnerPart(value as Record<string, any>, [...pathAsArray, key as string], callbacks);
            }

            callbacks.get?.({ pathAsArray, fullPath, target, key, value });

            return value;
        },
        set(target, key: string, value) {
            const fullPath = [...pathAsArray, key].join('.');
                        
            callbacks.set?.({ pathAsArray, fullPath, key, target, value })

            const oldValue = target[key as keyof typeof target];
            if (oldValue !== value) {
                target[key as keyof typeof target] = value;

                callbacks.change?.({ pathAsArray, fullPath, key, target, value, oldValue })
            }
            return true;
        }
    });
}
