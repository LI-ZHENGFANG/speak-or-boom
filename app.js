/* Speak or Boom — core game logic (vanilla JS, no dependencies) */
(function () {
'use strict';

/* ================= utils ================= */
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtMoney = (n) => '¥' + n.toFixed(2);
const fmtClock = (sec) => {
  sec = Math.max(0, Math.ceil(sec));
  return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
};

/* ================= persistent store ================= */
const LS_KEY = 'speakOrBoom.v1';
const store = {
  data: null,
  load() {
    try { this.data = JSON.parse(localStorage.getItem(LS_KEY)) || null; } catch (e) { this.data = null; }
    if (!this.data || typeof this.data !== 'object' || !Number.isFinite(this.data.balance) || this.data.balance < 0) {
      this.data = { balance: 10, sessions: 0, success: 0, fail: 0, speakMs: 0, lost: 0, longestWinSec: 0 };
    }
    ['sessions', 'success', 'fail', 'speakMs', 'lost', 'longestWinSec'].forEach(key => {
      if (!Number.isFinite(this.data[key]) || this.data[key] < 0) this.data[key] = 0;
    });
    return this.data;
  },
  save() { try { localStorage.setItem(LS_KEY, JSON.stringify(this.data)); } catch (e) {} },
  reset() {
    this.data = { balance: 10, sessions: 0, success: 0, fail: 0, speakMs: 0, lost: 0, longestWinSec: 0 };
    this.save();
  }
};

/* ================= scenarios ================= */
const REGISTRY = window.SPEAK_OR_BOOM_SCENARIOS || {};
function scenarioIds() { return Object.keys(REGISTRY); }
function getScenario(id) {
  return REGISTRY[id] || REGISTRY.coffee || { rounds: [], speaker: 'VOICE', title: '—', tagline: '' };
}
function agentLine(round) { return round.agent || round.barista || ''; }
function practiceRounds(rounds) {
  if (!G.reverseRoles) return rounds;
  return rounds.map(round => Object.assign({}, round, {
    agent: round.user, barista: round.user, user: agentLine(round),
    speaker: 'PARTNER', audioAgentRole: 'user', audioUserRole: 'agent',
    keywords: agentLine(round).toLowerCase().match(/[a-z]+/g) || []
  }));
}
function speakerLabel(round, sc) { return String(round.speaker || sc.speaker || 'VOICE').toUpperCase(); }
// Continuous stories keep their order. Other scenarios shuffle chapters.
function buildPlayOrder(rounds, scenario) {
  if (scenario && scenario.ordered) return rounds.slice();
  const byChapter = [];
  const seen = Object.create(null);
  rounds.forEach(r => {
    if (!seen[r.chapter]) { seen[r.chapter] = []; byChapter.push(seen[r.chapter]); }
    seen[r.chapter].push(r);
  });
  for (let i = byChapter.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = byChapter[i]; byChapter[i] = byChapter[j]; byChapter[j] = t;
  }
  return byChapter.flat();
}

/* ---- KTV word timing model ----
 * estimateWordTimings() maps each word to an estimated [startMs, endMs]
 * window measured in *speaking* milliseconds (pauses don't advance it).
 * Swap this function for real forced-alignment later without touching UI code.
 */
const MS_PER_WORD = 260;
function estimateWordTimings(words) {
  return words.map((w, i) => ({ word: w, startMs: i * MS_PER_WORD, endMs: (i + 1) * MS_PER_WORD }));
}
function needSpeakMs(words) {
  return clamp(words.length * MS_PER_WORD, 350, 4500);
}

/* ================= game state ================= */
const G = {
  state: 'idle',          // idle | barista | waiting | paused | over
  resumeState: 'waiting', // state to return to after pause
  modeMin: 10,
  scenarioId: 'coffee',
  reverseRoles: false,
  scenario: null,
  rounds: [],             // active play order (reshuffled each loop)
  roundIdx: 0,
  loop: 1,
  totalMs: 10 * 60 * 1000,
  elapsedBeforePause: 0,  // ms banked before current pause
  resumeStamp: 0,         // performance.now() at (re)start of timer
  lineSpeakMs: 0,
  silenceMs: 0,
  warned3: false,
  warned5: false,
  kwMatched: {},          // keyword -> true
  stats: null,
  timerId: null,
};
function freshStats() {
  return { warnings: 0, longestSilence: 0, pauses: 0, linesDone: 0, speakMs: 0 };
}
function sessionElapsedMs() {
  if (G.state === 'paused' || G.state === 'over' || G.state === 'idle') return G.elapsedBeforePause;
  return G.elapsedBeforePause + (performance.now() - G.resumeStamp);
}
function sessionRemainingMs() { return Math.max(0, G.totalMs - sessionElapsedMs()); }

/* ================= audio / VAD ================= */
const AudioSys = {
  ctx: null, analyser: null, stream: null, buf: null, sink: null,
  noiseFloor: 0.0005, threshold: 0.003, level: 0, floatBuf: null,
  speaking: false, loudMs: 0, quietMs: 0,

  async init() {
    if (this.stream) { await this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    const openingContext = this.ctx;
    // Unlock audio while still in the button gesture, before permission UI.
    this.ctx.resume().catch(() => {});
    let openingStream;
    try { openingStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    }); } catch (e) { this.stop(); throw e; }
    if (this.ctx !== openingContext) {
      openingStream.getTracks().forEach(track => track.stop());
      throw new Error('Microphone test cancelled');
    }
    this.stream = openingStream;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    src.connect(this.analyser);
    this.sink = this.ctx.createGain();
    this.sink.gain.value = 0;
    this.analyser.connect(this.sink);
    this.sink.connect(this.ctx.destination);
    this.buf = new Uint8Array(this.analyser.fftSize);
    this.floatBuf = typeof this.analyser.getFloatTimeDomainData === 'function' ? new Float32Array(this.analyser.fftSize) : null;
    setMicHud(true);
  },
  rms() {
    if (this.floatBuf) this.analyser.getFloatTimeDomainData(this.floatBuf);
    else this.analyser.getByteTimeDomainData(this.buf);
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) {
      const v = this.floatBuf ? this.floatBuf[i] : (this.buf[i] - 128) / 128;
      sum += v * v;
    }
    this.level = Math.sqrt(sum / this.buf.length);
    return this.level;
  },
  // One VAD frame. dt in ms. Returns nothing; mutates speaking flags.
  frame(dt) {
    const r = this.rms();
    // adapt noise floor slowly toward quiet measurements
    if (r < Math.max(this.noiseFloor * 1.6, this.threshold * 0.85)) {
      this.noiseFloor = this.noiseFloor * 0.96 + r * 0.04;
    }
    const thresh = Math.max(this.noiseFloor * 3.0, this.threshold);
    const loud = r > thresh;
    if (loud) { this.loudMs += dt; this.quietMs = 0; }
    else {
      this.quietMs += dt;
      if (this.quietMs >= 120) this.loudMs = 0;
    }
    // Natural speech has gaps between consonants. Bridge brief dips, reject clicks.
    if (!this.speaking && this.loudMs >= 80) { this.speaking = true; }
    if (this.speaking && this.quietMs >= 250) {
      this.speaking = false; this.loudMs = 0; this.quietMs = 0;
    }
  },
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  stop() {
    try { if (this.stream) this.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    try { if (this.ctx) this.ctx.close(); } catch (e) {}
    this.stream = null; this.ctx = null; this.analyser = null; this.sink = null;
    this.speaking = false; this.loudMs = 0; this.quietMs = 0; this.noiseFloor = 0.0005; this.level = 0; this.floatBuf = null;
    setMicHud(false);
  }
};
function setMicHud(on) {
  $('hud-mic').innerHTML = on ? '🟢 <b>MIC ACTIVE</b>' : '🔴 MIC OFF';
}
const MIC_PREF = 'speakOrBoom.micThreshold.v2';
try { const value = Number(localStorage.getItem(MIC_PREF)); if (value >= 0.002 && value <= 0.04) AudioSys.threshold = value; } catch (e) {}
let micTesting = false, calPhase = '', calSamples = [], calNoise = 0, calTimer = null;
let micTrial = null;
function startMicTrial() {
  if (!micTesting || !AudioSys.analyser) return;
  clearTimeout(calTimer); calPhase = '';
  AudioSys.speaking = false; AudioSys.loudMs = 0; AudioSys.quietMs = 0;
  micTrial = { speakMs: 0, silenceMs: 0, text: $('mic-test-sentence').value.trim() || 'Can I get a medium latte, please?' };
  $('mic-trial-status').textContent = '请读：“' + micTrial.text + '” 。读完停半秒到一秒，没有倒计时。';
}
function updateMicTrial(dt) {
  if (!micTrial) return;
  if (AudioSys.speaking) { micTrial.speakMs += dt; micTrial.silenceMs = 0; }
  else micTrial.silenceMs += dt;
  const need = needSpeakMs((micTrial.text || 'Can I get a medium latte, please?').split(/\s+/));
  if (speechDurationComplete(micTrial.speakMs, micTrial.silenceMs, need)) {
    $('mic-trial-status').textContent = '✓ 这句已完成：发声检测和句子完成判定均正常。可以重新试读。';
    micTrial = null;
  } else {
    $('mic-trial-status').textContent = '本句发声 ' + (micTrial.speakMs / 1000).toFixed(1) + ' / ' + (need / 1000).toFixed(1) + ' 秒' + (micTrial.speakMs >= need ? ' · 读完后停半秒到一秒' : ' · 继续读即可');
  }
}
function saveMicThreshold(value) {
  AudioSys.threshold = clamp(Number(value), 0.002, 0.04);
  $('mic-threshold').value = AudioSys.threshold;
  $('mic-threshold-label').textContent = '当前门槛：' + AudioSys.threshold.toFixed(3);
  try { localStorage.setItem(MIC_PREF, String(AudioSys.threshold)); } catch (e) {}
}
saveMicThreshold(AudioSys.threshold);
function micFeedback(test) {
  const r = AudioSys.level;
  const threshold = Math.max(AudioSys.noiseFloor * 3, AudioSys.threshold);
  const track = AudioSys.stream && AudioSys.stream.getAudioTracks()[0];
  let label = '音量 ' + r.toFixed(3) + ' / 门槛 ' + threshold.toFixed(3);
  if (!track || track.readyState !== 'live') label = '未收到麦克风音轨，请重新开始';
  else if (AudioSys.ctx.state !== 'running') label = '音频暂未运行，请暂停后继续，或重新测试';
  else if (track.muted) label = '麦克风被其他应用占用或暂时静音';
  else label += r > threshold ? ' · 收到声音' : ' · 轻声或安静';
  if (!test && G.state === 'waiting') label += ' · 本句 ' + (G.lineSpeakMs / 1000).toFixed(1) + ' / ' + (needSpeakMs(currentRound().user.split(/\s+/)) / 1000).toFixed(1) + ' 秒';
  $(test ? 'mic-test-level' : 'mic-live').value = r;
  $(test ? 'mic-test-status' : 'mic-live-label').textContent = label;
}
async function openMicTest() {
  if (micTesting) return;
  micTesting = true;
  showScreen('mictest');
  try { await AudioSys.init(); } catch (e) {
    if (micTesting) { micTesting = false; showScreen('micerror'); }
  }
}
function closeMicTest() {
  micTrial = null;
  clearTimeout(calTimer); calPhase = ''; micTesting = false;
  AudioSys.stop(); refreshStartScreen(); showScreen('start');
  $('btn-cal-quiet').disabled = false; $('btn-cal-voice').disabled = true;
}
function recordCalibration(phase) {
  calPhase = phase; calSamples = [];
  $('btn-cal-quiet').disabled = true; $('btn-cal-voice').disabled = true;
  $('mic-cal-status').textContent = phase === 'quiet' ? '请保持安静，采样 2 秒…' : '现在连续读出测试句，采样 4 秒…';
  calTimer = setTimeout(() => {
    calPhase = '';
    const samples = calSamples.slice().sort((a, b) => a - b);
    const p = samples[Math.floor(samples.length * 0.8)] || 0;
    $('btn-cal-quiet').disabled = false;
    if (phase === 'quiet') {
      calNoise = p; $('btn-cal-voice').disabled = false;
      $('mic-cal-status').textContent = '背景音 ' + p.toFixed(3) + '。准备好后点击②，再读测试句。';
    } else if (p > Math.max(calNoise * 1.6, 0.002)) {
      AudioSys.noiseFloor = calNoise;
      saveMicThreshold(clamp(Math.max(calNoise * 3, p * 0.35), 0.003, 0.04));
      $('mic-cal-status').textContent = '已检测到人声并保存灵敏度。返回后即可开始练习。';
    } else {
      $('btn-cal-voice').disabled = false;
      $('mic-cal-status').textContent = '尚未检测到清晰人声。请靠近手机说话，检查系统麦克风开关或耳机输入，再试②。';
    }
  }, phase === 'quiet' ? 2000 : 4000);
}

/* ================= TTS (barista) ================= */
const VOICE_PREF = 'speakOrBoom.voice.v1';
const voicePrefs = { rate: 0.75, voiceId: '' };
try {
  const saved = JSON.parse(localStorage.getItem(VOICE_PREF));
  if (saved && Number.isFinite(saved.rate) && saved.rate >= 0.6 && saved.rate <= 1.1) voicePrefs.rate = saved.rate;
  if (saved && typeof saved.voiceId === 'string') voicePrefs.voiceId = saved.voiceId;
} catch (e) {}
if (window.SPEAK_OR_BOOM_AUDIO) {
  try {
    if (!localStorage.getItem('speakOrBoom.recordedDefault.v1')) {
      voicePrefs.voiceId = 'recorded';
      localStorage.setItem('speakOrBoom.recordedDefault.v1', '1');
    }
  } catch (e) { voicePrefs.voiceId = 'recorded'; }
}
const voiceId = (v) => JSON.stringify([v.voiceURI || v.name, v.lang]);
function saveVoicePrefs() {
  try { localStorage.setItem(VOICE_PREF, JSON.stringify(voicePrefs)); } catch (e) {}
}
function setVoiceRate(value) {
  const rate = Number(value);
  if (!Number.isFinite(rate)) return;
  voicePrefs.rate = clamp(rate, 0.6, 1.1);
  ['voice-rate', 'paused-voice-rate'].forEach(id => { $(id).value = voicePrefs.rate; });
  ['voice-rate-label', 'paused-voice-rate-label'].forEach(id => { $(id).textContent = '对方语速：' + voicePrefs.rate.toFixed(2) + '（1.00 为原音速度）'; });
  saveVoicePrefs();
}
function refreshVoiceChoices() {
  const select = $('voice-select');
  select.textContent = '';
  if (window.SPEAK_OR_BOOM_AUDIO) {
    const recorded = document.createElement('option');
    recorded.value = 'recorded'; recorded.textContent = '完整剧本配音 · 美式英语'; select.appendChild(recorded);
  }
  const automatic = document.createElement('option');
  automatic.value = ''; automatic.textContent = '自动选择英语音色'; select.appendChild(automatic);
  let voices = [];
  try { voices = speechSynthesis.getVoices().filter(v => /^en(?:[-_]|$)/i.test(v.lang)); } catch (e) {}
  voices.forEach(v => {
    const option = document.createElement('option');
    option.value = voiceId(v); option.textContent = v.name + ' · ' + v.lang;
    select.appendChild(option);
  });
  if (voicePrefs.voiceId === 'recorded' || voices.some(v => voiceId(v) === voicePrefs.voiceId)) select.value = voicePrefs.voiceId;
  $('voice-choice-note').textContent = window.SPEAK_OR_BOOM_AUDIO ? '完整剧本配音在手机和电脑上使用同一套声音；其他选项为系统语音。' : (voices.length > 1 ? '可逐个试听，选择你听着舒服的英语声音。' : '当前设备没有提供多种英语音色；自动选择会使用系统英语声音。');
}
function pickVoice() {
  try {
    const vs = speechSynthesis.getVoices();
    if (!vs.length) return null;
    return vs.find(v => /^en/i.test(v.lang) && voiceId(v) === voicePrefs.voiceId)
        || vs.find(v => /en-US/i.test(v.lang) && /google us english/i.test(v.name))
        || vs.find(v => /en-US/i.test(v.lang) && /female|samantha|aria|jenny|zira/i.test(v.name))
        || vs.find(v => /en[-_]US/i.test(v.lang))
        || vs.find(v => /^en/i.test(v.lang))
        || null;
  } catch (e) { return null; }
}
if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = refreshVoiceChoices;
}
setVoiceRate(voicePrefs.rate);
refreshVoiceChoices();
$('voice-rate').addEventListener('input', e => setVoiceRate(e.target.value));
$('paused-voice-rate').addEventListener('input', e => setVoiceRate(e.target.value));
$('voice-select').addEventListener('change', e => { voicePrefs.voiceId = e.target.value; saveVoicePrefs(); });
function stopVoicePlayback() {
  if (window.SOBRecorded) window.SOBRecorded.stop();
  try { speechSynthesis.cancel(); } catch (e) {}
}
function speakBarista(text, round) {
  if (voicePrefs.voiceId === 'recorded') {
    const selected = round || getScenario('coffee').rounds[0];
    const scene = round ? G.scenarioId : 'coffee';
    return window.SOBRecorded.play(window.SOBRecorded.entry(scene, selected.id, selected.audioAgentRole || 'agent'), voicePrefs.rate);
  }
  return speakSystemVoice(text);
}
function speakSystemVoice(text) {
  return new Promise((resolve, reject) => {
    let done = false;
    let timer;
    const fin = (error) => {
      if (done) return;
      done = true; clearTimeout(timer);
      if (error) reject(new Error(error)); else resolve();
    };
    try {
      if (!('speechSynthesis' in window)) { fin('浏览器不支持语音播放'); return; }
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) u.voice = v;
      u.lang = v ? v.lang : 'en-US';
      u.rate = voicePrefs.rate;
      u.onend = () => fin(); u.onerror = (event) => fin(event.error || '语音引擎播放失败');
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      // A timeout is a playback failure, never evidence the barista finished.
      const limit = Math.max(20000, text.split(/\s+/).length * 1500 / voicePrefs.rate);
      timer = setTimeout(() => fin('语音播放超时'), limit);
    } catch (e) { fin(e.message || '语音引擎不可用'); }
  });
}
async function testBaristaVoice() {
  const button = $('btn-voice-test');
  if (button.disabled) return;
  button.disabled = true;
  const voice = pickVoice();
  $('voice-test-status').textContent = voicePrefs.voiceId === 'recorded' ? '正在试听完整剧本配音…' : '正在试听英语声音' + (voice ? '：' + voice.name : '（系统默认引擎）') + '…';
  try {
    await speakBarista('Hello! Welcome in. What can I get for you today?');
    $('voice-test-status').textContent = '播放已结束。听到英语后再开始练习。';
  } catch (e) {
    $('voice-test-status').textContent = '对方语音未播放：' + e.message + '。配音模式请检查网络；系统语音模式请检查英语引擎。';
  } finally { button.disabled = false; }
}
async function playUserExample() {
  if (G.state === 'waiting' || G.state === 'barista') pauseSession();
  if (G.state !== 'paused') return;
  const button = $('btn-user-example');
  if (button.disabled) return;
  button.disabled = true;
  const round = currentRound();
  $('user-example-status').textContent = '正在播放你的台词示范。练习保持暂停，听完后点 RESUME。';
  try {
    await window.SOBRecorded.play(window.SOBRecorded.entry(G.scenarioId, round.id, round.audioUserRole || 'user'), voicePrefs.rate);
    if (G.state === 'paused') $('user-example-status').textContent = '示范播放结束。准备好后点 RESUME，自己读这一句。';
  } catch (e) {
    if (G.state === 'paused') $('user-example-status').textContent = '示范未能播放：' + e.message;
  } finally { button.disabled = false; }
}

