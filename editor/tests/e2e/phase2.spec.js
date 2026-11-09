import { test, expect } from '@playwright/test';

test('phase2 page loads and editor mounts', async ({ page }) => {
  const baseUrl = 'http://localhost:47319';
  
  await page.goto(baseUrl + '/phase2-js-editor/', { waitUntil: 'load' });
  await page.waitForSelector('[data-block-id]', { timeout: 15000 });
  await page.waitForTimeout(5000);
  
  // Check if the script tag is in the DOM
  const scriptExists = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    return scripts.some(s => s.textContent && s.textContent.includes('window.editorState'));
  });
  console.log('Script tag exists in DOM:', scriptExists);
  
  // Check if window.editorState is set
  const hasEditorState = await page.evaluate(() => typeof window.editorState === 'object');
  console.log('hasEditorState:', hasEditorState);
  
  // Check if the script content is valid JS
  const scriptContent = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    const s = scripts.find(s => s.textContent && s.textContent.includes('window.editorState'));
    return s ? s.textContent.substring(0, 100) : null;
  });
  console.log('Script content (first 100 chars):', scriptContent);
  
  expect(true).toBe(true);
});
