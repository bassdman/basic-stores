import { KeyBasedEventEmitter } from "./EventEmitter";

export function createReactiveObject(
    input: Record<string, any>,
    eventEmitter: KeyBasedEventEmitter,
    path: string[] = [],
    modificationsAllowedCallback?:(key,value,target)=>boolean
) {
    return new Proxy(input, {
        get(target, key) {
            const value = target[key as keyof typeof target];
            if (typeof value === 'object' && value !== null) {
                // Rekursiv einen Proxy erstellen
                return createReactiveObject(value as Record<string, any>, eventEmitter, [...path, key as string]);
            }
            return value;
        },
        set(target, key: string, value) {
            let isAllowed = !modificationsAllowedCallback || modificationsAllowedCallback(key,value,target);

            if(!isAllowed)
                return false;

            const oldValue = target[key as keyof typeof target];
            if (oldValue !== value) {
                target[key as keyof typeof target] = value;

                // Event mit vollständigem Pfad auslösen
                const fullPath = [...path, key].join('.');
                eventEmitter.emit('change', fullPath, { key, fullPath, value, oldValue, target });
            }
            return true;
        }
    });
}



