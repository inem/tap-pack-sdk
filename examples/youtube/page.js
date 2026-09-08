import { copy_with_preparation } from 'tap-pack-sdk/copy';
import { browser_clipboard } from 'tap-pack-sdk/dom';
import { settings, video_link } from './policy.js';
import './vendor/youtube-ui.js';
import './vendor/youtube-copy-controls.js';
import './vendor/youtube-captions.js';
import './vendor/caption-status.js';

if (!window.__tapYoutubeCopyLinks) {
  const clipboard = browser_clipboard(navigator, document);
  const captionState = { lastCaptionRequest: null };
  const linkFor = entry => video_link(entry, settings);
  const state = window.__tapYoutubeCopyLinks = window.TapYouTubeCopyControls(window.YouTubeUI, {
    linkFor,
    copy(entry) {
      const prepare = settings.prepareCaptions && window.TapYouTubeCaptions
        ? () => window.TapYouTubeCaptions.request_captions(entry.id, {
            state: captionState, confirmSaved: window.TapYouTubeCaptionStatus,
            notify: message => window.YouTubeUI.showToast(message)
          }) : undefined;
      return copy_with_preparation(linkFor(entry), clipboard, prepare).copy;
    },
    copyText: text => clipboard.writeText(text)
  });
  state.setCaptionsEnabled = enabled => settings.prepareCaptions = !!enabled;
  Object.defineProperty(state, 'lastCaptionRequest', { get: () => captionState.lastCaptionRequest });
}
