#!/usr/bin/env bash
# Runs the Maestro flows in this project against a connected device.
#
#   ./scripts/run.sh                            # everything
#   ./scripts/run.sh --include-tags smoke       # one tag
#   ./scripts/run.sh --include-tags login       # one feature area
#   ./scripts/run.sh flows/login/login-screen.yaml
#   ./scripts/run.sh flows/login                # one subfolder
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# The Maestro CLI requires Java 17 or higher; this machine defaults to 11.
jdk17="/c/Program Files/Amazon Corretto/jdk17.0.20_10"
if [ -d "$jdk17" ]; then
  export JAVA_HOME="C:\Program Files\Amazon Corretto\jdk17.0.20_10"
fi

export MAESTRO_CLI_NO_ANALYTICS=1
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true

maestro="${MAESTRO_BIN:-$HOME/.maestro/bin/maestro}"
if [ ! -x "$maestro" ] && ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro CLI not found. Install it from https://docs.maestro.dev." >&2
  exit 1
fi
[ -x "$maestro" ] || maestro="$(command -v maestro)"

env_file="$root/.env"
if [ ! -f "$env_file" ]; then
  echo "Missing $env_file. Copy .env.example to .env and fill in the values." >&2
  exit 1
fi

args=(test)
while IFS= read -r line || [ -n "$line" ]; do
  # A .env saved on Windows ends each line in CR, which would otherwise ride
  # along into the value - a password with a trailing CR fails to log in.
  line="${line%$'\r'}"
  case "$line" in
    ''|'#'*) continue ;;
  esac
  args+=(-e "$line")
done < "$env_file"

# Split the caller's arguments into Maestro options and target paths. Passing
# "$@" through as-is used to replace the target instead of adding to it, so a
# flag-only invocation like `run.sh --include-tags smoke` left Maestro with no
# target and it just printed its help text.
opts=()
targets=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    # Options that take a separate value; keep the pair together.
    --include-tags|--exclude-tags|--device|--udid|--platform|--format|--output|--test-suite-name|--debug-output)
      opts+=("$1" "${2:?missing value for $1}"); shift 2 ;;
    # --opt=value and bare flags.
    -*)
      opts+=("$1"); shift ;;
    *)
      targets+=("$1"); shift ;;
  esac
done

# Target the workspace root rather than flows/ so config.yaml governs discovery.
# Maestro does not recurse into subdirectories on its own, and the flows are
# grouped into feature-area subfolders - passing 'flows' here would find none.
[ "${#targets[@]}" -gt 0 ] || targets=(.)

# Each run gets its own folder: an HTML report of every flow's result, plus
# each flow's screenshots, logs and view hierarchies. Without
# --test-output-dir Maestro 2.10 writes screenshots under ~/.maestro/tests/,
# not the working directory. A caller's own --format wins over the default.
# Not HTML-DETAILED: it lists every step as executed, and the password step
# then shows the password in clear text.
run_dir="$root/artifacts/runs/$(date +%Y%m%d-%H%M%S)"
report=(--test-output-dir "$run_dir")
case " ${opts[*]-} " in
  *" --format "*|*" --format="*) ;;
  *) report+=(--format HTML --output "$run_dir/report.html") ;;
esac
echo "Report, screenshots and logs: $run_dir"

cd "$root"
exec "$maestro" "${args[@]}" "${report[@]}" ${opts[@]+"${opts[@]}"} "${targets[@]}"
