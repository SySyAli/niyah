# Group Session MVP — Implementation Plan

## Architecture Decisions (Confirmed)

| Decision | Choice |
|----------|--------|
| Session start model | "Start Now" only for v1 (scheduling deferred to v2) |
| Real-time sync | Firestore `onSnapshot` listeners |
| Stake timing | Deducted on invite accept (refunded if cancelled) |
| Session config | Cadence durations + custom stake override |
| Notifications | FCM push + in-app banners + share link for invites |
| Trust model | Server-authoritative (Cloud Function validates completion) |
| Payments | Full Stripe Connect (all testers do KYC) |
| No-shows | Wait for everyone + manual cancel + auto-timeout (30 min) with full refunds |
| Scheduling | "Start Now" only for v1 — proposer hits Start when all accepted. Scheduling deferred. |
| Timeout | Proposer can cancel anytime; auto-cancel after 30 min if not all ready. Full refunds. |
| FCM/APNs | Build full FCM code; user will configure APNs key separately. Manual steps listed at end. |

---

## Workstreams (Can Run in Parallel)

### Workstream A: Firestore Schema + Security Rules
**No dependencies. Can start immediately.**

1. **Design Firestore collections:**
   - `groupSessions/{sessionId}` — the session document
     ```
     {
       id, proposerId, status: "pending" | "ready" | "active" | "completed" | "cancelled",
       cadence, stakePerParticipant, customStake: boolean,
       duration (ms),
       participantIds: string[],  // for security rules
       participants: { [userId]: { name, venmoHandle, profileImage, reputation,
                                    accepted: bool, online: bool, completed?: bool,
                                    surrendered?: bool, surrenderedAt?: Timestamp } },
       poolTotal, startedAt?, endsAt?, completedAt?,
       payouts?: { [userId]: number },
       transfers?: SessionTransfer[],
       createdAt, updatedAt,
       autoTimeoutAt?: Timestamp  // 30 min after last accept, for auto-cancel
     }
     ```
   - `groupInvites/{inviteId}` — individual invite per user (for querying "my invites")
     ```
     {
       sessionId, fromUserId, fromUserName, fromUserImage?,
       toUserId, stake, cadence, duration,
       status: "pending" | "accepted" | "declined" | "expired",
       createdAt, respondedAt?
     }
     ```

2. **Write Firestore security rules:**
   - `groupSessions`: participants can read; only Cloud Functions write (admin SDK)
   - `groupInvites`: recipient can read + update (accept/decline); proposer can read; Cloud Functions create

3. **Add composite indexes** for common queries (invites by toUserId+status, sessions by participantIds+status)

---

### Workstream B: Cloud Functions — Session Lifecycle (Server-Authoritative)
**Depends on: Schema from Workstream A (design only, not deployed)**

1. **`createGroupSession`** — Proposer creates session + invites
   - Validates: auth, stake bounds, participant count (2-20), proposer has enough balance
   - Creates `groupSessions` doc with status="pending"
   - Creates `groupInvites` doc for each invitee
   - Deducts stake from proposer's wallet (they auto-accept)
   - Sends FCM to all invitees (Workstream D wires this up)
   - Returns: sessionId

2. **`respondToGroupInvite`** — Accept or decline
   - Validates: auth, invite belongs to user, invite is pending
   - If accept: deducts stake from user's wallet, updates invite status, updates session participant
   - If decline: updates invite, removes from session participants
   - If all accepted → set status="ready", set `autoTimeoutAt` = now + 30 min
   - Sends FCM to proposer ("X accepted/declined")

