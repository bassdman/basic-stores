import { describe, it, test, } from "node:test";
import assert from "node:assert";
import { useReactiveStore } from '../src/ReactiveStore';

describe('store using Extend-Method in new line', () => {
  it('should have getter', (t) => {
    const store = useReactiveStore();
    store.$extend({
      state: {
        var1: 1
      },
      getters: {
        double(ctx) {
          return ctx.state.var1 * 2;
        },
      }
    });

    assert.strictEqual(store.state.var1, 1);
    assert.strictEqual(store.double, 2);
  });

  it('should update getters recursively after running an action', (t) => {
    const store = useReactiveStore();
    store.$extend({
      state: {
        var1: 1
      },
      actions: {
        modify(ctx) {
          ctx.state.var1 = 3
        }
      },
      getters: {
        double(ctx) {
          return ctx.state.var1 * 2;
        },
        fourTimes(ctx) {
          return ctx.double * 2;
        },
        eightTimes(ctx) {
          return ctx.fourTimes * 2;
        }
      }
    });

    assert.strictEqual(store.state.var1, 1);
    assert.strictEqual(store.double, 2);
    assert.strictEqual(store.fourTimes, 4);
    assert.strictEqual(store.eightTimes, 8);

    store.modify();

    assert.strictEqual(store.state.var1, 3);
    assert.strictEqual(store.double, 6);
    assert.strictEqual(store.fourTimes, 12);
    assert.strictEqual(store.eightTimes, 24);
  });
});

describe('store using Extend-Method directlyCalled', () => {
  it('should have getter', (t) => {
    const store = useReactiveStore().$extend({
      state: {
        var1: 1
      },
      getters: {
        double(ctx) {
          return ctx.state.var1 * 2;
        },
      }
    });

    assert.strictEqual(store.state.var1, 1);
    assert.strictEqual(store.double, 2);
  });

  it('should update getters recursively after running an action', (t) => {
    const store = useReactiveStore().$extend({
      state: {
        var1: 1
      },
      actions: {
        modify(ctx) {
          ctx.state.var1 = 3
        }
      },
      getters: {
        double(ctx) {
          return ctx.state.var1 * 2;
        },
        fourTimes(ctx) {
          return ctx.double * 2;
        },
        eightTimes(ctx) {
          return ctx.fourTimes * 2;
        }
      }
    });

    assert.strictEqual(store.state.var1, 1);
    assert.strictEqual(store.double, 2);
    assert.strictEqual(store.fourTimes, 4);
    assert.strictEqual(store.eightTimes, 8);

    store.modify();

    assert.strictEqual(store.state.var1, 3);
    assert.strictEqual(store.double, 6);
    assert.strictEqual(store.fourTimes, 12);
    assert.strictEqual(store.eightTimes, 24);
  });

  it.only('should update getters recursively after running an action', (t) => {
    const store = useReactiveStore({
      state: {
        var1: 1
      },
      actions: {
        modify(ctx) {
          console.log('modify')
          ctx.state.var1 = 3
        }
      },
      getters: {
        double(ctx) {
          console.log('double');
          return ctx.state.var1 * 2;
        },
        fourTimes(ctx) {
          console.log('fourtimes');
          return ctx.double * 2;
        },
        eightTimes(ctx) {
          console.log('eighttimes');
          return ctx.fourTimes * 2;
        }
      }
    });

    store.$on('dependencies',(data)=>{
    //  console.log('change dependency',data)
    })

    console.log('var1=1',store.state.var1);
    console.log('double=2',store.double);
    console.log('fourTimes=4',store.fourTimes);
    console.log('eightTimes=8',store.eightTimes);

    console.log('modify(var1=3)');
    store.modify();

    console.log('var1=3;',store.state.var1);
    console.log('double=6;',store.double);
    console.log('fourTimes=12;',store.fourTimes);
    console.log('eightTimes=24;',store.eightTimes);
  });
});