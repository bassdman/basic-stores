export function createRecursiveProxy(target, handler) {
    // Wenn das Ziel ein Objekt ist, erstelle einen Proxy dafür
    if (typeof target === "object" && target !== null) {
      for (const key in target) {
        if (typeof target[key] === "object" && target[key] !== null) {
          // Rekursiv einen Proxy für verschachtelte Objekte erstellen
          target[key] = createRecursiveProxy(target[key], handler);
        }
      }
      return new Proxy(target, handler);
    }
    // Wenn das Ziel kein Objekt ist, gib es unverändert zurück
    return target;
  }


  interface EventEmitterInterface<T extends Record<string, (...args: any[]) => any>> {
    on<K extends keyof T>(event: K, listener: T[K]): void;
    emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): ReturnType<T[K]> | void;
  }
  
  export function mergeEmitters<T extends Record<string, (...args: any[]) => any>>(
    emitterA: EventEmitterInterface<T>,
    emitterB: EventEmitterInterface<T>
  ): EventEmitterInterface<T> {
    return {
      on<K extends keyof T>(event: K, listener: T[K]): void {
        emitterA.on(event, listener);
        emitterB.on(event, listener);
      },
      emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): ReturnType<T[K]> | void {
        // Wir können beide Aufrufe machen und z. B. den ersten nicht-undefined Rückgabewert zurückgeben.
        const resA = emitterA.emit(event, ...args);
        const resB = emitterB.emit(event, ...args);
        return resA !== undefined ? resA : resB;
      }
    };
  }