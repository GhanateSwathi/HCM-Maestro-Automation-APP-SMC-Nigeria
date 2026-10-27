# Test cases — eGov HCM

The register of what this suite covers, grouped by screen. One row per test case.
Keep it in step with `flows/` — a case marked automated must name the flow that
runs it, and a new flow must add its case here.

Strings are quoted exactly as the app renders them, because Maestro matches
`text:` as a **full-string regex** — a paraphrase will not match. Read expected
values off the running app, and note the device, package and app version they
were taken from.

## Coverage

| Screen | Cases | Automated | Gaps |
| --- | :-: | :-: | --- |
| Login | 7 | 7 | Wrong-credential rejection, password show/hide toggle (national stock user: out of scope) |
| Post-login onboarding | 11 | 11 | Choosing a configured facility, already-selected boundaries. Boundary data (BDD): the CDD's Data found / No data found paths not seen yet (its check fails - server-side issue, 2026-10-23); Proceed Without Downloading on Data found not run |
| Stock — Manage Stock | 6 | 6 | (Reject and View Transactions: their own sections) |
| Stock — Dispatch to a health facility | 4 | 4 | Transport Type, Scan Resource; receiving and dispatching in one session (see DSP-04) |
| Stock — Return to National | 3 | 3 | Return validation (0, above balance); one-session receive → dispatch → return |
| Stock — Health facility accepts the dispatch | 6 | 6 | Choosing a named facility (Reject: see Stock — Reject) |
| Stock — Health facility dispatches to a CDD | 4 | 4 | Scanning from the gallery (the app has none); a wrong CDD's QR |
| Stock — Health facility returns to the state | 3 | 3 | Return validation (0, above balance) |
| Stock — Reconciliation (state user, health facility) | 4 | 4 | REC-03/04 fail by design against this build (see the section) |
| Stock — View Reports (state user, health facility) | 5 | 5 | VR-02–05 fail against fresh sessions (reports are device-local); recipient columns not shown |
| Stock — Reject a receipt (state user, health facility, CDD) | 6 | 6 | Passed for the state user 2026-10-23 (in two runs, one session) and 2026-10-26 (one run, chained), and for the health facility 2026-10-26; CDD not run - needs a fresh dispatch of both variants from the health facility. View Reports after a rejection (the sender's balance coming back: out of scope) |
| Stock — View Transactions (state user, health facility, CDD) | 6 | 6 | Passed end to end for all three roles 2026-10-23 (the CDD's list was empty). What the QR encodes; transactions with more than one product; received transactions' cards (Sender) not seen yet |
| Beneficiary Referral (health facility) | 7 | 7 | Scan Beneficiary; Referred by (CDD team code); opening a listed referral; mandatory-field validation; referral ID (the app shows none) |
| Registration & Delivery (CDD) | 16 | 16 | The mobile-number bounds (never run - no test number); Unable To Deliver, Redose, Mark Closed Household (Near by households and Search by ID: their own section). REG-01, 02, 08, 09, 13 (and REG-07's save) were done in session by hand, not yet as written; the full flow has not run end to end (see the section) |
| Registration — consent No (CDD) | 7 | 7 | Done in session by hand 2026-10-22; the flow has not run as written. Reasons other than free text; a refused household found other than by name |
| Registration — Unable to Deliver (CDD) | 9 | 9 | Comment on Unable to Deliver (optional, left empty); a 20-member household fully registered; UTD-09's sync not run (expired sign-in) |
| Registration — dose and redose (CDD) | 10 | 10 | Redose reason Others; a redose's time window; RDS-10's sync not run (expired sign-in) |
| Registration — search by Near by households and by ID (CDD) | 11 | 11 | Whether part of an ID should match (QA); the radius, and a household outside it; Near by households with a name typed; Search by ID by scanning (no scanner on this screen) |
| Registration — eligibility checklist: referral and ineligible (CDD) | 6 | 6 | Several Yes answers at once (which outcome wins); "SPAQ for the first time" Yes; Go Back on the referral success screen; ELG-06's sync (Server Error, 2026-10-27) |
| **Total** | **131** | **131** | |

Status key: **Automated** — a flow asserts it. **Partial** — the flow performs
the step but asserts nothing about it. **Blocked** — a flow exists but cannot
run until its test data exists, and its locators stay unverified until then.
**Manual** — not automated yet.

## Chained runs — 2026-10-26

Each role's flows run back to back in one app session, then sync and log out
([`scripts/run-chain.ps1`](scripts/run-chain.ps1), LGN-07). Run folders are
under `artifacts/runs/`.

| Role | Flow | Result | Run |
| --- | --- | --- | --- |
| State user | Accept (Prompt 2) | Passed; balance shown 0 → 410, really -490 → 410 | `20261026-155703` |
| State user | Reject (Prompt 15) | Passed, Test Cases 1–6 | `-162237` |
| State user | Dispatch (Prompt 3), two parts | Passed: 200 + 200 per variant — `BFBE-4559-55E0`, `F7B8-600A-3F95`, `AC86-4096-BDD2`, `CC78-20FB-7219` | `-164616` |
| State user | Return (Prompt 4) | Passed, 5 per variant | `-170154` |
| State user | Logout | Passed | `-170707` |
| Health facility | Accept (Prompt 5) | Passed: `F7B8-600A-3F95`, `CC78-20FB-7219` | `-171427` |
| Health facility | Reject (Prompt 15) | Passed: `BFBE-4559-55E0`, `AC86-4096-BDD2` | `-172654` |
| Health facility | Dispatch to a CDD (Prompt 6) | Blocked: balance 0 (below) | `-173617` |
| CDD | Registration (Prompt 11) | Steps 1–10 passed; Step 11 blocked, no incoming stock | `-174831` |
| CDD | Consent No, Unable to Deliver (Prompts 12, 13) | Failed: the Auto Sync notification took the side-menu tap; fixed (`open-side-menu.yaml`) | `-181013`, `-181434` |
| CDD | Dose and redose (Prompt 14) | Blocked: balance 0 | `-181546` |
| CDD | Logout | Passed | `-181636` |

Reruns: Prompt 12 (`-182226`) met `Limit exceeded to fetch Beneficiary IDs`,
now answered with Re-Fetch IDs (REG-02, passed `-185004`); Prompt 13 was
stopped before it submitted anything.

**Why the health facility had no stock.** After a fresh sign-in (every flow
clears the app) a stock user's device gets its dispatches but not its own
receipts. The health facility's Stock Reconciliation read Received 0, Issued
480, Stock in hand -480 per variant (`20261026-185921`, read only), and home
shows a negative balance as 0. From the app's source, the stock download
skips records last changed by the signed-in user, and the balance "heal" may
then lower the server's stored balance to that figure. Bug report written
2026-10-26. Until it is fixed, a role can dispatch only when its session
itself accepts more stock than the role has dispatched before.

---

## Login screen

Reached on launch after `clearState`. Fields carry no `resource-id` or
`content-desc`; each is addressed by the label above it.

Strings below were read from `com.digit.hcm` 2.2.113 (SMC-MC, UAT) on the
`Pixel_9_Pro_XL` emulator, 2026-10-14.

### LGN-01 — Login form renders
- **Status:** Automated — [`flows/login/login-screen.yaml`](flows/login/login-screen.yaml) · `smoke`, `login`
- **Preconditions:** App installed. No backend needed.
- **Steps:** Launch the app with cleared state.
- **Expected:** `User ID *` field, `Password *` field, `Login` button and
  `Forgot Password?` link are all present.
- **Notes:** The cheapest health check in the suite — it touches no backend, so
  it stays green when the environment is down. Run it first when triaging a red
  suite: green here means the app and emulator are fine and the fault is data,
  credentials or backend.

### LGN-02 — Empty form is rejected
- **Status:** Automated — [`flows/login/login-validation.yaml`](flows/login/login-validation.yaml) · `regression`, `login`
- **Preconditions:** App installed. No backend needed.
- **Steps:** Leave User ID and Password blank. Tap `Login`.
- **Expected:** `User ID is required` and `Password is required` appear under
  their fields, and the login screen stays up.
- **Notes:** Validation is client-side; nothing is typed and nothing is sent.

### LGN-03 — Forgot password shows contact message
- **Status:** Automated — [`flows/login/forgot-password.yaml`](flows/login/forgot-password.yaml) · `regression`, `login`
- **Preconditions:** App installed. No backend needed.
- **Steps:** Tap `Forgot Password?`, then `Ok`.
- **Expected:** A `Forgot Password` dialog reads `Please contact your
  administrator if you have forgotten your password`. `Ok` closes it and
  returns to the login form.
- **Notes:** There is no self-service reset in the app.

### LGN-04 — CDD user signs in
- **Status:** Automated — [`flows/login/sign-in-cdd.yaml`](flows/login/sign-in-cdd.yaml) · `regression`, `login`, `cdd`
- **Preconditions:** `HCM_CDD_USER_ID` / `HCM_CDD_PASSWORD` set for a real CDD
  user; environment reachable.
- **Steps:** Enter the CDD credentials. Tap `Login`.
- **Expected:** `Sync in progress` shows over the `Projects` screen, then
  `Allow Permissions` (ONB-01), then the facility-selection screen opens with
  `Health Facility *`, `Community *` and `Submit` — `ADMIN_Health Facility *`
  and `ADMIN_Community *` on the mhbase tenant.
- **Notes:** Sync took about 3 minutes on SMC-MC UAT and about 1 on mhbase;
  the flow allows 5. The test user has one project, so the app skips the
  Projects list on its own — a user with several projects would stop there
  instead. On a device's first run Android asks
  `Let app always run in background?`; `accept-system-dialogs.yaml` allows it.

### LGN-05 — State stock user signs in
- **Status:** Automated — [`flows/login/sign-in-state-stock.yaml`](flows/login/sign-in-state-stock.yaml) · `regression`, `login`, `state-stock`
- **Preconditions:** `HCM_STATE_STOCK_USER_ID` / `HCM_STATE_STOCK_PASSWORD`
  set for a real state stock user; environment reachable.
- **Steps:** Enter the state stock credentials. Tap `Login`.
- **Expected:** `Sync in progress`, `Allow Permissions` (ONB-01), then boundary
  selection with a single dropdown — `Community *` on SMC-MC, `ADMIN_State *`
  on mhbase — and `Submit`. No `Health Facility *` field.
- **Notes:** On SMC-MC the dropdown selects the state, but the app labels it
  `Community *` (read off USR-006307). Possibly a label bug in that build —
  if a later build relabels it, update the wait in
  `subflows/sign-in/state-stock.yaml`.

### LGN-06 — Health facility stock user signs in
- **Status:** Automated — [`flows/login/sign-in-hf-stock.yaml`](flows/login/sign-in-hf-stock.yaml) · `regression`, `login`, `hf-stock`
- **Preconditions:** `HCM_HF_STOCK_USER_ID` / `HCM_HF_STOCK_PASSWORD` set for a
  real health facility stock user; environment reachable.
- **Steps:** Enter the health facility stock credentials. Tap `Login`.
- **Expected:** `Sync in progress`, `Allow Permissions` (ONB-01), then boundary
  selection with a single dropdown — `Community *` on SMC-MC,
  `ADMIN_Health Facility *` on mhbase — and `Submit`. Never both a facility
  and a community field, as the CDD screen has.
- **Notes:** Read off USR-006308. On SMC-MC the dropdown selects the facility,
  but the app labels it `Community *` — the same screen the state stock user
  gets (LGN-05). The two roles are indistinguishable on that screen; only the
  dropdown's options differ, and those are not asserted yet. On mhbase the
  label names the facility, and ONB-03 selects one.

### LGN-07 — Sync, then log out
- **Status:** Automated — [`flows/login/logout.yaml`](flows/login/logout.yaml) · `chain`, `login`
  (through [`subflows/sync-and-logout.yaml`](subflows/sync-and-logout.yaml)).
  Ends each role of a chained run ([`scripts/run-chain.ps1`](scripts/run-chain.ps1)).
  Passed 2026-10-26 for the state user (`20261026-170707`) and the CDD
  (`20261026-181636`).
- **Preconditions:** a signed-in session (the flow keeps the app's state;
  on the Login screen already, it does nothing).
- **Steps:** Home through the side menu if elsewhere. `Sync Data` until
  `No Data available for sync` (Close any `Data Synced Successfully`). Side
  menu → `Logout` → `Ok`.
- **Expected:** `Sync Up Failed` never shows (it fails the flow: the next
  role would not see this role's records). Logout asks `Are you sure you
  want to end the session?` with `No` and `Ok`; Ok lands on the Login screen.
- **Notes:** Read off the app as AU-SAT-001, 2026-10-23. The background Auto
  Sync's heads-up notification can cover the menu button for a few seconds
  and take the tap; [`open-side-menu.yaml`](subflows/open-side-menu.yaml)
  taps again until `Logout` shows (CDD, 2026-10-26).

### Not yet covered
- **National stock user** — out of scope (decided 2026-10-23): no sign-in,
  onboarding or stock flows for this role. `HCM_NAT_STOCK_*` stay in
  `.env.example` unused.
- **Wrong-credential rejection.** Deliberately left out: repeated bad
  passwords against a real account can lock it. Needs a dedicated test
  account before it is automated.
- **Password show/hide toggle.** Asserting it means putting the real password
  on screen and into screenshots.

---

## Post-login onboarding

What a user does between sign-in and the home screen: grant the app's
permissions, then pick the boundaries they work in. The app only shows its
Allow Permissions screen when a permission is missing, so these cases launch
with none granted (`permissions: all: unset`), as on a field device.

Strings below were read from `com.digit.hcm` 2.2.113,
`file-based-download-mhbase-tenant` build (UAT), on the `Pixel_9_Pro_XL`
emulator running Android 16, 2026-10-15. This build shows raw boundary codes
(`ADMIN_State *`) where the SMC-MC build shows localised names, so the boundary
cases are tagged `mhbase`.

### ONB-01 — Permissions are granted after sign-in
- **Status:** Automated — every flow in `flows/onboarding/` and `flows/login/sign-in-*.yaml`, through [`subflows/allow-permissions.yaml`](subflows/allow-permissions.yaml)
- **Preconditions:** App launched with no permissions granted. Signed in as
  any role; sync complete.
- **Steps:** At launch, allow `Allow SMC-MC to send you notifications?`. After
  sync, on `Allow Permissions`, tap each `Grant` and accept Android's prompt.
  Tick `Please check if background activity is enabled from settings. *` —
  or, as on 2026-10-23 15:56 (state user), `Allow background activity *`,
  with the cards renamed `Allow background activity in battery -> settings *`
  and `NearBy Share *`; the next sign-in showed the old wording again. The
  flow accepts both. Tap `Continue`.
- **Expected:** Each card — `Notifications *`, `Ignore battery optimization *`,
  `Location *`, `Nearby share *`, `Camera` — reads `Permission granted` and
  its `Grant` button is gone. `Continue` opens the role's boundary screen.
- **Notes:** Prompts per Grant: Location offers `While using the app` (taken),
  `Only this time`, `Don’t allow`; Nearby share offers `Allow`; Camera offers
  `While using the app`. Battery optimisation was already granted on this
  emulator — it is a system setting that `clearState` does not reset — so its
  `Let app always run in background?` dialog was not seen here. **Quirk:** the
  checkbox reports `checked=false` even when ticked, so its state cannot be
  asserted. `Continue` does nothing while it is unticked, and the flow uses
  that: it presses `Continue` first and ticks the box only if the screen stays
  up, so it never unticks a ticked box. **Quirk:** `Continue` is also ignored
  while the app is still loading the boundary localisation it fetched during
  sync — over 10,000 entries on mhbase, still arriving 2.5 minutes after
  login. A ticked box plus one `Continue` then stays put, so the flow presses
  `Continue` again, up to 6 times 20 s apart. The one case this cannot handle:
  a box ticked *before* the flow starts, while the app is busy, would read as
  unticked and be unticked. `clearState` rules that out.

### ONB-02 — State stock user selects the first state
- **Status:** Automated — [`flows/onboarding/state-stock-selects-state.yaml`](flows/onboarding/state-stock-selects-state.yaml) · `regression`, `onboarding`, `state-stock`, `mhbase`
- **Preconditions:** `HCM_STATE_STOCK_*` set for `AU-SAT-001`; ONB-01 passed.
- **Steps:** Open `ADMIN_State *`. Tap the first option. Close the menu.
- **Expected:** The field reads `1 Selected` and a chip with the option's name
  sits under it.
- **Notes:** Multi-select: the menu stays open after a tap, and each option
  row has its own checkbox. The option is picked by position; on 2026-10-15
  the only one offered was `01Bauchi`. `Submit` turns from grey to enabled
  once something is picked, and leads to the stock home screen
  (`Stock Balance`, `Manage Stock`, …) — neither is asserted.

### ONB-03 — Health facility stock user selects the first facility
- **Status:** Automated — [`flows/onboarding/hf-stock-selects-facility.yaml`](flows/onboarding/hf-stock-selects-facility.yaml) · `regression`, `onboarding`, `hf-stock`, `mhbase`
- **Preconditions:** `HCM_HF_STOCK_*` set for `AU-HFS-001`; ONB-01 passed.
- **Steps:** Open `ADMIN_Health Facility *`. Tap the first option. Close the
  menu.
- **Expected:** The field reads `1 Selected` and a chip with the facility's
  name sits under it.
- **Notes:** Same multi-select widget as ONB-02. No particular facility is
  configured for this user, so the first offered is taken; on 2026-10-15 that
  was `03ba Buri-Buri Health Post`, the only option.

### ONB-04 — CDD user selects a facility and the first three communities
- **Status:** Automated — [`flows/onboarding/cdd-selects-facility-and-communities.yaml`](flows/onboarding/cdd-selects-facility-and-communities.yaml) · `regression`, `onboarding`, `cdd`, `mhbase`
- **Preconditions:** `HCM_CDD_*` set for `AU-CDD-001`; ONB-01 passed.
- **Steps:** Open `ADMIN_Health Facility *` and tap the first option. Open
  `ADMIN_Community *`, read the first three options, tick each. Close the menu.
- **Expected:** The facility field shows the facility's name. The community
  field reads `3 Selected` with a chip for each of the three, and all three
  are still there after the menu closes.
- **Notes:** The facility field is a *single-select search field* (an
  `EditText`; opening it raises the keyboard, and the menu closes on a pick).
  Communities are a multi-select. On 2026-10-15 the facility was
  `03ba Buri-Buri Health Post`, and its 18 communities were listed in
  descending code order, the first three being `18Gammadadi`, `17Bunduryel`
  and `16Buri buri rugan fulani`. **Quirk:** while the menu is open a ticked
  option appears twice — its row and its chip — so a second tap would untick
  it; the flow skips any option already showing twice. Fewer than three
  communities fails the flow, but only after the available ones are selected
  and verified.

### Boundary data download after Submit (health facility, CDD)

[Prompt 17](prompts/prompt-17-boundary-data-download.md):
[`flows/onboarding/hf-stock-boundary-data.yaml`](flows/onboarding/hf-stock-boundary-data.yaml)
and
[`flows/onboarding/cdd-boundary-data.yaml`](flows/onboarding/cdd-boundary-data.yaml)
· `regression`, `onboarding`, `hf-stock` / `cdd`, `mhbase`, over
[`subflows/home/boundary-data.yaml`](subflows/home/boundary-data.yaml) — which
every health facility and CDD flow runs after its boundary Submit, so both
roles handle all three answers the same way. Changes nothing on the server.
Test data: `BOUNDARY_DATA_CHOICE` (`Download` / `Proceed`),
`BOUNDARY_DATA_RETRIES` (`2`).

After Submit the app checks the server for the boundary's records. **Which
answer comes is the server's to decide**, so each run covers the cases of
the answer it got and logs which (`Boundary data - <role>: first answer …
Covered: Test Case …`). Answers read off the app 2026-10-19 to 23:
`Data found!` / `There are records found for the selected area...` (Download,
Proceed Without Downloading); `No data found!` / `There are no new records
found for the selected boundary` (Go Back); `Failed to check data in server`
(Retry, Proceed Without Downloading). **On 2026-10-23 the check failed for
the CDD every time** — a server-side issue, per the user — so the CDD's
Data found and No data found paths are handled but not yet seen; the CDD
gets No data found when there are no records to download.

Runs on 2026-10-23 (`20261023-145737`): health facility `Data found!` →
Download → `Health facility data download completed` → Go To Home Screen;
CDD `Failed to check data in server`, Retry ×2, still failing → Proceed
Without Downloading. Both reached home. That run's health facility report
counted 2 retries that never happened (the retry loop was ended by setting
its counter); fixed with a stop flag and re-run in `20261023-151503`
(4 min 16 s): `Data found!`, no retries, Test Cases 1, 2, 3, 7 covered.
Every health facility and CDD flow run since uses the same subflow.

### BDD-01 — The app answers the boundary data check (Test Case 1)
- **Status:** Automated — the flows above. Passed 2026-10-23 for both roles
  (`20261023-145737`).
- **Expected:** After Submit, within 5 minutes, one of `Data found!`,
  `No data found!`, `Failed to check data in server`, or the home screen;
  which one is logged.

### BDD-02 — Data found offers both choices (Test Case 2)
- **Status:** Automated. Health facility passed 2026-10-23. CDD: not seen
  (the check failed).
- **Expected:** `Download` and `Proceed Without Downloading` under
  `Data found!`.

### BDD-03 — Data found, Download (Test Case 3)
- **Status:** Automated. Health facility passed 2026-10-23: `Health facility
  data download completed`, Go To Home Screen. CDD: not seen.
- **Expected:** Download → `Go To Home Screen` (up to 5 minutes) with the
  completion message → home. **QA to confirm** the CDD's message.

### BDD-04 — Data found, Proceed Without Downloading (Test Case 4)
- **Status:** Automated — not run yet: needs `BOUNDARY_DATA_CHOICE=Proceed`
  on a run that gets `Data found!`.
- **Expected:** Proceed Without Downloading → home, nothing downloaded.

### BDD-05 — Failed check: Retry, then proceed (Test Case 5)
- **Status:** Automated. CDD passed 2026-10-23: failed, Retry 1 and 2 failed
  too, Proceed Without Downloading → home. Health facility: not seen.
- **Expected:** `Retry` and `Proceed Without Downloading` offered; Retry up
  to `BOUNDARY_DATA_RETRIES` times, continuing with whatever a retry answers;
  still failing → Proceed Without Downloading → home.

### BDD-06 — No data found, Go Back (Test Case 6)
- **Status:** Automated. Seen for the health facility on 2026-10-19 (the
  home subflow's earlier version); not seen by these flows yet.
- **Expected:** `No data found!` with `Go Back` → home.

### BDD-07 — The role's home screen (Test Case 7)
- **Status:** Automated. Passed 2026-10-23 for both roles.
- **Expected:** Health facility: Stock Balance, Manage Stock, Download Stock
  Data. CDD: Registration & Delivery, Stock Balance, Manage Stock.

### Not yet covered
- **Choosing a configured facility.** The facility is always the first offered.
  Picking a named one would need a per-tenant variable in `.env`.
- **Submit and the home screen** — covered for the state stock user by STK-01,
  and for the health facility and the CDD by BDD-01–07.
- **Already-selected boundaries.** The dropdown subflow assumes a fresh state
  (`clearState`); a menu opened over existing selections would mix their
  chips into the option count.

---

## Stock — Manage Stock

Reached from the stock roles' home screen. Strings below were read from the
same mhbase build and emulator as the onboarding cases, as `AU-SAT-001`,
2026-10-15. Both stock flows start from
[`subflows/home/state-stock.yaml`](subflows/home/state-stock.yaml) (ONB-01,
ONB-02, then `Submit`), then fetch stock records with
[`download-stock-data.yaml`](subflows/stock/download-stock-data.yaml).

**Stock records must be downloaded first.** This build does not fetch them at
sign-in: Incoming Transactions stayed empty until home → `Download Stock Data`
→ `Data Found` → `Download` → `Go To Home Screen` ran (or `No Data Found` when
there is nothing new). Downloading changes nothing on the server.

**What an incoming transaction looks like.** Each card reads `MRN <mrn>`, the
date, `Sender` over the sender's id, the status (`Dispatched`), **one**
product line (`SPAQ 2: 100`) and `Select`. Stock Receipt Details shows
Resource, Material issue number and Received from, a Waybill / Batch /
Quantity / Comment form, and `Accept Stock` / `Reject`. On the 2026-10-15 data
the MRN was missing: cards read `MRN null_0`, `MRN null_1`, … — their place in
the list, renumbered as transactions leave it — and details showed Material
issue number `--`.

### STK-01 — Home screen shows the Manage Stock card
- **Status:** Automated — [`flows/stock/state-stock-incoming-receipts.yaml`](flows/stock/state-stock-incoming-receipts.yaml) · `regression`, `stock`, `state-stock`, `mhbase`
- **Preconditions:** ONB-02 passed.
- **Steps:** Tap `Submit` on boundary selection.
- **Expected:** The home screen opens with the `Stock Balance` card, and a
  `Manage Stock` card is visible — scrolled to if needed. If it is missing, the
  flow fails with `Manage Stock card not displayed on home screen for State User.`
- **Notes:** `Submit` went straight to home with no further sync; a
  `Background service started` banner shows at the bottom for a few seconds.
  The home grid: `Manage Stock`, `Stock Reconciliation`, `File Complaint`,
  `Sync Data`, `View Reports`, `Download Stock Data`, `DB`,
  `HOME_ANALYTICS_DB_LABEL`. Card labels are content-descs; the visible text
  wraps ("Manage / Stock") but the content-desc is whole.

### STK-02 — Record Stock Receipt opens Incoming Transactions
- **Status:** Automated — same flow
- **Preconditions:** STK-01 passed.
- **Steps:** Tap `Manage Stock`, then `Record Stock Receipt`.
- **Expected:** `Manage Stock` opens a screen of the same title listing
  `Record Stock Receipt` and `Record Stock Issued`, with a `View Transactions`
  button. `Record Stock Receipt` opens `Incoming Transactions`, subtitled
  `View and accept incoming stock transactions`.
- **Notes:** The entry's own caption reads `Create records for stock received
  at the warehouse`, but the screen it opens is a list of incoming
  transactions to accept, not a receipt form.

### STK-03 — Incoming transactions are present or absent
- **Status:** Automated — same flow. Both outcomes seen on the app.
- **Preconditions:** STK-02 passed, stock records downloaded. Optional
  `HCM_STATE_STOCK_INCOMING_RECEIPTS` in `.env`: `present`, `absent` or blank.
- **Steps:** Wait for the list under the subtitle. Branch on what it shows.
- **Expected:** Either outcome passes, unless the variable names one:
  - **Absent** — a card reading `No Incoming Transactions` /
    `No incoming stock transactions found`. Logged as
    `No incoming transactions available.`
  - **Present** — transaction cards. The first card is logged to
    `maestro.log`, e.g. `First incoming transaction - MRN null_0, product SPAQ 2: 100, date 15 Oct 2026, sender FAC_F-2026-10-15-137945, status Dispatched`,
    and the list is captured. Logged as `Incoming transactions found.`
  - **Nothing** under the subtitle within 30 s fails with
    `Record Stock Receipt screen did not show transactions or an empty state.`
- **Notes:** Before the download step existed this case reported *absent*
  while three transactions were waiting on the server — the list only shows
  downloaded records. The list painted with the screen, with no loading
  indicator.

### STK-04 — Accept Stock asks for confirmation (Case 2)
- **Status:** Automated — [`flows/stock/state-stock-accept-receipt.yaml`](flows/stock/state-stock-accept-receipt.yaml) · `regression`, `stock`, `state-stock`, `mhbase`, `consumes-data`.
  Its steps ran live on 2026-10-15 against a SPAQ 2 transaction.
- **Preconditions:** STK-03 ends with transactions present, with at least one
  for each of `PRODUCT_VARIANT_1` and `PRODUCT_VARIANT_2`. Otherwise the flow
  fails before touching anything, with
  `BLOCKED - Case 2, 2a and 2b: No incoming transactions available; Case 2 cannot be executed.`
  or `BLOCKED - Case 2, 2a and 2b: Expected product variants SPAQ1 and SPAQ2; found SPAQ2 (1).`
- **Steps:** Find the first `SPAQ1` transaction, capture its MRN, sender and
  quantity, tap its own `Select`. On `Stock Receipt Details` tap
  `Accept Stock`.
- **Expected:** Details shows the same product and sender (`Received from`);
  a real MRN must match Material issue number — otherwise
  `MRN mismatch: expected <card>, found <details>.` Its read-only `Quantity *`
  equals the card's quantity, else
  `Quantity mismatch for SPAQ1: the card shows <X>, Stock Receipt Details shows <Y>.`
  The popup reads
  `Accept Confirmation` / `Are you sure you want to accept this stock?` with
  `Confirm` and `Cancel`.
- **Notes:** The specification has one MRN carrying both variants as records,
  each with its own Accept Stock. The app has one product per transaction and
  one Accept Stock per transaction, so the cases work per transaction; agreed
  2026-10-15. With no MRN in the data (`MRN null_N` / `--`) the MRN check is
  logged, not enforced, and the transaction is identified by product and
  sender. A card is fenced from its MRN label to the next card's, so the
  `Select` tapped is its own.

### STK-05 — Cancel leaves the stock unaccepted (Case 2a)
- **Status:** Automated — same flow, after STK-04. Ran live 2026-10-15.
- **Steps:** In the `SPAQ1` transaction's `Accept Confirmation`, tap `Cancel`.
  Go back to the list.
- **Expected:** The popup closes; `Stock Receipt Details` is still up for the
  same product, `Accept Stock` still offered. Back on the list both variants
  still have every transaction they had. Logged as
  `Cancel returned to Stock Receipt Details; stock not accepted.`
- **Notes:** Runs before STK-06, so the cancel path is proven before anything
  is consumed.

### STK-06 — Confirm accepts SPAQ1, then SPAQ2 (Case 2b)
- **Status:** Automated — same flow, after STK-05. Run by hand on 2026-10-15,
  then by the flow's own steps on 2026-10-19 (`SPAQ 1: 500` and
  `SPAQ 2: 500`, balances 0 → 500 each). Each run consumes one transaction
  per variant.
- **Steps:** 1. The first `SPAQ1` transaction → `Accept Stock` → `Confirm`.
  2. The first `SPAQ2` transaction → `Accept Stock` → `Confirm`. 3. Home.
- **Expected** (observed 2026-10-15; **QA to confirm** as the intended
  behaviour):
  - After each `Confirm`: a `Stock accepted successfully` banner, then the
    `Manage Stock` screen.
  - The accepted transaction leaves Incoming Transactions; the other variant's
    transactions are untouched until its turn.
  - Each product's home Stock Balance rises by the quantity received
    (SPAQ 1 100 → 200, SPAQ 2 0 → 100).
  - A failure in step 2 reads
    `Partial acceptance: SPAQ1 accepted, SPAQ2 failed – <reason>`; a failure
    in step 1 stops before SPAQ2 is touched.
- **Notes:** **Irreversible** — consumes one transaction per variant, so each
  run needs fresh incoming stock; `consumes-data` lets a routine run exclude
  it. The background service uploaded both acceptances on its own:
  `Sync Data` reported `No Data available for sync` afterwards, so the next
  run's `clearState` lost nothing. The by-hand run accepted `MRN null_1`
  (SPAQ 1: 100) and `MRN null_0` (SPAQ 2: 100), both from
  `FAC_F-2026-10-15-137945`; one SPAQ 2 transaction was left for later.

### Not yet covered
- **Reject** on Stock Receipt Details — now its own section,
  [Stock — Reject a receipt](#stock--reject-a-receipt-state-user-health-facility-cdd).
- The Waybill / Batch / Comment fields — left empty when accepting.
- **Lists longer than a screen.** Only the cards on screen are read; three fit
  on the Pixel 9 Pro XL. (The reject flows count the whole list.) A card's
  sender is read inside its own card, fenced by the next card's MRN: on
  2026-10-23 three cards read `SPAQ 1: 900` and the unfenced read took a later
  card's `Select` as the sender.

---

## Stock — Dispatch to a health facility

All four cases run in one flow,
[`flows/stock/state-stock-dispatch.yaml`](flows/stock/state-stock-dispatch.yaml)
· `regression`, `stock`, `state-stock`, `mhbase`, `consumes-data`, starting
from [`subflows/home/state-stock.yaml`](subflows/home/state-stock.yaml) and
Download Stock Data. Strings read off the mhbase build as `AU-SAT-001` on the
`Pixel_9_Pro_XL` emulator (Android 16), 2026-10-19. Test data from `.env`:
`PRODUCT_VARIANT` (`SPAQ1,SPAQ2` — each product runs DSP-01 to DSP-04 in
turn, in one session), `REMAINING_BALANCE` (`10`), optional
`TARGET_HEALTH_FACILITY`.

**The stock balance is the home screen's, and the device's own.** The
dispatch form shows no balance; the only figure is the home Stock Balance line
(`0 SPAQ 1`). It is built from records on the device: on 2026-10-19 a fresh
install read `0 SPAQ 1` / `0 SPAQ 2` and Download Stock Data reported
`No Data Found` — the records accepted on 2026-10-15 (balance 200 / 100 then)
did not come back. Download looks incremental, so after `clearState` the
balance may not reflect the server.

### DSP-01 — The dispatch form opens with a facility and product chosen
- **Status:** Automated — the flow above.
- **Steps:** Home → `Manage Stock` → `Record Stock Issued` → Transaction type
  `Issue` → `Next` → Warehouse Details: `Facility To *` = `TARGET_HEALTH_FACILITY`
  or the first offered → `Next` → Stock Details: `Select product *` =
  `PRODUCT_VARIANT` → `Next`.
- **Expected:** `Select Transaction Type` (options `Issue`, `Return`) →
  `Warehouse Details` (Date of receipt and Settlement area prefilled) →
  `Stock Details` (`1 Selected`, the variant's chip; Received from - facility
  prefilled) → `Product Details` with `Quantity sent *` and `Submit`. The
  chosen facility shows in `Facility To` and is logged.
- **Notes:** `Facility To` and `Transaction type` are search fields (they raise
  the keyboard); `Select product` is a multi-select like the boundary fields.
  On 2026-10-19 `Facility To` offered one facility, `Fac_f-2026-10-15-137947`.
  The form's `version 2` label sits under `Facility To` and is excluded when
  reading options. Waybill, Batch, Transport Type and Vehicle number are left
  empty.

### DSP-02 — A dispatch of 0 is refused (Case 1)
- **Status:** Automated — same flow. Seen on the app 2026-10-19.
- **Steps:** `Quantity sent` = `0`; tap `Submit`.
- **Expected:** `Issued quantity should be more than 1` under the field as soon
  as it is typed; `Submit` stays enabled but does nothing — no popup, still on
  Product Details. Logged as `Dispatch with quantity 0 blocked as expected.`
- **Notes:** The message is read generically (the text under the field that is
  not a number) and logged, so a reworded message still passes. QA to confirm
  the intended text, and whether a disabled `Submit` would be preferred. Should
  `Submit` ever raise a popup here, the flow cancels it and fails — a
  validation case never dispatches.

### DSP-03 — A dispatch above the balance is refused (Case 2)
- **Status:** Automated — same flow. Seen on the app 2026-10-19.
- **Steps:** `Quantity sent` = CURRENT_BALANCE + 1; tap `Submit`. Then back on
  home, re-read the balance.
- **Expected:** A message under the field — `No stock available` when the
  balance is 0, `Quantity cannot exceed stock in hand 500` at a balance of
  500 — and `Submit` does nothing. The balance afterwards equals
  CURRENT_BALANCE. Logged as `Dispatch above stock balance blocked as expected.`
- **Notes:** The balance shows only on home, so it is re-read once, after Cases
  1 and 2 together, rather than after each.

### DSP-04 — A dispatch leaving REMAINING_BALANCE (Case 3)
- **Status:** Automated — same flow. Passed 2026-10-19 for SPAQ 1 and SPAQ 2
  (see Notes); BLOCKED whenever the balance is `REMAINING_BALANCE` or less:
  `BLOCKED - Case 3: Insufficient stock: balance 0; cannot dispatch while leaving 10.`
- **Steps:** Fresh form; `Quantity sent` = CURRENT_BALANCE − REMAINING_BALANCE
  (500 → 490); `Submit`; `Confirm` if a popup offers it; back to home.
- **Expected** (observed 2026-10-19; **QA to confirm** as intended): no
  validation message; no popup — `Submit` dispatches at once — then a
  `Stock recorded successfully` screen, `Stock has been recorded successfully. MRN: <mrn>`,
  with `View Transaction` / `Create New Transaction`. The home balance equals
  `REMAINING_BALANCE`, else
  `Balance mismatch: expected 10, found <actual> after dispatching <qty> from <balance>.`
  The dispatch appears in Manage Stock → View Transactions with the facility
  as Receiver.
- **Notes:** **Irreversible** — moves stock to the facility, which then has it
  as incoming. Run 2026-10-19 as `AU-SAT-001` to `Fac_f-2026-10-15-137947`:
  SPAQ 1 500 → 10 (`MRN 67E0-282C-1890`, 490), SPAQ 2 500 → 10
  (`MRN 9D99-BB3A-DAEC`, 490). The background service synced both — `Sync
  Data` reported nothing pending. **Stock has to reach the device in the same
  session:** the 500 of each arrived as two incoming transactions, so that
  run first downloaded and accepted them (STK-04–06) and then dispatched,
  without the app being wiped in between. Separate test runs each start by
  wiping the app, so this flow on its own finds a balance of 0.

---

## Stock — Return to National

All three cases run in one flow,
[`flows/stock/state-stock-return.yaml`](flows/stock/state-stock-return.yaml)
· `regression`, `stock`, `state-stock`, `mhbase`, `consumes-data`. Read off
the mhbase build as `AU-SAT-001`, 2026-10-19. Test data from `.env`:
`PRODUCT_VARIANT_1` / `_2` (`SPAQ1`, `SPAQ2`), `RETURN_QUANTITY` (`5`),
`EXPECTED_START_BALANCE` (`10`), `EXPECTED_FINAL_BALANCE` (`5`),
`RETURN_DESTINATION`.

**Path:** home → `Manage Stock` → `Record Stock Issued` → Transaction type
`Return` → `Next` → Warehouse Details, `Facility To *` → `Next` → Stock
Details, `Select product *` → `Next` → Product Details,
`Quantity returned *` → `Submit`. The same form as a dispatch
([`open-stock-form.yaml`](subflows/stock/open-stock-form.yaml)).

**Destination.** `Facility To` on the Return path offered one warehouse,
`Fac_f-2026-10-15-137945` — the one that sent the state its stock — and
nothing labelled "National". Confirmed as National on 2026-10-19, so
`RETURN_DESTINATION` holds that code. If it is not offered the case fails
with `Return destination <RETURN_DESTINATION> not available.`

**Stock has to be in the session.** As with DSP-04, the starting balance
lives on the device; this flow on its own starts from a wiped app and stops
before submitting anything, with
`Precondition not met: SPAQ1 balance is 0, expected 10. Run Prompt 3 first.`

### RTN-01 — Return 5 of SPAQ1 to National (Test Case 1)
- **Status:** Automated. Passed 2026-10-19 in the session left by DSP-04
  (`artifacts/runs/20261019-132805-return/`).
- **Preconditions:** SPAQ1 balance `EXPECTED_START_BALANCE` (10) — otherwise
  the case fails as above and submits nothing.
- **Steps:** Return form for SPAQ1, `Facility To` = `RETURN_DESTINATION`,
  `Quantity returned` = 5, `Submit`; `Confirm` if a popup offers it; home.
- **Expected:** No popup; `Stock recorded successfully`,
  `Stock has been recorded successfully. MRN: <mrn>`; home balance
  `EXPECTED_FINAL_BALANCE` (5), else
  `SPAQ1 balance mismatch: expected 5, found <actual> after returning 5 from 10.`
- **Notes:** 2026-10-19: 10 → 5, `MRN 0658-A4D5-C98A`. **Irreversible.**

### RTN-02 — Return 5 of SPAQ2 to National (Test Case 2)
- **Status:** Automated — same flow, after RTN-01. Passed 2026-10-19.
- **Steps / Expected:** As RTN-01, for SPAQ2. A failure here reads
  `Partial return: SPAQ1 returned (10 -> 5), SPAQ2 failed – <reason>`.
- **Notes:** 2026-10-19: 10 → 5, `MRN 0C49-0B5D-57D3`. Maestro stops at the
  first failure, so SPAQ2 is not tried after SPAQ1 fails — the
  specification's "still attempt SPAQ2" is not automated.

### RTN-03 — Returning SPAQ2 leaves SPAQ1 alone
- **Status:** Automated — same flow, after RTN-02. Passed 2026-10-19.
- **Steps:** Home; re-read SPAQ1.
- **Expected:** Still `EXPECTED_FINAL_BALANCE` (5), else
  `SPAQ1 balance changed after a later return: expected 5, found <actual>.`
- **Notes:** Both returns synced on their own — `Sync Data` reported
  `No Data available for sync`. Home ended at `5 SPAQ 1` / `5 SPAQ 2`.

---

## Stock — Health facility accepts the state's dispatch

All six cases run in one flow,
[`flows/stock/hf-stock-accept-receipt.yaml`](flows/stock/hf-stock-accept-receipt.yaml)
· `regression`, `stock`, `hf-stock`, `mhbase`, `consumes-data` — the
specification's `hf_main.yaml`. Read off the mhbase build as `AU-HFS-001` on
the `Pixel_9_Pro_XL` emulator, 2026-10-19. Test data from `.env`:
`TEST_USER` (`AU-HFS-001`), `PRODUCT_VARIANT_1` / `_2` (`SPAQ1`, `SPAQ2`),
`EXPECTED_INITIAL_BALANCE` (`0`), `DISPATCHED_QTY_SPAQ1` / `_SPAQ2` (`490`
each — DSP-04's dispatches). A gap in the test data fails the flow before
the device is touched.

**Path to home.** Sign-in and facility as ONB-03 (the first
`ADMIN_Health Facility` option — `03ba Buri-Buri Health Post`, the only one),
then `Submit`. Unlike the state user's, this Submit raises
`No data found!` / `There are no new records found for the selected boundary`
with `Go Back`, which leads on to home. Then Download Stock Data, as for the
state user.

**One product per transaction.** The specification has one MRN carrying both
variants. The state dispatched each product separately (DSP-04), so the
facility receives two transactions, each with its own real MRN; Test Cases
3–5 work per transaction, as STK-04–06 do.

**Which facility.** The boundary list names the facility
`03ba Buri-Buri Health Post`; the state's Facility To named it
`Fac_f-2026-10-15-137947`. The two lists use different names, so they are
not compared. The incoming list is the evidence: it shows only stock sent to
this facility, and on 2026-10-19 it held DSP-04's two MRNs — so
`03ba Buri-Buri Health Post` is `Fac_f-2026-10-15-137947`. The sender,
`FAC_F-2026-10-15-137946`, is the state's own warehouse.

### HFR-01 — Initial balance is zero (Test Case 1)
- **Status:** Automated — the flow above. All six cases passed in one run on
  2026-10-19 (8 min 47 s, `artifacts/runs/20261019-143137/`): `0 SPAQ 1`,
  `0 SPAQ 2`.
- **Steps:** Home after Download Stock Data; read `SPAQ 1` and `SPAQ 2`.
- **Expected:** Both equal `EXPECTED_INITIAL_BALANCE` (0); otherwise
  `BLOCKED - Test Cases 2 to 6: Precondition not met: SPAQ1 initial balance is <actual>, expected 0.`
- **Notes:** The app lists a product with no stock as `0 SPAQ 1`, so a missing
  line is not taken as 0 — it fails as
  `Unable to read stock balance for SPAQ1.` Read after the download, so it
  counts every record the device holds; a fresh install reads 0 before it.

### HFR-02 — The state's dispatch is listed (Test Case 2)
- **Status:** Automated — same flow. Passed 2026-10-19: two cards,
  `MRN 9D99-BB3A-DAEC` (`SPAQ 2: 490`) above `MRN 67E0-282C-1890`
  (`SPAQ 1: 490`), both from `FAC_F-2026-10-15-137946`, status `Dispatched`,
  dated 19 Oct 2026 — DSP-04's two dispatches.
- **Steps:** `Manage Stock` → `Record Stock Receipt`.
- **Expected:** At least one card with a real MRN (`MRN 67E0-282C-1890` —
  not a `MRN null_N` placeholder); its MRN captured and the first card logged.
  Nothing listed:
  `BLOCKED - Test Cases 3 to 6: No incoming transactions for Health Facility; State dispatch not received.`

### HFR-03 — Stock Receipt Details matches the dispatch (Test Case 3)
- **Status:** Automated — same flow. Passed 2026-10-19: each transaction's
  details showed its card's MRN and sender, and `Quantity *` `490` — the
  quantity dispatched.
- **Steps:** For SPAQ1, then SPAQ2: the variant's first transaction →
  `Select` → `Stock Receipt Details` → `Back`.
- **Expected:** A transaction for each variant, else
  `BLOCKED - Test Cases 3 to 6: Expected product variants SPAQ1 and SPAQ2; found <…>.`
  Details shows the card's product (`Resource`), MRN
  (`Material issue number`) and sender (`Received from`), and its `Quantity *`
  — a read-only field prefilled with the quantity sent — equals the card's
  and `DISPATCHED_QTY_*`, else
  `Quantity mismatch for SPAQ1: dispatched 490, shown as received <Y>.`
- **Notes:** Both are checked before anything is accepted.

### HFR-04 — Cancel leaves both pending (Test Case 4)
- **Status:** Automated — same flow, the state user's STK-04/05 steps.
  Passed 2026-10-19 on `MRN 67E0-282C-1890`.
- **Steps:** SPAQ1's transaction → `Accept Stock` → `Cancel` → `Back`.
- **Expected:** `Accept Confirmation` with `Confirm` and `Cancel`; after
  Cancel, still on Stock Receipt Details with `Accept Stock` offered; both
  variants' transactions still listed.

### HFR-05 — Accept SPAQ1, then SPAQ2 (Test Case 5)
- **Status:** Automated — same flow, the state user's STK-06 steps. Passed
  2026-10-19: `MRN 67E0-282C-1890` (SPAQ 1), then `MRN 9D99-BB3A-DAEC`
  (SPAQ 2), each with `Stock accepted successfully`.
- **Steps:** SPAQ1's transaction → `Accept Stock` → `Confirm`; then SPAQ2's.
- **Expected:** After each, `Stock accepted successfully`, back on Manage
  Stock, the transaction and its MRN gone from the list, the other variant
  untouched until its turn. A failure on SPAQ2 reads
  `Partial acceptance: SPAQ1 accepted, SPAQ2 failed – <reason>`; a failure on
  SPAQ1 stops before SPAQ2.
- **Notes:** **Irreversible** — consumes both dispatches.

### HFR-06 — Balances rose by what was received (Test Case 6)
- **Status:** Automated — same flow. Passed 2026-10-19: `490 SPAQ 1`,
  `490 SPAQ 2`; Record Stock Receipt then read `No Incoming Transactions`.
- **Steps:** Home; read both balances; reopen Record Stock Receipt.
- **Expected:** Each balance is initial + received (0 + 490), else
  `Balance mismatch for SPAQ1: expected 490, found <actual>.`; neither
  accepted MRN is listed. The flow ends by logging the execution report:
  user, facility, initial balances, first MRN, received against dispatched,
  the Cancel result, what was accepted, and final balances.
- **Notes:** The balance is the device's own figure, so there is no sync to
  wait for before reading it. Home showed a `Data Unsynced` /
  `There are 1 transactions yet to be synced` card just after; the background
  service cleared it within two minutes, and `Sync Data` then reported
  `No Data available for sync` — so a later wipe of the app loses nothing.

---

## Stock — Health facility dispatches to a CDD (QR code)

All cases run in one flow,
[`flows/stock/hf-stock-dispatch-cdd.yaml`](flows/stock/hf-stock-dispatch-cdd.yaml)
· `regression`, `stock`, `hf-stock`, `mhbase`, `consumes-data`, `qr-camera` —
the specification's `hf_dispatch_cdd.yaml`, built on the state's dispatch
cases (DSP-01–04). Read off the mhbase build as `AU-HFS-001`, 2026-10-19.
Test data from `.env`: `TEST_USER` (`AU-HFS-001`), `TARGET_CDD`
(`AU-CDD-001`), `PRODUCT_VARIANT` (`SPAQ1,SPAQ2`), `REMAINING_BALANCE`
(`10`), `QR_CODE_PATH` (`assets/qr/cdd_qr.png`).

**Path:** home → `Manage Stock` → `Record Stock Issued` → Transaction type
`Issue` → Warehouse Details, `Facility To *` offers only `Delivery team`,
which adds a `Team Code` button (QR icon) → scanner → back with Team Code
filled → Stock Details (`Received from - facility` prefilled with the
facility's own code, `Fac_f-2026-10-15-137947`) → Product Details,
`Quantity sent *` → `Submit`. After Team Code it is the state's form.

**The QR code.** The CDD's own QR, shown in their side menu, holds
`<user name>||<user id>`; `assets/qr/cdd_qr.png` was cropped from a
screenshot of `AU-CDD-001`'s menu. The scanner has no gallery or manual entry,
so the specification's Method A (addMedia + gallery) is not possible; Method
B is used — [`prepare-qr-camera`](README.md#qr-codes-on-the-emulator) points
the emulator's virtual camera at the room's wall and flashes the image there.

**Stock has to be in the session**, as for RTN-01: the flow on its own
starts from a wiped app, where the balance is 0 and Case 3 is BLOCKED.

### CDD-01 — The CDD is chosen by scanning their QR code
- **Status:** Automated — the flow above, on every form it opens. All four
  cases passed for SPAQ1 and SPAQ2 on 2026-10-19, in the session left by
  HFR-06 (13 min 16 s, `artifacts/runs/20261019-160735/`): four scans, each
  `AU-CDD-001`.
- **Steps:** Facility To `Delivery team` → `Team Code` → camera permission if
  asked → wait for the scanner to read a code → `Submit`.
- **Expected:** `Scan QR Code` opens; within 30 s `1 Resources Scanned` lists
  `AU-CDD-001||…`; its user name equals `TARGET_CDD`; after Submit, Warehouse
  Details shows Team Code `AU-CDD-001`. Otherwise
  `QR code scan failed: <reason>.` and nothing is dispatched — e.g.
  `QR code scan failed: scanned AU-CDD-002, expected AU-CDD-001.`
- **Notes:** The scanner keeps reading a code that stays in view, each time
  raising a red `Code already scanned` banner over Submit; a tap then lands
  on the banner. With the QR held in front of the camera, Submit never came
  free in ten tries (run `20261019-155400`, stopped before any quantity).
  The banner clears about 5 s after the code leaves the view, so
  `prepare-qr-camera` flashes the QR (2 s up, 10 s down) and the flow taps
  Submit once the banner is gone. The count stays at 1. Camera permission
  was already granted at onboarding.

### CDD-02 — A dispatch of 0 is refused (Case 1)
- **Status:** Automated — same flow, DSP-02's steps. Passed 2026-10-19 for
  both: `Issued quantity should be more than 1`, nothing dispatched.

### CDD-03 — A dispatch above the balance is refused (Case 2)
- **Status:** Automated — same flow, DSP-03's steps. Passed 2026-10-19 for
  both: 491 against a balance of 490 —
  `Quantity cannot exceed stock in hand 490`; the balance stayed 490.

### CDD-04 — A dispatch leaving REMAINING_BALANCE (Case 3)
- **Status:** Automated — same flow, DSP-04's steps. Passed 2026-10-19:
  SPAQ1 490 → 10 (`MRN 0572-01DA-C66C`), SPAQ2 490 → 10
  (`MRN CDC9-2D30-F38E`), 480 each to `Delivery team - Team Code AU-CDD-001`.
- **Expected:** As DSP-04: no popup; `Stock recorded successfully`,
  `Stock has been recorded successfully. MRN: <mrn>`; home balance
  `REMAINING_BALANCE`, else
  `Balance mismatch: expected 10, found <actual> after dispatching <qty> from <balance>.`
  The MRN is in the dispatch summary for the CDD's acceptance.
- **Notes:** **Irreversible** — moves stock to the CDD, who accepts it in the
  next prompt. The first `Sync Data` afterwards uploaded the two dispatches
  (`Sync in progress`); the second reported `No Data available for sync`.

---

## Stock — Health facility returns to the state

All three cases run in one flow,
[`flows/stock/hf-stock-return-state.yaml`](flows/stock/hf-stock-return-state.yaml)
· `regression`, `stock`, `hf-stock`, `mhbase`, `consumes-data` — the
specification's `hf_return_state.yaml`, running the state's return subflow
(RTN-01–03) for the health facility. Read off the mhbase build as
`AU-HFS-001`, 2026-10-19. Test data from `.env`: `TEST_USER`,
`PRODUCT_VARIANT_1` / `_2`, `RETURN_QUANTITY` (`5`),
`EXPECTED_START_BALANCE` (`10`), `EXPECTED_FINAL_BALANCE` (`5`),
`HF_RETURN_DESTINATION`.

**Destination.** On the Return path `Facility To` offered one warehouse,
`Fac_f-2026-10-15-137946` — the state's, which sent this facility its stock
(Prompt 5's `Received from`, `FAC_F-2026-10-15-137946`). No `Delivery team`,
so a return scans no QR code. Not offered:
`Return destination <HF_RETURN_DESTINATION> not available.`

**Stock has to be in the session**, as for RTN-01; on its own the flow stops
with `Precondition not met: SPAQ1 balance is 0, expected 10. Run Prompt 6 first.`

### HRT-01 — Return 5 of SPAQ1 to the state (Test Case 1)
- **Status:** Automated. All three cases passed on 2026-10-19 in the session
  left by CDD-04 (4 min 1 s, `artifacts/runs/20261019-165213/`): SPAQ1
  10 → 5, `MRN 547C-3366-330E`. No popup; `Stock recorded successfully`.
- **Steps / Expected:** As RTN-01, from the health facility: SPAQ1 10 → 5,
  else `SPAQ1 balance mismatch: expected 5, found <actual> after returning 5 from 10.`;
  the MRN is logged for the state's acceptance. **Irreversible.**

### HRT-02 — Return 5 of SPAQ2 to the state (Test Case 2)
- **Status:** Automated — same flow, after HRT-01. Passed 2026-10-19: SPAQ2
  10 → 5, `MRN 5318-E7D9-B9D7`.
- **Steps / Expected:** As HRT-01 for SPAQ2. A failure here reads
  `Partial return: SPAQ1 returned (10 -> 5), SPAQ2 failed – <reason>`.

### HRT-03 — Returning SPAQ2 leaves SPAQ1 alone
- **Status:** Automated — same flow, after HRT-02. Passed 2026-10-19: SPAQ1
  still 5.
- **Expected:** SPAQ1 still 5, else
  `SPAQ1 balance changed after a later return: expected 5, found <actual>.`
- **Notes:** The background service uploaded both returns on its own — the
  first `Sync Data` afterwards reported `No Data available for sync`. Home
  ended at `5 SPAQ 1` / `5 SPAQ 2`.

---

## Stock — Reconciliation (state user and health facility)

One shared subflow,
[`reconcile-variant.yaml`](subflows/stock/reconciliation/reconcile-variant.yaml),
run per role by
[`flows/stock/hf-stock-reconciliation.yaml`](flows/stock/hf-stock-reconciliation.yaml)
and
[`flows/stock/state-stock-reconciliation.yaml`](flows/stock/state-stock-reconciliation.yaml)
· `regression`, `stock`, `hf-stock` / `state-stock`, `mhbase`,
`consumes-data`. Read off the mhbase build, 2026-10-19. Test data from
`.env`: `PRODUCT_VARIANT_1` / `_2`, `RECON_COMMENT`, optional
`RECON_FACILITY`.

**The screen.** `Stock Reconciliation` is a home card: `Select warehouse *`
(the user's own warehouse — the health facility's
`Fac_f-2026-10-15-137947`, alone), `Select product variant *` (`Spaq 1`,
`Spaq 2`), then `Stock metrics` — Date, Stock Received, Stock Issued, Stock
Returned, **Stock in hand** (the home balance) — and `Manual count *`,
prefilled with stock in hand, and `Submit`. A `Comments` field appears only
while the count differs from stock in hand. Submit goes straight to
`Stock reconciliation submitted successfully` /
`Your stock reconciliation has been recorded` with `Back To Home`; no popup.
**Every submission records a reconciliation.**

**The specification's rules do not hold in this build** — both were marked
"to be confirmed by QA". Agreed on 2026-10-19 to run every case and report
the differences rather than stop at the first:

1. **A comment is not required for a differing count.** `Comments` carries
   no asterisk, and Submit without a comment goes through.
2. **Stock in hand does not change to the reconciled count.** After
   reconciling 4 or 6 against 5, stock in hand still read 5, on the form and
   on home.

Each difference is logged as `DEVIATION - …` and the run fails at the end
listing them all, e.g.
`Stock reconciliation for Health Facility User differs from the specification: Comments is not marked mandatory when the count differs from stock in hand (SPAQ1 Case 2, …); a count different from stock in hand was submitted without a comment (…); stock in hand did not change to the reconciled count (…).`
Because a refused-or-not submission without a comment does go through, the
form is reopened and the count entered again for the submission with the
comment. Case 3's count is stock in hand as read after Case 2, + 1 — so 6
here, not the specification's 5, since stock in hand stayed 5.

### REC-01 — Stock in hand is read per variant
- **Status:** Automated — both flows. Health facility passed 2026-10-19 in
  the session left by HRT-03 (`artifacts/runs/20261019-175232/`): SPAQ1 5,
  SPAQ2 5. State, 2026-10-19 (`artifacts/runs/20261019-182047/`): read, but
  **BLOCKED** — see Notes.
- **Expected:** The warehouse is picked (`RECON_FACILITY` or the first
  offered, logged); a number to the right of `Stock in hand`, else
  `Unable to read Stock in hand for SPAQ1 on Stock Reconciliation (read "<text>").`
  No warehouse:
  `No facilities available in Stock Reconciliation dropdown for <role>.`
  Below 0 the variant's cases are BLOCKED and nothing is submitted:
  `BLOCKED - SPAQ1 Cases 1 to 3: Precondition not met: Stock in hand is <n>, expected at least 1.`
- **Notes:** The state user signed in afresh (the stock it held lived in a
  session wiped since). Select warehouse offered `Fac_f-2026-10-15-137946`;
  each product read Stock Received 0, Stock Issued 490, Stock Returned 0,
  **Stock in hand -490** — Download Stock Data had brought back the dispatch
  to the health facility but none of what the state received or returned.
  Both products BLOCKED, nothing submitted. A first attempt, before the
  negative-stock rule existed, was stopped before its first Submit. For a
  real state run, reconcile in the session that received the stock.

### REC-02 — A count equal to stock in hand needs no comment (Case 1)
- **Status:** Automated. Health facility passed 2026-10-19 for both: no
  Comments field, submitted, stock in hand 5 → 5. State: BLOCKED (REC-01).
- **Expected:** Comments not marked mandatory; submitted; stock in hand
  unchanged. Logged as
  `Reconciliation with matching count submitted without a comment.`

### REC-03 — A count one less needs a comment (Case 2)
- **Status:** Automated — **fails by design** against this build. Health
  facility 2026-10-19, both variants: count 4 — Comments not marked
  mandatory, **submitted without a comment**; with the comment submitted;
  stock in hand stayed 5 (expected 4). State: BLOCKED (REC-01).
- **Expected (specification):** Comments mandatory; Submit without it
  refused; with it submitted and stock in hand becomes the count. BLOCKED,
  touching nothing, at stock in hand 0:
  `BLOCKED - SPAQ1 Case 2: Stock in hand is 0; cannot enter a count lower than stock in hand.`

### REC-04 — A count one more needs a comment (Case 3)
- **Status:** Automated — **fails by design** against this build. Health
  facility 2026-10-19, both variants: count 6 — as REC-03; stock in hand
  stayed 5 (expected 6). Final stock in hand 5 = the original. State:
  BLOCKED (REC-01).
- **Notes:** The health facility run recorded 5 reconciliations per variant
  (one per submission). Before it, the first exploration and an attempt
  stopped by a locator fix added three more for SPAQ1 — one of 5 and two of
  4, all without a comment.

---

## Stock — View Reports (state user and health facility)

One shared subflow,
[`view-report.yaml`](subflows/stock/reports/view-report.yaml), run per role
by [`flows/stock/state-stock-view-reports.yaml`](flows/stock/state-stock-view-reports.yaml)
and [`flows/stock/hf-stock-view-reports.yaml`](flows/stock/hf-stock-view-reports.yaml)
· `regression`, `stock`, `state-stock` / `hf-stock`, `mhbase`. Reads only.
Read off the mhbase build, 2026-10-19. Test data from `.env`: the
`STATE_REPORT_*` / `HF_REPORT_*` entries (from the earlier prompts' execution
reports) and optional `REPORT_FACILITY`.

**The screens.** `View Reports` is a home card listing `Stock Received`,
`Stock Issued`, `Stock Returned` and `Stock Reconciliation`. The first three
open `Reports` with `Select warehouse *` and `Product *`; Stock
Reconciliation opens `Stock Reconciliation` / `Reports of reconciliation`
with `Select facility *` and `Select product *`. Each filter lists the
user's own warehouse only; there is no date filter. Picking the warehouse
alone loads the table (both products). A transaction table scrolls sideways:
`Date | Product | MRN | Waybill Number |` and a quantity column whose header
reads `STOCKREPORTS_REPORT_DETAILS_TABLE_HEADER_4_LABEL` — an untranslated
label key. Each row is one element holding every cell. Empty:
`No records found for the selected filters`. No column names the sender or
recipient, so the specification's recipient / destination checks have
nothing to read and are not made.

**The reports show only the records on the device.** Like Stock Balance,
they are built from what the app holds locally. Every earlier prompt was run
in a session wiped since, so after a fresh sign-in:
- **Health facility** — every table empty, Download Stock Data finding
  nothing new.
- **State** — Stock Received lists only the health facility's two returns
  (Prompt 7, `547C-3366-330E` SPAQ 1 5 and `5318-E7D9-B9D7` SPAQ 2 5),
  downloaded as incoming and not yet accepted; Issued, Returned and
  Reconciliation empty — although the state's reconciliation screen counts
  490 issued.

The flows report this rather than stop at it: every report runs, and the run
fails at the end listing each empty table, missing entry and the
untranslated header. For the earlier prompts' entries to appear, view the
reports in the session that made the transactions.

### VR-01 — View Reports offers four reports
- **Status:** Automated — both flows. Passed 2026-10-19 for the health
  facility (`artifacts/runs/20261019-192933/`, 17 min with sign-in) and the
  state (`artifacts/runs/20261019-194714/`, 7 min).
- **Expected:** All four listed, else
  `<Report> not available in View Reports for <role>.`

### VR-02 — Stock Received holds the receipts (Test Case 1)
- **Status:** Automated — **fails** against fresh sessions (see above).
  Health facility 2026-10-19: empty; expected Prompt 5's `67E0-282C-1890`
  SPAQ1 490 and `9D99-BB3A-DAEC` SPAQ2 490. State: two rows,
  `19 Oct 2026 | SPAQ 1 | 547C-3366-330E | -- | 5` and
  `19 Oct 2026 | SPAQ 2 | 5318-E7D9-B9D7 | -- | 5` (the health facility's
  returns, unaccepted); Prompt 2's `C552-4450-5C9A` SPAQ1 500 and
  `B46C-1695-D327` SPAQ2 500 not found; headers read, quantity header
  untranslated.
- **Expected:** Each entry's row — product, MRN, quantity — present; else
  `Stock Received is missing <n> of <m> expected entries from <prompt> (…)`,
  or, empty, `Stock Received table is empty for <role>; expected transactions from <prompt>`.
  Headers `Date`, `Product`, `MRN`, `Waybill Number` read; the quantity
  header's untranslated key is reported.

### VR-03 — Stock Issued holds the dispatches (Test Case 2)
- **Status:** Automated — **fails** against fresh sessions. Health facility
  2026-10-19: empty; expected Prompt 6's `0572-01DA-C66C` SPAQ1 480 and
  `CDC9-2D30-F38E` SPAQ2 480. State: empty; expected Prompt 3's
  `67E0-282C-1890` SPAQ1 490 and `9D99-BB3A-DAEC` SPAQ2 490.

### VR-04 — Stock Returned holds the returns (Test Case 3)
- **Status:** Automated — **fails** against fresh sessions. Health facility
  2026-10-19: empty; expected Prompt 7's `547C-3366-330E` SPAQ1 5 and
  `5318-E7D9-B9D7` SPAQ2 5. State: empty; expected Prompt 4's
  `0658-A4D5-C98A` SPAQ1 5 and `0C49-0B5D-57D3` SPAQ2 5.

### VR-05 — Stock Reconciliation holds the reconciliations (Test Case 4)
- **Status:** Automated — **fails** against fresh sessions. Health facility
  2026-10-19: empty; expected Prompt 8's counts 5, 4 and 6 per product.
  State: empty, as expected — it submitted none (REC-01).
- **Notes:** The reconciliation table's columns have not been seen — it was
  empty every time — so an entry is looked for as its product and count
  anywhere in a row. Check the columns once it shows rows.

---

## Stock — Reject a receipt (state user, health facility, CDD)

[Prompt 15](prompts/prompt-15-stock-reject.md): one shared subflow,
[`reject-receipt.yaml`](subflows/stock/reject-receipt/reject-receipt.yaml),
run per receiving role by
[`flows/stock/state-stock-reject-receipt.yaml`](flows/stock/state-stock-reject-receipt.yaml),
[`flows/stock/hf-stock-reject-receipt.yaml`](flows/stock/hf-stock-reject-receipt.yaml)
and
[`flows/stock/cdd-stock-reject-receipt.yaml`](flows/stock/cdd-stock-reject-receipt.yaml)
· `regression`, `stock`, `state-stock` / `hf-stock` / `cdd`, `mhbase`,
`consumes-data`. The counterpart of accepting (STK-04–06, HFR-03–05, REG-12):
the same Incoming Transactions and Stock Receipt Details, but Reject. Test
data from `.env`: `PRODUCT_VARIANT_1` / `_2`, `REJECT_REASON`.

**How it was run.** On 2026-10-23 as the state user (AU-SAT-001), against
National's two fresh dispatches of that morning — `SPAQ 1: 900` and
`SPAQ 2: 900`, both from `FAC_F-2026-10-15-137945` with placeholder MRNs
(`MRN null_0`, `MRN null_1`). The list also held the health facility's two
returns of 2026-10-19 (`5318-E7D9-B9D7` SPAQ 2 5, `547C-3366-330E` SPAQ 1 5),
which were left alone. Run `20261023-131008` (7 min 23 s with sign-in)
passed Test Cases 1–4 and rejected SPAQ1, then failed on the flow's own
count: it counted only the three cards on screen, and the rejection brought
the fourth (another SPAQ1) into view. The count now walks the whole list
([`count-all.yaml`](subflows/stock/reject-receipt/count-all.yaml)), and the
message is looked for straight after Confirm (the first run looked 6 s late
and missed the banner). In the same session, `20261023-132400` (4 min 38 s)
rejected SPAQ2 and passed Test Case 6; Sync Data then reported
`No Data available for sync`. The fixed flow has not yet run end to end in
one go. **The health facility and the CDD have not been run:** each needs a
fresh, unaccepted dispatch of both variants — from the state (as Prompt 3)
and from the health facility (as Prompt 6). Every run rejects both.

**2026-10-26, chained** (see [Chained runs](#chained-runs--2026-10-26)): the
state user passed all six in one run (`20261026-162237`), rejecting
National's `SPAQ 1: 900` and `SPAQ 2: 900` (placeholder MRNs); balances
410 → 410. The health facility passed all six (`20261026-172654`), rejecting
two of the state's four dispatches of the same chain — `BFBE-4559-55E0`
(SPAQ 1, 200) and `AC86-4096-BDD2` (SPAQ 2, 200); after Download Stock Data
both stayed gone. Its balances read 0 → 0, which proves nothing here: a
negative balance shows as 0 on home. The CDD has not been run.

**What the app does** — read off the app as AU-SAT-001, 2026-10-23: Reject
raises `Reject Confirmation` / `Are you sure you want to reject this stock?`
with a text area `Reason for rejection *`, then `Confirm` and `Cancel`.
Confirm lands on Manage Stock with a green `Stock rejected successfully`
banner that lasts a few seconds; the transaction leaves Incoming
Transactions, and the balance does not change. From the app's source
(egovernments/health-campaign-field-worker-app, main, read 2026-10-23): the
tenant's config decides whether Reject asks first, so the flow also handles
a build without the popup; a rejected dispatch is marked `REJECTED`, and the
sender's balance gets the quantity back when the sender next downloads stock
— not checked here. **QA to confirm** the wording as intended.

The popup, reason field and message are soft checks: each difference is
logged as `DEVIATION - …` and the run fails at the end listing them
(`Stock rejection for <role> differs from Prompt 15: …`). A transaction left
listed, a list that changes after Cancel, or a balance that moves fails at
once.

### RJT-01 — Stock Receipt Details offers Reject (Test Case 1)
- **Status:** Automated — the flows above. State user passed 2026-10-23
  (`20261023-131008`): `SPAQ 1: 900`, `MRN null_0` (details `--`), sender
  `FAC_F-2026-10-15-137945`, quantity 900. State user and health facility passed again 2026-10-26 (`20261026-162237`, `-172654`). CDD: not run.
- **Preconditions:** Download Stock Data run; at least one incoming
  transaction for each variant, else
  `BLOCKED - Test Cases 1 to 6: No incoming transactions for <role>; <prerequisite> not received.`
  or `BLOCKED - Test Cases 1 to 6: Expected product variants SPAQ1 and SPAQ2; found <…>.`
  — nothing is rejected.
- **Steps:** Home balances read; Record Stock Receipt; the first `SPAQ1`
  transaction → `Select`.
- **Expected:** Stock Receipt Details shows the card's product, MRN, sender
  and quantity (as STK-04), and offers both `Accept Stock` and `Reject`.

### RJT-02 — Reject asks for confirmation (Test Case 2)
- **Status:** Automated. State user passed 2026-10-23 (`20261023-131008`,
  and again for SPAQ2 in `-132400`). State user and health facility passed again 2026-10-26 (`20261026-162237`, `-172654`). CDD: not run.
- **Steps:** Tap `Reject`.
- **Expected:** `Reject Confirmation` / `Are you sure you want to reject this
  stock?`, a `Reason for rejection *` text area, `Confirm` and `Cancel`; its
  title, buttons and reason field are logged.
- **Notes:** No popup within 10 s is a DEVIATION, and the tap has then
  already rejected the `SPAQ1` transaction: RJT-03 and RJT-04 cannot run, and
  the run goes straight to RJT-05's checks for it.

### RJT-03 — Cancel leaves the stock pending (Test Case 3)
- **Status:** Automated. State user passed 2026-10-23 (`20261023-131008`).
  State user and health facility passed again 2026-10-26 (`20261026-162237`, `-172654`). CDD: not run.
- **Steps:** In the popup, `Cancel`; then `Back`.
- **Expected:** The popup closes; Stock Receipt Details is still up for the
  same product with `Accept Stock` and `Reject` offered; back on the list,
  both variants still have every transaction they had, else
  `Test Case 3 - the incoming list changed after Cancel: …`.

### RJT-04 — A reason is required (Test Case 4)
- **Status:** Automated. State user passed 2026-10-23 (`20261023-131008`):
  Confirm with the reason empty showed `Reason for Rejection is required` and
  the popup stayed up. State user and health facility passed again 2026-10-26 (`20261026-162237`, `-172654`). CDD: not run.
- **Expected (QA to confirm):** The popup's reason field is marked
  mandatory, and Confirm with it empty is refused (`<label> is required`),
  the popup staying up.
- **Notes:** Soft check. No field, or one not marked mandatory, is a
  DEVIATION, and Confirm with it empty is then never tried — it would reject
  without a reason. A mandatory field whose empty Confirm goes through is a
  DEVIATION, and that transaction is rejected without a reason.

### RJT-05 — Reject SPAQ1, then SPAQ2 (Test Case 5)
- **Status:** Automated. State user passed 2026-10-23: SPAQ1 `SPAQ 1: 900`
  rejected in `20261023-131008` (gone from the list; the run's on-screen
  count misread it, since fixed), SPAQ2 `SPAQ 2: 900` in `-132400` —
  `Stock rejected successfully`, SPAQ2 2 → 1 listed, SPAQ1 untouched. Both
  carried `Automation test - stock rejected`. State user and health facility passed again 2026-10-26 (`20261026-162237`, `-172654`). CDD: not run.
- **Steps:** For each variant: its first transaction → `Reject` →
  `REJECT_REASON` in the reason field → confirm.
- **Expected:** A message about the rejection (none is a DEVIATION); back on
  Incoming Transactions the transaction and a real MRN are gone and the other
  variant is untouched until its turn, else
  `the SPAQ1 transaction is still listed after Reject (…)`. A failure on the
  second reads `Partial rejection: SPAQ1 rejected, SPAQ2 failed – <reason>`.
- **Notes:** **Irreversible** — consumes one dispatch per variant. Confirm
  lands on Manage Stock; the flow also handles the list, a success screen
  and home. The incoming list is counted whole, scrolling to its end: the
  accept flows count only the cards on screen (three fit).

### RJT-06 — Nothing was received (Test Case 6)
- **Status:** Automated. State user passed 2026-10-23 (`20261023-132400`):
  `0 SPAQ 1` / `0 SPAQ 2` before and after; after Download Stock Data the
  list held only the health facility's two returns. Both rejected
  transactions had placeholder MRNs, so the "not listed again" check had no
  MRN to look for. State user and health facility passed again 2026-10-26 (`20261026-162237`, `-172654`). CDD: not run.
- **Steps:** Home; read both balances; Download Stock Data; Record Stock
  Receipt.
- **Expected:** Each Stock Balance unchanged, else
  `Test Case 6 - stock was rejected, but the balance changed: …`; the
  rejected MRNs not listed again. The flow ends by logging the execution
  report.

### Not yet covered
- **The sender's balance coming back** — out of scope (decided 2026-10-23).
  It happens on the sender's device when the sender downloads stock, so it
  would need the sender's session.
- **View Reports after a rejection.**

---

## Stock — View Transactions (state user, health facility, CDD)

[Prompt 16](prompts/prompt-16-view-transactions.md): one shared subflow,
[`view-transactions.yaml`](subflows/stock/view-transactions/view-transactions.yaml),
run per role by
[`flows/stock/state-stock-view-transactions.yaml`](flows/stock/state-stock-view-transactions.yaml),
[`flows/stock/hf-stock-view-transactions.yaml`](flows/stock/hf-stock-view-transactions.yaml)
and
[`flows/stock/cdd-stock-view-transactions.yaml`](flows/stock/cdd-stock-view-transactions.yaml)
· `regression`, `stock`, `state-stock` / `hf-stock` / `cdd`, `mhbase`.
**Reads only.** Test data from `.env`: `PRODUCT_VARIANT_1` / `_2`, optional
`VIEW_TXN_EXPECTED_STATE` / `_HF` / `_CDD`.

**The screen** — read off the app as AU-SAT-001, 2026-10-23: Manage Stock's
foot offers `View Transactions`, which opens `View Transactions` / `View all
stock transactions`. One card per MRN: an `MRN <mrn>` tag and the date
(`19 Oct 2026`), `Receiver` over the party's id, `View QR` (dispatches), the
product line (`SPAQ 2: 490`) and `Select Transaction`. From the app's
source, it lists the stock records **the signed-in user created** on the
device, rejected ones left out — so after a fresh sign-in it holds what
Download Stock Data brought back. Select Transaction opens `Stock Receipt
Details`: Resource, Transaction Type, Transaction reason, Sender, MRN number,
Waybill number, Batch number, Quantity received, Comment. View QR opens a
`QR Code` popup with the QR image and a text-less close X.

**How it was run.** The screens were read off the app as the state user on
2026-10-23 (read only), then the shared subflow ran as written in that
session (`20261023-135912`, 2 min 55 s): all six cases passed, with
`VIEW_TXN_EXPECTED_STATE` = `SPAQ1 490,SPAQ2 490`. Then the committed flows
ran end to end, sign-in included, on 2026-10-23: the state user and the CDD
passed in `20261023-140237` (24 min 48 s — a slow sign-in sync — and 6 min
23 s). The health facility failed there on Back from a transaction's
details: the background Auto Sync's Android notification covered the Back
link as it was tapped. Back is now retried once the notification has gone
([`tap-back.yaml`](subflows/stock/view-transactions/tap-back.yaml)), and the
health facility passed in `20261023-145737` (6 min 53 s).

**Points for QA** (logged as `NOTE - …`; the flows pass on them):
1. The details screen is titled `Stock Receipt Details` and labels the
   quantity `Quantity received` for a dispatched transaction too, and shows
   the Sender but no Receiver.
2. Back from a transaction's details returns to Manage Stock, not to View
   Transactions (as the app's source configures it).
3. The state user's two dispatches of 2026-10-19 show as `MRN 8407-93EF-C911`
   (SPAQ 1: 490) and `MRN A4ED-AAB3-1B81` (SPAQ 2: 490) — same date,
   receiver and quantities as DSP-04's dispatches, which were recorded as
   `67E0-282C-1890` and `9D99-BB3A-DAEC`. From the app's source, accepting
   stock writes a new MRN, so the health facility's acceptance (HFR-05) may
   have renumbered them. Hence `VIEW_TXN_EXPECTED_*` entries take an MRN
   only optionally.

### VTX-01 — Manage Stock offers View Transactions, and it opens (Test Case 1)
- **Status:** Automated — the flows above. Passed 2026-10-23 for all three
  roles (state user, CDD `20261023-140237`; health facility
  `20261023-145737`).
- **Expected:** `View Transactions` on Manage Stock (with `Record Stock
  Receipt`); it opens `View Transactions` / `View all stock transactions`;
  the list or its empty state loads.

### VTX-02 — The transaction list (Test Case 2)
- **Status:** Automated. Passed 2026-10-23 for all three roles. State user,
  2 cards: `MRN A4ED-AAB3-1B81 | 19 Oct 2026 | Receiver FAC_F-2026-10-15-137947 | SPAQ 2: 490 | View QR`
  and `MRN 8407-93EF-C911 | … | SPAQ 1: 490 | View QR`. Health facility,
  2 cards: `MRN 5B66-913A-DFE2 | 19 Oct 2026 | Receiver AU-CDD-001 | SPAQ 2: 480 | View QR`
  and `MRN 5AAF-446D-7E52 | … | SPAQ 1: 480 | View QR` (Prompt 6's
  dispatches to the CDD, recorded as `CDC9-2D30-F38E` / `0572-01DA-C66C` —
  renumbered, as Point for QA 3). CDD: none — `No Transactions Available`
  (its acceptances of 2026-10-21 were in a session wiped since).
- **Expected:** Every card read — MRN, date, Receiver or Sender with the id,
  product lines, View QR — scrolling to the end of the list; each has an MRN
  and a product line, else
  `Test Case 2 - View Transactions shows MRN tags for <role>, but no card with a product line could be read.`
  No cards: the empty state's text is logged — `No Transactions Available`
  (CDD, 2026-10-23).

### VTX-03 — Transaction details match the card (Test Case 3)
- **Status:** Automated. Passed 2026-10-23 for the state user and the
  health facility: both cards each — MRN, resource and quantity matched;
  Transaction Type `Dispatched`, Sender the user's own warehouse
  (`…137946`, `…137947`). CDD: not applicable (no cards).
- **Expected:** For the first card of each variant, its own `Select
  Transaction` → details whose MRN number, Resource and quantity match the
  card, else
  `Test Case 3 - transaction details mismatch for <MRN>: <field> shows <value>, the card shows <value>.`
  Back → Manage Stock → View Transactions reopened (Point for QA 2).
- **Notes:** Each value is read right of its label and fenced between the
  rows around it; the MRN below the Sender row, whose id wraps onto two
  lines. Back is tapped again if an Android notification covered it (the
  health facility's first run, `20261023-140237`).

### VTX-04 — View QR (Test Case 4)
- **Status:** Automated. Passed 2026-10-23 for the state user
  (`MRN A4ED-AAB3-1B81`) and the health facility (`MRN 5B66-913A-DFE2`):
  `QR Code` popup with the QR image, closed back to the list. CDD: not
  applicable.
- **Expected:** The first card offering `View QR` opens the `QR Code` popup
  with a QR image; it closes and the list is still up. Not applicable when no
  card offers View QR.
- **Notes:** Closed with Back: the popup's X has no text and could only be
  fenced against the status bar. What the QR encodes is not checked.

### VTX-05 — Expected transactions are listed (Test Case 5)
- **Status:** Automated. State user passed 2026-10-23 in session:
  `SPAQ1 490`, `SPAQ2 490` both found. The end-to-end runs had no entries
  set.
- **Expected:** Each `VIEW_TXN_EXPECTED_<role>` entry matches a card by
  product and quantity (and MRN, when given), else, at the end,
  `Test Case 5 - View Transactions is missing <entries> for <role>.`
  Blank: nothing expected.

### VTX-06 — Back to Manage Stock (Test Case 6)
- **Status:** Automated. Passed 2026-10-23 for all three roles.
- **Expected:** `Back` on View Transactions → Manage Stock (`Record Stock
  Receipt`, `Record Stock Issued`). The flow ends on home with the execution
  report.

---

## Beneficiary Referral (health facility)

[`flows/referral/hf-beneficiary-referral.yaml`](flows/referral/hf-beneficiary-referral.yaml)
· `regression`, `referral`, `hf-stock`, `mhbase`, `consumes-data` — Prompt 10.
The health facility stock user (AU-HFS-001) creates one referral per reason,
then checks the list and syncs. **Every run creates four referral records in
UAT.** Read off the mhbase build as AU-HFS-001, 2026-10-21. Test data from
`.env`: `REASON_1`…`REASON_4`, `CHILD_AGE_MONTHS`, `CHECKLIST_TEXT_ANSWER`,
optional `REFERRAL_VILLAGE` / `REFERRAL_CYCLE` / `CHILD_GENDER`. Child names
are generated per run: `AutoChild_<reason>_<yyyyMMddHHmmss>`.

**The screens.** Home card `Beneficiary Referral` → `Select Your Village`
(one village offered: `03ba Buri-Buri Health Post`) → the referral screen:
`Search Referrals`, a search field (hint `Enter the name of the referral`),
`Create New Referral`, `Scan Beneficiary`. Create New Referral →
`Health Facility Details` (`Administrative unit *` and `Date of evaluation *`
prefilled; `Health facility *` offering `Fac_f-2026-10-15-137947` only;
`Referred by (cdd team code)` optional) → Next → `Referral Details`
(`Select cycle *`, `Name of the child *`, `Beneficiary id`, `Referral code`,
`Age in months *`, `Gender *`, `What is the reason for referral? *`) → Next →
the reason's checklist → Submit → `Data recorded successfully` /
`The data has been recorded successfully.` with `Go Back`. No confirmation
popup, and **no referral ID is shown** — none is captured.

| Reason (as listed) | Checklist title | Mandatory questions |
| --- | --- | --- |
| `Fever` | `Fever Checklist` | tested for malaria → result → treated / SPAQ follow-ups → `Add reason *` (text) |
| `Sick` | `Sick Checklist` | evaluated → `Enter comments for diagnosis. *` (text); treated → `Name and dose of the drug *` (text); admitted |
| `Drug side effect from the current cycle` | `Side effect from current cycle checklist` | three Yes/No |
| `Drug side effect from the previous cycle` | `Side effect from previous cycle Checklist` | three Yes/No |

**Results.** Run `artifacts/runs/20261021-123351/` (25 min with sign-in)
created all four — each reached the success screen. Its list check and sync
check then failed on the flow's own mistakes (it scrolled a list that shows
nothing until searched, and read the sync result after closing the dialog);
both were fixed and re-run in the same session against those four records,
creating nothing: `artifacts/runs/20261021-131133/` passed (1 min 53 s). The
committed flow has not yet run end to end in one go since the fixes.

### REF-01 — The village is chosen
- **Status:** Automated. Passed 2026-10-21 (`20261021-123351`,
  `20261021-131133`): `03ba Buri-Buri Health Post (first available)`.
- **Expected:** `REFERRAL_VILLAGE`, or the first village offered, is tapped
  and shown above `Search Referrals`; else
  `No villages available in Beneficiary Referral for <user>.` /
  `REFERRAL_VILLAGE <name> is not offered in Beneficiary Referral.`

### REF-02 — Referral for Fever (Test Case 1)
- **Status:** Automated. Passed 2026-10-21 (`20261021-123351`):
  `AutoChild_Fever_20261021123405`; answers Yes / Positive / Yes / Yes /
  `Automation test`.
- **Expected:** Health Facility Details → Referral Details (cycle, name,
  `CHILD_AGE_MONTHS`, gender, reason) → `Fever Checklist` with every
  mandatory question answered → Submit → `Data recorded successfully` →
  Go Back to the referral screen. A failed stage fails this record only
  (`Referral Fever FAILED - …`) and the next reason runs.

### REF-03 — Referral for Sick (Test Case 2)
- **Status:** Automated. Passed 2026-10-21 (`20261021-123351`):
  `AutoChild_Sick_20261021123405`; answers Yes / `Automation test` / Yes /
  `Automation test` / Yes.
- **Expected:** As REF-02, with `Sick Checklist`.

### REF-04 — Referral for a side effect from the current cycle (Test Case 3)
- **Status:** Automated. Passed 2026-10-21 (`20261021-123351`):
  `AutoChild_SideEffectCurrentCycle_20261021123405`; answers Yes ×3.
- **Expected:** As REF-02, with `Side effect from current cycle checklist`.

### REF-05 — Referral for a side effect from the previous cycle (Test Case 4)
- **Status:** Automated. Passed 2026-10-21 (`20261021-123351`):
  `AutoChild_SideEffectPreviousCycle_20261021123405`; answers Yes ×3.
- **Expected:** As REF-02, with `Side effect from previous cycle Checklist`.

### REF-06 — All four are listed before sync
- **Status:** Automated. Passed 2026-10-21 (`20261021-131133`): all four
  found.
- **Expected:** Each submitted child name, searched on the referral screen,
  shows a result card; else
  `<reason> - <name> is not in the referral list after it was submitted`.
- **Notes:** The referral screen lists nothing until a name is searched.
  The field filters as you type; no match reads `Match Not Found`. The typed
  name is in the field too, so a result is the name's second occurrence.
  The field is focused once, through its hint, and kept focused: tapping it
  again places the cursor mid-text and `eraseText` leaves the tail behind.
  Cards show the name, `Open` and `Date of evaluation: <date>` — no sync
  status, so the spec's "pending sync" state cannot be checked on the list.

### REF-07 — The referrals sync
- **Status:** Automated. Passed 2026-10-21 (`20261021-131133`):
  `No Data available for sync` — the background auto sync had already sent
  the four records.
- **Expected:** From home, Sync Data until `No Data available for sync`
  (`Data Synced Successfully` first, when anything was pending); else
  `Referral sync failed: …`.
- **Notes:** Home then read `5 referral completed` — the four created plus
  one record already on the device after the facility's data download.

**Quirks the flow works around.** The reason radio buttons are separate,
text-less elements left of their labels; tapping a label selects nothing, so
the labels are read top to bottom and the radio is tapped by position
(`leftOf` the reason, `below` the question, `index` = position). Go Back
lays the referral screen over the form pages, so Android Back walks into
them; the flow returns home through the side menu (`Open navigation menu` →
`Home`).

---

## Registration & Delivery (CDD)

[`flows/registration/cdd-registration-full.yaml`](flows/registration/cdd-registration-full.yaml)
· `regression`, `registration`, `cdd`, `mhbase`, `consumes-data` — Prompt 11,
Test Case 1 then Steps 1–15; REG-01 alone is also
[`cdd-low-beneficiary-id.yaml`](flows/registration/cdd-low-beneficiary-id.yaml).
Signs in as the CDD (AU-CDD-001), boundary `03ba Buri-Buri Health Post` with
the first three communities. **Registers a household of three, accepts the
health facility's dispatch and records two doses in UAT.** Read off the
mhbase build as AU-CDD-001, 2026-10-21. Test data: the Prompt 11 block of
`.env`; names are generated per run — `AutoHead<stamp>`,
`AutoChild1<stamp>`, `AutoChild2<stamp>`, last name `Test` — and the search
text is the head's whole first name.

**How it was run.** All of Test Case 1 and Steps 1–15 were done on
2026-10-21 in **one app session** — a fresh sign-in loses the beneficiary
IDs and the stock, so the steps cannot be split over runs. The session's
household is `AutoHead20261021180102` (stamp `20261021180102`). Each step
was explored on the app, then written as a subflow; most subflows were then
run as written against the same session (scratchpad wrappers that skip
sign-in and pick up the stamp). Steps done by hand and **not yet run as
written** are marked below; the full flow has not run end to end. A dry run
of Steps 2–6 without saving (`20261021-192632`, stopped by the user before the
head's age was set) ran the head's age bounds as written: 17 refused, 150
accepted, 18 accepted.

**Sign-in.** After the boundary Submit, the CDD got `Failed to check data in
server` (Proceed Without Downloading / Retry) — three times, Retry twice
(`20261021-170602`, `-171629`, `-171720`). `home/cdd.yaml` now retries twice
and proceeds without downloading. Home: `Stock Balance` (`0 SPAQ 1`,
`0 SPAQ 2`), `Registration & Delivery`, `Mark Closed Household`,
`Manage Stock`, `File Complaint`, `Sync Data`, `Beneficiary IDs`,
`Download Stock Data`, `Summary Report`.

**Execution report, 2026-10-21.** Village `18Gammadadi` (first of
18Gammadadi, 17Bunduryel, 16Buri buri rugan fulani); location the emulator's
GPS fix, 37.421998, -122.084 (TEST_LATITUDE / TEST_LONGITUDE blank); consent
Yes; 3 members:

| Member | Name | Age | Gender | ID | Product offered | Dose |
| --- | --- | --- | --- | --- | --- | --- |
| Head of household | AutoHead20261021180102 Test | 30y 0m | Female | 157722141110 | — | — |
| Child 1 | AutoChild120261021180102 Test | 0y 6m | Female | 159168014201 | SPAQ 1 only | 1 |
| Child 2 | AutoChild220261021180102 Test | 3y 0m | Female | 152419241171 | SPAQ 2 only | 1 |

CDD balance SPAQ 1 / SPAQ 2: 0 / 0 before the receipt, 480 / 480 after it
(MRNs `0572-01DA-C66C`, `CDC9-2D30-F38E`), 479 / 479 after the doses. Sync
Data then found nothing left (`20261021-192142`).

**Deviations from the specification** (logged as `DEVIATION`; the full flow
fails at the end listing them):
1. Register Beneficiary works from the first character typed, not the third.
2. 0 household members is accepted (Save Household Details moves on).
3. A head of household aged 150 years is accepted (the app's own message reads
   "from 18 years to 150 years"; the specification's maximum is 149).
4. A child aged 2 months is accepted on the form, though the app's message
   reads "from 3 months to 5 years".
5. Household Overview and the search results show `--` for every member's
   name; Edit Individual and Beneficiary Details show the names typed.

### REG-01 — Low Beneficiary IDs popup (Test Case 1)
- **Status:** Automated — `low-id-popup.yaml`; passed by hand 2026-10-21
  (`20261021-172003`, `-172107`), **not yet run as written**.
- **Expected:** With no IDs on the device: village, search text, Register
  Beneficiary → popup `Low Beneficiary IDs` / `Please download beneficiary IDs
  to register a new household` with `Skip` and `Download`. Beneficiary
  Location instead fails `Low Beneficiary ID popup not shown; beneficiary IDs
  may already be downloaded.`
- **Notes:** Register Beneficiary does nothing while the search field is empty
  (checked). Skip is never tapped.

### REG-02 — Beneficiary IDs download (Step 1)
- **Status:** Automated — `download-ids.yaml`; passed by hand 2026-10-21
  (`20261021-172151`…`-172504`); passed as written 2026-10-26
  (`20261026-174831`, 600/600). Met the server's limit the same evening
  (below, `20261026-182226`); Re-Fetch IDs then passed (`20261026-185004`:
  one Re-Fetch, `Download Completed` 600/600, 598 available).
- **Expected:** Download → `Beneficiary IDs` (0 available / 0 total) →
  Download Beneficiary IDs → `Download in progress...` (`0/10`) →
  `Download Completed`, `600/600`, about a minute → Close → 600 available →
  Back to home. A failure or 5-minute timeout fails `Beneficiary ID download
  failed: <message>.`
- **Notes:** The server caps a user's ID downloads. On 2026-10-26 the CDD
  downloaded 600 at 17:56 (Prompt 11); a fresh sign-in at 18:23 (clearState
  drops the IDs from the device) then got `Limit exceeded to fetch Beneficiary IDs` with
  `Re-Fetch IDs` and `Close`. Re-Fetch IDs downloads the IDs already given
  to the user again and may be tapped again whenever the dialog comes back
  (QA, 2026-10-26): the flow taps it up to three times, logging a `NOTE`
  each time; a fourth `Limit exceeded` fails `Beneficiary ID download
  failed: Limit exceeded…`. Chained runs sign the CDD in once, so one download
  serves Prompts 11–14.

### REG-03 — Register Beneficiary again, no popup (Step 2)
- **Status:** Automated — `open-registration.yaml`, `search-and-register.yaml`;
  run as written 2026-10-21 (`20261021-180050`). **Deviation** 1 (above).
- **Expected:** Same village and search text; with 2 characters typed
  Register Beneficiary should do nothing; with the search text it opens
  Beneficiary Location, no popup.
- **Notes:** The search field's hint is `Name of the individual`; Back from
  Beneficiary Location keeps the typed text.

### REG-04 — Beneficiary location (Step 3)
- **Status:** Automated — `beneficiary-location.yaml`; run as written
  (`20261021-180314`).
- **Expected:** `Lat/Long *` shows the fix's accuracy (`5.00 meters`) within
  60 s, else `Beneficiary location not captured.`; Save Location.
- **Notes:** The app never shows the coordinates, only the accuracy; the
  report names what was set. `Administrative area *` is the village.

### REG-05 — Care giver's consent Yes (Step 4)
- **Status:** Automated — `consent.yaml` (`CONSENT`); run as written
  (`20261021-180558`).
- **Expected:** `Did the care giver allow for registration and distribution of
  SMC medicines? *` offers Yes and No; Yes → Submit → Household Details.
- **Notes:** Radios report no state; the choice is in the screenshot. Consent
  No has not been run.

### REG-06 — Household member bounds (Step 5)
- **Status:** Automated — `household-details.yaml`; run as written
  (`20261021-181456`). **Deviation** 2.
- **Expected:** 0 and 31 refused; `HOUSEHOLD_MEMBERS` (3) saved.
- **Notes:** The count is a stepper (`-` 1 `+`) that takes no typing, so
  "enter 0 / 31" is pressing past the limit: `-` reaches 0 and Save moves on;
  `+` stops at 30. Back from Beneficiary Details keeps the count.

### REG-07 — Head of household (Step 6)
- **Status:** Automated — `member-form.yaml` (`WHO=head`), `age-entry.yaml`;
  saved by hand (`20261021-182837`); age bounds run as written in the dry run
  (`20261021-192632`). **Deviation** 3. Mobile number **not run**
  (`HEAD_MOBILE` blank — `mobile-number.yaml` is unverified).
- **Expected:** First name (prefilled with the search text), `Test`, age 17
  years refused (`Age should be from 18 years to 150 years.`), 150 refused, 18
  logged (accepted), `HEAD_AGE_YEARS` / `_MONTHS` (30 / 0), gender, mobile
  bounds (10 digits refused, 12 blocked), Save Beneficiary → Household
  Overview.
- **Notes:** `Is head of family? *` comes ticked. Date of birth follows the
  age typed. Save is never pressed with an age under test.

### REG-08 — Head listed, child 1 added (Step 7)
- **Status:** Automated — `household-check.yaml`, `add-member.yaml`
  (`WHO=child1`); done by hand (`20261021-182936`…`-183555`), **not yet run as
  written**. **Deviations** 4 and 5.
- **Expected:** Household Overview lists the head (`Head of household`,
  `FEMALE | 30y 0m`); Add Members → Member Details: names, 2 months refused, 60
  refused (`Age should be from 3 months to 5 years.`), `CHILD_1_AGE_MONTHS`
  (6), gender, Save Beneficiary.

### REG-09 — Household submitted (Step 8)
- **Status:** Automated — `add-member.yaml`, `household-check.yaml`; done by
  hand (`20261021-183719`, `-183812`), **not yet run as written**.
- **Expected:** `Ready to submit ?` → Submit → `Data recorded Successfully` /
  `Token ID: <id>` (child 1's ID) → View Household Details shows the head and
  child 1 (`Not Administered`, Dose, Unable To Deliver).

### REG-10 — Eligibility checklist, all No (Step 9)
- **Status:** Automated — `eligibility-checklist.yaml` (`ANSWER=No`); run as
  written (`20261021-184550`).
- **Expected:** Every question answered No — `Is the child sick?`, `Is the
  child having fever?`, `Is the child given SPAQ for the first time?(Not
  administered in the previous cycle)`, then the follow-up No adds, `Is there
  any side effect to SPAQ which was administered last cycle?`, and `Child has
  taken SP or CTX containing drugs in the past 28 days?` — Save Delivery →
  `Ready to submit ?` → Submit → Beneficiary Details.
- **Notes:** A question left unanswered gives `Fill the required fields` /
  `This field is required`. The checklist comes back every time Dose is
  tapped (REG-13, REG-15).

### REG-11 — Insufficient Stock (Step 10)
- **Status:** Automated — `insufficient-stock.yaml`; run as written
  (`20261021-185225`).
- **Expected:** At balance 0, Record Cycle Dose → popup `Insufficient Stock` /
  `Not enough stock` → Go Back; `Current Dose 1` still `To be administered`;
  home. A dose recorded fails `Dose recorded without stock; Insufficient Stock
  check failed.`

### REG-12 — The CDD accepts the incoming stock (Step 11)
- **Status:** Automated — `cdd-accept-stock.yaml`, `cdd-check-transaction.yaml`
  over `stock/accept-receipt/`; run as written (`20261021-185633`).
- **Expected:** Balances 0 / 0 (else BLOCKED); the dispatch listed (else `No
  incoming stock for CDD; Prompt 6 dispatch not received.`); each variant's
  Stock Receipt Details shows its card's MRN, the sender and
  `EXPECTED_CDD_RECEIVED_*`, and the MRN is one of `CDD_INCOMING_MRNS`; SPAQ1
  then SPAQ2 accepted (`Stock accepted successfully`); balances 480 / 480.
- **Notes:** The CDD's list held Prompt 6's two dispatches straight after
  sign-in; Download Stock Data answered `No Data Found`.

### REG-13 — Child 1's dose: SPAQ1 only (Step 12)
- **Status:** Automated — `open-household.yaml`, `deliver-dose.yaml`
  (`WHO=child1`); checklist run as written (`20261021-190318`), the rest by
  hand (`20261021-190114`…`-190833`), **not yet run as written**.
- **Expected:** Search finds the household → Open → child 1's Dose → checklist
  all No → Record Cycle Dose → `Delivery Details` offers `SPAQ 1` only, else
  `Age-product mismatch: child aged 6 months should receive SPAQ1; delivery
  screen shows <products>.`; quantity read (1); Save Delivery → `Please check
  you have done the following` (three boxes ticked) → Next → `Delivery
  Successful`.
- **Notes:** The product is a fixed button that opens nothing. Search results
  show `--` for the name, with a Beneficiary / Age / Gender row per member.

### REG-14 — Child 2 added (Step 13)
- **Status:** Automated — `add-member.yaml` (`WHO=child2`),
  `household-check.yaml`; run as written (`20261021-191317`).
- **Expected:** Add Members → 3 years 0 months, gender → Ready to submit →
  Submit → `Data recorded Successfully`, Token ID → the household lists the
  head, child 1 (`Administered success`) and child 2.

### REG-15 — Child 2's dose: SPAQ2 only (Step 14)
- **Status:** Automated — `deliver-dose.yaml` (`WHO=child2`); run as written
  (`20261021-191727`).
- **Expected:** As REG-13, with `SPAQ 2` only (36 months); dose 1.
- **Notes:** The delivery checks read the same for SPAQ 2, including `Give 2 AQ
  tablets to caregiver *`.

### REG-16 — Balances fall by the doses (Step 15)
- **Status:** Automated — `balance-after-doses.yaml`; run as written
  (`20261021-192051`).
- **Expected:** Each balance = after the receipt − the dose: 480 − 1 = 479 for
  both, read straight away (no sync needed); else `CDD balance mismatch for
  <variant>: expected <expected>, found <actual>.`

---

## Registration — caregiver consent No (CDD)

[`flows/registration/cdd-consent-no.yaml`](flows/registration/cdd-consent-no.yaml)
· `regression`, `registration`, `cdd`, `mhbase`, `consumes-data` — Prompt 12.
A new registration as the CDD (AU-CDD-001) whose caregiver refuses consent.
**Records a consent-refused household in UAT.** Read off the mhbase build as
AU-CDD-001, 2026-10-22. Test data: `CONSENT_REASON` (`test`), optional
`REGISTRATION_VILLAGE`, `TEST_LATITUDE` / `TEST_LONGITUDE`; the head's name is
generated, `AutoNoConsent<stamp>`, and is also the search text.

**How it was run.** On 2026-10-22, in the CDD session of Prompt 11 (still
signed in, beneficiary IDs on the device), each step by hand —
`20261022-093935` to `-094742`. Household: `AutoNoConsent20261022093935`,
village `18Gammadadi`, location the emulator's GPS fix (37.421998, -122.084).
The flow and its subflows (`consent-init`, `consent-no`, `consent-no-submit`,
the `CONSENT` branch of `register-household`) were written from those steps
and **have not run as written**.

**Precondition.** The specification assumes Prompt 11 downloaded beneficiary
IDs. They live on the device, so the flow's fresh sign-in has none:
`register-household.yaml` meets the Low Beneficiary IDs popup, downloads the
IDs (Prompt 11 Step 1, logged as a NOTE) and searches again. Only a popup after
that fails, with `Low Beneficiary ID popup shown; run Prompt 11 ID download
first.`

### CNS-01 — Register Beneficiary opens without the popup
- **Status:** Automated — `register-household.yaml` (`CONSENT=No`); passed
  by hand (`20261022-093935`).
- **Expected:** Village, search text, Register Beneficiary (enabled) →
  Beneficiary Location, no Low Beneficiary IDs popup.

### CNS-02 — Location captured
- **Status:** Automated — `beneficiary-location.yaml` (as Prompt 11, REG-04);
  passed by hand (`20261022-093935`).
- **Expected:** `Lat/Long *` shows the accuracy (`5.00 meters`); Save Location
  → Care giver's consent.

### CNS-03 — Consent No asks for a reason, and the reason is mandatory
- **Status:** Automated — `consent-no.yaml`; passed by hand
  (`20261022-093935`, `-094210`, `-094319`).
- **Expected:** Yes and No offered; No adds `Enter Reason *`, a text field.
  Submit with it empty stays and shows `This field is required.` (a popup
  instead is logged as a DEVIATION and cancelled). `CONSENT_REASON` typed →
  Submit → `Ready to Submit?`.

### CNS-04 — Ready to Submit?, Cancel (Test Case 1)
- **Status:** Automated — `consent-no-submit.yaml`; passed by hand
  (`20261022-094439`).
- **Expected:** `Ready to Submit?` — "Make sure you review all the details
  before clicking on the submit button. Click on the cancel button to go back
  to the previous page." — with Submit and Cancel. Cancel closes it, Care
  giver's consent is back, nothing is submitted: "Cancel returned to Caregiver
  Consent; household not submitted."
- **Notes:** No stays selected and the reason stays `test` (the reason field,
  shown only while No is chosen, still holds it). Were they cleared, the flow
  enters them again before Test Case 2. The title differs from the `Ready to
  submit ?` of a household with members.

### CNS-05 — Ready to Submit?, Submit (Test Case 2)
- **Status:** Automated — `consent-no-submit.yaml`; passed by hand
  (`20261022-094553`, `-094656`).
- **Expected:** Submit → `Ready to Submit?` again → Submit → `Data recorded
  successfully` / `The data has been recorded successfully` with `Back To
  Search` only — no Token ID, no View Household Details, no Household or
  Beneficiary Details. Back To Search → Search Beneficiary, its field empty.

### CNS-06 — The consent-refused household in search (Test Case 3)
- **Status:** Automated — `consent-no-submit.yaml`; passed by hand
  (`20261022-094742`).
- **Expected:** Searching the generated name lists nothing (no card, no
  message), so no dose action is offered.
- **Notes:** Consent No records the household without members — no name is
  ever entered — and search looks up individuals by name. A card, should one
  appear, is logged as INFO.

### CNS-07 — The household is synced
- **Status:** Automated — `sync-data.yaml` (also the last step of
  `cdd-registration-full.yaml`); run as written 2026-10-22
  (`20261022-101110`) — **failed**: `There are 1 transactions yet to be
  synced.` then `Sync Up Failed` / `Session Expired` (Retry gave the same).
  The session had been signed in since 2026-10-21 and its sign-in had
  expired. Left unsynced at the user's choice: `AutoNoConsent20261022093935`
  is on the device only, and the next fresh sign-in wipes it.
- **Expected:** From home, Sync Data until `No Data available for sync`
  (`Data Synced Successfully` first when anything was pending); else a failure
  with the app's message (`Sync Up Failed …`) — sign in again to sync.
- **Notes:** In the flow the sign-in is minutes old, so this is the
  in-session run's problem, not the flow's.

---

## Registration — Unable to Deliver (CDD)

[`flows/registration/cdd-household-utd.yaml`](flows/registration/cdd-household-utd.yaml)
· `regression`, `registration`, `cdd`, `mhbase`, `consumes-data` — Prompt 13.
The CDD (AU-CDD-001) registers a household of 20 with consent Yes — the head
and four children — and records Unable to Deliver for each child with a
different reason, from the button on the child's card.

**Product check dropped (2026-10-22).** The specification had each child go
Dose → eligibility checklist → Delivery Details to see its product before
Unable to Deliver, assuming the action sat on the delivery screen. It sits on
the member's card, so that detour only submitted a checklist per child and
re-checked the age-product rule Prompt 11 already covers (REG-13, REG-15). At
the user's request the flow now goes straight to the card's Unable To
Deliver. The runs below still made the detour; the products they saw are kept
in the table. **Registers a household and records four unsuccessful
deliveries in UAT ("This action cannot be changed later").** Read off the
mhbase build as AU-CDD-001, 2026-10-22. Test data: the `UTD_*` keys (their
own, so Prompt 11's stay), `PRODUCT_VARIANT_1` / `_2`; names generated —
`AutoUTDHead<stamp>` (also the search text), `AutoUTDChild<n><stamp>`.

**How it was run.** On 2026-10-22, in the CDD session of Prompts 11–12 (stock
479 / 479, beneficiary IDs on the device). The registration and four children
ran as written (`20261022-102010`, 13 min); child 1's Unable to Deliver was
found by hand (`20261022-103506` … `-104100`); children 2–4 and the final
verification ran as written (`20261022-104828`, after a first attempt,
`-104439`, stopped on a wait — Household Overview comes back scrolled, its
title off screen; fixed). The session's sign-in had expired (CNS-07), so
these records are **on the device only** and the sync was not run. The flow
signs in fresh and syncs.

**Execution report, 2026-10-22.** Village `18Gammadadi`; location the
emulator's GPS fix; household total 20, members registered 5; head
`AutoUTDHead20261022102026 Test`, 35y 0m, Female. Balances SPAQ 1 / SPAQ 2:
479 / 479 before and after.

| Test case | Child | Age | Token ID | Product band | Shown (old detour) | Reason | Status afterwards |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | AutoUTDChild120261022102026 | 6 months | 159024211915 | SPAQ1 | SPAQ 1 | Beneficiary died | Beneficiary Died |
| 2 | AutoUTDChild220261022102026 | 9 months | 152981561411 | SPAQ1 | SPAQ 1 | Beneficiary migrated | Beneficiary Migrated |
| 3 | AutoUTDChild320261022102026 | 24 months | 151914226013 | SPAQ2 | SPAQ 2 | Beneficiary absent | Beneficiary Absent |
| 4 | AutoUTDChild420261022102026 | 48 months | 160181219141 | SPAQ2 | SPAQ 2 | Beneficiary refused | Beneficiary refused |

### UTD-01 — Start balances
- **Status:** Automated — `cdd-balances.yaml` (`PHASE=start`); run as written
  (`20261022-102010`): 479 / 479.
- **Expected:** Both variants' home Stock Balance read, else `Unable to read
  stock balance for <variant>.`
- **Notes:** Stock is device-local: the specification's "Prompt 11 stock"
  exists only in Prompt 11's session. A fresh run reads whatever its device
  holds; only that it does not move is checked (UTD-08).

### UTD-02 — Household registered: consent Yes, 20 members, the head
- **Status:** Automated — `start-registration.yaml`, `consent.yaml`,
  `household-details.yaml` (`BOUNDS=false`), `member-form.yaml` (`WHO=head`);
  run as written (`20261022-102010`).
- **Expected:** Search, Register Beneficiary, location, consent Yes, 20
  members accepted and saved, head (35 years, gender, mobile if set) saved →
  Household Overview lists the head.
- **Notes:** The specification calls 20 the maximum; the stepper goes to 30
  (REG-06) — logged as a NOTE.

### UTD-03 — Four children added (5 of 20 registered)
- **Status:** Automated — `add-member.yaml` × 4, `household-check.yaml`
  (`CHILDREN=4`); run as written (`20261022-102010`).
- **Expected:** Each child: Member Details → Save Beneficiary → `Ready to
  submit ?` → Submit → `Data recorded Successfully`, Token ID → View Household
  Details. Household Overview lists the head and the four children by ID and
  age.
- **Notes:** The app accepts submitting with fewer members registered than
  the household total (5 of 20). Children are found by Token ID: every name
  on Household Overview reads `--` (REG deviation 5).

### UTD-04 — Unable to Deliver, child 1 (6 months), reason 1 (Test Case 1)
- **Status:** Automated — `unable-to-deliver.yaml` (`WHO=child1`); passed by
  hand (`20261022-103506`, `-103955`, `-104100`). The trimmed subflow (no
  product detour) has **not run yet**; its Unable to Deliver part is the one
  that ran for children 2–4.
- **Expected:** On Household Overview, the child's card → `Unable To
  Deliver` → `Select a reason for unable to deliver. *` offers four reasons →
  `Beneficiary died` → Proceed → `Are you sure you want to proceed?` ("…the
  beneficiary will be reported as 'Died'. This action cannot be changed
  later…") → Submit → Household Overview; the card reads `Beneficiary Died`,
  no Dose.
- **Notes:** The form also shows Lat/Long (the fix's accuracy) and an
  optional Comment, left empty. No success screen: Submit returns straight to
  Household Overview.

### UTD-05 — Child 2 (9 months), reason 2 (Test Case 2)
- **Status:** Automated — run as written, in the version with the product detour (`20261022-104828`); the trimmed subflow has not run yet.
- **Expected:** As UTD-04: `Beneficiary migrated` ('Migrated') →
  `Beneficiary Migrated`.

### UTD-06 — Child 3 (24 months), reason 3 (Test Case 3)
- **Status:** Automated — run as written, in the version with the product detour (`20261022-104828`); the trimmed subflow has not run yet.
- **Expected:** As UTD-04: `Beneficiary absent` ('Absent') →
  `Beneficiary Absent`.

### UTD-07 — Child 4 (48 months), reason 4 (Test Case 4)
- **Status:** Automated — run as written, in the version with the product detour (`20261022-104828`); the trimmed subflow has not run yet.
- **Expected:** As UTD-04: `Beneficiary refused` ('Refused') →
  `Beneficiary refused`.
- **Notes:** This status alone keeps the lower-case reason ("refused"); the
  others are capitalised ("Died", "Migrated", "Absent"). The check compares
  the last word, case-insensitively.

### UTD-08 — Statuses shown, stock unchanged (final verification)
- **Status:** Automated — `utd-final.yaml`; run as written
  (`20261022-104828`).
- **Expected:** Each child's card shows the status of its reason; both
  balances equal the start (479 / 479), else `Stock reduced after Unable to
  Deliver for <variant>: expected <start>, found <actual>.`
- **Notes:** Each reason is used once; a reason missing from the list, or
  fewer than four, fails that child only, and the next child still runs. A
  missing screen stops the run.

### UTD-09 — Sync
- **Status:** Automated — `sync-data.yaml`, the flow's last step; **not run**
  in the session (its sign-in had expired — CNS-07).
- **Expected:** As CNS-07: Sync Data until `No Data available for sync`.

---

## Registration — dose and redose (CDD)

[`flows/registration/cdd-household-redose.yaml`](flows/registration/cdd-household-redose.yaml)
· `regression`, `registration`, `cdd`, `mhbase`, `consumes-data` — Prompt 14.
The CDD (AU-CDD-001) registers a household of 7 — the head and six children —
and gives child 1 (6 months, SPAQ1) and child 2 (24 months, SPAQ2) a dose and
a redose each. **Registers a household and records two doses and two
redoses in UAT; stock falls by each.** Read off the mhbase build as
AU-CDD-001, 2026-10-22. Test data: the `REDOSE_*` keys (their own),
`PRODUCT_VARIANT_1` / `_2`; names generated — `AutoRedoseHead<stamp>`,
`AutoRedoseChild<n><stamp>`.

**How it was run.** On 2026-10-22, in the CDD session of Prompts 11–13 (stock
479 / 479). Registration and the six children ran as written
(`20261022-111304`; its final check stopped on a card at the screen's foot —
fixed, re-run `-113438`); child 1's dose as written (`-113635`, stopped by
the user before Save Delivery, finished `-114156`); child 1's redose by hand
(`-114333` … `-115027`); child 2's dose as written (`-115323`) and redose,
balances and final verification as written (`-120120`, after `-115323`
stopped on a centring scroll — fixed). The sign-in had expired (CNS-07):
these records are **on the device only**; the sync was not run.

**Execution report, 2026-10-22.** Village `18Gammadadi`; 7 of 7 members
registered; head `AutoRedoseHead20261022111319 Test`, 32y 0m, Female.

| Child | Age | Token ID | Dose (product, qty) | Redose (product, qty, reason) | Balance after |
| --- | --- | --- | --- | --- | --- |
| 1 | 6 months | 152423121324 | SPAQ 1, 1 | SPAQ 1, 1, Vomitting | SPAQ1 479 → 478 → 477 |
| 2 | 24 months | 151721153211 | SPAQ 2, 1 | SPAQ 2, 1, Vomitting | SPAQ2 479 → 478 → 477 |
| 3–6 | 4, 10, 15, 50 months | 152116010567, 155141727142, 158146113182, 158151412122 | — | — | — |

Balances SPAQ1 / SPAQ2: start 479 / 479, end 477 / 477; child 2's doses left
SPAQ1 at 477.

### RDS-01 — Start balances cover a dose and a redose
- **Status:** Automated — `cdd-balances.yaml`, `cover`; run as written
  (`20261022-111304`): 479 / 479.
- **Expected:** Each variant at least 2, else `BLOCKED - dose and redose
  cases: the CDD balance does not cover a dose and a redose (…)`.

### RDS-02 — Household of 7: the head and six children
- **Status:** Automated — `household-with-children.yaml`; run as written
  (`20261022-111304`, check `-113438`).
- **Expected:** Consent Yes, 7 members, the head, six children each submitted;
  Household Overview lists all seven by ID and age.

### RDS-03 — Child 1's dose: SPAQ1 (Test Case 1 Step 1)
- **Status:** Automated — `dose-and-redose.yaml` → `deliver-dose.yaml`; run
  as written (`20261022-113635`, `-114156`).
- **Expected:** As REG-13: `SPAQ 1` only, dose 1, `Delivery Successful`;
  SPAQ1 = start − dose (478), SPAQ2 unchanged; else `<variant> balance
  mismatch after dose for <child>: expected <expected>, found <actual>.`

### RDS-04 — Child 1's redose: SPAQ1 (Test Case 1 Step 2)
- **Status:** Automated — `redose.yaml`; passed by hand (`20261022-114333`
  … `-114854`), run as written for child 2 (RDS-07).
- **Expected:** The card (`Administered success`, View Details, Redose) →
  Redose → `Redose Details` / `Capture redose details of the beneficiary`:
  `Resources to be delivered` `SPAQ 1` only, Quantity Distributed 1, `Reason
  *` (dropdown: `Vomitting`, `Others`) → Submit → `Data recorded
  Successfully` / "Data has been recorded successfully. Data will be synced
  when you are online." → View Household Details: the card adds `Redose
  Completed`. SPAQ1 = 478 − 1 = 477, SPAQ2 unchanged.
- **Notes:** No eligibility checklist, no confirmation and no delivery
  checks for a redose. The reason is spelled `Vomitting` in the app.

### RDS-05 — No second redose for child 1 (Test Case 1 Step 3)
- **Status:** Automated — `redose.yaml`; passed by hand (`20261022-114854`).
- **Expected:** After the redose the card still shows `Redose`, but tapping it
  opens nothing; a `Redose Details` would be a DEVIATION.

### RDS-06 — Child 2's dose: SPAQ2 (Test Case 2 Step 1)
- **Status:** Automated — run as written (`20261022-115323`).
- **Expected:** `SPAQ 2` only, dose 1; SPAQ2 479 → 478, SPAQ1 stays 477.

### RDS-07 — Child 2's redose: SPAQ2 (Test Case 2 Step 2)
- **Status:** Automated — run as written (`20261022-120120`).
- **Expected:** As RDS-04 with `SPAQ 2`; SPAQ2 478 → 477, SPAQ1 stays 477.

### RDS-08 — No second redose for child 2
- **Status:** Automated — run as written (`20261022-120120`).
- **Expected:** As RDS-05.

### RDS-09 — Every card (final verification)
- **Status:** Automated — `redose-final.yaml`; run as written
  (`20261022-120120`).
- **Expected:** Children 1 and 2: `Administered success`, `Redose Completed`;
  children 3–6: `Not Administered`.

### RDS-10 — Sync
- **Status:** Automated — `sync-data.yaml`, the flow's last step; **not run**
  in the session (expired sign-in — CNS-07).

---

## Registration — search by Near by households and by ID (CDD)

[`flows/registration/cdd-search-nearby-and-id.yaml`](flows/registration/cdd-search-nearby-and-id.yaml)
· `regression`, `registration`, `cdd`, `mhbase`, `consumes-data` —
[Prompt 18](prompts/prompt-18-cdd-search-nearby-and-id.md). The CDD (AU-CDD-001)
adds a household of a head and one child at the device's own position, then
finds it on Search Beneficiary without typing a name: by Near by households
and by the child's beneficiary ID. **Registers a household of two in UAT.**
Test data: the `SEARCH_*` keys; names generated — `AutoSearchHead<stamp>`,
`AutoSearchChild1<stamp>`.

**Why it adds a household first.** Search reads the households on the
device. After a fresh sign-in the CDD has none: its boundary data check
fails on the server ("Failed to check data in server", 2026-10-23 to 27), so
nothing is downloaded — a name search for `Auto` listed nothing
(`20261027-124949`).

**What the app does** — read off the app as AU-CDD-001, 2026-10-27:
- "Near by households" and "Search by ID" are each a text-less switch left of
  its label; neither reports an on/off state, and a tap on the label does
  nothing. On, a switch shows orange.
- Near by households on, with the field empty: the households near the
  device are listed and Register Beneficiary is enabled. A card shows the
  household name (`--`), `Open`, and a Beneficiary / Age / Gender row per
  member (`--`, `30y 0m`, `Female`); **no distance is shown**. The app's
  configuration searches within a radius of the device's position, inside the
  village, and keeps the switch disabled until the position is known.
- Search by ID on: the field's hint changes from `Name of the individual` to
  `Id Search` — the only sign of the switch's state. The full ID lists the
  household with all its members; turning the switch off clears the field.

**How it was run.** `20261027-131219` (17 min 57 s, sign-in kept): household
added — head `AutoSearchHead20261027131252 Test`, 30y 0m, Female; child 1
`AutoSearchChild120261027131252 Test`, 0y 6m, Female, beneficiary ID
**172201651133**. Test Cases 1–11 all behaved as expected, but the run
failed on two faults of the flow's own: Test Case 9 logged a false deviation
next to its pass (it looked for the hint after typing), and Prompt 11's
names deviation (`--`) failed it. Both fixed — the hint is recorded before
typing, and the names finding is INFO here. Re-checked in the same session
on the same household, without registering again: `20261027-133230` (Test
Case 9 now logs one result; that check typed a newly generated name, so it
found nothing) and **`-133847`, with the household's own name: Test Cases
1–10 passed, no deviations** (5 min 32 s).

### SRC-01 — The search options (Test Case 1)
- **Status:** Automated — `search-nearby.yaml`. Passed 2026-10-27.
- **Expected:** `Near by households` and `Search by ID`, both off; the field
  reads `Name of the individual`.

### SRC-02 — Near by households on (Test Case 2)
- **Status:** Automated — `search-nearby.yaml`. Passed 2026-10-27: the
  household added was listed with no name typed (the only one on the device).
- **Expected:** With the field empty, households near the device are listed,
  the one just added among them (found by its head's row).
- **Notes:** No distance on the cards. **QA to confirm** the radius (5 km in
  the app's sample configuration) — a household registered elsewhere is not
  tried.

### SRC-03 — Near by households off (Test Case 3)
- **Status:** Automated — `search-nearby.yaml`. Passed 2026-10-27.
- **Expected:** The list clears; the name search is back.

### SRC-04 — Search by ID on (Test Case 4)
- **Status:** Automated — `search-by-id.yaml`. Passed 2026-10-27.
- **Expected:** The hint changes from `Name of the individual` to `Id Search`.

### SRC-05 — Search by the full ID (Test Case 5)
- **Status:** Automated — `search-by-id.yaml`. Passed 2026-10-27:
  `172201651133` listed the household, both members.
- **Expected:** The household is listed, with child 1's row.

### SRC-06 — Search by part of the ID (Test Case 6)
- **Status:** Automated, logged only — `search-by-id.yaml`. 2026-10-27:
  `172201` (the first 6 digits) listed **nothing**.
- **Notes:** The app's configuration matches with "contains", which suggests
  part of an ID should match. **QA to confirm** which is intended.

### SRC-07 — A name in ID mode (Test Case 7)
- **Status:** Automated — `search-by-id.yaml`. Passed 2026-10-27.
- **Expected:** The head's name lists nothing: ID mode does not search names.

### SRC-08 — An unknown ID (Test Case 8)
- **Status:** Automated — `search-by-id.yaml`. Passed 2026-10-27:
  `000000000000` listed nothing, with no message.
- **Notes:** **QA to confirm** whether a "no results" message should show.

### SRC-09 — Search by ID off (Test Case 9)
- **Status:** Automated — `search-by-id.yaml`. Passed 2026-10-27
  (`20261027-131219`; as fixed, `-133847`).
- **Expected:** The field clears and reads `Name of the individual`; the
  head's name then lists the household.

### SRC-10 — Open the household found by ID (Test Case 10)
- **Status:** Automated — `search-by-id.yaml`, `household-check.yaml`. Passed
  2026-10-27.
- **Expected:** Household Overview lists the head and child 1 under
  `172201651133`.

### SRC-11 — Sync (Test Case 11)
- **Status:** Automated — `sync-data.yaml`. Passed 2026-10-27: `No Data
  available for sync` (the background Auto Sync had sent the household).

---

## Registration — eligibility checklist: referral and ineligible (CDD)

[`flows/registration/cdd-eligibility-referral.yaml`](flows/registration/cdd-eligibility-referral.yaml)
· `regression`, `registration`, `cdd`, `mhbase`, `consumes-data` —
[Prompt 19](prompts/prompt-19-cdd-eligibility-referral-ineligible.md). The CDD
(AU-CDD-001) registers a household of a head and four children and answers
each child's eligibility checklist with one Yes: sick, fever, side effect
from last cycle's SPAQ (referral) and SP or CTX in the past 28 days
(ineligible). **Registers a household of five, three referrals and an
ineligible child in UAT.** No stock is needed. Test data: the `ELIG_*`
keys; names generated — `AutoEligHead<stamp>`, `AutoEligChild<n><stamp>`.

**What the app does** — read off the app as AU-CDD-001, 2026-10-27:
- The checklist: `Is the child sick?`, `Is the child having fever?`, `Is the
  child given SPAQ for the first time?(Not administered in the previous
  cycle)` (No adds `Is there any side effect to SPAQ which was administered
  last cycle?`) and `Child has taken SP or CTX containing drugs in the past
  28 days?`, each with Yes / No radios that report no state.
- Save Delivery with sick, fever or side effect Yes: `Ready to submit ?` /
  `Based on responses you are going to 'referral flow'. Are you sure you want
  to proceed?` (Submit / Cancel). With SP or CTX Yes: the same popup with
  `'Ineligible flow'`.
- Referral: Submit opens **Refer Beneficiary** — `Admnistrative unit *`
  (so spelt; the village) and `Referred by *` (CDD), both read-only, and
  `Health facility *`, a searchable dropdown listing `Fac_f-2026-10-15-137947`
  alone; empty, Submit shows `This field is required`. Submit then shows
  `Referral recorded successfully`, `ID-<beneficiary ID>`, View Household
  Details and Go Back. The card shows **`Beneficiary Referred`**, no Dose or
  Unable To Deliver, Edit Individual greyed out.
- Ineligible: Submit returns straight to Household Overview, no form; the
  card shows **`Ineligible`**, no Dose.

**How it was run.** Explored on the Prompt 18 household's child
(`172201651133`, referred for sickness; runs `20261027-142832` to `-144801`).
Then `20261027-145607` (31 min 26 s): household — head
`AutoEligHead20261027145647 Test`, 34y 0m, Female; children 1–4
`175611531811` (6 months), `176231419201` (9 months), `176118811091` (2 years),
`181072141523` (4 years), all Female. Test Case 1 passed in full and Test
Case 2's referral was recorded; the run then stopped on the flow's own
20-second scroll limit to child 3's card (the ID was on screen when it ran
out; now 60 s). Resumed in the same session on the same household
(`20261027-153014`): child 2's card, Test Cases 3, 4 and 5 passed. **Test Case
6 failed: `Sync Up Failed` / `Server Error`, twice** (retry `-154318`), with
`There are 4 transactions yet to be synced` — Test Cases 3 and 4's records
are on the device only; the app was left as it is.

### ELG-01 — Sick: referral popup, Cancel, referral (Test Case 1)
- **Status:** Automated — `elig-case.yaml`, `elig-refer.yaml`, `elig-card.yaml`.
  Passed 2026-10-27 (`20261027-145607`, child 1 `175611531811`): the popup,
  Cancel kept the answers, the prefilled form, `This field is required`,
  `Referral recorded successfully` with `ID-175611531811`, card `Beneficiary
  Referred` without Dose.
- **Notes:** `Admnistrative unit` is logged as a DEVIATION once per run, so
  the flow ends failed on it until the label is fixed or QA accepts it.

### ELG-02 — Fever: referral (Test Case 2)
- **Status:** Automated. Passed 2026-10-27: referral recorded
  (`20261027-145607`), card `Beneficiary Referred` (`-153014`).

### ELG-03 — Side effect from last cycle's SPAQ: referral (Test Case 3)
- **Status:** Automated. Passed 2026-10-27 (`20261027-153014`, child 3
  `176118811091`): first time No, side effect Yes, referral recorded, card
  `Beneficiary Referred`.

### ELG-04 — SP or CTX taken: ineligible (Test Case 4)
- **Status:** Automated. Passed 2026-10-27 (`20261027-153014`, child 4
  `181072141523`): `'Ineligible flow'` popup, no referral form, card
  `Ineligible` without Dose.
- **Notes:** **QA to confirm** the popup's and the card's wording.

### ELG-05 — Every card (Test Case 5)
- **Status:** Automated. Passed 2026-10-27: children 1–3 `Beneficiary
  Referred`, child 4 `Ineligible`.

### ELG-06 — Sync (Test Case 6)
- **Status:** Automated — `sync-data.yaml`. **Failed 2026-10-27**: `Sync Up
  Failed` / `Server Error`, also on a retry; 4 transactions pending on the
  device.

---

## Adding a case

1. Append it under the right screen with the next free ID. IDs are permanent —
   never renumber, and never reuse one from a deleted case.
2. Quote expected strings **exactly** as the app renders them. Read them from a
   view-hierarchy dump, not a screenshot: an element that looks labelled in an
   image often carries no such text in the hierarchy.
3. Write it as Manual first. Promote it to Automated in the same commit that
   adds the flow, and link the flow file.
4. Put the flow in `flows/<area>/` matching the screen, and tag it with one
   test-level tag (`smoke` or `regression`) plus the feature-area tag that
   matches the folder.
5. If a case exercises a known app quirk — an inverted dialog, a dropdown that
   stays open — record the quirk in the **Notes**. That note is what stops the
   next person "simplifying" the workaround away.
