export const settings = { format: 'short', prepareCaptions: true };
export function video_link(entry, settings) {
  return () => {
    if (settings.format === 'short') return 'https://youtu.be/' + entry.id;
    if (settings.format === 'original') return entry.url;
    throw new Error('Unknown link format');
  };
}
