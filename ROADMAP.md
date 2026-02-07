# Niyah Roadmap

## Approvals

- [ ] legal confirmation from vaill lab
- [ ] Family controls (we can use API for development, but make sure to apply before working too hard; Takes ~2weeks, Apple may deny)
- [ ] `com.apple.developer.family-controls` entitlement (Distribution version)
- [ ] stripe approval (fastest, takes ~3 days)

**what we need to use (All part of the Screen Time API):**

- FamilyControls: auth and privacty tokens for selecting apps
- ManagedSettings: shield apps, block content
- DeviceActivity: screen time usage, execute code on scheduled events

## Stripe steps:

- [ ] Create Stripe account at dashboard.stripe.com
- [ ] Start in test mode immediately (no approval needed for testing)
- [ ] Submit business verification for production access
- [ ] Install `@stripe/stripe-react-native` when ready to integrate

**Fee impact on $5 stake:**

```
Deposit: $5.00
Stripe fee: -$0.45 (2.9% + $0.30)
Net received: $4.55

Payout (if user wins): $10.00
Instant payout fee: -$0.15 (1.5%)
User receives: $9.85

Cost per successful session: ~$0.60
```

#### Is NIYAH Gambling?

Three-element test:

1. Consideration (payment) -- YES
2. Prize (something to win) -- DEBATABLE
3. Chance (luck-based outcome) -- **NO, user controls outcome**

**Verdict: Likely NOT gambling** for solo mode. Outcome is 100% effort-based.

#### Precedents (Apps Operating Legally for 10+ Years)

| App       | Model                        | Status                               |
| --------- | ---------------------------- | ------------------------------------ |
| stickK    | Stakes go to charity if fail | Legal, 10+ years                     |
| Beeminder | Stakes go to company if fail | Legal, 10+ years                     |
| DietBet   | Pool split among winners     | Legal, explicit skill/effort framing |

#### IMPORTANT: NIYAH is NOT an Event Contract (Kalshi Model)

Do NOT frame NIYAH as an "event contract" platform. Kalshi operates as a CFTC-regulated derivatives exchange for betting on external events (elections, weather, etc.). NIYAH is fundamentally different:

- Kalshi: Outcome determined by external events the user cannot control
- NIYAH: Outcome determined 100% by the user's own effort and action

The correct legal framing is **"commitment contract"** -- a contract where the user commits to a goal and stakes money as a motivational device. This is the same model stickK and Beeminder have used safely for over a decade.

#### Pool/Duo Mode -- Higher Risk Area

Solo mode (user vs. themselves) is legally clean. Pool mode (users competing for a shared pot) introduces gambling risk because it's zero-sum (one person's loss is another's gain).

**Mitigation strategies (safest to most complex):**

| Strategy                              | Model                                                        | Risk Level                    |
| ------------------------------------- | ------------------------------------------------------------ | ----------------------------- |
| **A: Splitwise Model (MVP)**          | Track virtual balances only, users settle outside app        | LOW                           |
| **B: Penalty-to-Charity**             | Failed stakes go to charity, not other users                 | LOW-MEDIUM                    |
| **C: Forfeit-to-Company (Beeminder)** | Failed stakes kept as service fee, no user-to-user transfers | LOW-MEDIUM                    |
| **D: Pool Redistribution**            | Winners receive losers' stakes                               | HIGHER -- closest to gambling |

**Recommendation:** For MVP and likely for production, use Strategy A or C. Strategy D (pool redistribution) requires legal review and potentially money transmitter licensing.

#### Money Transmission

You ARE a money transmitter if you: custody user funds, transfer funds user-to-user, or pay out funds to users.
Triggers: FinCEN registration + State Money Transmitter Licenses (49 states) = $50K-$500K+ in fees, 6-24 month timeline.

You are NOT a money transmitter if you: never custody funds (Splitwise model), only track debts with users settling outside app, or use a licensed third party (Stripe) for all fund movement.

#### App Store Strategy

- **Category:** Productivity or Health & Fitness (NOT Games)
- **Avoid words:** "bet," "wager," "gamble," "win"
- **Use words:** "stake," "commitment," "goal," "complete"
- **Required disclaimer:**

```
COMMITMENT CONTRACT DISCLAIMER

NIYAH provides commitment contract services, not gambling services.
The outcome of each focus session is determined solely by the user's
personal effort and action - not by chance, luck, or random events.

Users stake funds as a commitment device to help achieve their goals.
Successful completion is entirely within the user's control.

NIYAH is not a gambling, gaming, lottery, or betting service.
```

---

## Animation & UI Roadmap

### Goal

Build a professional, Robinhood-quality onboarding experience and polished UI animations using **Figma** (design) + **React Native Reanimated** (animation) + **Gesture Handler** (interaction).

### Inspiration

