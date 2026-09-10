import {copy_link} from 'tap-pack-sdk/copy';
import {browser_clipboard, select_link} from 'tap-pack-sdk/dom';
import {mount_action, action_button} from 'tap-pack-sdk/ui';

const key = '__tap_example.article-copy';
window[key]?.dispose();
let cleanup = () => {};
function start() {
const clipboard = browser_clipboard(navigator, document);
const link = select_link('a[data-article-selected="true"]', document);
// A text control in the synthetic article document, independent of LinkedIn's
// icon-button presentation. The marker anchors the action at the page's end.
const anchor = document.createElement('span');
document.body.append(anchor);
const mounted = mount_action({root:document.documentElement,
  targets:() => [document.body], resolve:() => ({key:'selected-article',anchor}),
  present:() => {
    const view = action_button(document, {label:'Copy article URL',
      messages:{pending:'Copying…',completed:'Copied',failed:'Copy failed'}});
    view.element.setAttribute('data-tap-copy-article','');
    return view;
  },
  run:() => copy_link(link, clipboard), resetAfter:0,
});
cleanup = () => {mounted.dispose(); anchor.remove();};
}
window[key] = {dispose() {document.removeEventListener('DOMContentLoaded',start); cleanup();}};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
