# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Maestro (Android) UI automation for the eGov HCM app (`com.digit.hcm` 2.2.113, mhbase tenant, UAT, Flutter-rendered). There is no build or unit-test step: the "code" is Maestro YAML flows plus small JavaScript helpers. [README.md](README.md) is the full manual and [TEST-CASES.md](TEST-CASES.md) the case register; read the README's **Conventions** section before writing selectors.

## Commands

Maestro needs Java 17. The runner scripts pin `JAVA_HOME` to `C:\Program Files\Amazon Corretto\jdk17.0.20_10` for their own process; calling `maestro` directly from a shell needs the same:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Amazon Corretto\jdk17.0.20_10'; $env:Path = "$env:JAVA_HOME\bin;$env:Path"
```

```powershell
.\scripts\run.ps1 -Flow flows\stock\hf-stock-accept-receipt.yaml -Device emulator-5554   # one flow
.\scripts\run.ps1 -Flow flows\login                                                       # a folder
.\scripts\run.ps1 -Tags smoke            # by tag; -ExcludeTags consumes-data,qr-camera to skip data-consuming / camera flows
maestro check-syntax <file.yaml>         # validate a flow or subflow (with JAVA_HOME set)
maestro --device emulator-5554 hierarchy # dump the live view hierarchy (JSON) - the source of truth for selectors
.\scripts\prepare-qr-camera.ps1          # before qr-camera flows; -Stop afterwards
```

`run.sh` is the bash twin. The runners forward every `.env` key as `-e KEY=VALUE` and write each run to `artifacts/runs/<yyyyMMdd-HHmmss>/` (`report.html`, screenshots, `maestro.log`). Long runs (sign-in alone takes 3-5 min) go in the background.

## Credentials and run output

- Credentials live only in `.env` (gitignored; `.env.example` is the tracked template). Never type, echo or pass passwords anywhere else - no MCP `run` with credentials, no flow-level `env:` values for them. Anything that signs in runs through `scripts/run.ps1`. When checking `.env`, check key presence, not values.
- `commands.json` and `logs/maestro.log` in a run folder contain the typed password. Share only `report.html` and screenshots.
- Never type invented credentials or data into the app.
- Accepting, dispatching, returning and reconciling stock, creating referrals, registering households and recording doses are irreversible and write to UAT: confirm with the user before running anything that submits, unless the current prompt explicitly asks for it.

## Architecture

- `flows/` - runnable tests only (`config.yaml` discovers `flows/**`), grouped by area: `login/`, `onboarding/`, `stock/`, `referral/` (health facility Beneficiary Referral), `registration/` (the CDD's Registration & Delivery). Each flow is self-contained and starts from `launch-app.yaml` (`clearState`, no permissions granted).
- `subflows/` - building blocks pulled in with `runFlow`; never run on their own. Layers:
  - `launch-app.yaml` → `login.yaml` (the only login; takes `LOGIN_USER_ID`/`LOGIN_PASSWORD`) → `sign-in/<role>.yaml` (hands that role's `.env` pair to `login.yaml`, gets through Allow Permissions) → `home/<role>.yaml` (boundary selection + Submit + home screen).
  - `stock/` - shared stock steps (`download-stock-data`, `read-stock-balance`, `open-stock-form`, `scan-team-code`, `back-to-home`) and one folder per feature (`accept-receipt/`, `dispatch/`, `return/`, `hf-receipt/`, `reconciliation/`, `reports/`). The state user's and the health facility's flows share these; the caller passes the differences (recipient, role, prerequisite, expected data) as `env`.
  - `referral/` and `registration/` - one folder per feature, each with its own `*.js` report; `registration/` reuses `stock/accept-receipt/` for the CDD's receipt.
  - `fail.yaml` - the one way to fail with a readable message.
- JavaScript helpers (`*.js` next to their YAML) hold the book-keeping: Maestro JS cannot read the screen, so YAML copies text into `maestro.copiedText`, a script parses it into `output.<name>`, and YAML reads the result back. Scripts never throw (a thrown error reports as "Unknown error"); they leave a reason in `output.*.failure` and the YAML calls `fail.yaml`. Variables a caller may not pass are read with `typeof X === 'undefined'`.
- Specs that contradict the app (Prompt 8 reconciliation, Prompt 9 reports) use "soft" checks: every case runs, each difference is logged as `DEVIATION - …` / a finding, and the flow fails once at the end with the full list.

## Stock data is device-local

Balances, incoming transactions, reconciliation stock-in-hand, View Reports and the CDD's downloaded beneficiary IDs are built from records on the device. `clearState` (every flow's sign-in) loses them, and Download Stock Data brings each record down once. Consequences:

- Stock prompts that build on each other (receive → dispatch → return → reconcile) only pass when run in **one session**. Verified runs used scratchpad "in-session" wrappers - the committed flow's steps minus its sign-in - against the already signed-in app. Don't wipe the app while a session holds stock someone needs.
- Before wiping, make sure the session synced: Sync Data must end on "No Data available for sync".
- After a wipe a role can see odd figures (e.g. state stock in hand -490). Flows treat a precondition like that as `BLOCKED - …` and submit nothing.

## Maestro and app gotchas (all hit in this repo)

- Text matching is a full-string, case-insensitive regex; `\\` in double-quoted YAML. Quote any YAML scalar containing `": "` (e.g. `evalScript: "${console.log('a: ' + b)}"`) or `check-syntax` fails. Write YAML with backslashes using the Write/Edit tools, not shell heredocs.
- Fence every selector on several sides: `below`/`above` compare top edges, `rightOf` alone reaches the status bar, and the keyboard's keys are in the hierarchy. Assert `focused: true` before typing. Never use `hideKeyboard` (it can exit the app); close the keyboard with `tapOn: id: "android:id/input_method_nav_back"`.
- An unset variable resolves to the string `"undefined"`; a flow-level `env:` value beats the `-e` from `.env`. `when: true:` skips only on `false`/`''`. Labels are printed verbatim (no `${}`).
- A `${...}` ends at its first `}`: no function bodies or object literals inside one - build the value in a script. There is no `hint:` selector; `text:` matches hints.
- `eraseText` deletes only before the cursor, and a tap drops the cursor mid-text: press `Remote Dpad Right` a few times first to reach the end (`subflows/registration/age-entry.yaml`).
- `scrollUntilVisible` with `centerElement: true` can overshoot an element low on a card and run on to the bottom; scroll to the last element you need instead (e.g. the card's button) and leave centring out. Household Overview comes back scrolled, its title off screen - wait for `"Household Overview|Edit Individual"`.
- Radio buttons and checkboxes are text-less clickables left of their labels and report no state; tap them by position (`below: <question>, leftOf: <label>, index: n`) and record the choice with a screenshot.
- Running the Maestro CLI kills the Maestro MCP / Studio device connection (`DeviceServerDiedException`); after a CLI run, inspect with `maestro hierarchy` or `adb exec-out screencap -p` instead. Don't run two Maestro clients against one device.
- The app's QR scanner reads only the camera. On the emulator the camera is a virtual room; `prepare-qr-camera` flashes `QR_CODE_PATH` on its wall (a QR held in view re-triggers a "Code already scanned" banner over Submit).

## Keeping docs in step

Every change to flows updates, in the same change: `.env.example` (new keys, with a comment), the README's variable / flow / subflow / layout tables, and `TEST-CASES.md` (cases, status with run folder and date, coverage table). Comments in YAML explain *why* a selector or wait is shaped as it is and what was read off the app on which date - keep that style.