Robinhood's onboarding uses a single continuous Lottie animation scrubbed by a pan gesture. We replicate the same effect purely in code:

- Gesture-driven page transitions (swipe controls animation progress, not time)
- 3D perspective transforms (phone rotation, scale, tilt between pages)
- Parallax depth layers (foreground moves faster than background)
- Choreographed element entrances (staggered fades, springs, slides)
- Background color interpolation between pages

### Current State

#### Installed But Unused

| Library                        | Version | Status                                                            |
| ------------------------------ | ------- | ----------------------------------------------------------------- |
| `react-native-reanimated`      | 4.1.6   | Installed, Babel plugin configured, **not used in any component** |
| `react-native-gesture-handler` | 2.28.0  | Installed, only used internally by expo-router                    |
| `expo-linear-gradient`         | 15.0.8  | Installed, **not used in any component**                          |

#### Currently Used for Animation

| Library                     | Usage                                                   |
| --------------------------- | ------------------------------------------------------- |
| `react-native` Animated API | All current animations (press scale, fade-in, confetti) |
| `react-native-svg`          | Timer progress ring                                     |
| `expo-haptics`              | Button, Card, NumPad press feedback                     |

All animations need to migrate from the legacy `Animated` API to Reanimated for UI-thread performance and gesture-driven capabilities.

### Architecture: Gesture-Driven Onboarding

```
┌─────────────────────────────────────┐
│           PanGesture                │  User swipes left/right
│     translationX: -width to 0      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Shared Value: progress         │  Normalized 0 to N (num pages)
│      interpolate(translationX,      │
│        [0, -screenWidth],           │
│        [0, 1])                      │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────┬───────────┐
    ▼          ▼          ▼           ▼
 BG Color   Scene      Scene      Text
 interp     Scale      RotateY    Fade
            interp     interp     interp
```

One shared value (gesture progress) drives every animation through `interpolate()`.

### Key Techniques

**1. Parallax Layers**

Each scene is composed of stacked layers exported from Figma, each translating at different speeds:

```
far background:  speed = 0.2x (slowest)
mid background:  speed = 0.5x
foreground:      speed = 1.0x (fastest)
```

**2. 3D Phone Rotation Transition**

Between pages, the scene shrinks into a phone frame and rotates:

```
progress 0.0 → 0.3: Scene normal
progress 0.3 → 0.5: Scale 1→0.7, borderRadius 0→20, rotateY 0→15deg
progress 0.5 → 0.7: Next scene scales 0.7→1, rotateY 15→0deg
progress 0.7 → 1.0: Next scene normal

Transforms: perspective(1000), rotateY, rotateZ, scale + animated borderRadius
```

**3. Background Color Interpolation**

Reanimated's `interpolateColor()` smoothly transitions backgrounds between pages.

**4. Text Choreography**

```
opacity:    interpolate(progress, [page-0.3, page, page+0.3], [0, 1, 0])
translateY: interpolate(progress, [page-0.3, page, page+0.3], [30, 0, -30])
```

**5. Page Snap**

On gesture end, snap to nearest integer page with `withSpring()` + haptic feedback.

### Onboarding Content Plan

| Page | Theme                                        | Hero Element                     | Color Direction          |
| ---- | -------------------------------------------- | -------------------------------- | ------------------------ |
| 1    | "You're spending 7 hours on your phone"      | Phone with distracting app icons | Cool/neutral tones       |
| 2    | "What if quitting cost you $5?"              | Dollar/coin being staked         | Warm transition          |
| 3    | "Complete your session, earn it back + more" | Growing plant / balance rising   | Green, NIYAH brand       |
| 4    | "Ready to take control?"                     | NIYAH logo / shield              | Full brand palette, CTAs |

### Figma Design Strategy

Design each page as separate, stackable layers (NOT flat compositions):

```
Page N/
├── background-far.svg      (distant elements, parallax slowest)
├── background-mid.svg      (mid-ground environment)
├── foreground.svg           (characters, main objects)
├── hero.svg                 (central element)
└── [UI overlay]             (text, dots, buttons -- in code, not Figma)
```

Export rules:

- Each layer as separate SVG/PNG
- Same canvas size for alignment
- Clear naming: `page1-bg-far.svg`, `page1-foreground.svg`, etc.
- Breathing room for elements that scale
- Phone frame as its own reusable SVG

---

## Implementation Phases

### Phase 0: Approvals & Registration (Week 1 -- DO IMMEDIATELY)

- [x] Purchase Apple Developer Program ($99)
- [ ] Decide: Individual vs. Organization enrollment
- [ ] If Organization: Apply for D-U-N-S Number (free, 5-14 business days)
- [ ] Once account active: Apply for FamilyControls Distribution entitlement
- [ ] Enable FamilyControls Development entitlement for immediate testing
- [ ] Create Stripe account, start in test mode
- [ ] Submit Stripe business verification for production access
- [ ] Schedule legal consultation with VAIL (Mark & Cat) and/or Dr. White
- [ ] Review commitment contract framing with legal advisor
- [ ] Confirm pool mode strategy (Splitwise vs. Charity vs. Forfeit-to-Company)

