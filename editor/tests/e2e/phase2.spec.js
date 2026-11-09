import { test, expect } from '@playwright/test';

test('phase2 page loads and editor mounts', async ({ page }) => {
  const baseUrl = 'http://localhost:47319';

  await page.goto(baseUrl + '/phase2-js-editor/', { waitUntil: 'load' });
  await page.waitForSelector('[data-block-id]', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Verify window.editorState is set by the embedded script
  const hasEditorState = await page.evaluate(() =>
    typeof window.editorState === 'object' && window.editorState !== null
  );
  expect(hasEditorState).toBe(true);

  // Verify editorState has blocks
  const hasBlocks = await page.evaluate(() =>
    window.editorState && typeof window.editorState.blocks === 'object'
  );
  expect(hasBlocks).toBe(true);

  // Verify at least one block has content
  const blockCount = await page.evaluate(() => {
    const blocks = window.editorState?.blocks;
    return blocks ? Object.keys(blocks).length : 0;
  });
  expect(blockCount).toBeGreaterThan(0);

  // Verify blocks exist in DOM
  const domBlockCount = await page.evaluate(() =>
    document.querySelectorAll('[data-block-id]').length
  );
  expect(domBlockCount).toBeGreaterThan(0);
});

test('clicking a block enables contenteditable and shows toolbar', async ({ page }) => {
  const baseUrl = 'http://localhost:47319';

  await page.goto(baseUrl + '/phase2-js-editor/', { waitUntil: 'load' });
  await page.waitForSelector('[data-block-id]', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Click on a block to focus it
  await page.click('[data-block-id]', { timeout: 5000 });
  await page.waitForTimeout(500);

  // Verify contenteditable was set
  const isEditable = await page.evaluate(() => {
    const el = document.querySelector('[data-block-id]');
    return el && el.getAttribute('contenteditable') === 'true';
  });
  expect(isEditable).toBe(true);

  // Verify toolbar appeared
  const toolbarExists = await page.evaluate(() => {
    return document.querySelector('.editor-toolbar') !== null;
  });
  expect(toolbarExists).toBe(true);
});

test('typing in a block updates window.editorState', async ({ page }) => {
  const baseUrl = 'http://localhost:47319';

  await page.goto(baseUrl + '/phase2-js-editor/', { waitUntil: 'load' });
  await page.waitForSelector('[data-block-id]', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Record initial editorState
  const initialState = await page.evaluate(() =>
    JSON.stringify(window.editorState?.blocks)
  );

  // Click a block to focus it, then type
  await page.click('[data-block-id]', { timeout: 5000 });
  await page.waitForTimeout(500);
  await page.type('[data-block-id]', 'test edit content');
  await page.waitForTimeout(300);

  // Click elsewhere to trigger focusout
  await page.click('body', { position: { x: 1, y: 1 } });
  await page.waitForTimeout(500);

  // Verify editorState was updated
  const newState = await page.evaluate(() =>
    JSON.stringify(window.editorState?.blocks)
  );
  expect(newState).not.toBe(initialState);
});

test('clicking outside all blocks removes contenteditable from active block', async ({ page }) => {
  const baseUrl = 'http://localhost:47319';

  await page.goto(baseUrl + '/phase2-js-editor/', { waitUntil: 'load' });
  await page.waitForSelector('[data-block-id]', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Click a block to make it editable
  await page.click('[data-block-id]', { timeout: 5000 });
  await page.waitForTimeout(500);

  // Verify contenteditable was set
  const isEditable = await page.evaluate(() => {
    const el = document.querySelector('[data-block-id]');
    return el && el.getAttribute('contenteditable') === 'true';
  });
  expect(isEditable).toBe(true);

  // Click outside all blocks (the <h1> heading)
  await page.click('h1', { timeout: 5000 });
  await page.waitForTimeout(500);

  // Verify contenteditable was removed
  const isStillEditable = await page.evaluate(() => {
    const el = document.querySelector('[data-block-id]');
    return el && el.getAttribute('contenteditable') === 'true';
  });
  expect(isStillEditable).toBe(false);
});

test('clicking a toolbar command keeps contenteditable active', async ({ page }) => {
  const baseUrl = 'http://localhost:47319';

  await page.goto(baseUrl + '/phase2-js-editor/', { waitUntil: 'load' });
  await page.waitForSelector('[data-block-id]', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Click a block to make it editable and show the toolbar
  await page.click('[data-block-id]', { timeout: 5000 });
  await page.waitForTimeout(500);

  // Verify contenteditable was set and toolbar is visible
  const isEditable = await page.evaluate(() => {
    const el = document.querySelector('[data-block-id]');
    return el && el.getAttribute('contenteditable') === 'true';
  });
  expect(isEditable).toBe(true);

  const toolbarExists = await page.evaluate(() => {
    return document.querySelector('.editor-toolbar') !== null;
  });
  expect(toolbarExists).toBe(true);

  // Click a toolbar button (Bold)
  await page.click('.editor-toolbar button', { timeout: 5000 });
  await page.waitForTimeout(500);

  // Verify contenteditable is still set
  const stillEditable = await page.evaluate(() => {
    const el = document.querySelector('[data-block-id]');
    return el && el.getAttribute('contenteditable') === 'true';
  });
  expect(stillEditable).toBe(true);

  // Verify toolbar is still visible
  const toolbarStillVisible = await page.evaluate(() => {
    return document.querySelector('.editor-toolbar') !== null;
  });
  expect(toolbarStillVisible).toBe(true);
});
