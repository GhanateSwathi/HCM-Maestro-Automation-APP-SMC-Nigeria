# Beneficiary ID cases (SMC Nigeria)

The cases of the **Beneficiary ID Fix – QA Test Plan** (2026-10-30), run against this repo's app. They are the cases run in [HCM-Maestro-Beneficiary-ID-Fix](https://github.com/GhanateSwathi/HCM-Maestro-Beneficiary-ID-Fix) on the AZM builds (Kaduna 2.2.120, Kebbi 2.2.122), ported to the SMC app. The question is the same: does the app give two people one beneficiary ID, or save something other than a pool ID? The ID could repeat after a stale search screen, a double tap, a killed app, offline work, a cleared device, or two devices under one CDD.

| | |
| --- | --- |
| App | `HCM_APP_ID` from the root `.env` (`com.digit.hcm`, mhbase UAT) |
| User | The CDD of the root `.env` (`HCM_CDD_USER_ID`, `AU-CDD-001`) |
| Device | An emulator with the app (`DEVICE_ID`, else the one connected); X9, X9b and D5 also need a second one (`DEVICE_ID_2`) |
| Cases | [TEST-CASES.md](TEST-CASES.md): 19 cases, X2 inside X1, and SETUP (the fixtures) |
| Spec | [Prompt 20](../prompts/prompt-20-beneficiary-id-fix.md) |

This is a suite of its own, like `proximity/` in the ID-fix repo. It has its own runner, ID ledger and report, because its cases run in parts, in one app session, with values passed between parts. It reuses the root suite's `scripts/run.ps1`, `.env`, and these subflows: `login`, Allow Permissions, the boundary dropdowns and data check, the side menu, `fail` and `age-entry`. `config.yaml` discovers `flows/**` only, so `.\scripts\run.ps1` with no flow never runs these cases.

## Where we left off (2026-11-10)

**Ported, not run yet.** Every case flow, subflow and setup flow passes `maestro check-syntax`; no case has run on the SMC app. All results in [TEST-CASES.md](TEST-CASES.md) read NOT RUN.

Next session, start here:

1. Boot an emulator with the SMC app. Run `setup/download-ids.yaml`, then `run-case.ps1 -Case SETUP` once (it creates the fixtures).
2. Run P1 first, by itself. It exercises the most building blocks: sign-in without wiping, the ID count, register, the head's ID read, and Search by ID with the opened household. Fix the selectors it trips on (see [Not verified yet](#not-verified-yet-on-this-app)), then run the rest.
3. Ask QA which SMC build carries the ID fix. The fix landed in AZM 2.2.122; this repo's notes last record `com.digit.hcm` 2.2.113.

## What changed from the AZM suite, and why

The cases keep their plan steps and expected results. What changed is how the flows find things on this app:

- **Names show as "--".** Household Overview and the search results show `--` for every member's name on this build (root [TEST-CASES](../TEST-CASES.md), 2026-10-21), so nothing can be found by name:
  - **A head's ID** is the last 12-digit ID above the card's "Head of household" tag ([read-head-id.yaml](subflows/id/read-head-id.yaml)).
  - **A member's ID** comes from the card that carries the member's Token ID, or else from the card with the member's age line, `FEMALE | 2y 0m` ([read-member-card.yaml](subflows/id/read-member-card.yaml)). The members of one household get different ages (P5: 24, 30, 36 months).
  - **Search by ID** opens the one household it finds and compares that household's head ID with the expected one (`HEAD_ID`). The AZM suite compared the head's name.
