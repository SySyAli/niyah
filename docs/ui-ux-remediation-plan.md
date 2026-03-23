# UI/UX Remediation Plan

> Structured implementation plan for shared screen scaffolds, legal acceptance, auth UX, list standardization, portrait-only layout fit, and logout/reset integrity.
> See also: [Architecture](./architecture.md) | [Features](./features.md) | [Legal](./legal.md) | [UI & Animation](./ui-animation.md)

## Goals

- Standardize repeated auth and session screen shells without hiding screen-specific content.
- Add a legally safer, product-aligned Terms + Privacy flow that works for both new and existing users.
- Make primary, secondary, and tertiary actions feel consistent across the app.
- Standardize scalable list surfaces for friends and transaction/history views.
- Keep the app portrait-only and ensure strong fit for iPhone layouts down to 4.7-inch devices.
- Prevent cross-user state leaks on logout or auth loss.

## Locked Product and Architecture Decisions

- Use shared scaffolds for layout, safe area, header, and footer only; keep screen content explicit.
- Shared components own baseline accessibility (VoiceOver roles, labels, disabled state), loading/disabled behavior, touch-target behavior, and default interaction semantics.
- Use a dedicated non-visual reset coordinator for user-scoped store cleanup. Theme store is device-level and persists across accounts; all other user-scoped stores (wallet, session, partner, groupSession, social) are cleared on logout.
- Use internal Terms and Privacy surfaces via a custom non-dismissible overlay component.
- Use the official Apple sign-in control.
- Keep onboarding carousel (`welcome.tsx`) standalone with animated scenes; do not wrap in `AuthScreenScaffold`.
- Standardize friends and transaction/history surfaces now rather than waiting for scale problems later.
- Rationalize CTA naming around existing Button variants (primary, secondary, danger, ghost, outline) rather than introducing a new parallel hierarchy.
- Support portrait only.
- Hard-support 4.7-inch iPhones and up; anything smaller may degrade gracefully.
- Keep copy/compliance cleanup in the same pass as UI work.
- Legal acceptance writes go through a Firebase Cloud Function (`acceptLegalTerms`) for tamper-resistance and server-side timestamping.
- All session screens migrate to `SessionScreenScaffold`, not just a subset.
- Tests are written incrementally per phase, not batched at the end.

## Device Support Rules

### Orientation

- Portrait only.
- Do not support landscape layouts.

### Practical QA Matrix

- 4.7-inch class: minimum hard-support target.
- 6.1-inch class: baseline modern iPhone target.
- 6.3-inch class: current Pro-class check.
- 6.5-inch / 6.9-inch class: large-phone spacing and balance check.

### Layout Rules

- If a screen risks clipping vertically on shorter phones, reflow or scale it rather than letting content fall off-screen.
- Prefer scroll-safe layouts for long auth, legal, and finance flows.
- Avoid brittle module-load sizing for controls that need to adapt to short screens.

## Legal Acceptance Model

- Terms and Privacy are accepted together as one combined acceptance.
- New users must accept during first-time onboarding before they can continue.
- Existing users must be re-prompted once on next app open if they have not accepted the current version.
- Future legal updates should automatically re-prompt users when the in-app legal version changes.
- The forced acceptance flow should appear as a custom non-dismissible overlay component after auth hydration, not as a dedicated blocking screen route.
- The legal content is scrollable. The acceptance checkbox is enabled immediately (no forced scroll-to-bottom requirement).
- Ticking the checkbox triggers haptic feedback. Pressing the confirm/finish button triggers a separate haptic feedback.
- Terms and Privacy remain viewable later from profile/account in read-only modal form with no checkbox.
- Acceptance is persisted via a Firebase Cloud Function (`acceptLegalTerms`) that records the version and a server-side timestamp, ensuring tamper-resistance.

### Minimum Acceptance Data

- `legalAcceptanceVersion`
- `legalAcceptedAt` (server-side timestamp, set by Cloud Function)

