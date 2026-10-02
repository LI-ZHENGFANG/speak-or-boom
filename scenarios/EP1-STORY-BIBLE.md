# Ship It! — Ep.1 "Demo Day Disaster" · Story Bible (ORIGINAL, all characters fictional)

## Series
Original workplace sitcom. No copyrighted material. All names, companies, dialogue original.

## Characters (voice casting — Meta AI voices, American English)
- MIA (player role): 28, product manager. Organized, warm, anxious-but-capable.
  Voice: avocado_v2:MAI_01 (Aria, F, American, Warm). All USER lines.
- JAKE: 26, developer. Funny, chaotic, brilliant, talks to rubber duck.
  Voice: avocado_v2:ronan (M, American, Casual). AGENT lines with speaker JAKE.
- LUCY: 50s, office manager. Dry wit, unflappable, secretly runs everything.
  Voice: avocado_v2:myrtle (F, American, Kindly). AGENT lines with speaker LUCY.

## Setting
BrightBox — small startup. Product: smart lunchbox + app that scans food,
tracks nutrition, suggests healthier swaps. Office, one day.

## Episode arc (10 scenes x 14 rounds = 140 rounds)
1. Morning Meltdown (001-014): coffee machine dead; demo TOMORROW 10am...
   phone call: moved to TODAY 3pm. Panic.
2. Damage Control (015-028): Jake's 2am buggy push broke the demo;
   backup thumb drive missing; search begins; Captain Quackers introduced.
3. The Duck and the Drive (029-042): drive was hidden INSIDE coffee machine
   (Jake "safest spot"); found wet/dead; Lucy reveals printed screenshots.
4. Plan B (043-056): wild ideas rejected; roles assigned;
   password-one-two-three-four gag; pitch practice begins.
5. Pitch Practice (057-070): Mia messes up, improves; heckling + coaching;
   cookie callback (refused morning, accepted now); ready.
6. Investor Arrives Early (071-084): Mr. Chen at 2pm not 3pm; panic tidy;
   warm/funny small talk; notices broken coffee machine.
7. The Pitch (085-098): screenshots pitch; forced live demo crashes;
   honest recovery; tough questions; duck charms Mr. Chen.
8. The Twist (099-112): Mr. Chen's daughter has diabetes — personal stake;
   the early meeting was a pressure test; investment offered with one
   condition: kids' version within a year.
9. The Deal (113-126): cautious celebration; terms talk; Mr. Chen leaves;
   robot dance; "Ship it!"
10. Aftermath + Hook (127-140): Lucy fixes coffee machine with paperclip;
    cookies; HOOK for Ep.2: email from competitor LunchTech wants to meet
    tomorrow about "partnership". Close on "Ship it!"

## Running gags / callbacks (must stay consistent)
- Coffee machine: broken by Jake (Sc1) -> fixed by Lucy with paperclip (Sc10)
- Captain Quackers: rubber debugging duck, introduced Sc2, saves day Sc7
- Password: "password one two three four" (spelled out for TTS), Sc4 + Sc10
- Lucy's oatmeal cookies: refused (Sc1), accepted (Sc5), shared (Sc10)
- "Oh no what? ... what does oh no mean?" — Jake Sc2 / Lucy Sc10 (mirror)
- "Ship it!" catchphrase: Sc9, Sc10 close
- Mr. Chen: investor, Bright Future Capital, daughter with diabetes
- Competitor: LunchTech (hook for Ep.2)

## TTS rules (no subtitle/audio mismatch)
- All numbers/times spelled out: "two in the morning", "three", "forty"
- No digits in spoken text ("password one two three four")
- Contractions OK: don't, can't, we'll, it's
- No stage directions in lines; agent lines are spoken setup (6-16 words)
- User lines 4-12 words, speakable drills

## Format contract (scenarios/_FORMAT.md)
- id 'movies' kept (manifest keys + audio paths unchanged)
- round ids movies-001 ... movies-140
- chapters = scene names; round order within chapter preserved by engine
