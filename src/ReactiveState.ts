
import { useKeyBasedEventEmitter } from "./EventEmitter";
import { createReactiveObject } from "./ReactiveObject";

export function reactiveState(input: Record<string, any>, modificationsAllowedCallback?: (key, value, target) => boolean) {
    const eventEmitter = useKeyBasedEventEmitter();
    const state = createReactiveObject(input, eventEmitter, [], modificationsAllowedCallback);

    return {
        state,
        on: eventEmitter.on,
    };
}
export type ReactiveState = ReturnType<typeof reactiveState>;
