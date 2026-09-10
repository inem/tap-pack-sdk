// Page-local observations, never permissions or trusted Core status.
// Providers return facts; any presentation can project the same snapshot.
const key = Symbol.for('tap.page.observations.v1');
export function context(scope) {
  if (!scope[key]) scope[key] = new Map();
  const sources = scope[key];
  return {
    provide(read) { const id = Symbol(); sources.set(id, read); return () => sources.delete(id); },
    snapshot() {
      return [...sources.values()].flatMap(read => {
        try { const value = read(); return Array.isArray(value) ? value : []; }
        catch { return []; }
      });
    },
  };
}