### Phase 1: Learn Reanimated Fundamentals (Week 1-2)

Learn in isolation, then apply to existing NIYAH components.

| Day | Focus                                                            | Exercise                                            |
| --- | ---------------------------------------------------------------- | --------------------------------------------------- |
| 1-2 | `useSharedValue`, `useAnimatedStyle`, `withSpring`, `withTiming` | Watch William Candillon "Reanimated 2 Fundamentals" |
| 3   | `interpolate()` -- mapping one value to multiple properties      | Watch William Candillon "Interpolation" video       |
| 4   | `Gesture.Pan()`, `Gesture.Tap()`, `GestureDetector`              | Read Gesture Handler docs, build a draggable box    |
| 5   | Migrate existing components                                      | Apply to NIYAH code                                 |

**Components to migrate:**

| Component                      | Current                              | Target                                          |
| ------------------------------ | ------------------------------------ | ----------------------------------------------- |
| `Button.tsx`                   | `Animated.spring` scale 1→0.97       | `useSharedValue` + `Gesture.Tap` + `withSpring` |
| `Card.tsx`                     | `Animated.timing` fade + press scale | `withTiming` entrance + `withSpring` press      |
| `(tabs)/_layout.tsx` tab icons | `Animated.sequence` bounce           | `withSequence(withTiming(), withSpring())`      |

### Phase 2: Design Onboarding in Figma (Week 2-3)

- [ ] Design 4 onboarding page compositions
- [ ] Separate each into 3-4 depth layers
- [ ] Design phone frame border SVG
- [ ] Export all layers as individual SVGs/PNGs
- [ ] Import into NIYAH `/assets/onboarding/`

### Phase 3: Build Gesture-Driven Onboarding (Week 3-4)

- [ ] Create `OnboardingScreen` with `GestureDetector`
- [ ] Implement `progress` shared value driven by `Gesture.Pan()`
- [ ] Build page snapping with `withSpring` on gesture end
- [ ] Implement parallax layer system
- [ ] Add `interpolateColor()` background transitions
- [ ] Add text fade/slide choreography

### Phase 4: 3D Transitions (Week 4-5)

- [ ] Implement `perspective` + `rotateY` + `scale` transforms
- [ ] Add animated `borderRadius` for phone frame effect
- [ ] Add subtle `rotateZ` for dynamism
- [ ] Tune transition curves

### Phase 5: Polish (Week 5-6)

- [ ] Tune spring physics (damping, stiffness, mass)
- [ ] Add haptic feedback on page snap
- [ ] Animate page indicator dots
- [ ] Animate CTA button entrance on final page
- [ ] Add rubber-band overshoot resistance (Extrapolation.CLAMP)
- [ ] Test on physical device

### Phase 6: Screen Time API Prototype (Week 4-8, parallel)

- [ ] Set up native Swift module structure (Custom Expo Module or bare RN bridge)
- [ ] Implement FamilyControls authorization flow (Development entitlement)
- [ ] Implement basic app selection with ManagedSettings
- [ ] Implement DeviceActivity monitoring
- [ ] Test on physical device (Screen Time API does not work in simulator)
- [ ] Once Distribution entitlement approved: test with distribution provisioning profile

### Phase 7: Stripe Integration (Week 6-8)

- [ ] Install `@stripe/stripe-react-native`
- [ ] Implement Stripe test mode with PaymentSheet
- [ ] Build deposit flow with real Stripe UI
- [ ] Build payout/withdrawal flow
- [ ] Set up Firebase Cloud Functions for Stripe server-side (payment intents, webhooks)
- [ ] Test end-to-end with test cards (4242 4242 4242 4242)
- [ ] Switch to production keys after business verification

### Phase 8: Firebase Backend (Week 6-10, parallel)

- [ ] Set up Firebase project (Auth, Firestore/Data Connect, Cloud Functions)
- [ ] Implement authentication (email + Google Sign-In already started)
- [ ] Migrate from Zustand mock data to Firestore
- [ ] Implement session tracking in backend
- [ ] Implement wallet/balance management server-side
- [ ] Cloud Functions for payout calculations, streak tracking

### Phase 9: App-Wide Animation Polish (Ongoing)

Apply Reanimated techniques across all screens:

