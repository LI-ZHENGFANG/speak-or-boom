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
    rounds: [
      {
        id: '<id>-001',                       // unique string within the file
        chapter: '<Chapter Name>',            // groups rounds; chapters are shuffled on loop
        speaker: '<LABEL>',                   // OPTIONAL: overrides scenario speaker for this round
        agent: '<Their line, spoken by TTS>', // natural, 6-16 words
        user: '<Your line, the drill>',       // 4-12 words; the line the player must say out loud
        keywords: ['word1', 'word2']          // 1-3 lowercase core words from the USER line
      },
      // ... 140+ rounds total
    ]
  };
})();
```

## Hard rules

1. **Round count:** minimum 140 rounds per file. Target 12 chapters × 12 rounds (or equivalent).
2. **Field names are `agent` / `user`** (the app maps `agent` to speech internally).
   `speaker` is optional per round; when omitted the scenario-level `speaker` is used.
3. **User lines:** the player READS THESE OUT LOUD. Keep them speakable:
   - 4–12 words each. Vary length for rhythm (short answers mixed with full sentences).
   - Natural spoken English, contractions encouraged ("I'd like", "can't").
   - No tongue-twisters, no rare vocabulary, no stage directions in the line itself.
   - Progressive: earlier chapters simpler, later chapters longer / more complex.
4. **Agent lines:** set up the situation so the user line is the obvious reply.
   6–16 words, conversational. The TTS voice reads these.
5. **Keywords:** 1–3 lowercase words taken VERBATIM from the user line
   (strip punctuation). They are a bonus recognition signal only — never a fail condition.
6. **Chapters:** each chapter is one mini-situation with a clear arc
   (e.g. greeting → details → problem → resolution). 10–20 rounds per chapter.
7. **No filler rounds:** every round must teach or drill something (a phrase, a question form,
   a polite complaint, a number, a time, etc.). No "Yes." / "OK." one-word user lines.
8. **Variety:** rotate user-line patterns — statements, questions, requests, refusals,
   clarifications, numbers/times, polite complaints, small talk.
9. **Movie scenarios:** use SHORT iconic quotes only (1–2 lines, the kind everyone quotes).
   Do NOT reproduce long verbatim scenes. Mix: (a) famous quote to repeat,
   (b) simple role-play where the player answers in character.
   Agent lines give one sentence of scene context, then the quote setup.
10. **IDs:** unique strings, sequential, e.g. `airport-001` … `airport-144`.
11. File must define NOTHING except the registration IIFE (no globals, no console.log).
    End the file with `})();`.

## Quality bar

Read 5 random rounds aloud. If any feels robotic, unnatural, or unspeakable, rewrite it.
The product promise is "Fluency first" — the lines must feel like real talking.