/* ================= speech recognition (layer 2, optional) ================= */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, recOn = false;
function currentRound() { return G.rounds[G.roundIdx]; }
function startRec() {
  // Android recognition may request a second recorder/audio focus; VAD works locally.
  if (/Android/i.test(navigator.userAgent)) return;
  if (!SR || recOn || G.state !== 'waiting') return;
  try {
    rec = new SR();
    const recognizer = rec;
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      if (rec !== recognizer || G.state !== 'waiting') return;
      let txt = '';
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript + ' ';
      checkKeywords(txt.toLowerCase());
      // A full final transcript can end a turn even if low room noise masks the pause.
      const finalText = Array.from(e.results).filter(result => result.isFinal).map(result => result[0].transcript).join(' ');
      if (G.lineSpeakMs >= 800 && sentenceCoverage(finalText, currentRound().user) >= 0.8) completeLine();
    };
    rec.onerror = () => { if (rec === recognizer) stopRec(); };   // VAD path still works
    rec.onend = () => { if (rec !== recognizer) return; recOn = false; if (G.state === 'waiting') startRec(); };
    rec.start();
    recOn = true;
  } catch (e) { recOn = false; }
}
function stopRec() {
  recOn = false;
  try { if (rec) rec.stop(); } catch (e) {}
  rec = null;
}
// normalize for keyword matching: "Wi-Fi" / "wifi" / "wi fi" all become "wifi"
const normKw = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
function sentenceCoverage(transcript, sentence) {
  const heard = (transcript.toLowerCase().match(/[a-z0-9]+/g) || []).slice();
  const target = sentence.toLowerCase().match(/[a-z0-9]+/g) || [];
  let matches = 0;
  target.forEach(word => { const index = heard.indexOf(word); if (index >= 0) { matches++; heard.splice(index, 1); } });
  return target.length ? matches / target.length : 0;
}
function checkKeywords(transcript) {
  const round = currentRound();
  if (!round) return;
  const t = normKw(transcript);
  let changed = false;
  for (const kw of round.keywords) {
    if (!G.kwMatched[kw] && t.includes(normKw(kw))) { G.kwMatched[kw] = true; changed = true; }
  }
  if (changed) renderKwHint(round);
}

