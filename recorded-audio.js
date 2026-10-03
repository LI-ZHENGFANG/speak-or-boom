/* Scripted audio player. Never treats an error or cancellation as a finished turn. */
(function () {
  'use strict';
  let element = null, active = null;
  function audio() {
    if (!element) { element = new Audio(); element.preload = 'auto'; element.playsInline = true; }
    return element;
  }
  function stop() {
    const pending = active;
    if (pending) pending.finish(new Error('interrupted'));
    if (element) { element.pause(); element.removeAttribute('src'); element.load(); }
  }
  function entry(scene, id, role) {
    const pack = window.SPEAK_OR_BOOM_AUDIO;
    return pack && pack.scenarios[scene] && pack.scenarios[scene][String(id)] && pack.scenarios[scene][String(id)][role];
  }
  function play(clip, rate) {
    stop();
    if (!clip || !clip.src) return Promise.reject(new Error('这句配音尚未加载'));
    return new Promise((resolve, reject) => {
      const media = audio();
      let settled = false, timer;
      const finish = error => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        media.onended = null; media.onerror = null;
        if (active && active.finish === finish) active = null;
        if (error) reject(error); else resolve();
      };
      active = { finish };
      // A changed recording must not reuse a cached broken file.
      media.src = clip.src + (clip.sha256 ? (clip.src.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(clip.sha256) : '');
      media.playbackRate = rate;
      media.preservesPitch = true;
      media.onended = () => finish();
      media.onerror = () => finish(new Error('配音文件未能播放，请检查网络后重试'));
      timer = setTimeout(() => {
        media.pause(); finish(new Error('配音加载或播放超时'));
      }, Math.max(30000, clip.seconds * 1000 / rate + 20000));
      try {
        const result = media.play();
        if (result && result.catch) result.catch(error => finish(new Error(error.name === 'NotAllowedError' ? '请点击试听或继续按钮，允许播放声音' : '配音播放失败：' + error.message)));
      } catch (error) { finish(error); }
    });
  }
  function unlock() {
    // A real, valid short silent WAV is played in the START/RESUME button gesture.
    // Keep the same media element for subsequent turns on Android Chrome.
    if (active) return;
    const media = audio();
    const bytes = new Uint8Array(44 + 800);
    const view = new DataView(bytes.buffer);
    const label = (offset, value) => { for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i); };
    label(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); label(8, 'WAVE'); label(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, 8000, true); view.setUint32(28, 8000, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true);
    label(36, 'data'); view.setUint32(40, 800, true); bytes.fill(128, 44);
    let raw = ''; for (const value of bytes) raw += String.fromCharCode(value);
    media.src = 'data:audio/wav;base64,' + btoa(raw);
    const attempt = media.play(); if (attempt && attempt.catch) attempt.catch(() => {});
  }
  window.SOBRecorded = { entry, play, stop, unlock };
})();
