# Develop a site adapter

Use this subworkflow when a pack needs an unfamiliar site's UI, an existing adapter
lacks a needed capability, or the user asks to develop/revise a site UI library.
Return to the main pack workflow for packaging and installed checks.

## Start from the concrete operation

Translate the task into the smallest site contribution. For quick Copy on a post:
recognize the selected post, obtain its link representation, locate a place for an
action, and observe newly loaded/replaced posts. This does not require modeling
all of LinkedIn or designing a LinkedIn-specific Copy implementation.

Before adding code, inspect existing packs/adapters/UI providers in the available
repositories. Reuse or extend the relevant definitions and tests. A library named
for another site may contain general controls; inspect what it actually knows.
Do not copy its site-specific discovery into the general SDK.

## Observe before binding

Use the available browser tools and their documented API to inspect the actual
page, honoring the user's selected browser/tab. Examine the relevant DOM and the
site's existing links/actions. Do not guess current selectors, permalinks or site
API endpoints from memory. If the page cannot be accessed, make a synthetic example
or record what is missing, and explicitly leave live compatibility unverified.
Do not create a new login flow to compensate for an unavailable page.

Name the local meanings first: e.g. post identity, canonical link, action placement.
Then bind each to observed attributes, links, containers or page events. Keep the
site evidence with the adapter: which page/variant was inspected, the observation
date, and a minimal synthetic fixture reproducing the relevant structure. A short
module comment or existing test description is enough; no mandatory extra manifest.
Do not preserve personal feed text, credentials, signed URLs or whole-page dumps
in reusable fixtures. Preserve only the structure needed to test the binding.

If several links or actions are plausible, resolve the intended object before
choosing one. A feed container, tracking URL and canonical post URL are different
meanings. Normalization must follow the site/scenario policy; do not strip query
parameters merely because a URL looks cleaner. Missing identity or link means the
action is unavailable, not permission to copy a guessed/current-page URL.

## Compose the three parts

- The **site adapter** contributes objects, representations, placement and discovery.
  A path such as `adapters/linkedin.js` is sufficient until independent distribution
  is useful. Small functions over explicit inputs are enough; no per-site mega-class.
- The **feature** contributes the operation and its optional behavior. General
  `copy_link(link, clipboard)` stays unchanged. Resolving a link at each gesture
  avoids stale DOM/SPA state. Optional preparation does not imply publication.
- The **UI implementation** presents the action and its states using the available
  reusable controls. Keep site selectors out of generic controls and keep
  clipboard/network behavior out of site discovery.

The current SDK exports `copy_link`, `copy_with_preparation`, `select_link`,
`browser_clipboard` and `on_click`. It does **not** yet supply a generic mounted
button/state renderer or a universal site-observer API. Reuse an existing control
if available; otherwise write the smallest local presentation needed. Extract a
shared control when a concrete second consumer demonstrates reuse. Do not invent
SDK imports or claim that manual presentation code is generated from meanings.

For an existing reusable site library, preserve its callers; new capabilities
should extend the observed object/placement surface rather than absorb every
feature into the library. Module boundaries and pack/repository boundaries are
separate choices. The first adapter can ship inside its first feature pack.

## Verify the dynamic page and leave reusable knowledge

Exercise the built page script with a small synthetic reproduction of the site:
initial objects, later insertion, replacement/reuse of a container for another
object, changed href, and absent identity/link. Check repeated injection does not
multiply controls/listeners. If observers/listeners are introduced, expose cleanup
and exercise detach/remount; do not assume disabling a pack hot-unloads a classic
script from an already open page.

For Copy, check the exact selected URL and synchronous invocation during the user
gesture, plus missing link and clipboard refusal without a false success state.
Only add keyboard/focus/selection behavior if the scenario needs it; preserve
native text copying and site controls. User-facing injected controls need meaningful
labels and keyboard access. Use DOM construction rather than unsafe HTML strings
when compatible with the site's Trusted Types/CSP requirements.

Finally check the requested live page and a relevant dynamic transition when
available and authorized. Injection of a fixture script is not proof of delivery
through TAP: report the two separately. Record which variants remain untested.
Deliver the adapter alongside its feature, observation notes and runnable tests so
the next pack can discover and extend it without reopening the entire site study.
