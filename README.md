# Speak or Boom

**No-Silence English Challenge** — six scenarios, 5 / 10 / 60 minutes.

A browser-based speaking trainer. Fixed English script + karaoke subtitles +
voice activity detection + silence countdown + bomb fail mechanic.
The goal is not perfect pronunciation — it's **forcing you to keep speaking English**.

## Run it (Windows + Chrome recommended)

```bash
cd speak-or-boom
py -3.8 -m http.server 8000
```

Then open:

```
http://localhost:8000
```

> `localhost` counts as a secure context, so Chrome will allow microphone access.
> Opening `index.html` via `file://` will break mic + TTS — don't do that.

## How a session works

1. Pick a duration: **5 min demo / 10 min / 60 min**. Stake: **¥1.00** (virtual).
2. Press **START**, allow microphone access. 🎧 Headphones recommended.
3. The **partner** speaks (bundled American English voiceover, default playback 0.75).
4. **YOUR LINE** appears huge — read it out loud immediately.
5. Keep talking. Silence triggers: **3s** ⚠️ KEEP TALKING → **5s** 🚨 SPEAK NOW (+alarm)
   → **8s** 💣 countdown 3·2·1 → **12s** 💥 **BOOM**, session failed.
6. Finish the timer → **YOU SURVIVED**, **¥0.90** returned (¥0.10 simulated platform fee).

**Only silence can kill you.** Bad pronunciation, accent, missing words,
extra words, slow pace — none of these cause failure.

## Controls

- **Pause / Resume** — stops timer, bomb, and mic detection. Pauses are counted.
- **Your-line demonstration** — the pause screen plays the current user line while practice remains paused.
- **Reverse roles** — select the checkbox before START to read the partner's original lines.
- **End** — ends early (stake lost, counted as a failed session).
- **Reset Demo Data** — restores ¥10.00 balance and zeroes stats (with confirmation).

## Project structure

```
speak-or-boom/
├── index.html        # screens: start (scenario picker) / game / mic-error / success / fail
├── style.css         # dark Speed-movie countdown aesthetic
├── app.js            # VAD, TTS, recognition, bomb, stake, storage, scenario engine
├── coffee-script.js  # Coffee Shop scenario (88 rounds, 12 chapters)
├── recorded-audio.js # MP3 playback, cancellation and load-error handling
├── voice-manifest.js # 804 rounds / 1,608 audio files and text mapping
├── audio/            # Both sides of every fixed script, American English
├── scenarios/
│   ├── _FORMAT.md    # contract every scenario file must follow
│   ├── airport.js    # Airport — 144 rounds
│   ├── hotel.js      # Hotel — 144 rounds
│   ├── interview.js  # Job Interview — 144 rounds
│   ├── restaurant.js # Restaurant — 144 rounds
│   └── movies.js     # Ship It! Ep.1: Demo Day Disaster — 140 rounds, original workplace sitcom
└── README.md
```

Each scenario is a self-contained JS file that registers itself on
`window.SPEAK_OR_BOOM_SCENARIOS` (see `scenarios/_FORMAT.md` to add your own).
The movies slot now contains **Ship It! Ep.1: Demo Day Disaster**, an original
workplace sitcom with 10 scenes and 140 rounds. You play Mia and respond to Jake
and Lucy. Scenes run in story order on every pass, including with reversed roles.
All six scenarios now preserve their authored chapter order on every pass. The 60-minute option repeats material after a complete
pass; it is not a one-hour film or a complete TV season.

## How detection works (MVP)

1. **Voice Activity Detection (primary):** mic RMS volume vs. an adaptive noise
   baseline. Sound must sustain ~80 ms to count as speech (rejects isolated
   clicks, keyboard). A line completes after enough *speaking* milliseconds
   (scaled by line length) plus a short natural pause.
2. **Speech recognition (bonus layer):** if `webkitSpeechRecognition` is available,
   a final transcript covering at least 80% of the sentence, with at least 800 ms of voiced activity, can complete the line. A single keyword is not enough. Android disables this second recorder to avoid audio focus conflicts.
   It never punishes — if recognition fails or is offline, VAD alone drives the game.

The silence countdown runs **only** in `WAITING FOR USER` state — never while the
barista's TTS is playing, and never during line transitions.

## Notes / limitations

- 60-minute mode loops the selected scenario with an on-screen notice; all six scenarios preserve authored story/chapter order
  ("looping for endurance") until the timer ends. This includes repeated material.
- Switching to another app or tab automatically pauses the session.
- Data (balance, sessions, wins, fails, speaking time, longest win) persists in
  `localStorage` under key `speakOrBoom.v1`.

## Chinese setup guide

See 使用说明.txt for the Windows + Chrome startup steps and troubleshooting.
Subtitle timing and speech detection are approximate training aids, not professional pronunciation scoring.

Developer and copyright owner: LI ZHENGFANG.

## Voice controls

All 804 rounds have both sides voiced: 1,608 bundled MP3 files. Default playback uses the same American English clips on phone and computer. All six scenes now use Meta AI synthetic voices supplied with the Muse updates, with a stable voice per character. The five everyday scenes were rewritten and their 1,328 recordings replaced in v4.0; the 280 Ship It! recordings are retained. These are not human actor or original film recordings; see VOICE-NOTICE.txt for provenance. No voice model or generation dependencies run in the web application.

Rate defaults to 0.75; home and pause screens allow 0.60–1.10. 1.00 is the original recording speed. The voice selector also offers device system voices as an explicit alternative. Preferences persist under `speakOrBoom.voice.v1`. Playback must end successfully before the user's silence timer begins. Errors pause the session.

Keep the complete audio/ directory when extracting the ZIP. The separately exported inline HTML still needs sibling audio/ and downloads/ directories; it is not a single-file offline application. Subtitle highlighting estimates voiced progress, not exact word alignment. The scripts are fixed, not language-model conversation.

## Episode maintenance

Read scenarios/EP1-STORY-BIBLE.md and scenarios/_FORMAT.md before adding episodes.
Muse supplied 280 Ep.1 clips and their text/hash mapping. Its generation helpers
in tools/generate_ep1_voice.py and tools/rebuild_manifest_ep1.py require Muse's
Linux environment, its authorized /opt/hatch/bin/tts service and Node/ffprobe;
they are not Windows launchers or web runtime dependencies. Do not run the old
Kokoro manifest builder blindly: it will overwrite this episode's voice mapping.
See HANDOFF.txt and RELEASE-STATUS.json for actual verification evidence.


## v4.0 all-scenes update

Five practical scenes now have longer continuous dialogue and named characters: Sam/Alex, Raj/Jordan, Nora/Daniel, Helen/David, and Marco/Julia. Counts remain 804 rounds / 1,608 clips including Ship It! Ep.1. Every scene is ordered, including replay and role reversal. The Muse ZIP is a patch, missing the application shell and episode audio; download the complete runnable ZIP from the project page for standalone use.
Historical device acceptance does not establish v4.0 acceptance. See RELEASE-STATUS.json.