The app should compare the stored acceptance version to the current in-app legal version on startup and after auth hydration.

### Firestore Rules

- `legalAcceptanceVersion` and `legalAcceptedAt` are client-readable fields on the user document.
- Writes to these fields go through the `acceptLegalTerms` Cloud Function, not direct client writes.
- Firestore security rules should allow the Cloud Function (admin SDK) to write these fields.

## Out of Scope for This Pass

- Reducing onboarding scene count.
- Reducing onboarding looping motion.
- Landscape support.
- Tablet-specific layouts.
- Third-party UI framework adoption (including FlashList).
- Final lawyer-approved legal copy.
- Advanced accessibility (Dynamic Type, minimum contrast ratios, reduced motion).

## Phase Summary

| Phase | Outcome                                                                                         |
| ----- | ----------------------------------------------------------------------------------------------- |
| 1     | Shared auth/session scaffolds and legal acceptance flow are in place (Phases 1+2 combined)      |
| 2     | Auth UX and shared interaction behavior are standardized                                        |
| 3     | Friends, history, profile, and invite surfaces use scalable and consistent UI patterns          |
| 4     | Portrait fit, reset coordination, and logout UX are hardened                                    |
| 5     | QA, regression, and acceptance checks are complete                                              |

## Phase 1: Shared Scaffolds, Legal Versioning, and Required Acceptance

**Goal:** Remove repeated shell code from auth and session flows, and wire up the combined Terms + Privacy system — built together so the auth scaffold supports legal content slots from the start.

### Primary files likely touched

**Scaffolds:**
- `app/(auth)/auth-entry.tsx`
- `app/(auth)/check-email.tsx`
- `app/(auth)/profile-setup.tsx`
- `app/session/select.tsx`
- `app/session/propose.tsx`
- `app/session/confirm.tsx`
- `app/session/active.tsx`
- `app/session/complete.tsx`
- `app/session/surrender.tsx`
- `app/session/partner.tsx`
- `app/session/deposit.tsx`
- `app/session/withdraw.tsx`
- `app/session/stripe-onboarding.tsx`
- `src/components/` (new scaffold components, new overlay component)

**Legal acceptance:**
- `src/types/index.ts`
- `src/store/authStore.ts`
- `src/constants/config.ts` (legal version constant)
- `app/index.tsx` (legal gate check after auth redirect logic)
- `app/(auth)/profile-setup.tsx`
- `app/(tabs)/profile.tsx`
- `src/components/` (legal overlay, legal content component)
- `functions/` (new `acceptLegalTerms` Cloud Function)
- `firebase/firestore.rules`

### Implementation checklist

**Scaffolds:**
- [ ] Create `AuthScreenScaffold` with safe area, header slot, subtitle/footer slots, keyboard-safe layout support, shared spacing rules, and optional legal content slot for flows that include acceptance.
- [ ] Create `SessionScreenScaffold` with safe area, header/back area, content container, and footer CTA area.
- [ ] Migrate auth screens (`auth-entry`, `check-email`, `profile-setup`) to `AuthScreenScaffold`.
- [ ] Migrate all session screens (`select`, `propose`, `confirm`, `active`, `complete`, `surrender`, `partner`, `deposit`, `withdraw`, `stripe-onboarding`) to `SessionScreenScaffold`.
- [ ] Remove duplicated spacer/header/footer patterns left behind after migration.
- [ ] Keep screen-specific form fields, validation, and business logic inside the screens themselves.

**Legal acceptance — data layer:**
- [ ] Add `legalAcceptanceVersion` (string) and `legalAcceptedAt` (Timestamp) fields to the `User` type in `src/types/index.ts`.
- [ ] Define `CURRENT_LEGAL_VERSION` constant in `src/constants/config.ts`.
- [ ] Create `acceptLegalTerms` Firebase Cloud Function in `functions/` that validates the request, writes `legalAcceptanceVersion` and `legalAcceptedAt` (server timestamp) to the user document, and returns success.
- [ ] Update Firestore security rules to allow admin SDK writes for legal fields (no direct client writes for these fields).

