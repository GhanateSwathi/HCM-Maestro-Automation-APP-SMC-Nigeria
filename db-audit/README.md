# DB audit - are the CDD's actions stored in the local DB? (SMC Nigeria)

A QA check, one record per case: do an action in the app as a CDD, then read that record from the app's own local database, field by field. These are the cases of the DB audit run in [HCM-Maestro-Beneficiary-ID-Fix](https://github.com/GhanateSwathi/HCM-Maestro-Beneficiary-ID-Fix) on the Kaduna AZM build (2.2.122, 2026-11-10/11), ported to this repo's app ([Prompt 21](../prompts/prompt-21-db-audit.md)).

| | |
| --- | --- |
| App | `HCM_APP_ID` from the root `.env` (`com.digit.hcm`, mhbase UAT) - a build with the **DB** card (see below) |
| User | The CDD of the root `.env` (`HCM_CDD_USER_ID`) |
| Device | An emulator with the app (`emulator-5554` by default; `--device` / `-Device` for another) |
| Cases | [TEST-CASES.md](TEST-CASES.md): 10 cases and the schema check, NOT RUN |
| Fields | [CDD-field-capture.xlsx](CDD-field-capture.xlsx): 115 planned field rows, all Not tested, beside the Kaduna result |
| Kaduna result | `db-audit/RESULTS.md` and `CDD-field-capture.xlsx` in the ID-fix repo (branch `db-audit-cdd` until merged); its rows are in [baseline/kaduna-2.2.122.csv](baseline/kaduna-2.2.122.csv) |

This suite is like `beneficiary-id/` and `proximity/`: it runs in one app session that is never cleared, through the root `scripts/run.ps1` and `.env`, over `beneficiary-id/`'s subflows (sign-in without wiping, home and boundary, open search, register, add a member, consent No, sync). `config.yaml` discovers `flows/**` only, so a plain `.\scripts\run.ps1` never runs it.

## Where we left off (2026-11-11)

**Ported, not run.** Every flow passes `maestro check-syntax`; no case has run on the SMC app.

Next session, start here:

1. **Check for the DB card.** Install the SMC build, sign in as the CDD, and look at the home screen for a **DB** card (the Drift DB viewer of the HCM "-db" builds). Then run the schema check (`--check tables`).
   - No card: the checks cannot run. Ask dev for a "-db" build of this app. The Kaduna one was `kaduna-azm-signed-db-2.2.122.apk`; the `-without-db` APKs lack the card.
   - Card there: fix whatever [Not verified yet](#not-verified-yet-on-this-app) trips on, then run the cases in [TEST-CASES.md](TEST-CASES.md)'s order.
2. Ask before running: every case writes records that reach mhbase UAT at the next sync.

## How the local DB is read

The app keeps its data in `/data/data/<app>/app_flutter/db.sqlite` (Drift over SQLite). On the Kaduna build the file was **encrypted with SQLCipher**, so a copy cannot be opened without the key, and this suite does not take the key from the app. The "-db" builds put a **DB** card on the CDD's home screen: the Drift DB viewer. In it, open any table, then the filter button, then the pencil, to reach **Edit Query**, a free SQL editor. Every check here reads the DB that way, inside the app and read-only (SELECT only).

## What changed from the Kaduna suite, and why

- **Sign-in keeps the app's data.** `flows/home.yaml` signs in through `beneficiary-id/subflows/common/sign-in-cdd.yaml` only when the app is signed out. That subflow never clears the app (the cases build on records already on the device). The Kaduna suite pinned its own boundary (Fangwani Health Clinic / Rigan Ori); here the boundary is answered as `beneficiary-id`'s `home.yaml` answers it.
- **Names carry a tag.** `QAID-DB1-H-<ddHHmm>`, not `QAID-DB1-H`. Names read "--" on this build's cards, so a household is found by searching its name and taking the only card listed (`beneficiary-id/README.md`). An earlier run's household with the same name would be a second card.
- **Checks by label.** The Kaduna checks were typed with fixed names and record IDs. Here they are in [checks.json](checks.json), finding records by the names typed, and `db_query.py --check <label> --set HEAD=... CHILD=...` runs them. `--list` shows them.
- **The SMC form.**
  - The SMC checklist asks other questions than the AZM one (Prompt 19: sick, fever, SPAQ for the first time with its side-effect follow-up, SP or CTX), and none with a date. So Cases 1, 3, 4 and 9 are adapted ([TEST-CASES.md](TEST-CASES.md)).
  - There is no Height field.
  - The mobile number is 11 digits (`HEAD_MOBILE`); Kaduna wanted 10.
  - The sheet leaves out the Kaduna rows of AZM-only fields (63 of 153) and plans the SMC questions instead (25 rows).
- **Not ported:**
  - `flows/db-query.yaml` (the first version, Maestro typing only, too slow).
  - The Kaduna results (they stay in the ID-fix repo; the baseline CSV carries them for comparison).
  - The Kaduna form config, which is client data and was kept out of git there too.

## Not verified yet on this app

Every step here is read off the Kaduna -db build, or is `beneficiary-id/`'s, which has not run on this app either.

| What | Where | If it is wrong |
| --- | --- | --- |
| A **DB** card on the CDD's home screen | `db-query-open.yaml` (fails with "No DB card on the home screen") | No check can run: a -db build is needed |
| The DB viewer's screens and its unlabelled buttons, tapped by position (filter 95%,13%; pencil 98%,17%; field 93%,20%; Kaduna emulator, 1344x2992) | `db-query-open.yaml`, `db-query-run.yaml` | The editor does not open, or the SQL is not saved or run; read the screen with `screen.py --bounds` and move the points |
| Leaving the DB viewer with Back, one screen at a time | `home.yaml` | It may stop on a viewer screen, or pass home |
| The same tables and columns as the Kaduna build (task, task_resource, h_f_referral, ...) | `checks.json` | Run `tables` / `columns` first; change the checks to match |
| Names stored in `name.given_name`, although the cards show "--" | every check by name | Find the person by the ID the flow logged (`identifier.identifier_id`) instead |
| Where the SMC checklist's referral, delivery and ineligible outcomes are stored | Cases 1-4, 9 | Use `counts` before and after the action to see which table grew |

## Running a check

```powershell
python -I db-audit\scripts\db_query.py --list
python -I db-audit\scripts\db_query.py --check head --set HEAD=QAID-DB1-H-111530
python -I db-audit\scripts\db_query.py c1-extra "SELECT json_object('n',count(*)) AS j FROM task"   # any SELECT, your label
```

- **One row, one column.** The SQL must return a single column named `j`, usually `json_object(...)`, because the flow copies that one cell.
- **No `%`.** `adb input text` reads `%s` as a space; use `instr()` instead of `LIKE`.
- **Output.** Each check is kept in `artifacts/db-audit/queries/<time>-<label>.json`, as the SQL with its answer.
- **Typing.** This is the slow part. Maestro's `inputText` types about 2 characters a second and stops after 120 s. `adb input text` is fast, but drops characters when it runs ahead of the field. So the script types in 30-character pieces, then reads the field back and retypes once if it differs.
- **The Maestro MCP.** Claude Code's Maestro MCP (`maestro mcp`, a java process) holds the device and makes `maestro hierarchy` hang. `screen.py` gives up after 90 s with that hint; stop the process and retry (CLAUDE.md).

## Layout

| Path | What |
| --- | --- |
| `flows/home.yaml` | The app in front, on home. It closes a "Sync failed" popup, leaves the DB viewer with Back, signs in if signed out, then `beneficiary-id`'s `home.yaml` handles the boundary and goes home |
| `flows/db-query-open.yaml` | Home -> DB -> household -> Filter -> Edit Query, emptied and focused; fails if the build has no DB card |
| `flows/db-query-run.yaml` | Runs the SQL typed in and logs the single result cell as `DBROW|<label>|<text>` |
| `flows/register-household-child.yaml` | A household (head `NAME`) and one child (`CHILD`); logs both IDs |
| `flows/open-household.yaml` | Opens household `NAME` on Household Overview, where the by-hand steps start |
| `flows/add-child.yaml` | Adds child `CHILD` (`AGE_MONTHS` optional) to household `NAME` |
| `flows/consent-no.yaml` | Case 5: a new household with caregiver consent No and `CONSENT_REASON` |
| `flows/sync.yaml` | Sync Data until nothing is left (irreversible) |
| `checks.json` | The SQL checks, by label, with `{HEAD}` / `{CHILD}` |
| `scripts/db_query.py` | One check: opens the editor, types the SQL with adb, checks the field holds exactly that SQL, runs it, prints the JSON |
| `scripts/screen.py` | Prints the texts on screen (`maestro hierarchy`), for working out taps |
| `scripts/db_snapshot.py` | Pulls the DB file off a rooted emulator. Useful only with the SQLCipher key |
| `scripts/build_field_sheet.py` | Writes `CDD-field-capture.xlsx` from the Kaduna baseline, the SMC checklist and `OBS` (the results here). Run `python db-audit\scripts\build_field_sheet.py`; it needs openpyxl, and LibreOffice, if installed, stores the Summary counts |
| `baseline/kaduna-2.2.122.csv` | The Kaduna audit's 153 field rows (what was entered, the table and column, what was stored, the status) |

## Test data

Every case writes real records to mhbase UAT once the app syncs. People are named `QAID-DB<case>-<role>-<ddHHmm>` with last name `ID_LAST_NAME`. Head, ages and genders come from the `ID_*` keys in `.env` (the Beneficiary ID cases' keys). This suite adds no `.env` key; per-run values (`NAME`, `CHILD`, `AGE_MONTHS`) go in `-Set`. Run folders hold the typed password in `commands.json` and `maestro.log`, so share only `report.html` and screenshots.
