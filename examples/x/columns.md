# X columns and requested layout

User intent, 2026-09-09: remove the contents of the third/right column.
The supplied screenshot confirms Today's News, What's happening (trends), and
Who to follow as examples of the unwanted surface.

Model the site's layout independently of individual features:

| Surface | Meaning | Requested behavior |
|---|---|---|
| Navigation | Main site navigation and account entry points | Preserve |
| Primary content | Current timeline, selected post, replies or other selected view | Preserve |
| Secondary sidebar | Ancillary third-column content | Hide as one surface |

Bind these surfaces to actual containers, rather than English card titles.
The sidebar operation should have a dispose/restore path, cover DOM replacement
and SPA navigation, and avoid hiding dialogs or primary-content recommendations.
Do not stretch posts or redesign the remaining columns as an implicit side effect.
If search lives inside the sidebar, document that hiding the whole surface also
hides that instance; primary navigation remains available.

Implementation gate: the in-app X tab still shows the sign-in page. Captured
/home HTML is an application bootstrap, not rendered column markup. Therefore no
CSS selectors or authenticated live compatibility are claimed yet. Inspect the
logged-in page before binding and installing the hiding operation.
