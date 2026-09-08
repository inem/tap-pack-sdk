# Independent second-site authoring evaluation

Result: **passed** using SDK 0.1.0 as supplied. No SDK edits, packaging repairs, general operation duplication, downloads, profile installation, publication, or GitHub writes.

## Artifact and evidence

- `build-article/example.article-copy-0.1.0.tap-pack`
- Artifact SHA-256: `3f680f5fa973497b7089e3a39d4731590f35b9a79458db765c78ee2a01f977e1`
- Author inputs: `article-copy/tap-pack.json`, `article-copy/page.js`, `article-copy/LICENSE`.
- Generated provenance and validator evidence: `build-article/pack/BUILD.json`, `build-article/report.json`, `build-article/SHA256SUMS`.
- Core lifecycle evidence: `check.json` (isolated install, missing grants rejection, enable, disable, uninstall).
- Browser evidence: `browser-test.cjs`, `fixture.html`, `browser-results.json`, `browser-failure.png`.
- Input hashes and tool versions: `input-versions.json`, `build-article/pack/BUILD.json`, `browser-results.json`.

## What the author supplied

Read the supplied skill and README, inspected `src/copy.js` and `src/dom.js`, then ran `sdk.py init`. The fixture contract was necessarily chosen because the synthetic site had no provided HTML: exactly one selected article is an anchor with `data-article-selected="true"`. Relative hrefs resolve against the document base; query and fragment stay intact. The pack appends its own button to the body.

Hand-written browser glue is 28 lines: choose the selector; mount a button after DOM readiness; mark Copying while pending; disable concurrent presses; display success only when the SDK operation resolves; handle duplicate script injection. All selection resolution, URL normalization, copy operation, browser clipboard fallback, and delegated click handling reuse documented SDK imports. `intent` was written for documentation; it does not generate behavior. The synthetic fixture and browser test were also hand-written.

## Checks actually run

Bun 1.3.11 built the bundle and Core validated it. Core checkout was `b7c3cdd6d6a135f1e6aee440014b6f9c6e01fe1e`. Python version and exact SDK hashes are recorded in `input-versions.json`.

Chrome 152.0.7977.76 / Playwright 1.62.1 / Node v24.19.0 executed the generated `build-article/pack/page.js`, with every page request locally fulfilled and service workers blocked. Seven cases passed: initial selected URL, subsequent href mutation, selection change, rejected clipboard API plus unsuccessful fallback, missing href, duplicate injection, and clipboard invocation during user activation. Actual attempted strings and the final failure text are in `browser-results.json`; no page errors occurred.

The first Chrome launch aborted in the restricted shell. The same test passed with approved execution outside that sandbox using a disposable profile. This was environment friction, not an SDK defect.

## Limits and concrete feedback

No live site, real system clipboard, Core page injection transport, proxy/trust setup, WS, video, network fetch, or publication was exercised. Browser success/failure bindings are controlled synthetic evidence.

No missing general-operation seam was demonstrated. The SDK starter expects the host page to provide its button, which is documented. This task required the pack to provide a button, so mounting and busy-state UI were authored. A small optional starter variant that mounts a button and sets a pending state would reduce this repeated author work; no new runtime protocol or abstraction is needed. The existing operation boundary worked for this independent article site without copying YouTube code.
