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