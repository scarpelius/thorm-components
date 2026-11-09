import { test, describe } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<html><body></body></html>');
const { document, window } = dom.window;
global.window = window;
global.document = document;

const { CommandStack } = await import('/workspace/thorm-components/editor/src/js/undo-redo.js');

describe('CommandStack', () => {
  test('push and undo', () => {
    const stack = new CommandStack();
    assert.strictEqual(stack.canUndo, false);
    assert.strictEqual(stack.canRedo, false);

    stack.push({ type: 'text-edit', nodeId: 'n1', before: {}, after: {} });
    assert.strictEqual(stack.canUndo, true);

    const cmd = stack.undo();
    assert.strictEqual(cmd.type, 'text-edit');
    assert.strictEqual(cmd.nodeId, 'n1');
    assert.strictEqual(stack.canUndo, false);
  });

  test('redo after undo', () => {
    const stack = new CommandStack();
    stack.push({ type: 'text-edit', nodeId: 'n1', before: {}, after: {} });
    stack.push({ type: 'text-edit', nodeId: 'n2', before: {}, after: {} });

    const first = stack.undo();
    const second = stack.undo();

    assert.strictEqual(first.type, 'text-edit');
    assert.strictEqual(second.type, 'text-edit');

    const redone = stack.redo();
    assert.strictEqual(redone.type, 'text-edit');

    // Pushing a new command clears redo stack
    stack.push({ type: 'new', nodeId: 'n3', before: {}, after: {} });
    assert.strictEqual(stack.canRedo, false);
  });

  test('maxSize limits stack', () => {
    const stack = new CommandStack(3);
    for (let i = 0; i < 5; i++) {
      stack.push({ type: 'test', nodeId: `n${i}`, before: {}, after: {} });
    }
    assert.strictEqual(stack.stack.length, 3);
  });

  test('clear removes all commands', () => {
    const stack = new CommandStack();
    stack.push({ type: 'a', nodeId: 'n1', before: {}, after: {} });
    stack.push({ type: 'b', nodeId: 'n2', before: {}, after: {} });
    stack.clear();
    assert.strictEqual(stack.canUndo, false);
    assert.strictEqual(stack.canRedo, false);
  });
});