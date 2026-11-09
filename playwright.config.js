const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'editor/tests/e2e',
  browser: 'chromium',
  workers: 1,
  fullyParallel: false,
  testTimeout: 60000,
  globalSetup: './playwright.global-setup.js',
  globalTeardown: './playwright.global-teardown.js',
  projects: [
    {
      name: 'chromium',
      use: {
        chromium: {},
        pageTimeout: 30000,
      },
    },
  ],
});