3. **`markOnlineForSession`** — User signals they're ready
   - Updates `participants[userId].online = true` in session doc
   - Returns current session state (who's online)

4. **`startGroupSession`** — Proposer manually starts when all are ready
   - Validates: auth, user is proposer, status="ready", all participants online
   - Sets status="active", startedAt=now, endsAt=now+duration
   - Sends FCM to all: "Session started!"

5. **`reportSessionStatus`** — Client reports completion or surrender
   - Validates: auth, session is active, user is participant
   - If surrender: sets `participants[userId].surrendered=true, surrenderedAt=now`
   - If complete: **validates server time >= endsAt** (with 60s grace for cold start), sets `completed=true`
   - After each report: checks if ALL participants have reported → triggers `finalizeGroupSession`

6. **`finalizeGroupSession`** (internal, called by #5)
   - Calculates payouts server-side (same algorithm)
   - Creates Stripe transfers to winners' Connect accounts
   - Credits wallets in Firestore
   - Creates transaction records
   - Sets session status="completed", writes payouts + transfers
   - Sends FCM: "Session complete! You earned $X"

7. **`cancelGroupSession`** — Proposer cancels before start
   - Validates: auth, user is proposer, session not active
   - Refunds all accepted participants' stakes
   - Updates all invites to "expired"
   - Sets session status="cancelled"
   - Sends FCM: "Session cancelled by [proposer]. Stake refunded."

8. **`autoTimeoutGroupSession`** — Scheduled Cloud Function (runs every 5 min)
   - Queries sessions where status="ready" AND `autoTimeoutAt < now`
   - For each: refunds all stakes, sets status="cancelled", sends FCM
   - Prevents sessions from being stuck forever

---

### Workstream C: Client-Side Store + Real-Time Listeners
**Depends on: Schema from A, Cloud Function interfaces from B**

1. **Update `groupSessionStore.ts`:**
   - Replace local-only `startGroupSession()` with Cloud Function call
   - Add `subscribeToSession(sessionId)` — onSnapshot listener
   - Add `subscribeToInvites(userId)` — onSnapshot for pending invites
   - Add `acceptInvite(inviteId)` / `declineInvite(inviteId)` → Cloud Function calls
   - Add `markOnline(sessionId)` → Cloud Function call
   - Add `reportCompletion(sessionId)` / `reportSurrender(sessionId)` → Cloud Function calls
   - Keep local `activeGroupSession` state synced from onSnapshot
   - Add `pendingInvites: GroupInvite[]` state
   - Add `unsubscribe` cleanup methods

2. **Update `walletStore.ts`:**
   - Handle "held" funds concept (stake deducted on accept, shown as pending)
   - Add `pendingStakes` tracking so balance display shows available vs held

3. **Session recovery on app restart:**
   - In `authStore.initialize()`, check for active group sessions in Firestore
   - Resubscribe to onSnapshot if session found
   - Handle edge case: session completed while app was closed

---

### Workstream D: FCM Push Notifications
**Can start in parallel. No dependency on other workstreams until integration.**

1. **Install & configure `@react-native-firebase/messaging`:**
   - Add to package.json
   - Update app.config.ts plugins
   - Add APNs key/cert configuration

2. **FCM token management (authStore):**
   - On login: request notification permission, get FCM token
   - Store token in `users/{uid}.fcmTokens[]` (array for multiple devices)
   - Refresh token on app start
   - Remove token on logout

3. **Cloud Function notification helpers:**
   - `sendGroupInviteNotification(toUserId, fromUserName, stake, sessionId)`
   - `sendInviteResponseNotification(toUserId, responderName, accepted)`
   - `sendSessionStartNotification(participantIds, sessionId)`
   - `sendSessionCompleteNotification(participantIds, payouts)`

4. **Client-side notification handling:**
   - Foreground: in-app banner/toast (custom component)
   - Background: system notification with deep link to session
   - Deep link routing: `niyah://session/{sessionId}` → navigate to correct screen

5. **Share link for invites:**
   - Generate dynamic link: `https://{project}.firebaseapp.com/invite/{sessionId}`
   - Share via `Share.share()` with message like "Join my focus session on NIYAH! $5 stake, 1 hour. [link]"
   - Handle deep link in `_layout.tsx` → navigate to invite acceptance screen

---

### Workstream E: UI Updates
**Depends on: Store changes from C (interfaces), but can stub and build in parallel**

1. **New screen: `app/session/invites.tsx`** — List of pending invites
   - Shows invites from onSnapshot subscription
   - Each invite: proposer name/avatar, stake, duration, schedule
   - Accept / Decline buttons
   - Badge count on Focus tab

2. **Update `app/session/propose.tsx`:**
   - Wire "Propose Challenge" to `createGroupSession` Cloud Function
   - Add cadence selector alongside custom duration
   - Add custom stake input (override cadence default)
   - Show loading state while creating
   - On success: navigate to session waiting room

3. **New screen: `app/session/waiting-room.tsx`** — Pre-session lobby
   - Shows who's accepted, who's pending, who's declined
   - Real-time updates via onSnapshot
   - "Start Now" button (enabled when all accepted + all online, proposer only)
   - "Ready" toggle for each participant (marks online via `markOnlineForSession`)
   - Cancel button (proposer only)
   - Share invite link button
   - Auto-timeout countdown: "Session auto-cancels in X minutes if not started"

4. **Update `app/session/active.tsx`:**
   - Subscribe to session onSnapshot for real-time participant status
   - Show when teammates surrender (live update)
   - Remove local-only completion logic → call `reportCompletion` Cloud Function
   - Show "Waiting for server..." state after timer ends

5. **Update `app/session/surrender.tsx`:**
   - Call `reportSurrender` Cloud Function instead of local store
   - Show confirmation that server acknowledged

6. **Update `app/session/complete.tsx`:**
   - Read payouts + transfers from Firestore session doc (via onSnapshot)
   - Settlement UI stays mostly the same

7. **Update `app/(tabs)/session.tsx` (Focus tab):**
   - Add invites badge/banner at top
   - Show active group session if one exists
   - "Pending Invites (3)" section

8. **Update `app/(tabs)/index.tsx` (Dashboard):**
   - Show pending invites count
   - Show group session history from Firestore (not just local)

---

### Workstream F: Stripe Connect Onboarding Flow Testing
**Independent. Can start immediately.**

1. **Verify `stripe-onboarding.tsx` works end-to-end in test mode**
2. **Test with all 4 team members:**
   - Each person deposits $5-10 via the deposit screen
   - Each person completes Stripe Connect KYC
   - Verify `stripeAccountStatus: "active"` in Firestore for all
3. **Test `distributeGroupPayouts` Cloud Function manually:**
   - Call with test data to verify Stripe transfers work
   - Confirm balances update correctly

---

## Dependency Graph & Parallel Execution

```
Week 1 (Can all start Day 1):
├── Workstream A: Firestore Schema + Rules .............. (1-2 days)
├── Workstream D: FCM Setup + Token Management .......... (2-3 days)
├── Workstream F: Stripe Connect Testing ................ (1 day setup, ongoing)
│
Week 1-2 (Start once A is designed):
├── Workstream B: Cloud Functions ........................ (3-4 days)
│   └── createGroupSession, respondToInvite, markOnline,
│       reportStatus, finalizeSession, cancelSession
├── Workstream C: Client Store + Listeners .............. (2-3 days)
│   └── Can stub Cloud Function interfaces and build
│
Week 2 (Start once B+C interfaces exist):
├── Workstream E: UI Updates ............................ (3-4 days)
│   └── invites screen, waiting room, propose wiring,
│       active/complete screen updates, tab badges
│
Week 2-3: Integration + Testing
├── Wire FCM notifications into Cloud Functions
├── End-to-end test: propose → invite → accept → start → complete → payout
├── Fix bugs, polish UI
```

## What Can Be Done in Parallel RIGHT NOW

| Task | Workstream | Blocks |
|------|------------|--------|
| Design Firestore schema + write rules | A | B, C |
| Install FCM, token management, permission flow | D | Nothing (independent) |
| Test Stripe Connect onboarding with team | F | Nothing (independent) |
| Stub Cloud Function interfaces (TypeScript types) | B | C, E |
| Build invites screen UI (with mock data) | E | Nothing (can stub) |
| Build waiting room screen UI (with mock data) | E | Nothing (can stub) |

## Risk Areas

1. **Stripe Connect in test mode** — test mode has limitations (can't do real payouts). Need to verify the test→live transition path.
2. **Server-authoritative timer** — Cloud Functions have cold start latency (~1-3s). Using 60s grace period to account for this.
3. **onSnapshot costs** — each listener = 1 read per update. With 4 participants writing status, that's ~16 reads per session lifecycle. Very cheap but worth noting for scale.
4. **Auto-timeout cron** — Firebase scheduled functions need Cloud Scheduler API enabled in GCP console.

---

## Manual Steps Required (After Code Is Built)

### APNs Configuration for iOS Push Notifications
1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Create a new **APNs Authentication Key** (Key type: Apple Push Notifications service)
3. Download the `.p8` file — you only get ONE download
4. Note the **Key ID** (10-character string) and your **Team ID**
5. Go to [Firebase Console](https://console.firebase.google.com) → Project Settings → Cloud Messaging
6. Under "Apple app configuration", upload the `.p8` file
7. Enter the Key ID and Team ID
8. Save — FCM will now route through APNs for iOS

### Stripe Connect Live Mode (When Ready for Real Money)
1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Settings → Connect
2. Complete Stripe's platform onboarding (business verification)
3. Switch from test to live API keys
4. Update Firebase Secret Manager: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` with live keys
5. Update `.env`: `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` with live publishable key
6. Re-deploy Cloud Functions: `cd functions && npm run deploy`
7. Each tester re-does Stripe Connect onboarding (test accounts don't carry over)

### Firebase Cloud Scheduler (for auto-timeout)
1. Go to GCP Console → APIs & Services → Enable "Cloud Scheduler API"
2. Deploy the scheduled function — it auto-registers the cron job

### Tester Onboarding Checklist (Per Person)
1. Install the dev build on their phone
2. Sign in (Google/Apple/Email)
3. Complete Stripe Connect KYC (stripe-onboarding screen)
4. Deposit $5+ via the deposit screen
5. Grant notification permissions when prompted
6. Verify balance shows in wallet
