# Scenario file format — Speak or Boom

Every scenario is ONE self-contained JS file in `scenarios/`. No imports, no build step.
The file registers itself on `window.SPEAK_OR_BOOM_SCENARIOS`.

## Template

```js
/* Speak or Boom — <Title> scenario */
(function () {
  'use strict';
  window.SPEAK_OR_BOOM_SCENARIOS = window.SPEAK_OR_BOOM_SCENARIOS || {};
  window.SPEAK_OR_BOOM_SCENARIOS.<id> = {
    id: '<id>',                 // lowercase, no spaces, e.g. 'airport'
    title: '<Title>',           // e.g. 'Airport'
    tagline: '<Short line>',    // e.g. 'Check-in to Takeoff'
    speaker: '<LABEL>',         // default on-screen label for the "other" side, UPPERCASE, e.g. 'AGENT'
    difficulty: 'Beginner|Intermediate|Advanced',
    ordered: true,             // preserve chapters on every pass, including role reversal
    rounds: [
      {
        id: '<id>-001',                       // unique string within the file
        chapter: '<Chapter Name>',            // groups rounds; chapters retain authored order on every loop
        speaker: '<LABEL>',                   // OPTIONAL: overrides scenario speaker for this round
        agent: '<Their line, spoken by TTS>', // natural, normally 10-18 words
        user: '<Your line, the drill>',       // normally 8-14 words; the line the player must say out loud
        keywords: ['word1', 'word2']          // 1-3 lowercase core words from the USER line
      },
      // ... 140+ rounds total
    ]
  };
})();
```

## Hard rules

1. **Round count:** Coffee Shop has 88 rounds; other scenes have 140+ rounds. Target 12 chapters × 12 rounds (or equivalent).
2. **Field names are `agent` / `user`** (the app maps `agent` to speech internally).
   `speaker` is optional per round; when omitted the scenario-level `speaker` is used.
3. **User lines:** the player READS THESE OUT LOUD. Keep them speakable:
   - 8–14 words each. Full, natural sentences — not fragments.
   - Natural spoken English, contractions encouraged ("I'd like", "can't").
   - Varied vocabulary, collocations, descriptive detail. No rare words that block speaking.
   - No tongue-twisters, no stage directions in the line itself.
   - Progressive: earlier chapters simpler, later chapters longer / more complex.
4. **Agent lines:** set up the situation so the user line is the obvious reply.
   10–18 words, conversational, with personality and warmth. The TTS voice reads these.
   Every round must advance the interaction — no repeated ideas, no filler.
5. **Keywords:** 1–3 lowercase words taken VERBATIM from the user line
   (strip punctuation). They are a bonus recognition signal only — never a fail condition.
6. **Chapters:** each chapter is one mini-situation with a clear arc
   (e.g. greeting → details → problem → resolution). 10–20 rounds per chapter.
7. **No filler rounds:** every round must teach or drill something (a phrase, a question form,
   a polite complaint, a number, a time, etc.). No "Yes." / "OK." one-word user lines.
8. **Variety:** rotate user-line patterns — statements, questions, requests, refusals,
   clarifications, numbers/times, polite complaints, small talk.
9. **Series episodes (the `movies` scenario):** this scenario is an ORIGINAL series
   ("Ship It!"), not quotes from real films. Write it like a sitcom episode:
   complete story arc, named characters with consistent relationships, running
   gags and callbacks across scenes, continuous Q&A dialogue. Chapters are
   scenes in story order. Do NOT reproduce copyrighted film/TV dialogue beyond
   short iconic quotes; when in doubt, write original lines. Each episode is
   one self-contained file; future episodes extend the series.
10. **IDs:** unique strings, sequential, e.g. `airport-001` … `airport-144`.
11. File must define NOTHING except the registration IIFE (no globals, no console.log).
    End the file with `})();`.

## Quality bar

Read 5 random rounds aloud. If any feels robotic, unnatural, or unspeakable, rewrite it.
The product promise is "Fluency first" — the lines must feel like real talking.
