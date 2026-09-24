(function(){
  'use strict';
  window.TapYouTubeCopyControls = function(UI, actions){
  var state = {};
  var COPY_PATH = 'M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z';
  var CHECK_PATH = 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z';
  var ERROR_PATH = 'm6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5z';
  var LOAD_PATH = 'M11 4h2v9l3.5-3.5 1.4 1.4L12 16.8l-5.9-5.9 1.4-1.4L11 13V4zm-5 15h12v2H6v-2z';
  var COPY_ALL_PATH = 'M7 2h10v2H7V2zM4 6h16v2H4V6zm2 4h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zm0 2v8h12v-8H6z';
  var SUBS_PATH = 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 14H4V6h16v12zM6 11h4v2H6v-2zm6 0h6v2h-6v-2z';
  var LATER_PATH = 'M12 2a10 10 0 1 0 .001 0zM12.5 7H11v6l4.7 2.8.8-1.3-4-2.4V7z';

  function icon(pathData) {
    var namespace = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'display:block;pointer-events:none';
    var path = document.createElementNS(namespace, 'path');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('d', pathData);
    svg.appendChild(path);
    return svg;
  }

  function compactWatchIcon(pathData) {
    var svg = icon(pathData);
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.style.setProperty('width', '24px', 'important');
    svg.style.setProperty('height', '24px', 'important');
    return svg;
  }

  function compactWatchButtonStyle() {
    return 'width:36px;height:36px;padding:0;border:0;border-radius:18px;background:#fff;color:#0f0f0f;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;margin-inline:4px;flex:0 0 36px;white-space:nowrap;box-shadow:0 0 0 1px rgba(0,0,0,.35)';
  }

  function embedButtonStyle() {
    return 'width:36px;height:36px;padding:0;border:0;border-radius:18px;background:#fff;color:#0f0f0f;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;box-shadow:0 2px 12px rgba(0,0,0,.35),0 0 0 1px rgba(0,0,0,.24)';
  }

  function flash(button, stateName, message) {
    if (!button) return;
    clearTimeout(button.__tapFlashTimer);
    if (!button.__tapCopyLabel) button.__tapCopyLabel = button.getAttribute('aria-label') || 'Copy link';
    button.dataset.state = stateName;
    UI.setButtonIcon(button, icon(stateName === 'success' ? CHECK_PATH : ERROR_PATH));
    button.setAttribute('aria-label', message);
    button.title = message;
    button.__tapFlashTimer = setTimeout(function(){
      delete button.dataset.state;
      UI.setButtonIcon(button, icon(COPY_PATH));
      button.setAttribute('aria-label', button.__tapCopyLabel);
      button.title = button.__tapCopyLabel;
    }, 1100);
  }

  function cookieValue(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  function sidHash(sapisid) {
    var ts = Math.floor(Date.now() / 1000);
    return crypto.subtle.digest('SHA-1', new TextEncoder().encode(ts + ' ' + sapisid + ' ' + location.origin)).then(function(bytes){
      var hex = Array.from(new Uint8Array(bytes), function(b){ return b.toString(16).padStart(2, '0'); }).join('');
      return ts + '_' + hex;
    });
  }

  var BUFFER_ID = 'PLbagoXZg_pCU';
  var LATER_ID = 'WL';

  function youtubeHeaders(hash, get) {
    var headers = {
      'content-type': 'application/json',
      authorization: 'SAPISIDHASH ' + hash,
      'x-origin': location.origin,
      'x-goog-authuser': '0',
      'x-goog-pageid': String(get('DELEGATED_SESSION_ID') || '')
    };
    var clientName = get('INNERTUBE_CONTEXT_CLIENT_NAME');
    var clientVersion = get('INNERTUBE_CONTEXT_CLIENT_VERSION');
    if (clientName) headers['x-youtube-client-name'] = String(clientName);
    if (clientVersion) headers['x-youtube-client-version'] = String(clientVersion);
    return headers;
  }

  function playlistContains(text, playlistId) {
    var at = text.indexOf('"playlistId":"' + playlistId + '"');
    if (at < 0) return false;
    return text.slice(at, at + 400).indexOf('"containsSelectedVideos":"ALL"') >= 0;
  }

  function addToPlaylist(entry, playlistId, toast) {
    var config = window.ytcfg;
    var get = config && typeof config.get === 'function' ? function(key){ return config.get(key); } : function(){ return null; };
    var key = get('INNERTUBE_API_KEY');
    var context = get('INNERTUBE_CONTEXT');
    var sapisid = cookieValue('SAPISID') || cookieValue('__Secure-3PAPISID');
    if (!key || !context || !sapisid || !entry || !entry.id) return;
    return sidHash(sapisid).then(function(hash){
      var headers = youtubeHeaders(hash, get);
      return fetch('/youtubei/v1/playlist/get_add_to_playlist?key=' + encodeURIComponent(key) + '&prettyPrint=false', {
        method: 'POST',
        credentials: 'same-origin',
        headers: headers,
        body: JSON.stringify({ context: context, videoIds: [entry.id] })
      }).then(function(response){
        return response.text().then(function(text){
          if (playlistContains(text, playlistId)) return null;
          return fetch('/youtubei/v1/browse/edit_playlist?key=' + encodeURIComponent(key) + '&prettyPrint=false', {
            method: 'POST',
            credentials: 'same-origin',
            headers: headers,
            body: JSON.stringify({
              context: context,
              playlistId: playlistId,
              actions: [{ action: 'ACTION_ADD_VIDEO', addedVideoId: entry.id }]
            })
          });
        });
      });
    }).then(function(response){
      if (!response) return;
      return response.text().then(function(text){
        if (response.ok && text.indexOf('playlistEditVideoAddedResultData') >= 0) UI.showToast(toast);
      });
    }).catch(function(){});
  }

  function copyEntry(entry, button) {
    addToPlaylist(entry, BUFFER_ID, 'Added to Buffer');
    var copied = actions.copy(entry);
    copied.then(
      function(){
        UI.flashVideoTarget(entry);
        UI.showToast('Link copied');
        flash(button, 'success', 'Link copied');
      },
      function(){
        UI.showToast('Copy failed · try again');
        flash(button, 'error', 'Copy failed · try again');
      }
    );
  }

  function mountCard(entry) {
    var button = UI.addVideoCardAction(entry, {
      id: 'tap-copy-link',
      icon: icon(COPY_PATH),
      title: 'Copy video URL ' + actions.linkFor(entry)(),
      ariaLabel: 'Copy video URL ' + actions.linkFor(entry)(),
      onClick: function(current, event, button) {
        copyEntry(current, button);
      }
    });
    if (button) button.__tapCopyLabel = 'Copy video URL ' + actions.linkFor(entry)();
    var subs = UI.addVideoCardAction(entry, {
      id: 'tap-copy-subs',
      icon: icon(SUBS_PATH),
      title: 'Copy subtitles',
      ariaLabel: 'Copy subtitles',
      onClick: function(current, event, subsButton) {
        copySubtitles(current, subsButton);
      }
    });
    UI.addVideoCardAction(entry, {
      id: 'tap-watch-later',
      icon: icon(LATER_PATH),
      title: 'Watch later',
      ariaLabel: 'Watch later',
      onClick: function(current, event, laterButton) {
        saveWatchLater(current, laterButton);
      }
    });
    return button;
  }

  function saveWatchLater(entry, button) {
    if (button) {
      button.__tapCopyLabel = 'Watch later';
      UI.setButtonIcon(button, icon(LOAD_PATH));
    }
    var pending = addToPlaylist(entry, LATER_ID, 'Added to Watch Later');
    if (!pending) return;
    pending.then(function(){
      if (!button) return;
      UI.setButtonIcon(button, icon(CHECK_PATH));
      button.setAttribute('aria-label', 'Watch later');
      button.title = 'Watch later';
    }, function(){});
    setTimeout(function(){
      if (button && button.isConnected) UI.setButtonIcon(button, icon(LATER_PATH));
    }, 1100);
  }

  function isPlaylistPage() {
    return location.pathname.indexOf('/playlist') === 0;
  }

  function entries() {
    return UI.getVideoEntries(document, { unique: true });
  }

  function actionButton(id) {
    var element = UI.getElement(id);
    if (!element) return null;
    return element.matches && element.matches('button') ? element : element.querySelector('button');
  }

  function clearLegacyMastheadButtons() {
    ['tap-youtube-load-all', 'tap-youtube-copy-all'].forEach(function(id){
      var element = UI.getElement(id);
      if (element && !element.dataset.youtubeUiPlaylistAction) UI.removeElement(id);
    });
  }

  function syncCollectionActions() {
    clearLegacyMastheadButtons();
    if (!isPlaylistPage()) {
      UI.removeElement('tap-youtube-load-all');
      UI.removeElement('tap-youtube-copy-all');
      return;
    }

    UI.addPlaylistAction({
      id: 'tap-youtube-copy-all',
      icon: icon(COPY_ALL_PATH),
      title: 'Copy all loaded video links (' + entries().length + ')',
      ariaLabel: 'Copy all loaded video links (' + entries().length + ')',
      onClick: function(event, button){ copyAll(button); }
    });
    UI.addPlaylistAction({
      id: 'tap-youtube-load-all',
      icon: icon(LOAD_PATH),
      title: 'Load every video in this playlist',
      ariaLabel: 'Load every video in this playlist',
      onClick: function(event, button){ loadAll(button); }
    });

    var copyButton = actionButton('tap-youtube-copy-all');
    if (copyButton) {
      var count = entries().length;
      copyButton.title = 'Copy all loaded video links (' + count + ')';
      copyButton.setAttribute('aria-label', 'Copy all loaded video links (' + count + ')');
    }
    var loadButton = actionButton('tap-youtube-load-all');
    if (loadButton && !state.loading) {
      loadButton.title = 'Load every video in this playlist';
      loadButton.setAttribute('aria-label', 'Load every video in this playlist');
    }
  }

  async function loadAll(button) {
    if (state.loading) return;
    state.loading = true;
    button = button || actionButton('tap-youtube-load-all');
    if (button) {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.setAttribute('aria-busy', 'true');
      button.title = 'Loading every video in this playlist…';
      button.setAttribute('aria-label', button.title);
    }
    var previousHeight = 0;
    var previousCount = 0;
    var stable = 0;

    for (var iteration = 0; iteration < 500 && stable < 4 && isPlaylistPage(); iteration++) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' });
      await new Promise(function(resolve){ setTimeout(resolve, 1000); });
      var count = entries().length;
      var height = document.documentElement.scrollHeight;
      UI.showToast('Loaded ' + count + ' videos…', {
        id: 'tap-youtube-progress', duration: 0
      });
      if (height === previousHeight && count === previousCount) stable++;
      else stable = 0;
      previousHeight = height;
      previousCount = count;
    }

    state.loading = false;
    var loadedCount = entries().length;
    UI.showToast('Loaded ' + loadedCount + ' videos', {
      id: 'tap-youtube-progress', duration: 1800
    });
    if (button && button.isConnected) {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.setAttribute('aria-disabled', 'false');
      UI.setButtonIcon(button, icon(CHECK_PATH));
      button.title = 'Loaded ' + loadedCount + ' videos';
      button.setAttribute('aria-label', button.title);
      setTimeout(function(){
        if (!button.isConnected) return;
        UI.setButtonIcon(button, icon(LOAD_PATH));
        syncCollectionActions();
      }, 1200);
    }
  }

  function copyAll(button) {
    var all = entries();
    var text = all.map(function(entry){ return actions.linkFor(entry)(); }).join('\n');
    if (!text) {
      UI.showToast('No video links found');
      if (button) {
        UI.setButtonIcon(button, icon(ERROR_PATH));
        setTimeout(function(){ if (button.isConnected) UI.setButtonIcon(button, icon(COPY_ALL_PATH)); }, 1200);
      }
      return;
    }
    actions.copyText(text).then(
      function(){
        UI.showToast('Copied ' + all.length + ' video links');
        if (button) UI.setButtonIcon(button, icon(CHECK_PATH));
        restoreCopyAll(button);
      },
      function(){
        UI.showToast('Copy failed');
        if (button) UI.setButtonIcon(button, icon(ERROR_PATH));
        restoreCopyAll(button);
      }
    );
  }

  function restoreCopyAll(button) {
    setTimeout(function(){
      if (!button || !button.isConnected) return;
      UI.setButtonIcon(button, icon(COPY_ALL_PATH));
      syncCollectionActions();
    }, 1200);
  }

  function mountCurrentPage() {
    var id = UI.getVideoId(location.href);
    if (!id) return null;
    var entry = {
      id: id,
      url: location.href,
      shortUrl: 'https://youtu.be/' + id,
      element: document.documentElement,
      host: document.documentElement
    };
    if (location.pathname.indexOf('/embed/') === 0) return mountEmbedPlayer(entry);
    var options = {
      id: 'tap-copy-current-video',
      icon: icon(COPY_PATH),
      title: 'Copy video URL ' + actions.linkFor(entry)(),
      ariaLabel: 'Copy video URL ' + actions.linkFor(entry)(),
      onClick: function(current, event, button){ copyEntry(current, button); }
    };
    var button = location.pathname.indexOf('/shorts/') === 0
      ? UI.addShortsAction(entry, options)
      : UI.addWatchVideoAction(entry, options);
    if (button) button.__tapCopyLabel = options.ariaLabel;
    seatWatchSubs(entry);
    seatWatchLater(entry);
    return button;
  }

  function mountEmbedPlayer(entry) {
    var copy = UI.addPlayerButton({
      id: 'tap-copy-current-video',
      icon: icon(COPY_PATH),
      title: 'Copy video URL ' + actions.linkFor(entry)(),
      ariaLabel: 'Copy video URL ' + actions.linkFor(entry)(),
      onClick: function(event, button){ copyEntry(entry, button); }
    });
    if (copy) copy.__tapCopyLabel = 'Copy video URL ' + actions.linkFor(entry)();
    var subs = UI.addPlayerButton({
      id: 'tap-copy-current-subs',
      icon: icon(SUBS_PATH),
      title: 'Copy subtitles',
      ariaLabel: 'Copy subtitles',
      onClick: function(event, button){ copySubtitles(entry, button); }
    });
    var later = UI.addPlayerButton({
      id: 'tap-watch-later-current',
      icon: icon(LATER_PATH),
      title: 'Watch later',
      ariaLabel: 'Watch later',
      onClick: function(event, button){ saveWatchLater(entry, button); }
    });
    [copy, subs, later].forEach(function(button) {
      if (!button) return;
      button.dataset.videoId = entry.id;
      button.style.setProperty('width', '36px', 'important');
      button.style.setProperty('height', '100%', 'important');
      button.style.setProperty('padding', '0 6px', 'important');
    });
    return copy || subs || later;
  }

  function isEmbedFrame(frame) {
    if (!frame || !frame.src) return false;
    var id = UI.getVideoId(frame.src);
    if (!id) return false;
    try {
      return /(^|\.)youtube(-nocookie)?\.com$/.test(new URL(frame.src, location.href).hostname);
    } catch (_) {
      return false;
    }
  }

  function embedEntry(frame) {
    var id = UI.getVideoId(frame.src);
    if (!id) return null;
    return {
      id: id,
      url: 'https://www.youtube.com/watch?v=' + id,
      shortUrl: 'https://youtu.be/' + id,
      element: frame,
      host: frame
    };
  }

  function embeddedControl(id, pathData, title, handler) {
    var button = document.createElement('button');
    button.type = 'button';
    button.dataset.tapYoutubeEmbedButton = id;
    button.appendChild(compactWatchIcon(pathData));
    button.title = title;
    button.setAttribute('aria-label', title);
    button.style.cssText = embedButtonStyle();
    button.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      handler(button);
    }, true);
    return button;
  }

  function mountEmbeddedFrame(frame) {
    if (!isEmbedFrame(frame)) return;
    var entry = embedEntry(frame);
    if (!entry) return;
    var host = frame.parentElement || document.body;
    if (!host || !host.style) return;
    var style = getComputedStyle(host);
    if (style.position === 'static') host.style.position = 'relative';

    var frameRect = frame.getBoundingClientRect();
    var hostRect = host.getBoundingClientRect();
    if (!frameRect.width || !frameRect.height) return;

    var rail = Array.from(host.querySelectorAll('[data-tap-youtube-embed-rail]'))
      .find(function(candidate){ return candidate.dataset.frameSrc === frame.src; });
    if (!rail) {
      rail = document.createElement('div');
      rail.dataset.tapYoutubeEmbedRail = '';
      rail.dataset.frameSrc = frame.src;
      rail.dataset.videoId = entry.id;
      rail.style.cssText = 'position:absolute;display:flex;gap:8px;align-items:center;z-index:2147483600;pointer-events:auto';
      rail.appendChild(embeddedControl('copy', COPY_PATH, 'Copy video URL ' + actions.linkFor(entry)(), function(button) {
        copyEntry(entry, button);
      }));
      rail.appendChild(embeddedControl('subs', SUBS_PATH, 'Copy subtitles', function(button) {
        copySubtitles(entry, button);
      }));
      if (window.ytcfg) {
        rail.appendChild(embeddedControl('later', LATER_PATH, 'Watch later', function(button) {
          saveWatchLater(entry, button);
        }));
      }
      host.appendChild(rail);
    }
    rail.dataset.videoId = entry.id;
    rail.style.left = Math.max(8, frameRect.left - hostRect.left + 10) + 'px';
    rail.style.top = Math.max(8, frameRect.top - hostRect.top + frameRect.height - 96) + 'px';
  }

  function mountEmbeddedIframes() {
    var frames = Array.from(document.querySelectorAll('iframe[src*="youtube.com/embed/"],iframe[src*="youtube-nocookie.com/embed/"]'));
    frames.forEach(mountEmbeddedFrame);
    document.querySelectorAll('[data-tap-youtube-embed-rail]').forEach(function(rail) {
      var found = frames.some(function(frame){ return frame.src === rail.dataset.frameSrc && frame.isConnected; });
      if (!found) rail.remove();
    });
  }

  function copySubtitles(entry, button) {
    addToPlaylist(entry, BUFFER_ID, 'Added to Buffer');
    if (button) UI.setButtonIcon(button, icon(LOAD_PATH));
    var pending = actions.copySubtitles(entry);
    pending.then(
      function(){
        UI.showToast('Subtitles copied');
        if (button) UI.setButtonIcon(button, icon(CHECK_PATH));
      },
      function(error){
        UI.showToast(subtitleErrorMessage(error));
        if (button) UI.setButtonIcon(button, icon(ERROR_PATH));
      }
    );
    setTimeout(function(){
      if (button && button.isConnected) UI.setButtonIcon(button, icon(SUBS_PATH));
    }, 1100);
  }

  function subtitleErrorMessage(error) {
    var message = String(error && error.message || error || '');
    if (message.indexOf('Handler is not granted') >= 0 || message.indexOf('handler_denied') >= 0) {
      return 'Subtitles access not granted here';
    }
    if (message.indexOf('bridge') >= 0) return 'Subtitles bridge unavailable';
    return 'No subtitles';
  }

  function watchSubsButton(entry) {
    var button = document.getElementById('tap-copy-current-subs');
    if (!button) {
      button = document.createElement('button');
      button.id = 'tap-copy-current-subs';
      button.type = 'button';
      button.appendChild(compactWatchIcon(SUBS_PATH));
      button.title = 'Copy subtitles';
      button.setAttribute('aria-label', 'Copy subtitles');
      button.style.cssText = compactWatchButtonStyle();
    }
    button.onclick = function(event){
      event.preventDefault();
      event.stopPropagation();
      var id = UI.getVideoId(location.href);
      copySubtitles(id ? {
        id: id,
        url: location.href,
        shortUrl: 'https://youtu.be/' + id,
        element: entry.element,
        host: entry.host
      } : entry, button);
    };
    return button;
  }

  function seatWatchSubs(entry) {
    if (location.pathname !== '/watch' || !entry) return;
    var actionsRoot = document.querySelector('ytd-watch-metadata #actions');
    if (!actionsRoot) return;
    var nodes = [];
    function collect(root) {
      var found = root.querySelectorAll('button, [role="button"]');
      for (var n = 0; n < found.length; n++) nodes.push(found[n]);
      var hosts = root.querySelectorAll('*');
      for (var h = 0; h < hosts.length; h++) if (hosts[h].shadowRoot) collect(hosts[h].shadowRoot);
    }
    collect(actionsRoot);
    var copySlot = null;
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.id === 'tap-copy-current-subs') continue;
      var label = (node.innerText || node.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      if (label === 'Copy' || label.indexOf('Copy video') === 0 || label === 'Копировать') {
        copySlot = node.closest('yt-button-view-model, ytd-button-renderer') || node;
        break;
      }
    }
    if (!copySlot || !copySlot.parentElement) return;
    var subs = watchSubsButton(entry);
    subs.dataset.videoId = entry.id;
    if (subs.previousElementSibling !== copySlot) copySlot.parentElement.insertBefore(subs, copySlot.nextSibling);
  }

  function watchLaterButton(entry) {
    var button = document.getElementById('tap-watch-later-current');
    if (!button) {
      button = document.createElement('button');
      button.id = 'tap-watch-later-current';
      button.type = 'button';
      button.appendChild(compactWatchIcon(LATER_PATH));
      button.title = 'Watch later';
      button.setAttribute('aria-label', 'Watch later');
      button.style.cssText = compactWatchButtonStyle();
    }
    button.onclick = function(event){
      event.preventDefault();
      event.stopPropagation();
      var id = UI.getVideoId(location.href);
      saveWatchLater(id ? {
        id: id,
        url: location.href,
        shortUrl: 'https://youtu.be/' + id,
        element: entry.element,
        host: entry.host
      } : entry, button);
    };
    return button;
  }

  function seatWatchLater(entry) {
    if (location.pathname !== '/watch' || !entry) return;
    var subs = document.getElementById('tap-copy-current-subs');
    if (!subs || !subs.parentElement) return;
    var later = watchLaterButton(entry);
    later.dataset.videoId = entry.id;
    if (later.previousElementSibling !== subs) subs.parentElement.insertBefore(later, subs.nextSibling);
  }

  function compactNativeShare() {
    if (location.pathname !== '/watch') return;
    var actionsRoot = document.querySelector('ytd-watch-metadata #actions');
    if (!actionsRoot) return;
    var buttons = actionsRoot.querySelectorAll('button, [role="button"]');
    for (var i = 0; i < buttons.length; i++) {
      var button = buttons[i];
      var label = (button.getAttribute('aria-label') || button.textContent || '').replace(/\s+/g, ' ').trim();
      if (label !== 'Share' && label !== 'Поделиться') continue;
      button.style.setProperty('width', '40px', 'important');
      button.style.setProperty('min-width', '40px', 'important');
      button.style.setProperty('max-width', '40px', 'important');
      button.style.setProperty('height', '40px', 'important');
      button.style.setProperty('padding', '0', 'important');
      button.style.setProperty('border-radius', '20px', 'important');
      button.querySelectorAll('.ytSpecButtonShapeNextButtonTextContent').forEach(function(text) {
        text.style.setProperty('display', 'none', 'important');
      });
      button.querySelectorAll('yt-touch-feedback-shape, yt-light-shape').forEach(function(shape) {
        shape.style.setProperty('width', '40px', 'important');
        shape.style.setProperty('height', '40px', 'important');
      });
      return;
    }
  }

  function syncCurrentPage() {
    clearInterval(state.currentTimer);
    UI.removeElement('tap-copy-current-video');
    var subs = document.getElementById('tap-copy-current-subs');
    if (subs) subs.remove();
    var later = document.getElementById('tap-watch-later-current');
    if (later) later.remove();
    document.querySelectorAll('[data-youtube-ui-shorts-action="tap-copy-current-video"]')
      .forEach(function(element){ element.remove(); });
    var attempts = 0;
    mountCurrentPage();
    mountEmbeddedIframes();
    compactNativeShare();
    state.currentTimer = setInterval(function(){
      attempts++;
      mountCurrentPage();
      mountEmbeddedIframes();
      compactNativeShare();
      if (attempts >= 32) clearInterval(state.currentTimer);
    }, 50);
  }

  function isTextCopyContext(event) {
    var target = event.target;
    if (target && target.closest && target.closest(
      'input, textarea, [contenteditable="true"], [role="textbox"]'
    )) return true;
    var selection = window.getSelection && window.getSelection();
    return Boolean(selection && !selection.isCollapsed && String(selection).length);
  }

  function onCopyShortcut(event) {
    if (event.repeat || (!event.ctrlKey && !event.metaKey) || event.altKey || event.shiftKey) return;
    var key = String(event.key).toLowerCase();
    if (event.code !== 'KeyC' && key !== 'c' && key !== 'с') return;
    if (!state.hoveredEntry || isTextCopyContext(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    copyEntry(state.hoveredEntry, null);
  }

  var hotCard = null;
  function setCardActionsVisible(card, visible) {
    if (!card) return;
    Array.from(card.querySelectorAll('[data-youtube-ui-card-action]')).forEach(function(slot) {
      slot.style.setProperty('opacity', visible ? '1' : '0', 'important');
      slot.style.setProperty('pointer-events', visible ? 'auto' : 'none', 'important');
      if (visible) slot.style.setProperty('z-index', '30', 'important');
    });
  }
  function markHot(entry) {
    var next = null;
    if (entry && entry.id) {
      var slot = document.querySelector('[data-youtube-ui-card-action][data-video-id="' + entry.id + '"]');
      next = slot && slot.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, yt-lockup-view-model');
    }
    if (hotCard && hotCard !== next) {
      delete hotCard.dataset.tapCardHot;
      setCardActionsVisible(hotCard, false);
    }
    hotCard = next;
    if (next) {
      next.dataset.tapCardHot = '';
      setCardActionsVisible(next, true);
    }
  }

  state.stopCards = UI.onVideoCards(mountCard, { repeat: true, timeoutMs: 1600, initial: true });
  state.stopHover = UI.onVideoHover(function(entry){ state.hoveredEntry = entry; markHot(entry); });
  state.cardReconcileTimer = setInterval(function() {
    UI.getVideoEntries(document, { unique: true }).slice(0, 80).forEach(mountCard);
  }, 1000);
  state.embedReconcileTimer = setInterval(mountEmbeddedIframes, 1000);
  window.addEventListener('keydown', onCopyShortcut, true);
  window.addEventListener('yt-navigate-finish', syncCurrentPage);
  window.addEventListener('yt-page-data-updated', syncCurrentPage);
  syncCurrentPage();
  state.watchSubsTimer = setInterval(function(){
    var id = UI.getVideoId(location.href);
    if (!id || location.pathname !== '/watch') return;
    compactNativeShare();
    seatWatchSubs({
      id: id,
      url: location.href,
      shortUrl: 'https://youtu.be/' + id,
      element: document.documentElement,
      host: document.documentElement
    });
  }, 500);
  state.stop = function() {
    clearInterval(state.currentTimer);
    clearInterval(state.watchSubsTimer);
    clearInterval(state.cardReconcileTimer);
    clearInterval(state.embedReconcileTimer);
    if (state.stopCards) state.stopCards();
    if (state.stopHover) state.stopHover();
    window.removeEventListener('keydown', onCopyShortcut, true);
    window.removeEventListener('yt-navigate-finish', syncCurrentPage);
    window.removeEventListener('yt-page-data-updated', syncCurrentPage);
  };
  return state;
  };
})();
