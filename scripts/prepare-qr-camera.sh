#!/usr/bin/env bash
# Shows the QR code that flows scan to the emulator's camera - the same as
# prepare-qr-camera.ps1, which explains why: walk the camera to the virtual
# room's wall poster, then flash QR_CODE_PATH on it (2 s up, 10 s down) in
# the background, so the scanner reads it once and its "Code already
# scanned" banner clears off Submit in the gaps.
#
#   ./scripts/prepare-qr-camera.sh                      # emulator-5554, 30 min
#   ./scripts/prepare-qr-camera.sh emulator-5556 60
#   ./scripts/prepare-qr-camera.sh --stop [device]
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
stop=false
if [ "${1:-}" = "--stop" ]; then stop=true; shift; fi
device="${1:-emulator-5554}"
minutes="${2:-30}"
pid_file="${TMPDIR:-/tmp}/hcm-qr-camera-$device.pid"

sdk=""
for candidate in "${ANDROID_HOME:-}" "${ANDROID_SDK_ROOT:-}" "${LOCALAPPDATA:-}/Android/Sdk" "$HOME/Library/Android/sdk" "$HOME/Android/Sdk"; do
  if [ -n "$candidate" ] && [ -d "$candidate/emulator" ]; then sdk="$candidate"; break; fi
done
if [ -z "$sdk" ]; then
  echo "Android SDK not found (ANDROID_HOME, ANDROID_SDK_ROOT or the default location)." >&2
  exit 1
fi
adb="$(command -v adb || echo "$sdk/platform-tools/adb")"

# The emulator reads these paths itself, so on Windows hand it Windows paths.
native() { if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else echo "$1"; fi; }

console() {
  local out
  out="$("$adb" -s "$device" emu "$@" 2>&1 || true)"
  case "$out" in
    *OK*) ;;
    *) echo "adb emu $* failed: $out" >&2; return 1 ;;
  esac
}

stop_blinking() {
  if [ -f "$pid_file" ]; then
    kill "$(cat "$pid_file")" 2>/dev/null || true
    rm -f "$pid_file"
  fi
  # Back to the room's own poster, so no other scanner reads the code.
  console virtualscene-image wall || true
}

if $stop; then
  stop_blinking
  echo "Stopped showing the QR code on $device."
  exit 0
fi

env_file="$root/.env"
if [ ! -f "$env_file" ]; then
  echo "Missing $env_file. Copy .env.example to .env and fill in the values." >&2
  exit 1
fi
# QR_CODE_PATH only - nothing else is read out of .env.
qr_relative="$(grep -E '^[[:space:]]*QR_CODE_PATH[[:space:]]*=' "$env_file" | head -1 | cut -d= -f2- | tr -d '\r' | xargs || true)"
if [ -z "$qr_relative" ]; then
  echo "QR_CODE_PATH must be set in .env (e.g. assets/qr/cdd_qr.png)." >&2
  exit 1
fi
qr="$root/$qr_relative"
if [ ! -f "$qr" ]; then
  echo "QR code image not found at $qr (QR_CODE_PATH=$qr_relative)." >&2
  exit 1
fi
qr_native="$(native "$qr")"
macros="$sdk/emulator/resources/macros"

stop_blinking

# Start from the default pose so a second run lands in the same place. Each
# macro returns at once and plays on; the walk lasts about 20 seconds.
echo "Walking the $device camera up to the wall poster"
console automation play "$(native "$macros/Reset_position")"
sleep 3
console automation play "$(native "$macros/Walk_to_image_room")"
sleep 30

(
  end=$(( $(date +%s) + minutes * 60 ))
  trap 'console virtualscene-image wall || true; rm -f "$pid_file"' EXIT
  while [ "$(date +%s)" -lt "$end" ]; do
    console virtualscene-image wall "$qr_native" || true
    sleep 2
    console virtualscene-image wall || true
    sleep 10
  done
) >/dev/null 2>&1 &
echo $! > "$pid_file"
echo "Showing $qr_relative to the camera in bursts for $minutes minutes (stop with --stop)."
