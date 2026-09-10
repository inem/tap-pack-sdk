# Site UI libraries

A feature supplies an action over material. A site library supplies the selected
object, an action slot and the site's presentation. The SDK mounts the action,
tracks replacement and presents completion/failure. These are module boundaries;
they do not imply separate packs or repositories.

```js
import {mount_action} from 'tap-pack-sdk/ui';
const ui = mount_action({root: document.documentElement,
  ...post_actions(document, {label:'Copy post link', icon:'link'}),
  run: post => copy_link(() => post.link, clipboard),
});
// On removal/reinjection:
ui.dispose();
```

`post_actions` above is a **site-provided function**, not an SDK export. LinkedIn's
implementation lives in the LinkedIn pack's `adapters/linkedin-ui.js`. It takes
an action presentation; it does not implement copying. Other actions can use the
same post/slot knowledge without changing this library.

## Executable surface

`mount_action({root, targets, resolve, present, run, attributes=[], resetAfter=1600})`

- `targets()` returns iterable DOM objects; `resolve(object)` returns null when
  unavailable, otherwise `{key, anchor, ...material}`. Key is the semantic identity;
  anchor is a connected sibling before which to insert the action. Several actions
  can share an anchor; an unrelated inserted sibling does not force remounting. Resolve again at
  the gesture so recycled cards cannot act on stale material.
- `present(binding)` returns `{element, state(name), dispose(), sync?(binding)}`.
  It owns only its generated DOM; `sync` can refresh live presentation classes.
  It must not install another action listener. State is idle/pending/completed/failed.
- `run(binding,event,signal)` is called synchronously in the click, preserving browser
  user activation. Repeated gestures while pending are ignored. An action's promise
  completion updates only its still-mounted view. The optional third argument is an AbortSignal, aborted on replacement/disposal;
  an asynchronous adapter must check it before any later effect. Disposal removes listeners,
  timers, controls and the observer; it does not undo an already-started effect.
- Relevant DOM mutations trigger a coalesced refresh. Pass site-specific attribute
  names in `attributes`; `refresh()` also supports explicit site events. One observer
  per mount is appropriate for the current small slices, not a claim of an
  optimized observer bus for arbitrarily many packs.
- `resetAfter:0` retains completion/error until another action. Otherwise success state
  resets after the configured milliseconds; errors remain until retry without changing object identity.

`action_button(document, {label, icon?, messages?, appearance?})` is a view factory.
Without an icon it renders text. Currently `icon:'link'` selects a small original
stroke symbol; pending/check/error symbols share its footprint. Labels and feedback
remain feature-owned. The button supports keyboard activation, a stable accessible
name, busy state and live feedback. `appearance` is an explicit presentation binding:
`{buttonClass, contentClass, iconClass, iconSize, iconColor}`. `iconColor` keeps an
owned SVG visible when a borrowed site class overrides inherited text color.
`view.appearance(next)` updates the binding.
No site palette or generated CSS names are baked into the SDK.

A native reference is **not cloned**. Site code may borrow observed presentation
classes onto an owned button/span/SVG. It must not carry over IDs, component keys,
menu ARIA state, links, handlers, or tracking attributes. Runtime classes are a
compatibility dependency: retain semantic lookup and validate actual behavior.
A different site may supply its own view instead of using `action_button`.

## Develop the next site library

1. Start with a result and object: e.g. copy this post's link. Discover existing
   operations and site libraries before investigating the whole site again.
2. Inspect the live peer control and its container: slot, structure, computed
   geometry, theme source, hover/focus, disabled/busy behavior and narrow layout.
   A working click is insufficient evidence of native integration.
3. Bind local meanings (post/link/action slot/presentation) to observed DOM or
   captured material. Keep feature logic and site presentation separate. Use the
   site's stable tokens/classes when available; otherwise derive the minimum
   presentation from a semantically located live peer. Avoid hardcoded hash names.
4. Keep a synthetic fixture beside the library, preserving structure and states,
   not private content. Unknown identities/unsupported variants must not acquire
   guessed actions. Record the observed variant and material gaps locally.
5. Execute the **built** pack: replacement, detach/reinjection, missing material,
   success/failure, keyboard and an in-flight action during object replacement.
   Compare the real site's native action destination when possible. Inspect the
   rendered control alongside its native neighbor, including focus and layout.
6. A second consumer determines the shared part. Extract demonstrated common
   behavior; leave site-specific presentation in its library. Save new knowledge
   once so the next feature extends it instead of repeating the investigation.

Keep these steps proportional: a module comment plus a fixture/evidence result is
usually enough. No additional manifest, ontology registry or per-site skill is
required. This process does not automatically infer a complete UI library for an
arbitrary website.

## Current evidence and boundaries

LinkedIn uses an initial SDUI post identity and its menu slot; borrowed button/span/
SVG classes replace the old handwritten pill. The articles example exercises the
same mount/state machinery with a text view and changing selected links. Its
`tests/articles-ui-fixture.html` is runnable with the built `pack/page.js` beside it.

The existing YouTube reference remains byte-for-byte vendored: its player control
uses `ytp-button`, engagement controls use YouTube CSS variables and different
placement. Those are site presentation choices. Its mount methods also own insertion
and listeners, so adopting this mechanism requires splitting that ownership; it
has **not** been silently migrated or counted as a verified third consumer.

Known limits: LinkedIn pagination's new identities remain unsupported; only the
observed SDUI feed variant is covered. Dark mode has not been live-verified. Native
classes inheriting a theme are not themselves proof of dark-mode compatibility.
