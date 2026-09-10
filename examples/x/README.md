# X site-adapter investigation — 2026-09-09

Observed in existing **new TAP Core** capture, not legacy output:

- POST `/i/api/graphql/<operation-id>/HomeTimeline`: JSON, retained.
- POST `/i/api/graphql/<operation-id>/CreateBookmark`: JSON, retained;
  response has `data.tweet_bookmark_put`. Observed existing user traffic only;
  no bookmark operation was issued by this investigation.
- `/i/api/1.1/flow/timeline.json` and `/i/api/1.1/graphql/viewer_context.json`:
  observed responses have empty Content-Type, so Core omits body (`media_type`).
  Do not assume what these bodies contain or loosen capture globally.
- Badge counts, ExploreSidebar and live-pipeline subscription maintenance also
  appear. They are not necessary dependencies of quick Copy.

`adapters/traffic.js` projects only the observed HomeTimeline item shape. It
separates top-level post identity from quoted identity and preserves unknown
bookmark state. Legacy full_text is not promised to be complete note/article text.
It deliberately does not guess cursor behavior, new endpoint operation IDs,
permalinks, mutations, deleted/unavailable wrappers or promotional classification.
Two synthetic tests pass; no personal feed material or credentials in fixtures.

## UI composition verified on an authenticated page

`x.ui` 0.4.1 uses the existing SDK `copy_link`, `mount_action` and state feedback.
Its site adapter supplies the actual post's timestamp permalink, owned action row
and native presentation peer. The row exposes separate link and Markdown actions;
the Markdown operation first resolves the matching Tweet model from the card's
React fiber, then from passively observed `HomeTimeline` responses. It performs no
request or UI transition on a hit; deferred **Show more** remains a miss fallback. Quoted-card
identity stays scoped to the nearest post
article. Bookmark remains a separate native action; no guessed request client was
added.

Authenticated live verification covered installed delivery, one action per post,
native-row geometry, Share-menu deduplication and infinite-scroll insertion. See
`docs/results/x-copy-links-live-2026-09-09.json`. Clipboard readback was unavailable
for both the pack action and X's native Copy link in the automation bridge, so the
shared SDK clipboard contract remains the behavioral boundary for that final write.
The 0.3.0 verification is recorded in
`docs/results/x-copy-markdown-live-2026-09-09.json`.
Native expansion before Markdown projection is verified for 0.3.1 in
`docs/results/x-copy-markdown-show-more-live-2026-09-09.json`.
That same-click version was superseded after a manual paste exposed stale text.
The deferred 0.3.3 acceptance is in
`docs/results/x-copy-markdown-show-more-deferred-live-2026-09-09.json`.
