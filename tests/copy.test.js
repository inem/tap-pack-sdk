import { test, expect } from 'bun:test';
import { copy_link, copy_with_preparation } from '../src/copy.js';
import { browser_clipboard, select_link } from '../src/dom.js';

test('same operation accepts a DOM source and a non-browser clipboard', async () => {
  let href = '/one';
  const root = { querySelector: () => ({ getAttribute: () => href, baseURI: 'https://articles.example/base' }) };
  const link = select_link('a', root);
  const values = [];
  const clipboard = { writeText: text => values.push(text) };
  const first = copy_link(link, clipboard);
  expect(values).toEqual(['https://articles.example/one']); // synchronous effect invocation
  await first;
  href = '/two';
  await copy_link(link, clipboard);
  expect(values).toEqual(['https://articles.example/one', 'https://articles.example/two']);
});

test('missing selection never writes', async () => {
  let calls = 0;
  await expect(copy_link(select_link('a', { querySelector: () => null }),
    { writeText: () => calls++ })).rejects.toThrow('No link');
  expect(calls).toBe(0);
});

test('missing, failed and hanging preparation never delays copying', async () => {
  for (const prepare of [undefined, () => { throw Error('offline'); }, () => Promise.reject(Error('offline')), () => new Promise(() => {})]) {
    const writes = [];
    const result = copy_with_preparation(() => 'https://example.test/', { writeText: text => writes.push(text) }, prepare);
    await result.copy;
    expect(writes).toEqual(['https://example.test/']);
  }
});

test('clipboard refusal stays a refusal even if preparation succeeds', async () => {
  const result = copy_with_preparation(() => 'url', { writeText: () => Promise.reject(Error('denied')) }, () => 'fetched');
  await expect(result.copy).rejects.toThrow('denied');
  expect(await result.preparation).toEqual({ status: 'completed', value: 'fetched' });
});

test('deferred clipboard starts the privileged write before text preparation finishes', async () => {
  let finish, item, writes = 0;
  const pending = new Promise(resolve => { finish = resolve; });
  class FakeBlob { constructor(parts, options) {this.parts=parts;this.type=options.type;} }
  class FakeClipboardItem { constructor(data) {this.data=data;} }
  const clipboard = browser_clipboard({clipboard:{write(items) {
    writes++; item=items[0];
    return item.data['text/plain'].then(() => {});
  }}}, {defaultView:{Blob:FakeBlob,ClipboardItem:FakeClipboardItem}});
  const copied = clipboard.writeTextDeferred(() => pending);
  expect(writes).toBe(1);
  finish('expanded post');
  await copied;
  const blob = await item.data['text/plain'];
  expect(blob.parts).toEqual(['expanded post']);
  expect(blob.type).toBe('text/plain');
});