/* ================= UI helpers ================= */
function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }
function showScreen(name) {
  ['screen-start', 'screen-game', 'screen-mictest', 'screen-micerror', 'screen-success', 'screen-fail']
    .forEach(id => hide(id));
  show('screen-' + name);
  window.scrollTo(0, 0);
}
let toastTimer = null;
function toast(msg, ms) {
  const t = $('toast');
  t.textContent = msg; show('toast');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => hide('toast'), ms || 3200);
}

/* ================= KTV subtitle ================= */
let wordTimings = [];
function renderUserLine(round) {
  const box = $('user-line');
  box.innerHTML = '';
  const words = round.user.split(/\s+/);
  wordTimings = estimateWordTimings(words);
  words.forEach((w) => {
    const s = document.createElement('span');
    s.className = 'w todo';
    s.textContent = w;
    box.appendChild(s);
    box.appendChild(document.createTextNode(' '));
  });
  renderKwHint(round);
}
function renderKwHint(round) {
  const el = $('kw-hint');
  if (/Android/i.test(navigator.userAgent)) {
    el.textContent = '持续读完这句，停约一秒进入下一句。按发声检测，不逐字打分。';
    return;
  }
  el.innerHTML = 'Keywords: ';
  round.keywords.forEach((kw) => {
    const s = document.createElement('span');
    s.className = 'kw' + (G.kwMatched[kw] ? ' ok' : '');
    s.textContent = (G.kwMatched[kw] ? '✓ ' : '') + kw;
    el.appendChild(s);
  });
}
function updateKtv() {
  const spans = $('user-line').querySelectorAll('.w');
  if (!spans.length || !wordTimings.length) return;
  const t = G.lineSpeakMs;
  spans.forEach((s, i) => {
    const tw = wordTimings[i];
    let cls = 'w todo';
    if (t >= tw.endMs) cls = 'w said';
    else if (t >= tw.startMs) cls = 'w active';
    if (G.kwMatched[tw.word.replace(/[.,!?;:'"]/g, '').toLowerCase()]) cls += ' hit';
    s.className = cls;
  });
}

/* ================= bomb ================= */
function bombHide() {
  const o = $('bomb-overlay');
  o.className = 'hidden'; o.id = 'bomb-overlay';
  $('bomb-text').textContent = ''; $('bomb-count').textContent = '';
  $('hud-silence').classList.remove('danger');
  const sl = $('state-line');
  sl.className = 'live'; sl.textContent = '● WAITING FOR USER — SPEAK';
}
function bombStage() {
  // called every frame while waiting; manages overlay by silenceMs
  const s = G.silenceMs / 1000;
  const o = $('bomb-overlay');
  const bt = $('bomb-text'), bc = $('bomb-count');
  const sl = $('state-line');
  $('hud-silence').classList.toggle('danger', s >= 3);

  if (s < 3) {
    if (!o.classList.contains('hidden')) bombHide();
    sl.className = 'live'; sl.textContent = '● WAITING FOR USER — SPEAK';
    return;
  }
  show('bomb-overlay');
  if (s < 5) {
    o.className = ''; bt.className = 'warn'; bc.textContent = '';
    bt.textContent = '⚠️ KEEP TALKING';
    sl.className = 'warn'; sl.textContent = '⚠️ KEEP TALKING';
    if (!G.warned3) { G.warned3 = true; G.stats.warnings++; }
  } else if (s < 8) {
    o.className = 'alarm'; bt.className = 'crit'; bc.textContent = '';
    bt.textContent = '🚨 SPEAK NOW';
    sl.className = 'crit'; sl.textContent = '🚨 SPEAK NOW';
    if (!G.warned5) { G.warned5 = true; G.stats.warnings++; alarmBeep(); }
  } else if (s < 11) {
    o.className = 'red'; bt.className = 'crit';
    bt.textContent = '💣';
    const n = s < 9 ? '3' : (s < 10 ? '2' : '1');
    if (bc.textContent !== n) { bc.textContent = n; alarmBeep(660); }
    sl.className = 'crit'; sl.textContent = '💣 ' + n;
  } else if (s < 12) {
    o.className = 'red'; bt.className = 'crit'; bc.textContent = '💣';
    bt.textContent = '';
    sl.className = 'crit'; sl.textContent = '💣';
  } else {
    doBoom();
  }
}
function alarmBeep(freq) {
  try {
    const c = AudioSys.ctx; if (!c || c.state !== 'running') return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'square'; o.frequency.value = freq || 880;
    g.gain.setValueAtTime(0.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.28);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + 0.3);
  } catch (e) {}
}
function boomSound() {
  try {
    const c = AudioSys.ctx; if (!c) return;
    if (c.state === 'suspended') c.resume();
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(90, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(28, c.currentTime + 1.1);
    g.gain.setValueAtTime(0.5, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.2);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + 1.25);
  } catch (e) {}
}

/* ================= round flow ================= */
function resetLineCounters() {
  G.lineSpeakMs = 0; G.silenceMs = 0;
  G.warned3 = false; G.warned5 = false;
  G.kwMatched = {};
  AudioSys.speaking = false; AudioSys.loudMs = 0; AudioSys.quietMs = 0;
}
async function runRound() {
  if (G.state === 'over' || G.state === 'paused' || G.state === 'idle') return;
  const round = currentRound();
  if (!round) return;
  const turn = G.voiceTurn = (G.voiceTurn || 0) + 1;

  // --- barista phase: silence timer MUST NOT run here ---
  G.state = 'barista';
  stopRec();
  $('chapter-tag').textContent = 'Chapter · ' + round.chapter + (G.loop > 1 ? '  (loop ' + G.loop + (G.scenario && G.scenario.ordered ? ', story replay)' : ', reshuffled)') : '');
  $('who-barista').textContent = '🎙️ ' + speakerLabel(round, G.scenario);
  $('barista-line').textContent = agentLine(round);
  $('barista-line').classList.remove('dim');
  const sl = $('state-line');
  sl.className = ''; sl.textContent = '🔊 ' + speakerLabel(round, G.scenario) + ' SPEAKING…';
  updateHudLine();
  try { await speakBarista(agentLine(round), round); }
  catch (e) {
    if (G.state !== 'barista' || G.voiceTurn !== turn) return;
    pauseSession();
    $('tts-error').textContent = '对方语音未播放：' + e.message + '。练习已暂停，不会开启沉默倒计时。检查网络或语音设置后点 RESUME 重播。';
    return;
  }
  if (G.state !== 'barista' || G.voiceTurn !== turn) return; // paused / replaced mid-speech
  await AudioSys.ctx.resume();
  if (G.state !== 'barista' || G.voiceTurn !== turn) return;

  // --- waiting phase ---
  G.state = 'waiting';
  resetLineCounters();
  $('barista-line').classList.add('dim');
  renderUserLine(round);
  bombHide();
  startRec();
}
function tryCompleteLine() {
  if (G.state !== 'waiting') return;
  const round = currentRound();
  const words = round.user.split(/\s+/);
  const need = needSpeakMs(words);
  const kwHit = Object.keys(G.kwMatched).length > 0;
  const doneByTime = speechDurationComplete(G.lineSpeakMs, G.silenceMs, need);
  const doneByKw = kwHit && G.lineSpeakMs >= need && G.silenceMs >= 600;
  if (doneByTime || doneByKw) completeLine();
}
function speechDurationComplete(speakMs, silenceMs, need) {
  return speakMs >= need && silenceMs >= 600;
}
function completeLine() {
  if (G.state !== 'waiting') return;
  stopRec();
  G.stats.linesDone++;
  G.stats.speakMs += G.lineSpeakMs;
  G.stats.longestSilence = Math.max(G.stats.longestSilence, G.silenceMs / 1000);
  G.roundIdx++;
  if (G.roundIdx >= G.rounds.length) {
    G.roundIdx = 0; G.loop++;
    G.rounds = buildPlayOrder(practiceRounds(G.scenario.rounds), G.scenario);
    toast(G.scenario.ordered ? '📜 本集结束 — 按剧情顺序重播（第 ' + G.loop + ' 遍）' : '📜 Script complete — chapters reshuffled for endurance (round ' + G.loop + ')');
  }
  runRound();
}

/* ================= session control ================= */
async function startSession() {
  if (G.starting) return;
  G.starting = true;
  $('btn-start').disabled = true;
  try { await beginSession(); } finally { G.starting = false; $('btn-start').disabled = false; }
}
async function beginSession() {
  const d = store.data;
  if (d.balance < 1) {
    refreshStartScreen(); showScreen('start');
    const n = $('start-note');
    n.style.display = 'block';
    n.textContent = '虚拟余额不足 ¥1.00。可继续免费麦克风试读；若要重新挑战，请点击 Reset Demo Data（会清空统计）。';
    n.scrollIntoView({block: 'center'});
    return;
  }
  const sc = getScenario(G.scenarioId);
  G.reverseRoles = $('reverse-roles').checked;
  const rounds = buildPlayOrder(practiceRounds(sc.rounds), sc);
  if (!rounds.length) {
    toast('⚠️ Scenario "' + G.scenarioId + '" failed to load. Pick another one.');
    return;
  }
  // mic first
  if (window.SOBRecorded) window.SOBRecorded.unlock();
  try {
    await AudioSys.init();
  } catch (e) {
    showScreen('micerror');
    return;
  }
  // stake
  d.balance = Math.round((d.balance - 1) * 100) / 100;
  d.sessions++;
  store.save();

  G.modeMin = parseInt(document.querySelector('.dur-btn.selected').dataset.min, 10) || 10;
  G.totalMs = G.modeMin * 60 * 1000;
  G.scenario = sc;
  G.rounds = rounds;
  G.state = 'waiting';
  G.roundIdx = 0; G.loop = 1;
  G.elapsedBeforePause = 0;
  G.resumeStamp = performance.now();
  G.stats = freshStats();
  d.scenarioId = G.scenarioId; store.save(); // remember last scenario
  $('hdr-scenario').textContent = sc.title.toUpperCase();
  $('hdr-mode').textContent = G.modeMin + '-MINUTE CHALLENGE';

  showScreen('game');
  $('btn-pause').style.display = '';
  startTimerLoop();
  runRound();
}
function startTimerLoop() {
  clearInterval(G.timerId);
  G.timerId = setInterval(() => {
    if (G.state === 'over' || G.state === 'idle') { clearInterval(G.timerId); return; }
    const rem = sessionRemainingMs();
    $('hud-time').textContent = fmtClock(rem / 1000) + ' / ' + fmtClock(G.totalMs / 1000);
    if (rem <= 0) doWin();
  }, 200);
}
function pauseSession() {
  if (G.state !== 'waiting' && G.state !== 'barista') return;
  G.elapsedBeforePause = sessionElapsedMs();
  $('tts-error').textContent = '';
  G.resumeState = G.state;
  G.state = 'paused';
  G.voiceTurn = (G.voiceTurn || 0) + 1;
  G.stats.pauses++;
  stopVoicePlayback();
  $('user-example-line').textContent = currentRound().user;
  $('user-example-status').textContent = '';
  stopRec();
  AudioSys.suspend();
  clearInterval(G.timerId);
  show('paused-overlay');
}
function resumeSession() {
  if (G.state !== 'paused') return;
  stopVoicePlayback();
  if (window.SOBRecorded) window.SOBRecorded.unlock();
  hide('paused-overlay');
  AudioSys.resume();
  G.resumeStamp = performance.now();
  startTimerLoop();
  if (G.resumeState === 'waiting') {
    G.state = 'waiting';
    resetLineCounters();
    bombHide();
    renderUserLine(currentRound());
    startRec();
  } else {
    G.state = 'barista';
    runRound(); // replay barista line
  }
}
function endSessionEarly() {
  if (G.state === 'over' || G.state === 'idle') return;
  if (!confirm('End this session now? Your ¥1.00 stake will be lost.')) return;
  finishFail('Session ended early by user', false);
}
function doWin() {
  if (G.state === 'over') return;
  finishWin();
}
function doBoom() {
  if (G.state === 'over') return;
  G.elapsedBeforePause = sessionElapsedMs();
  G.state = 'over';
  stopRec();
  clearInterval(G.timerId);
  boomSound();
  const o = $('bomb-overlay');
  o.className = 'boom';
  $('bomb-text').textContent = '💥 BOOM';
  $('bomb-count').textContent = '';
  setTimeout(() => finishFail('12 seconds of silence', true), 2400);
}
function finishWin() {
  G.elapsedBeforePause = sessionElapsedMs();
  G.state = 'over';
  stopRec(); clearInterval(G.timerId);
  stopVoicePlayback();
  const d = store.data;
  d.balance = Math.round((d.balance + 0.90) * 100) / 100;
  d.lost = Math.round((d.lost + 0.10) * 100) / 100; // simulated platform fee
  d.success++;
  d.speakMs += G.stats.speakMs;
  d.longestWinSec = Math.max(d.longestWinSec, G.modeMin * 60);
  store.save();
  AudioSys.stop();

  const s = G.stats;
  $('success-stats').innerHTML = rows([
    ['Session', fmtClock(G.totalMs / 1000)],
    ['Lines completed', s.linesDone],
    ['Warnings', s.warnings],
    ['Longest silence', s.longestSilence.toFixed(1) + ' s'],
    ['Speaking time', fmtClock(s.speakMs / 1000)],
    ['Pauses', s.pauses],
    ['Stake', fmtMoney(1)],
    ['Money returned', fmtMoney(0.90), 'money-back'],
    ['Current balance', fmtMoney(d.balance), 'money-back'],
  ]);
  showScreen('success');
}
function finishFail(reason, exploded) {
  G.elapsedBeforePause = sessionElapsedMs();
  G.state = 'over';
  stopRec(); clearInterval(G.timerId);
  stopVoicePlayback();
  const d = store.data;
  d.fail++;
  d.lost = Math.round((d.lost + 1) * 100) / 100; // stake lost
  d.speakMs += (G.stats ? G.stats.speakMs : 0);
  store.save();
  AudioSys.stop();

  const s = G.stats || freshStats();
  const survived = fmtClock(sessionElapsedMs() / 1000);
  $('fail-sub').textContent = exploded ? 'You survived ' + survived : 'Session ended after ' + survived;
  $('fail-stats').innerHTML = rows([
    ['Line reached', (G.roundIdx + 1) + ' / ' + G.rounds.length],
    ['Warnings', s.warnings],
    ['Speaking time', fmtClock(s.speakMs / 1000)],
    ['Pauses', s.pauses],
    ['Failure reason', reason],
    ['Money lost', fmtMoney(1), 'money-lost'],
    ['Current balance', fmtMoney(d.balance), d.balance < 1 ? 'money-lost' : ''],
  ]);
  hide('bomb-overlay');
  showScreen('fail');
}
function rows(pairs) {
  return pairs.map(([k, v, cls]) =>
    '<div class="k">' + k + '</div><div class="v ' + (cls || '') + '">' + v + '</div>').join('');
}

/* ================= HUD ================= */
function updateHudLine() {
  $('hud-line').textContent = (G.roundIdx + 1) + ' / ' + G.rounds.length + (G.loop > 1 ? ' ·×' + G.loop : '');
}

/* ================= master frame loop ================= */
let lastT = 0;
function tick(t) {
  requestAnimationFrame(tick);
  const dt = Math.min(100, t - (lastT || t));
  lastT = t;
  if (micTesting && AudioSys.analyser) {
    if (micTrial) { AudioSys.frame(dt); updateMicTrial(dt); }
    else AudioSys.rms();
    micFeedback(true);
    if (calPhase) calSamples.push(AudioSys.level);
    return;
  }
  if (G.state !== 'waiting') return;
  if (!AudioSys.analyser) return;

  AudioSys.frame(dt);
  micFeedback(false);
  if (AudioSys.speaking) {
    G.silenceMs = 0;
    G.lineSpeakMs += dt;
  } else {
    G.silenceMs += dt;
    G.stats.longestSilence = Math.max(G.stats.longestSilence, G.silenceMs / 1000);
  }
  $('hud-silence').textContent = (G.silenceMs / 1000).toFixed(1) + ' s';
  updateKtv();
  bombStage();
  tryCompleteLine();
}
requestAnimationFrame(tick);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (G.state === 'barista' || G.state === 'waiting')) pauseSession();
});