- **Names are unique per run.** Every name gets the run's tag: `QAID-P1-A-<ddHHmm>` (`QAID_RUN`, set by `run-case.ps1`). Earlier runs' households are on the device, or come down with the boundary data (`BOUNDARY_DATA_CHOICE=Download`). Without the tag, X3's "nothing saved", X5's "one household" and D11's "was A saved?" would count them. The fixtures `QAID-FIX-E1` / `E2` keep fixed names, so make them once.
- **Sign-in keeps the app's data.** The root suite's sign-in launches with `clearState`, which drops the device's ID pool. This suite signs in only when the app is not signed in already ([sign-in-cdd.yaml](subflows/common/sign-in-cdd.yaml)). The boundary is answered as `home/cdd.yaml` answers it: the first facility, the first three communities, then the boundary data check. The cases register in the first village Registration & Delivery offers, or in `REGISTRATION_VILLAGE`.
- **The SMC form.** It has Beneficiary Location with Lat/Long and Save Location, then Save Household Details, then Save Beneficiary for the head, which goes straight to Household Overview. A member gets Member Details, then "Ready to submit ?", then "Data recorded Successfully" with its Token ID; there is no Height field. The home screen is recognised by `Registration & Delivery|Stock Balance`, because Registration & Delivery can be below the fold. The pending-sync notice is "There are N transactions yet to be synced." The test data keys are `ID_*`, kept apart from Prompt 11's `HOUSEHOLD_MEMBERS` and `HEAD_*`.
- **Dropped:**
  - **P6** has been out of scope since 2026-11-03.
  - **The `-122` re-runs** (X9-122, X9b-122, D5-122) existed only because the AZM fix came in a second build. Here X9, X9b and D5 are plain cases.
  - **The vivo phone's screen-lock handling** is not needed on an emulator.
- **Renamed:** P1b sat under `cases/X1/P1b` in the ID-fix repo; here it is `cases/P1b`, where `cases.csv` names it. "Acknowledgement" is the success screen's Token ID.

The comments in the case files keep the AZM observations they were written from, and name the build and date.

## Not verified yet on this app

Every selector here is read off this app by the root suite's flows, or carried over from the AZM build where the SMC form has the same labels. These steps have not run here yet:

| What | Where | If it is wrong |
| --- | --- | --- |
| The home card "Beneficiary IDs" (scrolled to) and its screen's counts | `read-available.yaml`, `download-ids.yaml` | Every case's start fails |
| Household Overview's Back link at the top | P1b, P2, X1, D2 | The case stops at that tap |
| System Back from Household Overview. On this build it may walk back through the form pages | P1, D1, P5, X6 via `to-search.yaml` (up to 8 Backs, then the side menu, with a NOTE) | Notes where Back went; the case goes on |
| Search by ID on, then opening the one household found | `search-by-id.yaml` | Every ID check fails |
| A hyphenated, run-tagged name (`QAID-P1-A-101530`) in First name | Every registration | The form may refuse it; change the name pattern in the cases |
| Logout without syncing first | D6, X9b | Another dialog may come up |
| The no-connection dialog under airplane mode | P4, X6, D5 (`connection-dialog.yaml`) | Its wording is matched loosely |
| The app logging `UPDATE_IDENTIFIER_STATUS`, `CONDITION_EVAL` and the pool's `deviceUuid` | `run-case.ps1` log check | Reported as "log check not run" |

## Setup

1. The root `.env`: the CDD pair, `HCM_APP_ID`, `CONSENT_REASON`, `BOUNDARY_DATA_*`, and this suite's `ID_*` keys ([.env.example](../.env.example)). Add `DEVICE_ID` / `DEVICE_ID_2` when more than one device is connected.
2. **IDs on the device.** Each case's first part BLOCKs when the device holds fewer IDs than the case needs. Download them first:

   ```powershell
   .\scripts\run.ps1 -Flow beneficiary-id\setup\download-ids.yaml
   ```

   Any root-suite flow wipes the app at sign-in, IDs included, so download again after one.
3. **The fixtures**, once per CDD and village: `QAID-FIX-E1` (X1's H1, P2, D2's S1) and `QAID-FIX-E2` (D2).

   ```powershell
   .\beneficiary-id\scripts\run-case.ps1 -Case SETUP
   ```