**Legal acceptance — UI:**
- [ ] Create a `LegalContentView` component: centered title, scrollable plain-text body, reusable for both acceptance and read-only contexts.
- [ ] Create a `LegalAcceptanceOverlay` component: custom non-dismissible full-screen overlay using React Native `Modal` or absolute-positioned `View`. Contains `LegalContentView`, a checkbox ("I agree to the terms and conditions") that is enabled immediately, and a confirm button. Checkbox tick triggers haptic feedback. Confirm button press triggers separate haptic feedback. Confirm is disabled until checkbox is ticked.
- [ ] Add legal version comparison logic in `app/index.tsx` (after auth state is resolved): if the user is authenticated but `legalAcceptanceVersion` does not match `CURRENT_LEGAL_VERSION`, render the `LegalAcceptanceOverlay` before allowing navigation to tabs.
- [ ] Add first-time onboarding acceptance to `profile-setup.tsx` flow: after profile fields are completed, show legal acceptance as part of the completion step.
- [ ] On acceptance, call the `acceptLegalTerms` Cloud Function and update local auth store state.
- [ ] Add read-only legal access from `profile.tsx`: open `LegalContentView` in a dismissible modal with no checkbox or acceptance controls.
- [ ] Ensure existing users are re-prompted exactly once when this ships, then only again when the legal version changes later.

**Tests:**
- [ ] Unit tests for `AuthScreenScaffold` and `SessionScreenScaffold` rendering.
- [ ] Unit tests for `LegalAcceptanceOverlay` (checkbox state, haptic triggers, confirm disabled until checked).
- [ ] Unit tests for `LegalContentView` (renders in acceptance and read-only modes).
- [ ] Unit tests for legal version comparison logic.
- [ ] Integration test for `acceptLegalTerms` Cloud Function.
- [ ] Update any existing screen tests broken by scaffold migration.

### Exit criteria

- Auth screens feel visually related and share one scaffold.
- All session screens use one consistent shell.
- No screen loses explicit ownership of its unique content or flow logic.
- New users cannot finish onboarding without accepting the current legal version.
- Existing users are gated once if needed via overlay, without routing to a dedicated blocking screen.
- Accepted users are not asked again unless the legal version changes.
- Legal acceptance is tamper-resistant (server-side timestamp via Cloud Function).
- All new and modified components have tests.

## Phase 2: Auth UX, Compliance Cleanup, and Shared Interaction Rules

**Goal:** Make auth and shared interaction patterns consistent, compliant, and easier to scale.

### Primary files likely touched

- `app/(auth)/auth-entry.tsx`
- `app/(auth)/check-email.tsx`
- `src/components/Button.tsx`
- `src/components/Card.tsx`
- `app/(tabs)/index.tsx`
- `src/components/profile/PaymentHandlesCard.tsx`
- any shared text-action or CTA helper introduced in `src/components/`

### Implementation checklist

- [ ] Replace the custom Apple button with the official `AppleButton` from `@invertase/react-native-apple-authentication`. Note: the official button has fixed styling constraints (black/white only, specific label variants) — adapt layout accordingly.
- [ ] Fix the mail-opening behavior in `check-email`.
- [ ] Add visible failure feedback for resend/open-mail actions.
- [ ] Make auth entry and related auth screens keyboard-safe and scroll-safe on short phones.
- [ ] Replace inert legal-looking text with real internal navigation to the read-only legal modal.
- [ ] Align auth copy with commitment-contract language from `docs/legal.md`.
- [ ] Upgrade `Button` to own baseline VoiceOver accessibility: `accessibilityRole`, `accessibilityLabel`, `accessibilityState` (disabled, busy), and minimum 44pt touch targets.
- [ ] Rationalize CTA naming around existing Button variants (primary, secondary, danger, ghost, outline) — document which variant maps to which emphasis level. Do not introduce a parallel naming system.
- [ ] Remove bespoke action patterns that compete with the shared CTA system, including the custom dashboard action button and inconsistent button styles in `PaymentHandlesCard.tsx`.
- [ ] Normalize haptics ownership so shared controls and screen handlers do not double-fire feedback.
- [ ] Review `Card` behavior so interactive cards feel consistent and non-essential default mount animation does not fight dense screens.

