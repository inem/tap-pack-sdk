# TAP Pack SDK — first authoring slice

Write the feature; generate TAP's packaging. This SDK emits the existing pack API 1,
uses Core's validator/archive builder/store, and introduces no runtime service or
alternate permissions protocol. It is developer tooling, not an end-user prerequisite.

Requirements: Python 3.9+, a TAP Core source/installed checkout, Bun **1.3.11** for
browser builds. Reader/handler/command-only packaging does not need the bundler.
The reference validation target is Core `61af290f136a8dfa538a49e39ce9360f21205d0f`
(the review branch `b7c3cdd` has the same pack validator/store). No package downloads.

## Start

```sh
export TAP_CORE_SOURCE=/absolute/path/to/tap-core
python3 /absolute/path/to/tap-pack-sdk/sdk.py init ./article-copy \
  --id example.article-copy --origin https://articles.example
```

The generated page expects `a[data-copy-source]` and a `[data-copy-link]` button.
Change the selectors/representation to the actual site and describe the result in
`tap-pack.json`. The starter is executable, not a universal site adapter.

```sh
python3 /absolute/path/to/tap-pack-sdk/sdk.py build ./article-copy --out ./build-article
python3 /absolute/path/to/tap-pack-sdk/sdk.py check ./build-article/example.article-copy-0.1.0.tap-pack
```

Use a new output directory for each build. Outputs: validated `pack/`, deterministic
`.tap-pack`, `SHA256SUMS`, `report.json`. Packaging includes generated README, byte
provenance and SDK license. `check` uses a temporary Core PackStore and synthetic
profile: install, denied missing grants, enable, disable, uninstall. No proxy/Hub
starts, no system settings change, no pack code executes. Feature and live delivery
checks remain distinct.

## What the author owns

`tap-pack.json` is **author input**, not a new runtime contract:

```json
{
  "id": "example.article-copy",
  "version": "0.1.0",
  "intent": "Copy the selected article link in one click.",
  "license": "MIT",
  "page": "page.js",
  "files": ["LICENSE"],
  "access": {"origins": ["https://articles.example"], "capabilities": ["page.inject"]}
}
```

`page` is one JS/TS entry. Explicit local imports and the SDK modules are bundled
into one classic browser script supported by today's TAP. Author modules do not
need globals, resource IDs, hashes or a manually ordered `uses` list. Vendor any
additional reviewed browser dependencies with their notices; bare external imports
are rejected. Core generates/validates the final artifact. Native ESM activation
is not assumed. Bun's [bundler](https://bun.com/docs/bundler) and
[plugin API](https://bun.sh/docs/bundler/plugins) provide the build step.

`files` lists additional runtime files and notices (never a whole-directory glob).
Generated `pack.json`, `page.js`, `BUILD.json`, `README.md`, `SDK-LICENSE` are reserved.
Source `page.js` is bundled, not included in `files`. JSON rejects duplicate/unknown
fields. Source imports are confined to the pack and SDK source directories.

For non-page roles, omit `page` and use the existing Core `entrypoints`, `files`,
`config` and `requires` shapes. `requires` defaults to API 1/no dependencies; `config`
to empty. For example reader entrypoint: `{"reader":{"file":"reader.py",
"interface":"python-jsonl-v1"}}`, files `reader.py` and LICENSE, capability
`capture.read`. The builder does not invent reader acknowledgement or handler RPC:
read the current Core `docs/readers.md`, `docs/pack-lifecycle.md` and executable
examples for the role. Undeclared entry files and missing capabilities fail Core
validation. Dependency bundles and unsupported host roles may build but fail `check`;
that failure is not a successful installable pack.

## Small operations

```js
import { copy_link, copy_with_preparation } from 'tap-pack-sdk/copy';
import { select_link, browser_clipboard, on_click } from 'tap-pack-sdk/dom';
```

- `copy_link(linkThunk, clipboard)` resolves a representation at the gesture and
  calls `clipboard.writeText` synchronously before awaiting. Returns a promise.
- `select_link(selector, root, represent?)` produces that thunk from current DOM;
  href changes are seen on the next click. The optional pure representation policy
  receives the resolved URL. Other sources can supply their own thunk.
- `browser_clipboard(navigator, document)` binds the browser API/fallback. Copy
  itself knows nothing about DOM, YouTube, WS, captions or network.
- `copy_with_preparation(link, clipboard, prepare?)` returns **separate** `copy`
  and `preparation` promises. Callback completion is not proof of local capture.
  Preparation runs independently even if clipboard fails; use this only when that
  is the scenario's intended policy. It never publishes to a downstream service.
- `on_click(root, selector, action, report?)` delegates clicks across DOM replacement
  and returns a teardown function. An async failure reports `failed`, not success.

Keep the user's intent, selected representation, site policy and optional
preparation distinct. This is a small executable operation seam, **not a completed
ontology compiler**. `intent` currently projects to documentation, not behavior.
Do not disguise new handwritten glue as generated semantic composition.

## YouTube reference

`examples/youtube` adapts the existing PR #3 controls/caption path. Its vendor files
are preserved byte-for-byte from `inem/tap-pack-youtube-copy-links` at `4e2e11b`
(see vendor/PROVENANCE.md and generated BUILD.json hashes). They belong to the
example, not the general SDK. Core and the external subtitle reader/handler are
unchanged. Settings are page-local; no fictitious Core page-config API.

The existing XML/JSON3/VTT-to-Döpo compatibility gap is not fixed by packaging:
HTTP success means fetched, saved requires matching evidence, Döpo publication
requires the separate user action. Public YouTube/CSP/trust delivery must be checked
separately. The build does not close those existing live tasks.

## Skill

The maintained skill is `skills/tap-pack-dev/SKILL.md`. It takes this SDK directory
and a Core checkout as tooling inputs. Use it to create a pack from a concrete user
scenario, rather than author manifests/protocols from memory.

## Verified second site and repeatable checks

`examples/articles` was authored by an independent agent given only this skill,
SDK and a concrete article-copy task. It imports the same operations unchanged;
its code only mounts a control, selects the current article and presents the result.
Seven Chrome checks passed, including changed href/selection, clipboard refusal,
missing href, duplicate injection and synchronous activation. See `evidence/`.
No real clipboard or public site was used. The author suggested an optional
mounted-button starter, not another operation framework.

```sh
bun test tests/copy.test.js
TAP_CORE_SOURCE=/absolute/path/to/tap-core python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 sdk.py build examples/youtube --out dist/youtube
python3 sdk.py build examples/articles --out dist/articles
python3 sdk.py check dist/youtube/example.sdk-youtube-copy-0.1.0.tap-pack
python3 sdk.py check dist/articles/example.article-copy-0.1.0.tap-pack
node tests/youtube-browser.cjs /absolute/path/to/playwright /absolute/path/to/chrome dist/youtube/pack
node tests/articles-browser.cjs /absolute/path/to/playwright /absolute/path/to/chrome dist/articles
```

Browser test dependencies are explicit developer tooling. The scripts fulfill all
requests from local fixtures; they do not contact the public example sites. Output
paths must be fresh for builds. Browser reports/screenshots are test artifacts,
not pack files.
