# Security

> Security measures, key management, and protection layers.
> See also: [Development](./development.md) | [Architecture](./architecture.md)

## Overview

The repo is **public** (school requirement). Security cannot depend on hiding code. All secrets are managed via environment variables, Firebase Secret Manager, or cloud provider configuration.

## Completed Security Work

### Server-Side Validation (Cloud Functions)

All 24 Cloud Functions validate:

- Firebase Auth token (`context.auth.uid`)
- Request parameters (types, ranges, required fields)
- Rate limiting on sensitive operations (deposits, withdrawals, session actions)
- Amount bounds and balance checks

### Firestore Security Rules

Hardened rules in `firebase/firestore.rules` covering:

- `users` -- owner read/write, public read for select fields
- `wallets` -- owner read only, no client writes (server-managed)
- `sessions` -- owner read/write with field validation
- `userFollows` -- owner write, read for social queries
- Default deny for unmatched collections

**Deploy**: `firebase deploy --only firestore:rules`

### Client-Side Protections

- **SSL Pinning** (`src/config/sslPinning.ts`) -- pins CA-level public keys for Cloud Functions endpoint. Safety valve expires 2027-01-01 (degrades to normal TLS, never bricks). No-op in `__DEV__` and on web.
- **Screen Protection** (`src/hooks/useScreenProtection.ts`) -- prevents screenshots, screen recording, and blurs app switcher preview. Uses `expo-screen-capture` with graceful fallback if unavailable.
- Both modules use lazy `require()` with try/catch for graceful failure.

## Environment Variables & Secrets

### Client-Side (`.env`)

Read by `app.config.ts` at build time. Values are `EXPO_PUBLIC_*` prefixed (embedded in JS bundle -- these are NOT secrets, just config that shouldn't be hardcoded in source).

See [Development > Environment Variables](./development.md#environment-variables) for the full list.

### Server-Side (Firebase Secret Manager)

True secrets that never touch client code:

- `STRIPE_SECRET_KEY` -- set via `firebase functions:secrets:set STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` -- set via `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET`
- `GCLOUD_PROJECT` / `GCP_PROJECT` -- auto-set by Firebase runtime

### Firebase Config Files

`GoogleService-Info.plist` and `google-services.json` are **gitignored**. They contain API keys that, while designed to be public (embedded in every compiled app binary), were removed from the repo for defense-in-depth.

- **Local dev**: files live in `firebase/`, injected by config plugins at build time
- **EAS cloud builds**: uploaded as file secrets (see [Development](./development.md#environment-variables))
- **Key rotation**: done in GCP Console > Credentials > Regenerate, then re-download from Firebase Console

## API Key Management

### Rotated Keys

All keys were rotated after removing config files from the repo:

- iOS API key (restricted to bundle ID `com.niyah.app`)
- Android API key (no fingerprint restriction yet -- add SHA-256 when first Android build is done)
- Browser API key (no restrictions)
- Stripe publishable key (updated in `.env`)
- Stripe secret key (updated in Firebase Secret Manager)

### Keys That Should NOT Be Rotated

- **OAuth Client IDs** -- used for Google Sign-In, different from API keys. Rotating breaks auth.

### Remaining Security Work

- **Firebase App Check** -- biggest remaining gap. Without it, anyone with the project ID can call Cloud Functions. Needs Firebase Console setup + `context.app` check in functions.
- **Android API key restriction** -- add SHA-256 fingerprint when first Android build is done via EAS.
- **Delete old rotated keys** -- remove deprecated keys in GCP Console after confirming stability.
- ~~Node.js runtime upgrade~~ -- Done. Cloud Functions upgraded to Node.js 22.