**Tests:**
- [ ] Unit tests for `Button` accessibility props (role, label, state, touch target).
- [ ] Unit tests for Apple sign-in button rendering.
- [ ] Update existing tests affected by CTA and Card changes.

### Exit criteria

- Auth flow uses the correct legal/compliance surface.
- Shared controls define the default interaction rules for the app.
- CTA emphasis is visibly consistent across major screens.
- All new and modified components have tests.

## Phase 3: List Standardization and Surface Consistency

**Goal:** Replace one-off list and profile patterns with scalable, consistent UI for social, history, and profile surfaces.

### Primary files likely touched

- `app/(tabs)/friends.tsx`
- `app/(tabs)/session.tsx`
- `src/components/profile/TransactionHistory.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/profile.tsx`
- `app/user/[uid].tsx`
- `src/components/profile/ProfileHeader.tsx`

### Implementation checklist

- [ ] Convert friends from `ScrollView` + `.map()` to `FlatList` for virtualization.
- [ ] Remove nested touch conflicts between row navigation and row actions.
- [ ] Review whether `TransactionHistory` needs virtualization (currently capped at 5 items). If the cap stays, a `FlatList` conversion is not required — focus on standardizing its loading/empty/error states instead.
- [ ] Standardize the session tab (`session.tsx`) CadenceCard list alongside friends and history surfaces.
- [ ] Standardize loading, empty, and error states for friends, history, and session surfaces.
- [ ] Extract the duplicated invite CTA into a shared component.
- [ ] Standardize profile stat-strip/card treatment across profile-related screens (`profile.tsx`, `user/[uid].tsx`).
- [ ] Align small action emphasis and spacing across profile/social cards.
- [ ] Keep profile legal access read-only and modal-based (using `LegalContentView` from Phase 1).

**Tests:**
- [ ] Unit tests for friends `FlatList` rendering (empty state, loaded state, error state).
- [ ] Unit tests for shared invite CTA component.
- [ ] Unit tests for standardized loading/empty/error states.
- [ ] Update existing tests for friends, transaction history, and profile screens.

### Exit criteria

- Friends and transaction/history surfaces scale better with more data.
- Invite, profile, and stats surfaces feel like one system instead of separate widgets.
- Row actions are easier to tap without accidental navigation.
- All new and modified components have tests.

## Phase 4: Portrait Fit, Reset Coordination, and Logout UX

**Goal:** Harden the app for shorter phones, keep orientation rules explicit, and prevent any cross-user state leakage.

### Primary files likely touched

- `app.config.ts` (if orientation confirmation is needed)
- `src/components/NumPad.tsx`
- `src/components/MoneyPlant.tsx`
- `app/invite.tsx`
- `app/(auth)/welcome.tsx`
- `src/store/authStore.ts`
- `src/store/walletStore.ts`
- `src/store/sessionStore.ts`
- `src/store/partnerStore.ts`
- `src/store/groupSessionStore.ts`
- `src/store/socialStore.ts`
- `src/store/` (new reset coordinator module)

### Implementation checklist

**Portrait fit:**
- [ ] Confirm portrait-only configuration in `app.config.ts`.
- [ ] Audit short-phone fit on 4.7-inch layouts and up.
- [ ] Replace brittle sizing where it causes clipping, especially in money-entry flows.
- [ ] Ensure vertically risky screens reflow or scroll instead of clipping.
- [ ] Review invite, auth, numpad, and money-plant surfaces for short-screen fit. `MoneyPlant` may need a size-aware rendering mode rather than just reflow.
- [ ] Review `welcome.tsx` carousel for short-screen fit (standalone, not scaffolded).

