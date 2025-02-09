type EmitParameterGet = {
    key: string | symbol;
    pathAsArray: string[];
    fullPath: string;
    target: Record<string, any>;
};
type EmitParameterSet = EmitParameterGet & {
    value: unknown;
};
type EmitParameterChange = EmitParameterSet & {
    oldValue: unknown;
};
export type Callbacks = {
    get?: (emitParameter: EmitParameterGet) => void;
    set?: (emitParameter: EmitParameterSet) => void;
    change?: (emitParameter: EmitParameterChange) => void;
    modificationsAllowed?: (emitParameter: EmitParameterSet) => boolean;
};
export declare function createReactiveObject(input: Record<string, any>, callbacks?: Callbacks): Record<string, any>;
export {};
//# sourceMappingURL=ReactiveObject.d.ts.map