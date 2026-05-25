// @ts-check
/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 390, height: 844 },
    screenshot: 'on',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  outputDir: './screenshots/test-results',
}
