---
name: tap-pack-dev
description: Build and revise TAP packs using the TAP Pack SDK, existing Core contracts, reusable operations and installed artifact checks. Use for TAP page, reader, handler or command packs, not Codex plugins.
---

# Develop a TAP pack

Use the user's actual intended result and current TAP mechanics. A pack is a
unit of distribution; a small operation or optional behavior need not become a
separate pack, process or protocol.

Locate the SDK from `TAP_PACK_SDK` or the repository containing this skill
(`../../` from this skill directory). If installed as a copy elsewhere, read the
adjacent `sdk-location.txt`. Read its README for the exact commands and available
operations. Locate Core from `TAP_CORE_SOURCE`, the user-specified checkout, or the
installed TAP checkout; require an actual `tap_core/packs.py`, not an invented API.
These are author-tooling inputs, not setup instructions for end users.

## From intent to working pack

Identify the user gesture/result, selected object or material, representation,
site rules and available effect implementations. Keep optional preparation and
passive reuse of material separate from publication. Ask only for material gaps;
do not make the user specify an architecture or repeat an already stated scenario.

Inspect the relevant existing operation/example before implementing. General Copy
is `copy_link(link, clipboard)`, not `youtube.copy()`. Site code can provide the link
and independently contribute preparation. DOM/network/clipboard implementations
are the final bindings. Functional availability is not `access.capabilities`:
manifest capabilities are requested permissions and remain Core-owned.

When site recognition, link discovery, action placement or dynamic-page handling
is missing, use the [site-adapter subworkflow](references/site-adapter.md). It also
covers extending a reusable site UI library. Site knowledge belongs beside the
adapter and its fixtures, so later packs can reuse it; do not repeat a full site
investigation for every feature.

Use `sdk.py init` for a small page starter, or adapt an existing pack. Author
`tap-pack.json` and feature modules; `sdk.py build` generates resources, hashes,
order, final manifest, documentation and archive. Never hand-maintain those outputs.
Only package explicit runtime files/notices. Preserve license/provenance of reused
code. Keep names and imports local to the pack or documented SDK entrypoints.

For reader/handler/command roles reuse Core's **current executable contracts** and
reference packs. Read that role's source/docs as needed; do not guess stdin,
checkpoint, context paths, WS envelopes or credentials. The SDK currently packages
those roles but has no new protocol helper API. JS/TS is for browser behavior;
existing Python readers/handlers can stay Python. No mandatory Hub for plain Copy;
no separate login/account/connect subsystem for existing browser sessions.

Run the generated artifact through `sdk.py check`, then execute the feature on a
synthetic page/material using the **built script or installed files**. For an
optional feature, exercise both presence and absence/failure. For Copy, observe the
actual requested text after a DOM change and clipboard refusal, not just manifest
shape. Tests should verify the user's result, not generated wording. Keep fixtures
synthetic; live user data and service credentials do not belong in reports.

Report the artifact, exact input versions, checks actually passed and live checks
not performed. Store validation, browser fixture, installed transport and live site
are different evidence. System routing/trust and external publication require the
user's task authorization; a skill is not authorization. Do not add release-wide
gates to a bounded pack task.

## Feedback to the SDK

If packaging needs manual repair or a second site needs copies of general operation
code, identify the concrete missing seam. Fix a demonstrated tooling defect or
propose one small reusable operation. Do not add a universal DSL/registry merely
to accommodate an example. The SDK's current intent text generates documentation;
it does not yet compile an ontology into behavior. State that boundary honestly.
