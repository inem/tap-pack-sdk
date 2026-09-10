/** Mount one action per observed object. Site code supplies identity and placement.
 * resolve(object) -> {key, anchor, ...material}; present(binding) -> view.
 * A view owns element, state(name), optional sync(binding), and dispose().
 * run(binding, event) is invoked synchronously in the original user gesture.
 */
export function mount_action({root, targets, resolve, present, run, attributes = [], resetAfter = 1600}) {
  const document = root.ownerDocument || root;
  const win = document.defaultView;
  const mounted = new Map();
  let disposed = false, frame = 0;
  const read = object => { try { return resolve(object); } catch { return null; } };
  function remove(object, item) {
    item.active = false;
    item.abort?.abort();
    win.clearTimeout(item.timer);
    item.view.element.removeEventListener('click', item.click);
    item.view.dispose(); mounted.delete(object);
  }
  function reconcile() {
    frame = 0;
    if (disposed) return;
    const objects = new Set(targets());
    for (const [object, item] of mounted) {
      const next = objects.has(object) && read(object);
      if (!next || next.key !== item.key || next.anchor !== item.anchor ||
          !item.view.element.isConnected || item.view.element.parentNode !== next.anchor.parentNode) remove(object, item);
      else item.view.sync?.(next);
    }
    for (const object of objects) {
      if (mounted.has(object)) continue;
      const binding = read(object);
      if (!binding?.anchor?.isConnected) continue;
      const view = present(binding);
      const item = {view, key: binding.key, anchor: binding.anchor, active: true, busy: false};
      item.click = event => {
        event.preventDefault(); event.stopPropagation();
        if (!item.active || item.busy) return;
        const current = read(object);
        if (!current || current.key !== item.key || current.anchor !== item.anchor) { reconcile(); return; }
        win.clearTimeout(item.timer);
        item.abort = new win.AbortController();
        item.busy = true; view.state('pending');
        const finish = state => {
          if (!item.active) return;
          item.busy = false; view.state(state);
          if (resetAfter > 0 && state !== 'failed') item.timer = win.setTimeout(() => { if (item.active) view.state('idle'); }, resetAfter);
        };
        try { Promise.resolve(run(current, event, item.abort.signal)).then(() => finish('completed'), () => finish('failed')); }
        catch { finish('failed'); }
      };
      view.element.addEventListener('click', item.click);
      binding.anchor.before(view.element);
      mounted.set(object, item);
    }
  }
  const observer = new win.MutationObserver(() => {
    if (!frame && !disposed) frame = win.requestAnimationFrame(reconcile);
  });
  observer.observe(root, {subtree: true, childList: true, characterData: true,
    ...(attributes.length ? {attributes: true, attributeFilter: attributes} : {})});
  reconcile();
  return {refresh: reconcile, dispose() {
    disposed = true; observer.disconnect(); win.cancelAnimationFrame(frame);
    for (const [object, item] of mounted) remove(object, item);
  }};
}

// Original small stroke symbols; no site's icon IDs or behavioral attributes.
const paths = {
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
  markdown: 'M3 17V7l4 5 4-5v10 M16 7v10 M13 14l3 3 3-3',
  completed: 'M5 12l4 4L19 6', failed: 'M12 4v10 M12 19v1',
  pending: 'M5 12h1 M11 12h1 M17 12h1',
};
function attr(node, name, value) {
  value = String(value);
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}
/** An owned button, with presentation supplied by the site. No global CSS.
 * appearance: {buttonClass, contentClass, iconClass, iconSize, iconColor}; omitted -> text.
 * Classes may come from an observed native peer; never copy its whole DOM/state.
 */
export function action_button(document, {label, icon, messages = {}, appearance = {}}) {
  const element = document.createElement('button');
  element.type = 'button';
  const content = document.createElement('span');
  element.append(content);
  let svg, path, announcer;
  if (icon) {
    if (!paths[icon]) throw new Error('Unsupported action icon');
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [k,v] of Object.entries({viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':2, 'stroke-linecap':'round', 'stroke-linejoin':'round', 'aria-hidden':'true', focusable:'false'})) svg.setAttribute(k,v);
    path = document.createElementNS(svg.namespaceURI, 'path');
    svg.append(path); content.append(svg);
    announcer = document.createElement('span');
    announcer.setAttribute('role','status');
    announcer.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0';
    element.append(announcer);
  } else element.setAttribute('aria-live','polite');
  function style(next) {
    attr(element,'class',next.buttonClass || ''); attr(content,'class',next.contentClass || '');
    if (svg) {
      attr(svg,'class',next.iconClass || ''); attr(svg,'width',next.iconSize || 16); attr(svg,'height',next.iconSize || 16);
      svg.style.color = next.iconColor || '';
    }
  }
  const labels = {idle:label, pending:'Working…', completed:'Done', failed:'Failed — try again', ...messages};
  function state(name) {
    const text = labels[name];
    attr(element,'aria-label',name === 'failed' ? `${label}: ${text}` : label);
    attr(element,'title',text); attr(element,'aria-busy',name === 'pending');
    attr(element,'aria-disabled',name === 'pending');
    attr(element,'data-tap-action-state',name);
    if (svg) { attr(path,'d',paths[name === 'idle' ? icon : name]); announcer.textContent = name === 'idle' ? '' : text; }
    else content.textContent = text;
  }
  style(appearance); state('idle');
  return {element, state, appearance:style, dispose() {element.remove();}};
}
