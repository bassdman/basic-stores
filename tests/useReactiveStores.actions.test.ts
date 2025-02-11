import { describe, it, test, } from "node:test";
import assert from "node:assert";
import { useReactiveStore } from '../src/ReactiveStore';

describe('Store-Actions',()=>{
  it('An action without parameter can be called', (t) => {
    const store = useReactiveStore().$extend({
      state: {
        var1: 1
      },
      actions:{
        setTo2(ctx){
          ctx.state.var1 = 2;
        },
      }
    });
  
    assert.strictEqual(store.state.var1, 1);
    store.setTo2();
    assert.strictEqual(store.state.var1, 2);
  });

  it('An action with parameter can be called', (t) => {
    const store = useReactiveStore().$extend({
      state: {
        var1: 1
      },
      actions:{
        setToNr(ctx, nr){
          ctx.state.var1 = nr;
        },
      }
    });
  
    assert.strictEqual(store.state.var1, 1);
    store.setToNr(3);
    assert.strictEqual(store.state.var1, 3);
  });

  it('An action can change nested state values', (t) => {
    const store = useReactiveStore().$extend({
      state: {
        var: {
          var1: 1
        }
      },
      actions:{
        setToNr(ctx, nr){
          ctx.state.var.var1 = nr;
        },
      }
    });
  
    assert.strictEqual(store.state.var.var1, 1);
    store.setToNr(3);
    assert.strictEqual(store.state.var.var1, 3);
  });

  it('An action can nested actions', (t) => {
    const store = useReactiveStore().$extend({
      state: {
        var: {
          var1: 1,
          var2: 2,
          var3: 3
        }
      },
      actions:{
        addVar1(ctx, nr){
          ctx.state.var.var1 += nr;
        },
        addVar2(ctx, nr){
          ctx.state.var.var2 += nr;
        },
        addVar3(ctx, nr){
          ctx.state.var.var3 += nr;
        },
        addToAll(ctx, nr){
          ctx.addVar1(nr);
          ctx.addVar2(nr);
          ctx.addVar3(nr);
        },
      }
    });
  
    assert.strictEqual(store.state.var.var1, 1);
    assert.strictEqual(store.state.var.var2, 2);
    assert.strictEqual(store.state.var.var3, 3);
    store.addToAll(5);
    assert.strictEqual(store.state.var.var1, 6);
    assert.strictEqual(store.state.var.var2, 7);
    assert.strictEqual(store.state.var.var3, 8);
  });

  it('An action with nested actions updates nested getters', (t) => {
    const store = useReactiveStore().$extend({
      state: {
        var: {
          var1: 1,
          var2: 2,
          var3: 3
        }
      },
      actions:{
        addVar1(ctx, nr){
          ctx.state.var.var1 += nr;
        },
        addVar2(ctx, nr){
          ctx.state.var.var2 += nr;
        },
        addToAll(ctx, nr){
          ctx.addVar1(nr);
          ctx.addVar2(nr);
        },
      },
      getters: {
        double1(ctx){
          return ctx.state.var.var1 * 2;
        },
        double2(ctx){
          return ctx.state.var.var2 * 2;
        },
        fourTimes1(ctx){
          return ctx.double1 * 2;
        },
        fourTimes2(ctx){
          return ctx.double2 * 2;
        },
        eightTimes1(ctx){
          return ctx.fourTimes1 * 2;
        },
        eightTimes2(ctx){
          return ctx.fourTimes2 * 2;
        },
      }
    });
  
    assert.strictEqual(store.state.var.var1, 1);
    assert.strictEqual(store.state.var.var2, 2);
    assert.strictEqual(store.double1, 2);
    assert.strictEqual(store.double2, 4);
    assert.strictEqual(store.fourTimes1, 4);
    assert.strictEqual(store.fourTimes2, 8);
    assert.strictEqual(store.eightTimes1, 8);
    assert.strictEqual(store.eightTimes2, 16);
    store.addToAll(5);
    assert.strictEqual(store.state.var.var1, 6);
    assert.strictEqual(store.state.var.var2, 7);
    assert.strictEqual(store.double1, 12);
    assert.strictEqual(store.double2, 14);
    assert.strictEqual(store.fourTimes1, 24);
    assert.strictEqual(store.fourTimes2, 28);
    assert.strictEqual(store.eightTimes1, 48);
    assert.strictEqual(store.eightTimes2, 56);
  });
});