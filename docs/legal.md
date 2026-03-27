# Legal & Regulatory

> Legal framing, gambling analysis, and App Store strategy.
> See also: [Payments](./payments.md) | [Features](./features.md)

## Commitment Contract, Not Gambling

Niyah is a **commitment contract** app. Users stake money as a motivational device to achieve focus goals. This is the same legal model used by stickK and Beeminder for 10+ years.

### Three-Element Gambling Test

1. **Consideration** (payment) -- YES
2. **Prize** (something to win) -- DEBATABLE
3. **Chance** (luck-based outcome) -- **NO, user controls outcome entirely**

**Verdict**: Likely NOT gambling for solo mode. Outcome is 100% effort-based (user controls whether they use their phone).

### Precedents

| App       | Model                        | Status                               |
| --------- | ---------------------------- | ------------------------------------ |
| stickK    | Stakes go to charity if fail | Legal, 10+ years                     |
| Beeminder | Stakes go to company if fail | Legal, 10+ years                     |
| DietBet   | Pool split among winners     | Legal, explicit skill/effort framing |

### Important Distinction

Niyah is NOT an event contract (Kalshi model). It is a commitment contract where the user commits to a goal and stakes money as motivation.

## Pool/Duo Mode -- Higher Risk

Solo mode (user vs. self) is legally clean. Pool mode (users competing for a shared pot) introduces gambling risk because it's zero-sum.

**Mitigation by phase**:

- **Phase 1**: Honor-based settlement with Venmo deep links. No money transmission.
- **Phase 2**: Stripe escrow (licensed third party handles all fund movement). No MTL required.

## Money Transmission

You are NOT a money transmitter if you:

- Never custody funds directly
- Only use a licensed third party (Stripe) for all fund movement
- Only track debts with users settling outside app

## App Store Strategy

- **Category**: Productivity (NOT Games)
- **Avoid words**: "bet," "wager," "gamble," "win"
- **Use words**: "stake," "commitment," "goal," "complete"

## Required Legal Disclaimer

```
COMMITMENT CONTRACT DISCLAIMER

Niyah provides commitment contract services, not gambling services.
The outcome of each focus session is determined solely by the user's
personal effort and action - not by chance, luck, or random events.

Users stake funds as a commitment device to help achieve their goals.
Successful completion is entirely within the user's control.

Niyah is not a gambling, gaming, lottery, or betting service.
```

## Outstanding Legal Actions

- [ ] Schedule legal consultation with VAIL (Mark & Cat) and/or Dr. White
- [ ] Confirm pool mode strategy (escrow vs. charity vs. forfeit-to-company)
- [ ] Review commitment contract framing with legal advisor
- [ ] Terms of Service and Privacy Policy
- [ ] Commitment contract disclaimer in app

## Contacts

- **Legal guidance**: VAIL (Mark & Cat), Dr. White
- **Technical consulting**: 40AU (Logan & Andrew)