**Reset coordination:**
- [ ] Add a `reset()` action to each user-scoped store: `walletStore`, `sessionStore`, `partnerStore`, `groupSessionStore`, `socialStore`.
- [ ] Do NOT add reset to `themeStore` — theme is a device-level preference that persists across accounts.
- [ ] Create a non-visual reset coordinator module (e.g., `src/store/resetCoordinator.ts`) that calls `reset()` on all user-scoped stores in sequence.
- [ ] Route `authStore.logout()` and auth-loss cleanup through the reset coordinator.
- [ ] Add a brief visible signing-out state in the UI while the reset and sign-out finish.
- [ ] Verify no prior-user wallet/session/social data persists after logout. Firestore retains all data server-side; only the local client-side cache is cleared.

**Tests:**
- [ ] Unit tests for each store's `reset()` action (verify state returns to initial values).
- [ ] Unit test for reset coordinator (calls all store resets, does not touch theme).
- [ ] Unit test for logout flow (reset coordinator is invoked, signing-out state is shown).
- [ ] Update existing tests for any layout changes.

### Exit criteria

- The app holds together on 4.7-inch portrait layouts.
- Sign-out visibly transitions and reliably clears user-scoped state.
- No stale prior-user data remains after logout/auth loss.
- Theme preference persists across account switches on the same device.
- All new and modified components have tests.

## Phase 5: QA, Regression, and Release Readiness

**Goal:** Validate the flows introduced above before feature work resumes.

### Implementation checklist

