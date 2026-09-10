# TAP page observations v1

This contract lets an independently loaded page pack describe the features it
currently contributes to that document. It is page-local presentation material,
not a permission, capability grant, Core health signal, or command interface.

A provider registered with `context(window).provide(read)` returns the array
defined by `schema.json`. Every fact has a provider-local stable `id`, the
`feature` kind, and plain-text `label` and `value`. Providers own the meaning and
lifetime of their facts. Consumers may project a snapshot but must not infer
permissions or invoke behavior from it.

The registry address is `Symbol.for('tap.page.observations.v1')`. The SDK module
owns access to that address so packs do not need to manipulate the shared map.
`provide()` returns an unregister function. A throwing provider contributes no
facts to that snapshot. Providers and consumers can load, update, and dispose in
any order.
