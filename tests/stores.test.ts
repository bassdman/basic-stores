import { describe, it, test, } from "node:test";
import assert from "node:assert";
import { useReactiveStore } from '../src/ReactiveStore';

describe('store using constructor', () => {
  it('should have a var1 with value 1', (t) => {
    const store = useReactiveStore({
      state: {
        var1: 1
      }
    })
    assert.strictEqual(store.state.var1, 1);
  });

  it('should update getters recursively after running an action', (t) => {
    const store = useReactiveStore({
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
});

describe('Store-Getters',()=>{
  it('with only ctx as parameter returning number in declaration should return number', (t) => {
    const store = useReactiveStore().$extend({
      state: {
        var1: 1
      },
      getters:{
        double(ctx){
          return ctx.state.var1 * 2;
        },
      }
    });
  
    assert.strictEqual(store.double, 2);
  });

  it('without parameter in declaration returning number should return number', (t) => {
    const store = useReactiveStore().$extend({
      state: {
        var1: 1
      },
      getters:{
        pi(){
          return 3.1415;
        },
      }
    });
  
    assert.strictEqual(store.pi, 3.1415);
  });
  
    it('store-getter returning number with 2 parameters should return function', (t) => {
      const store = useReactiveStore().$extend({
        state: {
          var1: 1
        },
        getters:{
          sum(ctx, nr){
            return ctx.state.var1 + nr;
          },
        }
      });
      assert.strictEqual(typeof store.sum, 'function');
      assert.strictEqual(store.sum(3), 4);
    });
});

describe('Store-Caching',()=>{
  it('getter-function should be not be internally called if store is just initialized',()=>{
    let count = 0;
    const store = useReactiveStore({
      state: {
        var1: 1
      },
      getters:{
        pi(){
          count++;
          return 3.1415;
        }
      }
    });
    assert.strictEqual(count, 0);
  });

  it('getter-function should be internally called once',()=>{
    let count = 0;
    const store = useReactiveStore({
      state: {
        var1: 1
      },
      getters:{
        pi(){
          count++;
          return 3.1415;
        }
      }
    });

    store.pi;
    assert.strictEqual(count, 1);
  });

  it('getter-function should be internally called once',()=>{
    let count = 0;
    const store = useReactiveStore({
      state: {
        var1: 1
      },
      getters:{
        sum(ctx,nr){
          count++;
          return 3.1415 + nr;
        }
      }
    });

    store.sum(3);
    assert.strictEqual(count, 1);
  });

  it('getter-function should be internally called once even if getter is called twice',()=>{
    let count = 0;
    const store = useReactiveStore({
      state: {
        var1: 1
      },
      getters:{
        pi(){
          count++;
          return 3.1415;
        }
      }
    });

    store.pi;
    store.pi
    assert.strictEqual(count, 1);
  });

  it('getter-function should be internally called before and after state-value changed',()=>{
    let count = 0;
    const store = useReactiveStore({
      state: {
        var1: 1
      },
      actions:{
        setVar1(ctx, nr){
          ctx.var1 = nr;
        }
      },
      getters:{
        pi(){
          count++;
          return 3.1415;
        }
      }
    });

    store.pi;
    store.pi;
    store.setVar1(5);
    store.pi;
    store.pi;
    store.pi;
    assert.strictEqual(count, 2);
  });
});