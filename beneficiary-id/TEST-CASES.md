# Test Cases — Beneficiary ID

The Phase A cases of the **Beneficiary ID Fix – QA Test Plan** (2026-10-30), ported from [HCM-Maestro-Beneficiary-ID-Fix](https://github.com/GhanateSwathi/HCM-Maestro-Beneficiary-ID-Fix) to the SMC app (`com.digit.hcm`, mhbase UAT, CDD `AU-CDD-001`). How to run them, and what changed for this app: [README.md](README.md).

Result is PASS, FAIL, BLOCKED (a precondition was missing; nothing judged), INCOMPLETE (the run stopped before its checks; not a verdict on the app) or NOT RUN. `run-case.ps1` fills Result and Comments from each run: what was expected against what was found, and the run folder.

Automation: **Auto** = Maestro on one emulator. **Auto (2 emulators)** = two emulators signed in as the same CDD, each step on both at once.

## What each case checks

The plan's steps on this app. N = "Number of available IDs" on Beneficiary IDs. Every person registered must get a 12-digit ID that no one else in the ledger has, and Search by ID must find exactly their household. Names are `QAID-<case>-<letter>-<run>`.

| Case | Steps | Expected |
| --- | --- | --- |
| SETUP | Register QAID-FIX-E1 and QAID-FIX-E2 from fresh search screens; sync | Two fixture households (run once) |
| P1 | Register A; system Back; register B from the same search screen | A ≠ B; N drops by 2; Search by ID finds each; the log shows "reallocated" for B |
| P1b | Ways back to search: the Overview's Back link (1A, 1B); Add Members 2M then Back To Search (2A, 2M, 2B); consent No 3A then Back To Search (3B) | 6 different IDs; N drops by 6 (3A uses none). Way 4, a dose, needs stock and is left out |
| P2 | Open QAID-FIX-E1, its Back link, system Back: the older search screen; Register on it | Register is enabled on the older screen, if the screen exists; A's ID unique; N drops by 1 |
| P3 | Five cold starts, then Register Beneficiary tapped at once | No Low Beneficiary IDs popup; N drops only for people saved |
| P4 | Offline: register X; online: Download Beneficiary IDs before X syncs; register Y | The download frees no used ID (available rises only with the total); X ≠ Y; sync |
| P5 | A with members A1, A2, A3 (24, 30, 36 months); back to search; B; C | 6 different IDs; N drops by 6; each success-screen Token ID is the card's |
| X1 | Open QAID-FIX-E1 (H1), its Back link, register H2, two system Backs to H1's Overview; Add Members M (30 months) | H2 ≠ M; N drops by 2; M found by ID in H1 |
| X2 | Inside X1: M's success-screen Token ID against M's card | The same ID; Search by ID with it finds H1 |
| X3 | Leave the form with system Back at consent; again up to the head's form, then kill the app; register for real | N unchanged by both abandoned forms; nothing saved; then N drops by 1 |
| X4 | Consent No for A; register B from the same search screen | A uses no ID; N drops by 1 (B) |
| X5 | Double-tap Save Beneficiary on the head's form | One household saved; N drops by 1 |
| X6 | Offline: A, member A1, B; checks offline; online: sync | 3 different IDs; N drops by 3; sync succeeds |
| X8 | Register A, sync; clear the app's data; sign in; download IDs (Re-Fetch); register B | After the re-fetch every ID already synced is left out; B ≠ A; N drops by 1 |
| X9 | Two devices, one CDD, online: both download, both register (A, B) at the same moment, both sync | A ≠ B; N drops by 1 on each |
| X9b | X9 after both log out and sign in a minute apart | A ≠ B; N drops by 1 on each |
| D1 | Five heads A to E from one search screen, system Back between them | 5 different IDs; N drops by 5; the log shows "reallocated" 4 times |
| D2 | Two Back links deep (QAID-FIX-E1, QAID-FIX-E2), register A; three system Backs, B; three more, C | 3 different IDs; N drops by 3; where each Back landed is noted |
| D5 | Two devices, one CDD, offline: register A and B at the same moment; both sync | A ≠ B (a duplicate here is the gap only the server setting closes) |
| D6 | Register A; log out and sign in again; register B | N unchanged by the log-out; A ≠ B; N drops by 2 in all |
| D11 | Three rounds: Save Beneficiary for A and kill the app at once; reopen; register B | A saved with an ID and N one lower (or neither); B never gets A's ID |

## Results

| # | Case | Phase | Automation | Result | Comments |
| --- | --- | --- | --- | --- | --- |
| SETUP | Fixture households QAID-FIX-E1 and E2 | - | Auto | NOT RUN | Not run yet. |
| P1 | Register twice from one search screen | A, B | Auto | NOT RUN | Not run yet. |
| P1b | Other ways back to search | A | Auto (dose variant needs stock) | NOT RUN | Not run yet. |
| P2 | Register button on the older search screen | A | Auto | NOT RUN | Not run yet. |
| P3 | Popup before the ID count loads | A | Auto | NOT RUN | Not run yet. |
| P4 | Re-download IDs before sync | A | Auto | NOT RUN | Not run yet. |
| P5 | Six people in a row | A | Auto | NOT RUN | Not run yet. |
| X1 | Stale ID on Add Member | A, B | Auto | NOT RUN | Not run yet. |
| X2 | Success screen shows the saved ID | A, B | Auto (runs inside X1) | NOT RUN | Not run yet. |
| X3 | Abandoned form uses no ID | A | Auto | NOT RUN | Not run yet. |
| X4 | Consent No uses no ID | A | Auto | NOT RUN | Not run yet. |
| X5 | Double-tap Save | A | Auto | NOT RUN | Not run yet. |
| X6 | Offline registration | A | Auto | NOT RUN | Not run yet. |
| X8 | Clear data after sync | A | Auto | NOT RUN | Not run yet. |
| X9 | Same CDD, two devices, synced | A, C | Auto (2 emulators) | NOT RUN | Not run yet. |
| X9b | Same CDD, two devices, sign-ins 1 min apart | A, C | Auto (2 emulators) | NOT RUN | Not run yet. |
| D1 | Five heads from one search screen | A | Auto | NOT RUN | Not run yet. |
| D2 | Deep screen stack | A | Auto | NOT RUN | Not run yet. |
| D5 | Same CDD, two devices, unsynced | A, C | Auto (2 emulators) | NOT RUN | Not run yet. |
| D6 | Log out and back in | A | Auto | NOT RUN | Not run yet. |
| D11 | App killed right after Save | A | Auto | NOT RUN | Not run yet. |

**For reference, on the AZM builds** (the ID-fix repo):

- **Kaduna 2.2.120:** 17 PASS. X9, X9b and D5 FAILED: two emulators under one CDD were given one ID, because both devices sent the Android build ID as `deviceUuid`.
- **Kebbi 2.2.122:** X9, X9b and D5 PASS; each device sends its own `deviceUuid` and gets its own pool.

## ID ledger

One row per person the app gave an ID, filled from `artifacts/beneficiary-id/ledger.csv` by `scripts/report.py`. If an ID appears on two rows, the case that made the second row fails.

| ID | Person | Household | Case | Device | CDD user | Run date |
| --- | --- | --- | --- | --- | --- | --- |
