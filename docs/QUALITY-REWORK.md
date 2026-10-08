# v0.2.0 CrazyGames rejection quality rework

Date: 2026-10-08. Branch: `dev`. This is a development hand-off, **not evidence that CrazyGames approved a new submission**.

## Product changes

- Early novelty: moving obstacles after score 4 (previously 20), positive pickup guarantees on rounds 3 and 6, poison guaranteed on round 12.
- Perfect passage is scored when the bug crosses a pillar centered within 0.62 world units of the opening center. A miss, an injury, or a new run breaks the streak.
- Three perfect passages during **normal flight only** trigger a 2.8-second protected **Toot Rush**; gates passed during rush still score but never charge another rush, generate a perfect chime, or break the existing streak. The charge resets to 0/3 at activation, and resumes only once rush ends. Rush protects against pillar/ceiling hits and bounces from the bottom. During rush, beetle and wings become a translucent animated indigo/cyan void silhouette with bounded fading afterimages and cyan-blue alpha-silhouette contour glow; the big five-point star shield is hidden. The star pickup's own shield still appears outside rush. After rush the beetle reverts to the selected skin. Score remains one point per cleared pair of pillars; streak does not inflate speed progression.
- Cosmetics are earned without ads or purchases: 6 skins unlocked by best score (0/3/6/10/15/25), 3 puff trails by highest streak (0/3/6), with a playable selector. Stardust emits its own additive four-point sparkling particles (not recolored puffs), with capped lifetime/count and a reduced-motion fallback. Progress is serialized through the existing CrazyGames Data adapter and legacy progress key.
- Normal gate clears are silent (flap/other gameplay effects still have sound). A perfect gate plays a unique two-note chime; the third perfect also cues rush activation. Platform mute and user mute remain authoritative.
- Compact iframe HUD presents score, hearts, streak, rush countdown; the garden remains a 9:16 logical playfield on any display.

## Before resubmission (manual, not auto-certified)

- [ ] Play 5 rounds with audio enabled and muted: normal gate gives no score sound; perfect gate chimes; third **normal-state** perfect enables void-colored beetle with a tight blue luminous contour and trailing afterimages **without the five-point star shield**; gates during void do not contribute charge, and after expiry three **new** perfect gates are needed. With Stardust selected, each flap emits distinct twinkling starbursts rather than plain puff recolors; verify all other effects and badges.
- [ ] Verify pointer taps on mobile do not activate behind buttons and that the overlay fits 360×640, 390×844, 430×932.
- [ ] Verify 821×462, 907×510, 1077×606 desktop iframe with DPR 1. Ensure every letter is legible and no header/card overlaps.
- [ ] Test iOS Safari and Android Chrome real devices: first press audio, mute, rotate, tab switching, 10-minute device performance.
- [ ] Upload the `npm run package:crazygames` ZIP to Developer Portal **Preview** with Progress Save enabled. Confirm SDK start/stop, guest/login save, silence under platform mute, no blocking console errors.
- [ ] Run a blind playtest with 5–10 new users. Record if the first 30 seconds communicates a unique hook; watch retry willingness and confusion without guidance.
- [ ] Produce accurate new-game cover and a short preview video; review style/assets and platform metadata.
- [ ] Recheck CrazyGames requirements and resubmission eligibility; submit only when manual results are complete.

## Automated validation

GitHub Actions runs `npm ci`, `npm test`, `npm run build`, `npm run check:release`, and `npm run package:crazygames` on every `dev` commit. A green build proves mechanical correctness only, not subjective quality. The GitHub Pages site deploys from `main` only.
