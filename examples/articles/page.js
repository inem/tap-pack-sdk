import { copy_link } from 'tap-pack-sdk/copy';
import { browser_clipboard, select_link, on_click } from 'tap-pack-sdk/dom';

const key = '__tap_example.article-copy';
if (!window[key]) {
  window[key] = true;
  const mount = () => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('data-tap-copy-article', '');
    button.setAttribute('aria-live', 'polite');
    button.textContent = 'Copy article URL';
    document.body.appendChild(button);
    const link = select_link('a[data-article-selected="true"]', document);
    const clipboard = browser_clipboard(navigator, document);
    window[key] = on_click(document, '[data-tap-copy-article]', target => {
      target.textContent = 'Copying…';
      target.disabled = true;
      return copy_link(link, clipboard);
    }, result => {
      result.target.disabled = false;
      result.target.textContent = result.status === 'completed' ? 'Copied' : 'Copy failed';
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else mount();
}
