#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# dev-device.sh — Build, install, and connect to a USB-connected iOS device.
#
# This script:
#   1. Kills any stale Metro / iproxy processes
#   2. Builds the native app and installs it on the device via USB
#   3. Starts iproxy to forward port 8081 over USB (no WiFi needed)
#   4. Starts Metro so the dev client connects automatically
#
# Requirements:
#   - iPhone connected via USB (Lightning or USB-C)
#   - iproxy installed: brew install libimobiledevice
#   - Xcode + Command Line Tools
#
# Usage:
#   pnpm build:local          # full build + connect
#   pnpm start:device         # skip build, just connect (for JS-only changes)
# ──────────────────────────────────────────────────────────────────────────────

set -e

METRO_PORT="${METRO_PORT:-8081}"
SKIP_BUILD="${SKIP_BUILD:-false}"

# ── Preflight ─────────────────────────────────────────────────────────────────

if ! command -v iproxy &>/dev/null; then
  echo "✗ iproxy not found. Install it with:"
  echo "  brew install libimobiledevice"
  exit 1
fi

# ── Cleanup stale processes ───────────────────────────────────────────────────

echo "› Cleaning up stale processes..."
# Kill any existing iproxy on our port
lsof -ti:"$METRO_PORT" -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
pkill -f "iproxy.*$METRO_PORT" 2>/dev/null || true
sleep 0.5

# ── Build (optional) ─────────────────────────────────────────────────────────

if [ "$SKIP_BUILD" = "false" ]; then
  echo "› Building and installing on device..."
  npx expo run:ios --device --no-bundler
  echo ""
  echo "✓ App installed on device"
fi

# ── Start USB tunnel ─────────────────────────────────────────────────────────

echo "› Starting USB port forwarding (port $METRO_PORT)..."
iproxy "$METRO_PORT:$METRO_PORT" &
IPROXY_PID=$!

# Make sure iproxy gets cleaned up on exit
cleanup() {
  echo ""
  echo "› Stopping USB tunnel (pid $IPROXY_PID)..."
  kill "$IPROXY_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep 0.5

# ── Start Metro ───────────────────────────────────────────────────────────────

echo "› Starting Metro on localhost:$METRO_PORT..."
echo "  Your phone connects via USB — no WiFi needed."
echo ""

# --host localhost binds Metro to 127.0.0.1 only. iproxy tunnels the
# phone's localhost:8081 → Mac's localhost:8081 over the USB cable.
npx expo start --dev-client --host localhost --port "$METRO_PORT"
