type Key = string | Symbol;

type EmitParameterGet = {
    key: string | symbol,
    pathAsArray: string[],
    fullPath: string,
    target: Record<string, any>
}

type EmitParameterSet = EmitParameterGet & {
    value: unknown,
}

type EmitParameterChange = EmitParameterSet & {
    oldValue: unknown
}

export type Callbacks = {
    get?: (emitParameter: EmitParameterGet) => void;
    set?: (emitParameter: EmitParameterSet) => void;
    change?: (emitParameter: EmitParameterChange) => void;
    modificationsAllowed?: (emitParameter: EmitParameterSet) => boolean
};

export function createReactiveObject(
    input: Record<string, any>,
    callbacks: Callbacks = {}
) {
    return createReactiveObjectInnerPart(input, [], callbacks);
}


function createReactiveObjectInnerPart(
    input: Record<string, any>,
    pathAsArray: string[] = [],
    callbacks: Callbacks = {}
) {

    return new Proxy(input, {
        get(target, key) {
            const fullPath = [...pathAsArray, key].join('.');
            const value = target[key as keyof typeof target];

            callbacks?.get({ pathAsArray, fullPath, target, key })

            if (typeof value === 'object' && value !== null) {
                return createReactiveObjectInnerPart(value as Record<string, any>, [...pathAsArray, key as string], callbacks);
            }
            return value;
        },
        set(target, key: string, value) {
            const fullPath = [...pathAsArray, key].join('.');
            
            callbacks?.set({ pathAsArray, fullPath, key, target, value })
            let isAllowed = !callbacks.modificationsAllowed || callbacks.modificationsAllowed({ key, value, target, fullPath, pathAsArray });


            if (!isAllowed)
                return false;

            const oldValue = target[key as keyof typeof target];
            if (oldValue !== value) {
                target[key as keyof typeof target] = value;

                callbacks?.change({ pathAsArray, fullPath, key, target, value, oldValue })
            }
            return true;
        }
    });
}