/* ================= start screen wiring ================= */
function renderScenarioPicker() {
  const grid = $('scenario-grid');
  if (!grid) return;
  grid.innerHTML = '';
  scenarioIds().forEach(id => {
    const sc = getScenario(id);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'scn-card' + (id === G.scenarioId ? ' selected' : '');
    const title = document.createElement('span'); title.className = 'scn-title'; title.textContent = sc.title;
    const tag = document.createElement('span'); tag.className = 'scn-tag'; tag.textContent = sc.tagline || '';
    const meta = document.createElement('span'); meta.className = 'scn-meta';
    meta.textContent = sc.rounds.length + ' lines · ' + (sc.difficulty || '');
    b.appendChild(title); b.appendChild(tag); b.appendChild(meta);
    b.addEventListener('click', () => {
      G.scenarioId = id;
      grid.querySelectorAll('.scn-card').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
    });
    grid.appendChild(b);
  });
}
function refreshStartScreen() {
  const d = store.load();
  if (d.balance >= 1) {
    $('start-note').style.display = 'none';
    $('start-note').textContent = '';
  }
  if (d.scenarioId && REGISTRY[d.scenarioId]) G.scenarioId = d.scenarioId;
  renderScenarioPicker();
  $('start-balance').textContent = fmtMoney(d.balance);
  const mins = Math.floor(d.speakMs / 60000);
  $('lifetime-stats').innerHTML =
    'Sessions: <b>' + d.sessions + '</b> · Wins: <b>' + d.success + '</b> · Booms: <b>' + d.fail + '</b><br>' +
    'Total speaking: <b>' + mins + ' min</b> · Virtual lost: <b>' + fmtMoney(d.lost) + '</b> · Longest win: <b>' + fmtClock(d.longestWinSec) + '</b>';
}
document.querySelectorAll('.dur-btn').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.dur-btn').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected');
  });
});
$('btn-start').addEventListener('click', startSession);
$('btn-mic-test').addEventListener('click', openMicTest);
$('btn-voice-test').addEventListener('click', testBaristaVoice);
$('btn-user-example').addEventListener('click', playUserExample);
$('btn-mic-test-back').addEventListener('click', closeMicTest);
$('mic-threshold').addEventListener('input', (event) => saveMicThreshold(event.target.value));
$('btn-cal-quiet').addEventListener('click', () => recordCalibration('quiet'));
$('btn-cal-voice').addEventListener('click', () => recordCalibration('voice'));
$('btn-mic-trial').addEventListener('click', startMicTrial);
$('btn-reset').addEventListener('click', () => {
  if (confirm('Reset all demo data? Balance returns to ¥10.00 and all stats go to zero.')) {
    store.reset();
    refreshStartScreen();
    toast('Demo data reset. Balance: ¥10.00');
  }
});
$('btn-pause').addEventListener('click', pauseSession);
$('btn-resume').addEventListener('click', resumeSession);
$('btn-end').addEventListener('click', endSessionEarly);
$('btn-mic-back').addEventListener('click', () => showScreen('start'));
const goHome = () => { refreshStartScreen(); showScreen('start'); };
$('btn-home-win').addEventListener('click', goHome);
$('btn-home-fail').addEventListener('click', goHome);
$('btn-again-win').addEventListener('click', startSession);
$('btn-again-fail').addEventListener('click', startSession);

// sanity: at least one scenario must be registered
if (!scenarioIds().length) {
  document.querySelector('.howto').innerHTML =
    '<b style="color:#ff2b2b">ERROR:</b> No scenarios loaded. Make sure the scenario scripts are served together with index.html.';
}
refreshStartScreen();
showScreen('start');

})();
