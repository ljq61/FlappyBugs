# v0.2.0 CrazyGames rejection quality rework

Date: 2026-10-08. Branch: `dev`. This is a development hand-off, **not evidence that CrazyGames approved a new submission**.

## Product changes

- Early novelty: moving obstacles after score 4 (previously 20), positive pickup guarantees on rounds 3 and 6, poison guaranteed on round 12.
- Perfect passage is scored when the bug crosses a pillar centered within 0.62 world units of the opening center. A miss, an injury, or a new run breaks the streak.
- Each three perfect passages trigger a 2.8-second protected **Toot Rush**. Rush protects against pillar/ceiling hits and bounces from the bottom. Score remains one point per cleared pair of pillars; streak does not inflate speed progression.
- Cosmetics are earned without ads or purchases: 6 skins unlocked by best score (0/3/6/10/15/25), 3 puff trails by highest streak (0/3/6), with a playable selector. Progress is serialized through the existing CrazyGames Data adapter and legacy progress key.
- Compact iframe HUD presents score, hearts, streak, rush countdown; the garden remains a 9:16 logical playfield on any display.

## Before resubmission (manual, not auto-certified)

- [ ] Play 5 rounds with audio enabled and muted, verify combo, rush, new skin/trail colors, and all three badges.
- [ ] Verify pointer taps on mobile do not activate behind buttons and that the overlay fits 360×640, 390×844, 430×932.
- [ ] Verify 821×462, 907×510, 1077×606 desktop iframe with DPR 1. Ensure every letter is legible and no header/card overlaps.
- [ ] Test iOS Safari and Android Chrome real devices: first press audio, mute, rotate, tab switching, 10-minute device performance.
- [ ] Upload the `npm run package:crazygames` ZIP to Developer Portal **Preview** with Progress Save enabled. Confirm SDK start/stop, guest/login save, silence under platform mute, no blocking console errors.
- [ ] Run a blind playtest with 5–10 new users. Record if the first 30 seconds communicates a unique hook; watch retry willingness and confusion without guidance.
- [ ] Produce accurate new-game cover and a short preview video; review style/assets and platform metadata.
- [ ] Recheck CrazyGames requirements and resubmission eligibility; submit only when manual results are complete.

## Automated validation

GitHub Actions runs `npm ci`, `npm test`, `npm run build`, `npm run check:release`, and `npm run package:crazygames` on every `dev` commit. A green build proves mechanical correctness only, not subjective quality. The GitHub Pages site deploys from `main` only.
