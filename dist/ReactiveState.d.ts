import { Callbacks } from "./ReactiveObject";
export declare function reactiveState(input: Record<string, any>, callbacks?: Callbacks): {
    state: Record<string, any>;
    on: {
        (event: string, callback: import("./EventEmitter").EventCallback): void;
        (event: string, pattern: import("./EventEmitter").EventPattern, callback: import("./EventEmitter").EventCallback): void;
    };
};
export type ReactiveState = ReturnType<typeof reactiveState>;
//# sourceMappingURL=ReactiveState.d.ts.map