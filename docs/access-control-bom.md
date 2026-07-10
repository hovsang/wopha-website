# Keypad Access for Pool & Tennis Gates — Budget BOM (Temu-grade parts)

Decision: keypad route (per-household PIN codes), no fobs.

Context: gates currently use a single shared code emailed to members — which
leaks (see July 2025 trespasser email). The fix isn't hardware alone: the
standalone controllers below hold 2000+ users, so **each household gets its
own 4–6 digit code**, revocable individually when dues lapse. Nothing to
carry, nothing to lose, nothing to hand out at the gate. Two controlled
gates assumed: pool and tennis.

## Per-gate hardware (standalone, no internet needed)

| Item | Temu-typical | Notes |
|---|---|---|
| IP68 waterproof standalone keypad controller (2000–3000 users, metal, backlit) | $10–16 | HFeng/MENGQI-style units; same hardware sold on Amazon at $18–25 if easier returns are worth 2× |
| 600 lb (280 kg) maglock + ZL bracket | $16–25 | Fits chain-link/metal pool gates; fail-safe (unlocks on power loss = safe egress) |
| 12 V 3 A power supply (CCTV type) | $9–14 | Get the version with space for a backup battery |
| 12 V 7 Ah backup battery (optional) | $15–25 | Keeps the gate locked through short outages |
| Stainless push-to-exit button | $4–7 | Free exit from inside, always |
| Waterproof junction box | $6–10 | Georgia rain + sprinklers |
| Wire (18/4 + 18/2), conduit, fittings | $15–25 | Assumes power already near gate (pool house; court lights) |
| Inline surge protection | $5–8 | Lightning is the #1 killer of these |
| **Per-gate subtotal** | **≈ $80–130** | |

## Totals

- **Parts, both gates + one spare keypad: roughly $190–290.**
- Install: free if a volunteer is handy and power is already at each gate
  (pool house and court lighting suggest yes); an electrician for conduit
  runs adds $200–500.
- Commercial comparison: professional access control runs $1,500–3,500 per
  door installed, plus monthly software. This is the $250 version.

## Making per-household codes workable

1. **Assignment:** generate a random 4–6 digit code per household (never
   house numbers or phone digits). Enroll at the keypad; both gates get the
   same code for the same household.
2. **The register is the system.** Spreadsheet: user slot # → household →
   code, maintained by one volunteer. Revoking a lapsed household = delete
   that slot at the keypad, 30 seconds — but only if the register is kept.
3. **Distribution:** email each household its code individually (BCC
   culture!), or hand out at opening day with wristbands.
4. **Codes will still be shared** — with sitters, grandparents, and
   eventually a teen's friend group. That's tolerable: damage is bounded to
   one household's code, and you delete just theirs. If a code circulates
   widely, rotate that one code, not everyone's.
5. **Optional seasonal hygiene:** reassign all codes each spring with the
   new membership year. One evening of volunteer time.

## Trade-offs to state plainly to the board

1. **No audit trail.** Standalone units don't log entries. If the board
   later wants logs and phone-app code management (issue/revoke from the
   couch, timed guest codes), the upgrade is a TTLock-style WiFi keypad at
   ~$40–80/gate — still no monthly fee. Worth considering for the pool gate.
2. **Budget-import lifespan** in Georgia sun/rain/lightning: expect 2–4
   seasons; keep the spare keypad boxed. Surge protection is not optional.
3. **Pool safety code.** Gwinnett follows pool-barrier rules: gates must
   self-close, self-latch, and allow free exit at all times. Fail-safe
   maglock + always-live exit button satisfies exit (power loss = unlocked).
   Confirm with the county before the pool-gate install; keep the existing
   mechanical latch as the self-latching element.
4. **Wristbands stay** — the keypad controls the gate; wristbands still
   identify members in the water.

## Rollout suggestion

Pilot the tennis gate first (lower stakes, power at hand, no safety-code
questions), one season. If it survives the summer, do the pool gate the
following spring and distribute codes with the wristbands at opening day.
