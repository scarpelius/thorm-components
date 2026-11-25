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

test('clicking a second block deactivates the first block', async ({ page }) => {
  const baseUrl = 'http://localhost:47319';

  await page.goto(baseUrl + '/phase2-js-editor/', { waitUntil: 'load' });
  await page.waitForSelector('[data-block-id]', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Click the first block to make it active
  await page.click('[data-block-id="block-1"]', { timeout: 5000 });
  await page.waitForTimeout(500);

  // Verify first block is active
  const firstActive = await page.evaluate(() => {
    const el = document.querySelector('[data-block-id="block-1"]');
    return el && el.classList.contains('editor-active');
  });
  expect(firstActive).toBe(true);

  // Click the second block
  await page.click('[data-block-id="block-2"]', { timeout: 5000 });
  await page.waitForTimeout(500);

  // Verify first block lost its active state
  const firstInactive = await page.evaluate(() => {
    const el = document.querySelector('[data-block-id="block-1"]');
    return el && !el.classList.contains('editor-active');
  });
  expect(firstInactive).toBe(true);

  // Verify second block is now active
  const secondActive = await page.evaluate(() => {
    const el = document.querySelector('[data-block-id="block-2"]');
    return el && el.classList.contains('editor-active');
  });
  expect(secondActive).toBe(true);
});

test('a newly inserted block is selectable and shows the toolbar', async ({ page }) => {
  const baseUrl = 'http://localhost:47319';

  await page.goto(baseUrl + '/phase2-js-editor/', { waitUntil: 'load' });
  await page.waitForSelector('[data-block-id]', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Make block-1 active so the toolbar is available
  await page.click('[data-block-id="block-1"]', { timeout: 5000 });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => document.querySelector('.editor-toolbar') !== null)).toBe(true);

  // Click the "Insert Block" toolbar button (find it by its label)
  await page.click('.editor-toolbar button:has-text("Insert Block")', { timeout: 5000 });
  await page.waitForTimeout(500);

  // A new block should exist in the DOM with a data-block-id
  const newBlockId = await page.evaluate(() => {
    const blocks = [...document.querySelectorAll('[data-block-id]')];
    const newOne = blocks.find((el) => el.getAttribute('data-block-id') !== 'block-1' && el.getAttribute('data-block-id') !== 'block-2');
    return newOne ? newOne.getAttribute('data-block-id') : null;
  });
  expect(newBlockId).not.toBeNull();

  // The new block should be activated automatically (no click needed)
  const newBlockActive = await page.evaluate((id) => {
    const el = document.querySelector(`[data-block-id="${id}"]`);
    return el && el.classList.contains('editor-active');
  }, newBlockId);
  expect(newBlockActive).toBe(true);

  // Verify contenteditable is set
  const newBlockEditable = await page.evaluate((id) => {
    const el = document.querySelector(`[data-block-id="${id}"]`);
    return el && el.getAttribute('contenteditable') === 'true';
  }, newBlockId);
  expect(newBlockEditable).toBe(true);

  // The previous block should have been deactivated
  const oldBlockInactive = await page.evaluate(() => {
    const el = document.querySelector('[data-block-id="block-1"]');
    return el && !el.classList.contains('editor-active');
  });
  expect(oldBlockInactive).toBe(true);

  // Verify the toolbar is shown
  const toolbarVisible = await page.evaluate(() => document.querySelector('.editor-toolbar') !== null);
  expect(toolbarVisible).toBe(true);
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

test('bold command wraps selected text in <strong>', async ({ page }) => {
  const baseUrl = 'http://localhost:47319';

  await page.goto(baseUrl + '/phase2-js-editor/', { waitUntil: 'load' });
  await page.waitForSelector('[data-block-id]', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Click a block to make it editable
  await page.click('[data-block-id]', { timeout: 5000 });
  await page.waitForTimeout(500);

  // Select all text in the block using triple-click
  await page.click('[data-block-id]', { timeout: 5000, tripleClick: true });
  await page.waitForTimeout(300);

  // Verify the selection exists
  const selectionRange = await page.evaluate(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    return {
      commonAncestor: range.commonAncestorContainer.tagName,
      startContainer: range.startContainer.nodeType,
      endContainer: range.endContainer.nodeType,
    };
  });
  console.log('Selection:', JSON.stringify(selectionRange));
  expect(selectionRange).not.toBeNull();

  // Click the Bold toolbar button
  await page.click('.editor-toolbar button', { timeout: 5000 });
  await page.waitForTimeout(500);

  // Verify the selection was wrapped in <strong>
  const hasStrong = await page.evaluate(() => {
    const el = document.querySelector('[data-block-id]');
    return el && el.querySelector('strong') !== null;
  });
  console.log('Has strong:', hasStrong);
  expect(hasStrong).toBe(true);
});

test('link command fails when URL is empty', async ({ page }) => {
  const baseUrl = 'http://localhost:47319';

  await page.goto(baseUrl + '/phase2-js-editor/', { waitUntil: 'load' });
  await page.waitForSelector('[data-block-id]', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Click a block to make it editable
  await page.click('[data-block-id="block-1"]', { timeout: 5000 });
  await page.waitForTimeout(500);

  // Select all text in the block (the first <p> inside block-1)
  await page.evaluate(() => {
    const p = document.querySelector('[data-block-id="block-1"] p');
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(p);
    sel.removeAllRanges();
    sel.addRange(range);
  });

  // Intercept the prompt dialog and return an empty string (simulates cancel/empty)
  const dialogPromise = page.waitForEvent('dialog').then((dialog) => {
    dialog.accept('');
  });

  // Click the Link toolbar button
  await page.click('.editor-toolbar button:has-text("Link")', { timeout: 5000 });
  await dialogPromise;
  await page.waitForTimeout(500);

  // Verify no <a> was created
  const hasLink = await page.evaluate(() => {
    const el = document.querySelector('[data-block-id="block-1"]');
    return el && el.querySelector('a') !== null;
  });
  expect(hasLink).toBe(false);
});

test('link command fails when no text is selected', async ({ page }) => {
  const baseUrl = 'http://localhost:47319';

  await page.goto(baseUrl + '/phase2-js-editor/', { waitUntil: 'load' });
  await page.waitForSelector('[data-block-id]', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Click a block to make it editable (click places caret, no selection)
  await page.click('[data-block-id="block-1"]', { timeout: 5000 });
  await page.waitForTimeout(500);

  // Ensure there is no selection (collapsed caret) by clearing any range
  await page.evaluate(() => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) sel.removeAllRanges();
  });

  // Intercept the prompt dialog and accept a valid URL
  const dialogPromise = page.waitForEvent('dialog').then((dialog) => {
    dialog.accept('https://example.com');
  });

  // Click the Link toolbar button
  await page.click('.editor-toolbar button:has-text("Link")', { timeout: 5000 });
  await dialogPromise;
  await page.waitForTimeout(500);

  // Verify no <a> was created (no selected text)
  const hasLink = await page.evaluate(() => {
    const el = document.querySelector('[data-block-id="block-1"]');
    return el && el.querySelector('a') !== null;
  });
  expect(hasLink).toBe(false);
});

test('link command wraps selected text in <a> when URL and text present', async ({ page }) => {
  const baseUrl = 'http://localhost:47319';

  await page.goto(baseUrl + '/phase2-js-editor/', { waitUntil: 'load' });
  await page.waitForSelector('[data-block-id]', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Click a block to make it editable
  await page.click('[data-block-id="block-1"]', { timeout: 5000 });
  await page.waitForTimeout(500);

  // Select all text in the block (the first <p> inside block-1)
  await page.evaluate(() => {
    const p = document.querySelector('[data-block-id="block-1"] p');
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(p);
    sel.removeAllRanges();
    sel.addRange(range);
  });

  // Intercept the prompt dialog and accept a URL
  const dialogPromise = page.waitForEvent('dialog').then((dialog) => {
    dialog.accept('https://example.com');
  });

  // Click the Link toolbar button
  await page.click('.editor-toolbar button:has-text("Link")', { timeout: 5000 });
  await dialogPromise;
  await page.waitForTimeout(500);

  // Verify an <a> was created with the correct href
  const linkInfo = await page.evaluate(() => {
    const el = document.querySelector('[data-block-id="block-1"]');
    const a = el && el.querySelector('a');
    return a ? { href: a.href, text: a.textContent } : null;
  });
  expect(linkInfo).not.toBeNull();
  expect(linkInfo.href).toBe('https://example.com/');
  expect(linkInfo.text).toBeTruthy();
});
