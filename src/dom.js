/** A DOM selector is one possible source of a link, not part of Copy. */
export function select_link(selector, root, represent = url => url) {
  return () => {
    const element = root.querySelector(selector);
    const href = element?.getAttribute('href');
    if (!href) throw new Error('No link selected');
    return represent(new URL(href, element.baseURI).href);
  };
}

export function browser_clipboard(navigator, document) {
  function fallback(text) {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;opacity:0;left:-9999px;top:0';
    document.body.appendChild(area);
    try {
      area.select();
      if (!document.execCommand('copy')) throw new Error('Clipboard write failed');
    } finally { area.remove(); }
  }
  return { writeText(text) {
    try {
      if (navigator.clipboard?.writeText) {
        return Promise.resolve(navigator.clipboard.writeText(text)).catch(() => fallback(text));
      }
    } catch (_) { /* Try the browser fallback. */ }
    return fallback(text);
  } };
}

/** Delegation survives replacement of matching DOM nodes. Returns teardown. */
export function on_click(root, selector, action, report = () => {}) {
  const listener = event => {
    const target = event.target?.closest?.(selector);
    if (!target || !root.contains(target)) return;
    event.preventDefault();
    // Invoke before any await; clipboard needs the originating gesture.
    try {
      Promise.resolve(action(target, event)).then(
        () => report({ status: 'completed', target }),
        error => report({ status: 'failed', target, error })
      ).catch(() => {});
    } catch (error) { report({ status: 'failed', target, error }); }
  };
  root.addEventListener('click', listener);
  return () => root.removeEventListener('click', listener);
}
