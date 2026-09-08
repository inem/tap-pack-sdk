/** Resolve the selected representation at the gesture, never at page load. */
export function copy_link(link, clipboard) {
  try {
    const text = link();
    if (typeof text !== 'string' || !text) throw new Error('No link selected');
    // Synchronous invocation preserves transient browser activation.
    return Promise.resolve(clipboard.writeText(text));
  } catch (error) { return Promise.reject(error); }
}

/** Independent preparation can fail or be absent without changing Copy. */
export function copy_with_preparation(link, clipboard, prepare) {
  const copy = copy_link(link, clipboard);
  let preparation = Promise.resolve({ status: 'unavailable' });
  if (prepare) {
    try {
      preparation = Promise.resolve(prepare()).then(
        value => ({ status: 'completed', value }),
        error => ({ status: 'failed', error })
      );
    } catch (error) { preparation = Promise.resolve({ status: 'failed', error }); }
  }
  // "completed" only describes this callback; it does not mean locally saved.
  return { copy, preparation };
}
