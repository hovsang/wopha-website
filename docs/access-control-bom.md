# Fob Access for Pool & Tennis Gates — Budget BOM (Temu-grade parts)

Context: gates currently use a shared code emailed to members (and shared
beyond them — see July 2025 trespasser email). Fobs fix that: one fob per
household, revocable when dues lapse, no code to leak. Two controlled gates
assumed: pool and tennis.

## Per-gate hardware (standalone, no internet needed)

| Item | Temu-typical | Notes |
|---|---|---|
| IP68 waterproof standalone RFID keypad controller (125 kHz, 2000–3000 users, Wiegand) | $10–16 | HFeng/MENGQI-style metal units; also sold on Amazon at $18–25 for faster warranty returns |
| 600 lb (280 kg) maglock + ZL bracket | $16–25 | Fits chain-link/metal pool gates; fail-safe (unlocks on power loss = safe egress) |
| 12 V 3 A power supply (CCTV type) | $9–14 | Get the version with space for a backup battery |
| 12 V 7 Ah backup battery (optional) | $15–25 | Keeps the gate locked through short outages |
| Stainless push-to-exit button | $4–7 | Free exit from inside, always |
| Waterproof junction box | $6–10 | Georgia rain + sprinklers |
| Wire (18/4 + 18/2), conduit, fittings | $15–25 | Assumes power already near gate (pool house; court lights) |
| Inline surge protection | $5–8 | Lightning is the #1 killer of these |
| **Per-gate subtotal** | **≈ $80–130** | |

## Fobs for the neighborhood

| Item | Temu-typical | Notes |
|---|---|---|
| 250 × 125 kHz EM4100 keyfobs (sequential IDs) | $45–75 (≈ $0.20–0.30 ea) | 170 households + spares/replacements. **Order sequentially numbered** — both controllers support batch-enrolling a card-number range, so you enroll all 250 in one command instead of tapping each fob twice |
| Spare keypad + spare maglock | ~$30 | Budget-import attrition insurance; a dead reader in July with no spare = angry summer |

## Totals

- **Parts, both gates + fobs + spares: roughly $250–350.**
- Install: free if a volunteer is handy and power is already at each gate
  (pool house and court lighting suggest yes); an electrician for conduit
  runs adds $200–500.
- Commercial comparison: professional access control runs $1,500–3,500 *per
  door* installed, plus monthly software fees. This is the $300 version of a
  $5,000 quote — with real trade-offs, below.

## Trade-offs to state plainly to the board

1. **125 kHz fobs are clonable** with a $10 gadget. Accept this: it's a pool
   gate, and the bar is "better than a shared code that's already leaked" —
   which fobs clear easily. (13.56 MHz Mifare fobs are only marginally
   harder to clone on cheap gear; not worth the enrollment hassle.)
2. **No audit trail.** Standalone units don't log who entered when. If the
   board wants logs and app-based management, the middle option is a
   TTLock-compatible controller (~$40–80/gate, phone-app managed, still no
   monthly fee) — still Temu-cheap, much easier revocation.
3. **Revocation discipline is the real cost.** Keep a spreadsheet: fob serial
   → household, filled in AT ISSUE TIME (fobs are laser-etched with their
   number). Deleting a lapsed household's fob takes 30 seconds at the keypad
   — but only if you know which number to delete.
4. **Budget-import lifespan** in Georgia sun/rain/lightning: expect 2–4
   seasons per unit. That's what the spares are for. If the board would
   rather pay 2× for Amazon-listed versions of the same hardware
   (LEXI/HFeng/MENGQI), returns are easier.
5. **Pool safety code.** Gwinnett follows pool-barrier rules: gates must
   self-close, self-latch, and allow free exit at all times. Fail-safe
   maglock + always-live exit button satisfies the exit requirement (and on
   power loss the gate simply unlocks). Confirm with the county before
   install, and keep the existing mechanical latch as the self-latching
   element.
6. **Wristbands stay.** Fobs control the gate; wristbands still identify
   members in the water. They complement, not replace.

## Rollout suggestion

Pilot the tennis gate first (lower stakes, power at hand, no safety-code
questions), one season. If it survives the summer, do the pool gate the
following spring and hand fobs out with the wristbands at opening day.