| Screen          | Animation Opportunity                                   |
| --------------- | ------------------------------------------------------- |
| Dashboard       | Staggered card entrances with layout animations         |
| Session timer   | Drive SVG strokeDashoffset with Reanimated shared value |
| Surrender flow  | Tension animations (screen shake, red pulse)            |
| Complete screen | Migrate confetti from Animated to Reanimated            |
| Tab bar         | Gesture-driven tab switching                            |
| Session select  | Card selection with spring feedback                     |
| All pressables  | Consistent withSpring press feedback via shared hook    |

### Phase 10: Pre-Launch (Week 10-12)

- [ ] Legal disclaimer integrated into app (commitment contract disclaimer)
- [ ] App Store listing preparation (Productivity category)
- [ ] App Store screenshots and preview video
- [ ] TestFlight beta distribution
- [ ] Final legal review
- [ ] App Store submission

---

## Learning Resources (Priority Order)

| #   | Resource                                                                                  | What You'll Learn                                                                |
| --- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | **William Candillon -- "Can it be done in React Native?" (YouTube)**                      | Best RN animation channel. Watch onboarding, wallet, interpolation videos first. |
| 2   | **Reanimated Docs -- Fundamentals** (docs.swmansion.com/react-native-reanimated)          | Official walkthrough of shared values, animations, layout animations             |
| 3   | **Catalin Miron (YouTube)**                                                               | Step-by-step RN animation recreations of real app UIs                            |
| 4   | **Gesture Handler Docs -- Pan Gesture** (docs.swmansion.com/react-native-gesture-handler) | Pan gesture API, connecting gestures to Reanimated                               |
| 5   | **"Reanimated 3" by Software Mansion (YouTube)**                                          | Architecture and mental model                                                    |
| 6   | **Figma -- Design for Development/Animation tutorials**                                   | Structuring layers for export                                                    |

---

## Payout Structure Reference

### Solo Session Payouts

| Cadence | Stake | Base Payout | ROI  |
| ------- | ----- | ----------- | ---- |
| Daily   | $5    | $10         | 2x   |
| Weekly  | $25   | $60         | 2.4x |
| Monthly | $100  | $260        | 2.6x |

### Streak Multipliers

| Cadence | Milestone 1 | Milestone 2 |
| ------- | ----------- | ----------- |
| Daily   | 1.25x @ 5d  | 1.5x @ 10d  |
| Weekly  | 1.5x @ 4wk  | 2x @ 8wk    |
| Monthly | 2x @ 3mo    | 3x @ 6mo    |

### Pool Mode Payout Formula

```
Let c = equal contribution from each person
Let t_i = screen time for person i
Let t_max = maximum time in the group
Let t_bar = mean time of the group

Payout for person i:
  P_i = c                                    if t_max = t_bar (everyone equal)
  P_i = c * (t_max - t_i) / (t_max - t_bar)  otherwise
```

Lower screen time = higher payout. Subject to legal review for gambling risk.

---

## Realistic Expectations

### What the Pure Code Animation Approach CAN Achieve

- Smooth gesture-driven page transitions
- 3D phone rotation/perspective effects
- Parallax depth between illustration layers
- Color and opacity choreography
- Spring physics that feel natural and premium
- All UI micro-interactions (press, entrance, exit, layout changes)

### What It CANNOT Match (Without Dedicated Animation Tools)

- Animated characters (people walking, waving)
- Complex shape morphing (one shape flowing into another)
- 50+ independently animated elements in a single scene
- Path-following animations (elements moving along curves)

### Why That's Fine for NIYAH

NIYAH's brand is about focus, discipline, and simplicity. A clean, well-animated onboarding with strong illustrations, smooth parallax, and 3D page transitions will look more professional than 95% of apps on the App Store.

---

## Contacts & Advisors

- **Legal guidance:** VAIL (Mark & Cat), Dr. White
- **Technical consulting:** 40AU (Logan & Andrew)
- **Professor feedback:** De-risk Screen Time API, legal/gambling, and payments first

---

## Tooling Summary

| Tool                                | Role                                      | Cost                 | Status                     |
| ----------------------------------- | ----------------------------------------- | -------------------- | -------------------------- |
| Figma                               | Design illustrations, export layered SVGs | Free                 | Ready                      |
| react-native-reanimated 4.1.6       | All animations, interpolations, springs   | Free                 | Installed, unused          |
| react-native-gesture-handler 2.28.0 | Pan/tap gesture tracking                  | Free                 | Installed, unused directly |
| expo-linear-gradient 15.0.8         | Gradient backgrounds                      | Free                 | Installed, unused          |
| react-native-svg 15.15.2            | Render SVG illustrations                  | Free                 | In use (Timer)             |
| expo-haptics 15.0.8                 | Tactile feedback                          | Free                 | In use                     |
| Stripe                              | Payments                                  | Per-transaction fees | Not yet set up             |
| Firebase                            | Backend (Auth, DB, Functions)             | Free tier            | Not yet set up             |
| EAS Build                           | iOS/Android builds                        | Free tier            | Configured                 |