- [ ] Validate new-user onboarding legal acceptance (checkbox, haptics, Cloud Function write).
- [ ] Validate existing-user re-prompt after auth hydration (overlay appears, cannot be dismissed, acceptance works).
- [ ] Validate read-only legal access from profile/account (no checkbox, dismissible).
- [ ] Validate CTA consistency and touch targets across auth, profile, friends, and session flows.
- [ ] Validate portrait fit on the target device classes (4.7", 6.1", 6.3", 6.5"/6.9").
- [ ] Validate logout/reset integrity: sign-out clears all user-scoped stores, theme persists, signing-out state is visible.
- [ ] Validate no prior-user data visible between account switches.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm typecheck`.
- [ ] Run full test suite (`pnpm test`) — all existing + new tests must pass.
- [ ] Perform manual pass on auth, friends, history, profile, deposit, withdraw, and all session flows.

### Exit criteria

- Legal acceptance works correctly for both new and existing users.
- Shared UI rules hold across the reviewed surfaces.
- All tests pass (existing + new from Phases 1–4).
- Regression checks are clean enough to begin broader feature work.

## Implementation Notes

### Legal Surfaces

- Keep Terms and Privacy simple: centered title, scrollable plain-text body.
- During onboarding or re-prompt, present via `LegalAcceptanceOverlay` (custom non-dismissible overlay). Content is scrollable; checkbox is enabled immediately (no forced scroll-to-bottom). Haptic feedback on checkbox tick and on confirm button press.
- In profile/account, present the same `LegalContentView` in a dismissible modal with no acceptance controls.
- Acceptance writes go through `acceptLegalTerms` Cloud Function for server-side timestamping and tamper-resistance.

### Legal Gate Placement

- The legal version check lives in `app/index.tsx`, which already handles the authenticated/unauthenticated routing decision. After auth state resolves and the user is authenticated, compare `user.legalAcceptanceVersion` against `CURRENT_LEGAL_VERSION`. If they don't match, render the `LegalAcceptanceOverlay` before allowing navigation to tabs. This is the most secure location because it is the single entry point for all authenticated navigation.

### Modal Infrastructure

- Use a custom overlay component (not Expo Router `presentation: 'modal'`) for the legal acceptance gate. This ensures the overlay cannot be dismissed via swipe gestures or back navigation. Implementation: either React Native's `Modal` component with `onRequestClose` as a no-op, or an absolute-positioned `View` covering the full screen.
- Read-only legal views from profile can use a standard dismissible modal.

### Reset Coordination

- The reset coordinator should be non-visual.
- It clears every user-scoped store: wallet, session, partner, groupSession, social.
- It does NOT clear theme (device-level preference).
- The UI only needs to show a brief signing-out state while the reset and sign-out finish.
- All data remains in Firestore — clearing local stores only removes the on-device cache.

### CTA Rationalization

- The existing Button variants (primary, secondary, danger, ghost, outline) map to the CTA emphasis levels: primary = high emphasis, secondary/outline = medium emphasis, ghost = low emphasis, danger = destructive action.
- Document this mapping in a comment or constants file. Do not create a parallel naming system.

### Accessibility Baseline (This Pass)

- VoiceOver `accessibilityRole` on interactive elements.
- `accessibilityLabel` on buttons and controls without visible text labels.
- `accessibilityState` for disabled and busy/loading states.
- Minimum 44pt touch targets on interactive controls.
- Out of scope for this pass: Dynamic Type, minimum contrast ratios, reduced motion support.

### Copy and Compliance Guardrails

- Avoid: `bet`, `wager`, `gamble`, `win`.
- Prefer: `stake`, `commitment`, `goal`, `complete`.
- Keep the app framed as a productivity and commitment-contract product, not a game of chance.

## Draft Plain-Text Legal Content Direction

**Important:** The content below is placeholder copy direction for product implementation, not final legal advice. It should be reviewed by counsel before release.

### Terms of Service - Draft Direction

Opening language should clearly state that Niyah is a productivity app and commitment-contract service. It should explain that users stake money as a commitment device to support focus goals, and that session outcomes depend on user action rather than chance, luck, or random events.

Minimum plain-text sections to include:

- Overview of the service and commitment-contract framing.
- Eligibility and account responsibilities.
- How sessions, stakes, and payouts/settlements work.
- Clear statement that Niyah is not a gambling, gaming, lottery, or betting service.
- Payment, withdrawal, and settlement disclaimers tailored to the current product phase.
- User conduct, abuse prevention, and suspension/termination rights.
- Warranty/liability limitations appropriate for a consumer app.
- Contact information and update/version notice.

### Privacy Policy - Draft Direction

Opening language should explain what information the app collects, why it is collected, and how it is used to provide authentication, focus sessions, wallet/account features, social features, and legal/compliance records.

Minimum plain-text sections to include:

- What data is collected: account info, profile info, session data, social data, payment-related identifiers, device/app telemetry if applicable, and legal acceptance records.
- How data is used to operate the app.
- Service providers and infrastructure used to process data, such as Firebase and Stripe where applicable.
- Data retention and deletion expectations.
- User rights and account choices.
- Security and risk disclosure written accurately and without overpromising.
- Contact information and update/version notice.

## Build Order Recommendation

When implementation starts, build in this order:

1. `AuthScreenScaffold` + `SessionScreenScaffold` components
2. Migrate auth screens to scaffold
3. Migrate all session screens to scaffold
4. Legal data layer: User type fields, `CURRENT_LEGAL_VERSION` constant, `acceptLegalTerms` Cloud Function, Firestore rules
5. `LegalContentView` + `LegalAcceptanceOverlay` components
6. Legal gate in `app/index.tsx`
7. First-time onboarding acceptance in `profile-setup.tsx`
8. Read-only legal view from `profile.tsx`
9. Tests for scaffolds and legal flow
10. Apple sign-in button replacement + auth compliance cleanup
11. Button accessibility + CTA rationalization
12. Card and haptics normalization
13. Tests for auth UX and interaction changes
14. Friends `FlatList` conversion
15. Transaction history / session tab standardization
16. Profile/invite/stat surface consistency
17. Tests for list and surface changes
18. Portrait-fit audit and fixes
19. Store `reset()` actions + reset coordinator
20. Logout UX with signing-out state
21. Tests for portrait fit and reset
22. Full QA and regression
