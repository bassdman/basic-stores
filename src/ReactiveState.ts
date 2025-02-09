
import { useKeyBasedEventEmitter } from "./EventEmitter";
import { Callbacks, createReactiveObject } from "./ReactiveObject";

export function reactiveState(input: Record<string, any>, callbacks?:Callbacks) {
    const eventEmitter = useKeyBasedEventEmitter();
    const state = createReactiveObject(input, callbacks);

    return {
        state,
        on: eventEmitter.on,
    };
}
export type ReactiveState = ReturnType<typeof reactiveState>;
