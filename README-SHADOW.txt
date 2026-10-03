Shadow scenario patch: "Codename: Nightfall" (shadow_bond)
============================================================
80-round shadowing scenario, 007-style original spy story.
Every round: agent line == user line (player shadows the intonation).

FILES:
  scenarios/shadow_bond.js      (80 rounds, 10 chapters, ordered:true)
  audio/shadow_bond/*.mp3       (80 clips, ronan voice, shared by agent/user)
  voice-manifest.js             (full manifest including shadow_bond section)

DEPLOY (after v4 is pushed):
1. Unzip at repo root, overwrite.
2. Commit & push. GitHub Pages redeploys.
3. The scenario appears as "Codename: Nightfall" in the picker.

NOTE: Voice is American English (ronan). No British voice available in
current TTS stock. Accent is a known limitation, documented for v4.1.