4. **A second emulator** for X9, X9b and D5, with the same app, signed in as the same CDD. Two emulators need about 7 GB of free RAM (AZM suite, 2026-11-03), so close Chrome and Slack first.

## Running

```powershell
.\beneficiary-id\scripts\run-case.ps1 -Case P1                       # one case, with the log check and the report
.\beneficiary-id\scripts\run-case.ps1 -Case X9 -Device emulator-5554 -Device2 emulator-5556
.\beneficiary-id\scripts\run-case.ps1 -Case D6 -Resume artifacts\beneficiary-id\runs\<run> -From 3-relogin
.\scripts\run.ps1 -Flow beneficiary-id\setup\cdd-home.yaml           # sign in, home (before a -Resume)
python .\beneficiary-id\scripts\report.py build                      # rebuild the report
```

How `run-case.ps1` works:

- **Parts.** It runs the case's parts in name order through the root `scripts\run.ps1`. It passes on each part's `VAR|NAME|VALUE` lines, and gives every part `QAID_RUN` and `DEVICE_ID`.
- **Lost sessions.** A part Maestro lost, with no failed check, is run again up to twice; the first attempt is kept as `<part>.lost-<n>`.
- **Two devices.** Parts with the same stage number (`2-register-a.yaml`, `2-register-b@2.yaml`) run at the same time, one per device.
- **Device log.** The log is recorded for the whole run. Its `UPDATE_IDENTIFIER_STATUS` / `reallocated` lines are checked against [cases.csv](scripts/cases.csv).
- **Output.** Each run writes to `artifacts\beneficiary-id\runs\<yyyyMMdd-HHmmss>-<case>\`.

Run folders hold the typed password in `commands.json` and `maestro.log` (root README), so share only `report.html` and screenshots.

**Case order.** X8 clears the app's data, so run it last, then download IDs again. D5 uses the ID pools X9 left, so run X9 before D5. X9b logs both devices out and signs them in again.

**Irreversible.** Every case writes households to mhbase UAT. Confirm before running.

## Report

`report.py` writes:

| File | Holds |
| --- | --- |
| `artifacts/beneficiary-id/results.csv`, `ledger.csv` | Every result and every ID given out (gitignored, like all run output) |
| `artifacts/beneficiary-id/report/results.xlsx`, `report.html` | Results (PASS / FAIL / BLOCKED / INCOMPLETE / NOT RUN), the ID ledger, the summary |
| [TEST-CASES.md](TEST-CASES.md) | Result and Comments per case, and the ID ledger |

The verdicts:

- **FAIL**: an expected result is not met, the log check is off, or an ID the case gave out is already in the ledger.
- **BLOCKED**: a precondition was missing, such as too few IDs on the device.
- **INCOMPLETE**: the run stopped before its checks.

## Layout

| Path | Holds |
| --- | --- |
| `cases/<case>/` | One folder per case, in parts (`1-...`, `2-...`; D11 `01-...`). `@2` parts run on the second device |
| `setup/` | Not cases: sign in and home, download IDs, the fixture households |
| `subflows/common/` | Launch keeping data, sign-in if needed, home and boundary, go home, sync (re-sign-in on Session Expired), logout, keyboard, no-connection dialog, fail |
| `subflows/registration/` | Open the search screen, village, search field, register a household (in parts), add a member, consent No, find or open a household by name, back to search, Search by ID on |
| `subflows/id/` | Case start, ID counts, download IDs, the head's and a member's card ID, Search by ID, the book-keeping (`id.js`) |
| `subflows/cases/` | Steps one case repeats (P3's try, D2's three Backs, D11's rounds) |
| `scripts/` | `run-case.ps1`, `cases.csv`, `report.py` |

## Test data

Every case writes real records to mhbase UAT. People are named `QAID-<case>-<letter>-<run>` with last name `ID_LAST_NAME` (`Test`), so each ledger row traces back to its case and run. Every case that syncs ends with Sync Data; the others leave their records to the background Auto Sync or the next sync.
