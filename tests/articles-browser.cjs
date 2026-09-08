const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.argv[2]);
const root = path.resolve(process.argv[4]);
const built = fs.readFileSync(path.join(root, 'pack/page.js'), 'utf8');
const fixture = '<!doctype html><html><head><title>Synthetic articles</title></head><body><h1>Article selection</h1><a data-article-selected="true" href="/articles/first?view=full#intro">First article</a><a id="second" href="/articles/second">Second article</a></body></html>';
fs.writeFileSync(path.join(root, 'fixture.html'), fixture);
(async () => {
  const browser = await chromium.launch({ executablePath: process.argv[3], headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const requests = [];
  await context.route('**/*', route => {
    requests.push(route.request().url());
    return route.fulfill({status:200, contentType:'text/html', body: fixture});
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    window.writes = [];
    window.fallbackWrites = [];
    window.writeMode = 'success';
    Object.defineProperty(navigator, 'clipboard', { value: {writeText(text) {
      window.writes.push({ text, activated: navigator.userActivation.isActive });
      return window.writeMode === 'success' ? Promise.resolve() : Promise.reject(new Error('Synthetic clipboard refusal'));
    }}, configurable: true });
    document.execCommand = command => {
      if (command !== 'copy') throw new Error('Unexpected fallback command');
      window.fallbackWrites.push(document.querySelector('textarea').value);
      return false;
    };
  });
  try {
    await page.goto('https://articles.example/reading');
    await page.addScriptTag({content: built});
    const button = page.locator('[data-tap-copy-article]');
    async function clickAndState(expected) {
      await button.click();
      await page.waitForFunction(expected => document.querySelector('[data-tap-copy-article]').textContent === expected, expected);
    }
    await clickAndState('Copied');
    assert.equal(await page.evaluate(() => writes.at(-1).text), 'https://articles.example/articles/first?view=full#intro');
    await page.locator('[data-article-selected]').evaluate(el => el.setAttribute('href', '/articles/revised?revision=2#changed'));
    await clickAndState('Copied');
    assert.equal(await page.evaluate(() => writes.at(-1).text), 'https://articles.example/articles/revised?revision=2#changed');
    await page.evaluate(() => {
      document.querySelector('[data-article-selected]').removeAttribute('data-article-selected');
      document.querySelector('#second').setAttribute('data-article-selected', 'true');
    });
    await clickAndState('Copied');
    assert.equal(await page.evaluate(() => writes.at(-1).text), 'https://articles.example/articles/second');
    await page.evaluate(() => { window.writeMode = 'reject'; });
    await clickAndState('Copy failed');
    assert.deepEqual(await page.evaluate(() => fallbackWrites), ['https://articles.example/articles/second']);
    assert.equal(await page.locator('textarea').count(), 0);
    await page.locator('[data-article-selected]').evaluate(el => el.removeAttribute('href'));
    const count = await page.evaluate(() => writes.length);
    await clickAndState('Copy failed');
    assert.equal(await page.evaluate(() => writes.length), count);
    await page.addScriptTag({content: built});
    assert.equal(await button.count(), 1);
    assert.deepEqual(errors, []);
    assert((await page.evaluate(() => writes)).every(w => w.activated));
    const report = {
      status: 'passed', browser: await browser.version(), node: process.version,
      playwright: require(path.join(process.argv[2], 'package.json')).version,
      executed: 'pack/page.js',
      cases: ['initial selected URL', 'href mutation', 'selection change', 'clipboard rejection plus failed fallback displays failure', 'missing href does not write or display success', 'double script injection leaves one button', 'write invoked during user activation'],
      writes: await page.evaluate(() => writes), fallbackWrites: await page.evaluate(() => fallbackWrites),
      finalButtonText: await button.textContent(), pageErrors: errors, requests,
      allRequestsFulfilledByFixture: true, liveSite: 'not tested', realClipboard: 'not tested; synthetic binding'
    };
    fs.writeFileSync(path.join(root, 'browser-results.json'), JSON.stringify(report, null, 2) + '\n');
    await page.screenshot({ path: path.join(root, 'browser-failure.png') });
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
