# HCM-Maestro-Automation-Nigeria-SMC

UI tests for the eGov **HCM** (Health Campaign Management) Android app, written as
[Maestro](https://docs.maestro.dev) flows.

This repo contains no app source. It drives an already-installed build on a
connected device or emulator, so the app under test is selected purely by its
package name (`HCM_APP_ID`). Each tenant ships its own build — `org.egov.bauchi`
for Bauchi State, `com.digit.hcm` for the SMC-MC UAT build and for the
`file-based-download-mhbase-tenant` build. Those last two share a package
name, so only one of them can be installed on a device at a time, and which
one is installed decides which tenant a run tests.

The framework — runner scripts, workspace config, launch and login subflows, and
the conventions below — is carried over from the `maestro-automation` project.
Coverage starts from a single smoke flow and grows from here.

## Test cases

[`TEST-CASES.md`](TEST-CASES.md) is the case register — what is covered, what is
not, and which flow runs each case, grouped by screen. Update it in the same
change that adds or removes a flow.

[`prompts/`](prompts/) holds the specification prompts the flows are built
from, one file per prompt. Prompts 1–14 were given in conversation and are
kept there word for word; where a flow differs from its prompt, TEST-CASES
says why.

| Prompt | Specification | Flows |
| --- | --- | --- |
| [1](prompts/prompt-01-login-and-onboarding.md) | Login and initial configuration, all three roles | `flows/login/sign-in-*`, `flows/onboarding/` |
| [2](prompts/prompt-02-state-stock-receipt.md) | State user: Record Stock Receipt, accept | `state-stock-incoming-receipts`, `state-stock-accept-receipt` |
| [3](prompts/prompt-03-state-dispatch-to-hf.md) | State user: dispatch to a health facility | `state-stock-dispatch` |
| [4](prompts/prompt-04-state-return-to-national.md) | State user: return to National | `state-stock-return` |
| [5](prompts/prompt-05-hf-accept-stock.md) | Health facility: accept incoming stock | `hf-stock-accept-receipt` |
| [6](prompts/prompt-06-hf-dispatch-to-cdd-qr.md) | Health facility: dispatch to a CDD by QR code | `hf-stock-dispatch-cdd` |
| [7](prompts/prompt-07-hf-return-to-state.md) | Health facility: return to the state | `hf-stock-return-state` |
| [8](prompts/prompt-08-stock-reconciliation.md) | Stock reconciliation, state user and health facility | `*-stock-reconciliation` |
| [9](prompts/prompt-09-view-reports.md) | View Reports, state user and health facility | `*-stock-view-reports` |
| [10](prompts/prompt-10-hf-beneficiary-referral.md) | Health facility: beneficiary referral | `hf-beneficiary-referral` |
| [11](prompts/prompt-11-cdd-registration-and-delivery.md) | CDD: registration, stock receipt, dose delivery | `cdd-registration-full`, `cdd-low-beneficiary-id` |
| [12](prompts/prompt-12-cdd-consent-no.md) | CDD: caregiver consent No | `cdd-consent-no` |
| [13](prompts/prompt-13-cdd-unable-to-deliver.md) | CDD: household of 20, Unable to Deliver | `cdd-household-utd` |
| [14](prompts/prompt-14-cdd-dose-and-redose.md) | CDD: household of 7, dose and redose | `cdd-household-redose` |
| [15](prompts/prompt-15-stock-reject.md) | Reject incoming stock, all three receiving roles | `*-stock-reject-receipt` |
| [16](prompts/prompt-16-view-transactions.md) | View Transactions, state user, health facility and CDD | `*-stock-view-transactions` |

## Prerequisites

- **Maestro CLI** — installed at `~/.maestro/bin/`. See the
  [install guide](https://docs.maestro.dev).
- **Java 17 or higher.** Maestro hard-fails on Java 11. The runner scripts pin
  `JAVA_HOME` to Amazon Corretto 17 for their own process only, so anything else
  on the machine that needs another JDK is unaffected. Edit the `jdk17` path at
  the top of the script if yours differs.
- **An Android device or emulator**, visible to `adb devices`, with the HCM build
  for your tenant already installed.
- **A reachable environment** for any flow that signs in. `login-screen.yaml`
  hits no backend; anything built on `subflows/login.yaml` waits on a full
  project sync and fails when the target environment is down.

## Setup

Copy the template and fill it in:

```powershell
Copy-Item .env.example .env
```

```bash
cp .env.example .env
```

`.env` is gitignored and must never be committed — only the `.env.example`
template is tracked.

| Variable | Purpose |
| --- | --- |
| `HCM_APP_ID` | Android package under test |
| `HCM_CDD_USER_ID` / `HCM_CDD_PASSWORD` | CDD user |
| `HCM_HF_STOCK_USER_ID` / `HCM_HF_STOCK_PASSWORD` | Health facility stock user |
| `HCM_STATE_STOCK_USER_ID` / `HCM_STATE_STOCK_PASSWORD` | State stock user |
| `HCM_NAT_STOCK_USER_ID` / `HCM_NAT_STOCK_PASSWORD` | National stock user |
| `HCM_STATE_STOCK_INCOMING_RECEIPTS` | Optional. `present` or `absent` makes the incoming-receipts flow fail when the state stock user's list shows the other outcome; blank accepts either |
| `PRODUCT_VARIANT_1` / `PRODUCT_VARIANT_2` | The two products Case 2b accepts, one incoming transaction each, first `_1` then `_2` (`SPAQ1`, `SPAQ2`). Also matched in the app's spaced form, `SPAQ 1` |
| `PRODUCT_VARIANT` | The product(s) the dispatch flow sends: `SPAQ1`, or several comma-separated (`SPAQ1,SPAQ2`), dispatched one after another in one session — not as separate runs, because a second fresh run would find no stock (see the flow) |
| `REMAINING_BALANCE` | What the dispatch flow's Case 3 leaves in stock (`10`); it dispatches the rest |
| `TARGET_HEALTH_FACILITY` | Optional. The facility to dispatch to, as the app lists it; blank takes the first offered |
| `RETURN_QUANTITY` / `EXPECTED_START_BALANCE` / `EXPECTED_FINAL_BALANCE` | The return flow's quantity (`5`) and the balance before (`10`) and after (`5`) for each of `PRODUCT_VARIANT_1` and `_2` |
| `RETURN_DESTINATION` | The National warehouse as Facility To lists it on the Return form — the app shows codes, not "National": `Fac_f-2026-10-15-137945` |
| `TEST_USER` | The account under test, for a flow's report. Must be the user the flow signs in with, or the flow fails before touching the device: `HCM_HF_STOCK_USER_ID` for the health facility accept and referral flows, `HCM_CDD_USER_ID` (`AU-CDD-001`) for the registration flows - so set it for the flow you run |
| `EXPECTED_INITIAL_BALANCE` | The health facility's balance of each variant before it accepts anything (`0`) |
| `DISPATCHED_QTY_SPAQ1` / `DISPATCHED_QTY_SPAQ2` | What the state dispatched, from the dispatch flow's report (`490` each on 2026-10-19). Checked against `PRODUCT_VARIANT_1`'s and `_2`'s Stock Receipt Details |
| `TARGET_CDD` | The CDD the health facility dispatches to, as their QR code names them (`AU-CDD-001`). The scanned code must match it |
| `QR_CODE_PATH` | That CDD's QR code as an image, relative to the project root (`assets/qr/cdd_qr.png`). [`prepare-qr-camera`](#qr-codes-on-the-emulator) shows it to the emulator camera |
| `HF_RETURN_DESTINATION` | The state warehouse the health facility returns to, as its Return form lists it: `Fac_f-2026-10-15-137946`. The return quantities and balances are the shared `RETURN_QUANTITY` / `EXPECTED_START_BALANCE` / `EXPECTED_FINAL_BALANCE` |
| `RECON_COMMENT` | The comment the reconciliation flows enter for a count different from stock in hand. ASCII only — Maestro's `inputText` on Android types nothing else — so `Automation test - reconciliation discrepancy` with a plain hyphen |
| `RECON_FACILITY` | Optional. The Stock Reconciliation warehouse, as the app lists it; blank takes the first offered |
| `REPORT_FACILITY` | Optional. The View Reports facility filter option; blank takes the first offered |
| `STATE_REPORT_RECEIVED` / `_ISSUED` / `_RETURNED` / `_RECONCILIATION` | The entries the state user's reports should hold, from the earlier prompts' execution reports. Transaction reports: `<variant> <MRN> <quantity>`, comma-separated (e.g. `SPAQ1 C552-4450-5C9A 500,SPAQ2 B46C-1695-D327 500`); reconciliation: `<variant> <manual count>`. Blank: none expected |
| `HF_REPORT_RECEIVED` / `_ISSUED` / `_RETURNED` / `_RECONCILIATION` | The same for the health facility |
| `REASON_1` … `REASON_4` | The four referral reasons, worded as the app lists them: `Fever`, `Sick`, `Drug side effect from the current cycle`, `Drug side effect from the previous cycle` |
| `CHILD_AGE_MONTHS` | The referred child's age in months, 3 to 59 (`24`) |
| `CHECKLIST_TEXT_ANSWER` | Typed into a referral checklist's free-text questions (`Automation test`; ASCII only) |
| `REFERRAL_VILLAGE` / `REFERRAL_CYCLE` / `CHILD_GENDER` | Optional; blank takes the first offered |
| `REGISTRATION_VILLAGE` | Optional. The CDD's Registration & Delivery village; blank takes the first offered (`18Gammadadi` on 2026-10-21) |
| `TEST_LATITUDE` / `TEST_LONGITUDE` | A point inside the village, in decimal degrees, pushed as the emulator's GPS fix on Beneficiary Location. Both blank keeps the emulator's own fix - its default is Mountain View, California (37.421998, -122.084) - and the report says so |
| `HOUSEHOLD_MEMBERS` | Total household members, 1 to 30 (`3`) |
| `HEAD_AGE_YEARS` / `HEAD_AGE_MONTHS` | The head of household's age: 18 to 149 years, 0 to 11 months (`30`, `0`) |
| `HEAD_MOBILE` | Optional. An 11-digit **test** number - never a real person's. Blank leaves the field empty (it is optional in the app) and skips the 10- and 12-digit checks, which are derived from this number |
| `CHILD_1_AGE_MONTHS` / `CHILD_2_AGE_MONTHS` | The two children's ages in months: child 1 3 to 11 (expects `PRODUCT_VARIANT_1`), child 2 12 to 59 (expects `PRODUCT_VARIANT_2`) - `6` and `36`. The form takes years and months; the flow splits them |
| `HEAD_GENDER` / `CHILD_1_GENDER` / `CHILD_2_GENDER` | Optional; blank takes the first offered (`Female`) |
| `EXPECTED_CDD_RECEIVED_SPAQ1` / `_SPAQ2` | What the health facility dispatched to the CDD - Prompt 6's report (`480` each) |
| `CDD_INCOMING_MRNS` | Optional. That dispatch's MRNs, comma-separated (`0572-01DA-C66C,CDC9-2D30-F38E`); the transaction about to be accepted must be one of them. Blank accepts the first per variant |
| `UTD_HOUSEHOLD_MEMBERS` / `UTD_HEAD_AGE_YEARS` / `UTD_HEAD_AGE_MONTHS` | The Unable to Deliver household's own values - `20`, `35`, `0` - kept apart from Prompt 11's `HOUSEHOLD_MEMBERS` / `HEAD_AGE_*` |
| `UTD_CHILD_1_AGE_MONTHS` … `_4_` | Its four children's ages in months, 3 to 59: `6`, `9` (`PRODUCT_VARIANT_1`), `24`, `48` (`PRODUCT_VARIANT_2`) |
| `UTD_HEAD_GENDER` / `UTD_CHILD_GENDER` | Optional; blank takes the first offered (`Female`) |
| `UTD_REASON_1` … `_4_` | Optional. The four Unable to Deliver reasons, as the app lists them, all different; all blank uses the app's list in order - `Beneficiary died`, `Beneficiary migrated`, `Beneficiary absent`, `Beneficiary refused` on 2026-10-22 |
| `REDOSE_HOUSEHOLD_MEMBERS` / `REDOSE_HEAD_AGE_YEARS` / `REDOSE_HEAD_AGE_MONTHS` / `REDOSE_HEAD_GENDER` | The dose-and-redose household's own values - `7`, `32`, `0`, blank (first offered) |
| `REDOSE_CHILD_1_AGE_MONTHS` … `_6_` / `REDOSE_CHILD_GENDER` | Its six children's ages in months - `6`, `24` (dosed and redosed: `PRODUCT_VARIANT_1`, `_2`), then `4`, `10`, `15`, `50` (registered only) - and their gender (blank: first offered) |
| `REDOSE_REASON` | Optional. The redose's Reason, as the app lists it (`Vomitting`, `Others` on 2026-10-22); blank takes the first |
| `CONSENT_REASON` | The reason typed when the caregiver refuses consent (`test`; ASCII only). The consent-No flow sets the consent itself - there is no `CONSENT` key, which would reach every flow |
| `REJECT_REASON` | The reason typed into the reject popup's reason field, when it has one, by the three reject flows (`Automation test - stock rejected`; ASCII only) |
| `VIEW_TXN_EXPECTED_STATE` / `_HF` / `_CDD` | Optional. Transactions the role's View Transactions list must hold, comma-separated, each `<variant> <quantity>` or `<variant> <MRN> <quantity>` (e.g. `SPAQ1 490,SPAQ2 490`). Blank: the list is logged and nothing is expected. A receiver's acceptance can change the MRN the sender sees, so give an MRN only when it is known to be stable |

Leave a role's pair blank if you are not testing that role. See
[Roles](#roles) for how a flow signs in as one.

The role pairs belong to one tenant. To switch tenants, keep a file per tenant
next to `.env` — say `smc-uat.env` and `mhbase.env`, both covered by the
`*.env` ignore rule — and copy the one you need over `.env`. On the mhbase
tenant the test accounts are `AU-SAT-001` (state stock), `AU-HFS-001`
(health facility stock) and `AU-CDD-001` (CDD).

When a new flow needs another variable, add it to `.env.example` and to this
table in the same change.

## Running

The runner scripts read every key out of `.env`, forward each one to Maestro as
`-e KEY=VALUE`, run from the project root so `config.yaml` governs discovery,
and give each run its own output folder. Use them rather than calling
`maestro test` directly.

```powershell
.\scripts\run.ps1                                       # every flow
.\scripts\run.ps1 -Tags smoke                           # by tag
.\scripts\run.ps1 -Tags login                           # by feature area
.\scripts\run.ps1 -ExcludeTags regression
.\scripts\run.ps1 -Flow flows\login                     # one subfolder
.\scripts\run.ps1 -Flow flows\login\login-screen.yaml   # one flow
.\scripts\run.ps1 -Device emulator-5554                 # pick a device
```

```bash
./scripts/run.sh                                   # every flow
./scripts/run.sh --include-tags smoke              # any maestro flag passes through
./scripts/run.sh flows/login                       # one subfolder
./scripts/run.sh flows/login/login-screen.yaml
```

Each run writes to `artifacts/runs/<yyyyMMdd-HHmmss>/` (gitignored), and the
script prints the path when it finishes:

```
artifacts/runs/20261015-142622/
  report.html                         pass/fail, duration and failure reason per flow
  2026-10-15_142623/<flow name>/
    takeScreenshot/artifacts/*.png    the flow's own takeScreenshot evidence
    screenshots/step-NNN-*.png        captured automatically at a failing step
    screen-hierarchy/                 the view hierarchy at that step
    logs/maestro.log                  full log, including console.log output
    logs/device-logcat.txt            the device log for the flow
```

The dropdown subflow logs what it picked to `logs/maestro.log` — search it for
`JsConsole`, e.g. `ADMIN_Community - selected 3 of 3 required: 18Gammadadi, …`.
To use a different report format with `run.sh`, pass your own `--format`
(`JUNIT` for CI) and `--output`; the default is `HTML`.

> **A run folder contains the test passwords.** Maestro records every command
> as executed, so `commands.json` and `logs/maestro.log` hold the password
> `login.yaml` typed, in clear text (so does Maestro's default output under
> `~/.maestro/tests/`). Share `report.html` and the screenshots, never the
> whole folder. That is also why the default report is `HTML` and not
> `HTML-DETAILED`, which lists each executed step, password included.

### QR codes on the emulator

Flows tagged `qr-camera` scan a QR code with the app's camera scanner — the
health facility names the CDD it dispatches to by scanning the CDD's QR
(Team Code). That scanner has no gallery option and no manual entry, so
Maestro's `addMedia` cannot feed it: the camera itself has to see the code.

The emulator's back camera is a virtual room (`hw.camera.back = virtualscene`
in the AVD). Before those flows run:

```powershell
.\scripts\prepare-qr-camera.ps1                     # emulator-5554, 30 minutes
.\scripts\prepare-qr-camera.ps1 -Device emulator-5556 -Minutes 60
.\scripts\prepare-qr-camera.ps1 -Stop               # when done
```

```bash
./scripts/prepare-qr-camera.sh [device] [minutes]
./scripts/prepare-qr-camera.sh --stop [device]
```

It plays the emulator's own `Walk_to_image_room` camera macro, which leaves
the camera facing the room's wall poster, then flashes `QR_CODE_PATH` on that
poster in the background (`adb emu virtualscene-image`): 2 seconds up, 10
down. It flashes because the scanner re-reads a code for as long as it stays
in view, and every re-read raises a red `Code already scanned` banner over
the scanner's Submit; in bursts the code is read once and the banner clears
in the gaps (about 5 seconds after the code leaves the view). The camera pose
lasts until the emulator restarts; the bursts last `-Minutes`, or until
`-Stop`, which also puts the room's own poster back.

`QR_CODE_PATH` holds a CDD's QR as the app's side menu shows it
(`<user name>||<user id>`) — it identifies a test account, so treat it like
the rest of the test data. The `*.png` ignore rule keeps it out of git, as
`.env` is: on a new machine, screenshot the CDD's side menu in the app, crop
the code with a white margin, and save it at `QR_CODE_PATH`.

## Running from Maestro Studio

Maestro Studio is the desktop app for editing and running these flows visually. It
is a **separate entry point from the runner scripts, with its own variable store.**

> **Studio does not read `.env`.** That file is consumed only by `scripts/run.ps1`
> and `scripts/run.sh`, which loop over it and forward each key as `-e KEY=VALUE`.
> Opening `.env` as a tab in Studio does not load it either — it is just a text file
> in the editor. Variables must be re-entered in Studio's own UI.

### One-time setup

1. Click **`Env`** in the bottom toolbar, then **Manage Environments** -> **Create**.
2. **Name** it after the target environment, e.g. `uat-bauchi`. Required.
3. Leave **Include Tags** and **Exclude Tags** empty (see below).
4. Under **Environment Variables**, add one KEY/value row per entry in your `.env`,
   using the **+** button for extra rows. Enter keys bare — no `${}`, no quotes.
   Values go in raw; do not quote values that contain spaces.
5. Click **Create**, then **select the environment from the `Env` dropdown**.
   Creating it does not select it.

The **Include Tags** / **Exclude Tags** fields are the same filters described under
[Tags](#tags), scoped to the environment. For a fast pre-merge gate, create a
second environment with the same variables and `smoke` in Include Tags.

No flow runs without a Studio environment: none carries a flow-level `env:`
default for `HCM_APP_ID` (see [Overriding variables](#conventions) for why), so
every flow needs at least that, and anything that signs in needs its role's
credentials too.

### Symptom of a missing variable

Maestro does not fail loudly on an undefined variable — it resolves it to the string
`undefined` and types that into the field. So a login that appears to fail on bad
credentials may simply be an unset variable. Check the field contents before
suspecting the environment: inspect the view hierarchy, or read the value straight
off the device panel.

## Flows

Flows are grouped into one subfolder per feature area. **The folder name matches
the flow's feature-area tag** — `flows/login/` holds everything tagged `login` —
so the two cannot drift apart.

### `flows/login/`

| Flow | Tags | What it checks |
| --- | --- | --- |
| [`login-screen.yaml`](flows/login/login-screen.yaml) | `smoke`, `login` | The app installs, launches and paints its login form. Hits no backend, so it stays green even when the environment is down — run this first when triaging a red suite. |
| [`login-validation.yaml`](flows/login/login-validation.yaml) | `regression`, `login` | Submitting a blank form shows both required-field errors and stays on the login screen. No backend. |
| [`forgot-password.yaml`](flows/login/forgot-password.yaml) | `regression`, `login` | The Forgot Password link shows the contact-administrator dialog, and `Ok` closes it. No backend. |
| [`sign-in-cdd.yaml`](flows/login/sign-in-cdd.yaml) | `regression`, `login`, `cdd` | The CDD user signs in, the post-login sync completes, and facility selection opens. Needs the CDD credentials and a reachable environment; takes about 3 minutes. |
| [`sign-in-state-stock.yaml`](flows/login/sign-in-state-stock.yaml) | `regression`, `login`, `state-stock` | The state stock user signs in and lands on boundary selection with no facility picker. Needs the state stock credentials. |
| [`sign-in-hf-stock.yaml`](flows/login/sign-in-hf-stock.yaml) | `regression`, `login`, `hf-stock` | The health facility stock user signs in and lands on the same boundary selection. Needs the health facility stock credentials. |

### `flows/onboarding/`

What a user does between sign-in and the home screen: grant the app's
permissions, then pick the boundaries they work in. Each flow launches with no
permissions granted, as a field device would, so it passes through the app's
**Allow Permissions** screen on the way. Dropdown options are picked by
position, never by name. These flows read the mhbase tenant's field labels
(`ADMIN_State *` and so on), hence the `mhbase` tag.

| Flow | Tags | What it checks |
| --- | --- | --- |
| [`state-stock-selects-state.yaml`](flows/onboarding/state-stock-selects-state.yaml) | `regression`, `onboarding`, `state-stock`, `mhbase` | The state stock user gets through Allow Permissions and selects the first `ADMIN_State` option. |
| [`hf-stock-selects-facility.yaml`](flows/onboarding/hf-stock-selects-facility.yaml) | `regression`, `onboarding`, `hf-stock`, `mhbase` | The health facility stock user gets through Allow Permissions and selects the first `ADMIN_Health Facility` option. |
| [`cdd-selects-facility-and-communities.yaml`](flows/onboarding/cdd-selects-facility-and-communities.yaml) | `regression`, `onboarding`, `cdd`, `mhbase` | The CDD user gets through Allow Permissions, selects the first health facility and the first three `ADMIN_Community` options, and all three stay selected once the menu closes. |

### `flows/stock/`

Stock management from the home screen. These start from
[`subflows/home/<role>.yaml`](subflows/home/state-stock.yaml), which runs the
onboarding path and submits the boundary, so they inherit its `mhbase` tag.
Then they run **Download Stock Data**: this build does not fetch stock records
at sign-in, and without them Incoming Transactions is empty.

| Flow | Tags | What it checks |
| --- | --- | --- |
| [`state-stock-incoming-receipts.yaml`](flows/stock/state-stock-incoming-receipts.yaml) | `regression`, `stock`, `state-stock`, `mhbase` | The state stock user reaches home, downloads stock records, finds the Manage Stock card, opens Record Stock Receipt (the `Incoming Transactions` screen) and reports whether incoming transactions are listed, logging the first one's MRN, product, date, sender and status. Either outcome passes unless `HCM_STATE_STOCK_INCOMING_RECEIPTS` names one. |
| [`state-stock-accept-receipt.yaml`](flows/stock/state-stock-accept-receipt.yaml) | `regression`, `stock`, `state-stock`, `mhbase`, `consumes-data` | Prompt 2's Cases 2, 2a, 2b in one session. Needs an incoming transaction for each of `PRODUCT_VARIANT_1` and `_2` — each transaction carries one product — or it fails as `BLOCKED - …` before touching anything. Opens the first `SPAQ1` transaction (product, sender and MRN checked on Stock Receipt Details), opens its Accept Confirmation and Cancels it (nothing accepted), then accepts the first `SPAQ1` and the first `SPAQ2` transaction in turn (**accepts the stock**): success banner, transaction gone from the list, Stock Balance up by the quantity. See TEST-CASES STK-04–06. |
| [`state-stock-dispatch.yaml`](flows/stock/state-stock-dispatch.yaml) | `regression`, `stock`, `state-stock`, `mhbase`, `consumes-data` | Prompt 3: dispatch `PRODUCT_VARIANT` to a health facility via Manage Stock → Record Stock Issued → Issue. Reads the home Stock Balance, then on one form: quantity 0 is refused (Case 1) and balance + 1 is refused (Case 2), the balance is unchanged; then dispatches balance − `REMAINING_BALANCE` (Case 3, **moves stock**) and expects `REMAINING_BALANCE` left. Case 3 is `BLOCKED - …` while the balance is `REMAINING_BALANCE` or less. See TEST-CASES DSP-01–04. |
| [`state-stock-return.yaml`](flows/stock/state-stock-return.yaml) | `regression`, `stock`, `state-stock`, `mhbase`, `consumes-data` | Prompt 4: return `RETURN_QUANTITY` of `PRODUCT_VARIANT_1`, then `_2`, to National (`RETURN_DESTINATION`) via Record Stock Issued → Return. Each must start at `EXPECTED_START_BALANCE` (else nothing is submitted) and end at `EXPECTED_FINAL_BALANCE`; the first is re-checked after the second. Needs the session that holds the stock — run on its own, it starts from a wiped app and fails the precondition. See TEST-CASES RTN-01–03. |
| [`hf-stock-accept-receipt.yaml`](flows/stock/hf-stock-accept-receipt.yaml) | `regression`, `stock`, `hf-stock`, `mhbase`, `consumes-data` | Prompt 5 (the specification's `hf_main.yaml`): the health facility user (`TEST_USER`) signs in, picks the first facility, starts at `EXPECTED_INITIAL_BALANCE` for both variants, finds the state's dispatch under Record Stock Receipt (a real MRN), checks each variant's Stock Receipt Details against the card and `DISPATCHED_QTY_*`, Cancels an Accept Confirmation (nothing accepted), then accepts `PRODUCT_VARIANT_1` and `_2` in turn (**accepts the stock**) and expects each balance to be initial + received and the MRNs gone from the list. Needs an undownloaded dispatch to the facility for each variant. See TEST-CASES HFR-01–06. |
| [`hf-stock-dispatch-cdd.yaml`](flows/stock/hf-stock-dispatch-cdd.yaml) | `regression`, `stock`, `hf-stock`, `mhbase`, `consumes-data`, `qr-camera` | Prompt 6 (the specification's `hf_dispatch_cdd.yaml`): the health facility user dispatches `PRODUCT_VARIANT` to the CDD `TARGET_CDD` — Facility To `Delivery team`, the CDD named by scanning their QR code (Team Code) — with Prompt 3's cases: 0 refused, balance + 1 refused, then balance − `REMAINING_BALANCE` dispatched (**moves stock**) and its MRN logged. Needs the emulator camera prepared ([QR codes on the emulator](#qr-codes-on-the-emulator)) and the session holding the stock, like the return flow. See TEST-CASES CDD-01–04. |
| [`hf-stock-return-state.yaml`](flows/stock/hf-stock-return-state.yaml) | `regression`, `stock`, `hf-stock`, `mhbase`, `consumes-data` | Prompt 7 (the specification's `hf_return_state.yaml`): the return flow's subflow run for the health facility — `RETURN_QUANTITY` of `PRODUCT_VARIANT_1`, then `_2`, back to the state (`HF_RETURN_DESTINATION`), each from `EXPECTED_START_BALANCE` to `EXPECTED_FINAL_BALANCE`, the first re-checked after the second, MRNs logged. No QR scan: the Return form offers the state warehouse only. Needs the session holding the stock. See TEST-CASES HRT-01–03. |
| [`state-stock-reconciliation.yaml`](flows/stock/state-stock-reconciliation.yaml) / [`hf-stock-reconciliation.yaml`](flows/stock/hf-stock-reconciliation.yaml) | `regression`, `stock`, `state-stock` or `hf-stock`, `mhbase`, `consumes-data` | Prompt 8, one flow per role (the specification's `state_reconciliation.yaml` / `hf_reconciliation.yaml`) over one shared subflow: Stock Reconciliation for `PRODUCT_VARIANT_1` and `_2` — Case 1 count = stock in hand with no comment, Case 2 one less and Case 3 one more, each first without a comment (must be refused) then with `RECON_COMMENT`; stock in hand re-read after each. **Every submission records a reconciliation.** The specification's rules are checked softly: each difference is logged as `DEVIATION - …` and the run fails at the end listing them all. Stock in hand below 0 BLOCKs the variant, submitting nothing; at 0 only Case 2 is BLOCKED. Needs the session that holds the stock, like the return flows. See TEST-CASES REC-01–04. |
| [`state-stock-view-reports.yaml`](flows/stock/state-stock-view-reports.yaml) / [`hf-stock-view-reports.yaml`](flows/stock/hf-stock-view-reports.yaml) | `regression`, `stock`, `state-stock` or `hf-stock`, `mhbase` | Prompt 9, one flow per role (the specification's `state_view_reports.yaml` / `hf_view_reports.yaml`) over one shared subflow: View Reports offers Stock Received, Issued, Returned and Reconciliation; each table is opened for the user's warehouse, its headers and rows read, and each `*_REPORT_*` entry looked for by product, MRN and quantity. Reads only. Findings — empty tables, missing entries, the untranslated quantity header — are logged and the run fails at the end listing them. **The reports show only the records on the device**, so after a wipe they miss the earlier prompts' transactions; see TEST-CASES VR-01–05. |
| [`state-stock-reject-receipt.yaml`](flows/stock/state-stock-reject-receipt.yaml) / [`hf-stock-reject-receipt.yaml`](flows/stock/hf-stock-reject-receipt.yaml) / [`cdd-stock-reject-receipt.yaml`](flows/stock/cdd-stock-reject-receipt.yaml) | `regression`, `stock`, `state-stock` / `hf-stock` / `cdd`, `mhbase`, `consumes-data` | [Prompt 15](prompts/prompt-15-stock-reject.md), one flow per receiving role over one shared subflow - the counterpart of accepting: needs an incoming transaction for each of `PRODUCT_VARIANT_1` and `_2` (else `BLOCKED - …`, nothing rejected); the first `_1` transaction's Stock Receipt Details offer Reject (Test Case 1); Reject asks for confirmation (2); Cancel leaves both variants pending (3); an empty reason is refused when the field is mandatory (4); then `_1` and `_2` are rejected in turn with `REJECT_REASON` (**rejects the stock**), each leaving the incoming list (5); the balances stay unchanged and the rejected MRNs stay out of the list after Download Stock Data (6). The popup, reason field and message are soft checks (`DEVIATION - …`, the run fails at the end listing them); if Reject asks for no confirmation, its first tap rejects and Test Cases 3-4 cannot run. The incoming list is counted whole, scrolling to its end. Passed for the state user on 2026-10-23; the health facility and CDD flows have not run yet. See TEST-CASES RJT-01–06. |
| [`state-stock-view-transactions.yaml`](flows/stock/state-stock-view-transactions.yaml) / [`hf-stock-view-transactions.yaml`](flows/stock/hf-stock-view-transactions.yaml) / [`cdd-stock-view-transactions.yaml`](flows/stock/cdd-stock-view-transactions.yaml) | `regression`, `stock`, `state-stock` / `hf-stock` / `cdd`, `mhbase` | [Prompt 16](prompts/prompt-16-view-transactions.md), one flow per role over one shared subflow. Reads only. Manage Stock offers View Transactions and it opens (Test Case 1); every card is read - MRN, date, Receiver or Sender, product lines, View QR - scrolling the whole list, or the empty state logged (2); the first card of each variant's Select Transaction opens details whose MRN, resource and quantity match the card (3); View QR opens the QR Code popup, which closes (4); `VIEW_TXN_EXPECTED_<role>` entries are listed, when set (5); Back returns to Manage Stock (6). The list holds the user's own records on the device, so it runs after Download Stock Data. Points for QA (titles, labels, where Back leads) are logged as `NOTE - …`. See TEST-CASES VTX-01–06. |

### `flows/referral/`

Beneficiary Referral, from the home card of the same name.

| Flow | Tags | What it checks |
| --- | --- | --- |
| [`hf-beneficiary-referral.yaml`](flows/referral/hf-beneficiary-referral.yaml) | `regression`, `referral`, `hf-stock`, `mhbase`, `consumes-data` | Prompt 10 (the specification's `hf_beneficiary_referral.yaml`): the health facility user picks the village, then creates one referral per reason `REASON_1`..`REASON_4` (**creates records**) — Health Facility Details, Referral Details (cycle, generated child name `AutoChild_<reason>_<run time>`, `CHILD_AGE_MONTHS`, gender), the reason's checklist answered with first options and `CHECKLIST_TEXT_ANSWER`, Submit, success screen, Go Back — then searches each child's name on the referral screen (it lists nothing until searched), returns home through the side menu and syncs until `No Data available for sync`. The app shows no referral ID, so none is captured. A failed record is reported and the next reason still runs. See TEST-CASES REF-01–07. |

### `flows/registration/`

Registration & Delivery, as the CDD user.

| Flow | Tags | What it checks |
| --- | --- | --- |
| [`cdd-low-beneficiary-id.yaml`](flows/registration/cdd-low-beneficiary-id.yaml) | `regression`, `registration`, `cdd`, `mhbase` | Prompt 11 Test Case 1 on its own (the specification's `cdd_low_beneficiary_id.yaml`): signed in fresh, with no beneficiary IDs on the device, the CDD searches the village and taps Register Beneficiary - the `Low Beneficiary IDs` popup offers Download. Downloads and registers nothing. See TEST-CASES REG-01. |
| [`cdd-registration-full.yaml`](flows/registration/cdd-registration-full.yaml) | `regression`, `registration`, `cdd`, `mhbase`, `consumes-data` | Prompt 11 (the specification's `cdd_registration_full.yaml`), Test Case 1 then Steps 1-15 in one session: the popup, the beneficiary ID download, a household registered - location, consent, member count bounds, the head of household (age and mobile bounds), child 1 (age bounds) - the eligibility checklist all No, **Insufficient Stock** on Record Cycle Dose, the health facility's dispatch accepted, child 1's dose (`PRODUCT_VARIANT_1` only), child 2 added and dosed (`PRODUCT_VARIANT_2` only), and the balances falling by the doses. **Registers a household of three, accepts both dispatches and records two doses**, so a rerun needs a fresh unaccepted dispatch to the CDD. The specification's bounds and the names on Household Overview are checked softly - each difference is a `DEVIATION`, and the run fails at the end listing them. See TEST-CASES REG-01-16. |
| [`cdd-consent-no.yaml`](flows/registration/cdd-consent-no.yaml) | `regression`, `registration`, `cdd`, `mhbase`, `consumes-data` | Prompt 12 (the specification's `cdd_consent_no.yaml`): a new registration (generated name `AutoNoConsent<run time>`) - village, search, Register Beneficiary, location - with Care giver's consent **No**: the reason field appears and is mandatory, `CONSENT_REASON` typed; Test Case 1 Cancel in `Ready to Submit?` returns to the consent screen with nothing submitted; Test Case 2 Submit records the household (**creates a record**), shows the success screen without Household Details, and Back To Search returns to search; Test Case 3 searches the name (not found: the household has no members); then Sync Data until nothing is left. A fresh sign-in has no beneficiary IDs, so they are downloaded first. See TEST-CASES CNS-01-07. |
| [`cdd-household-utd.yaml`](flows/registration/cdd-household-utd.yaml) | `regression`, `registration`, `cdd`, `mhbase`, `consumes-data` | Prompt 13 (the specification's `cdd_household_20_utd.yaml`): stock balances read; a household with consent Yes and `UTD_HOUSEHOLD_MEMBERS` (20) members registered - the head and four children (`UTD_CHILD_n_AGE_MONTHS`, two per product band), each submitted; then for each child (Test Cases 1-4) **Unable To Deliver** on its card with a different reason (**irreversible**) - no Dose, checklist or delivery screen; each card's status and the unchanged balances verified; Sync Data. See TEST-CASES UTD-01-09. |
| [`cdd-household-redose.yaml`](flows/registration/cdd-household-redose.yaml) | `regression`, `registration`, `cdd`, `mhbase`, `consumes-data` | Prompt 14 (the specification's `cdd_household_redose.yaml`): stock balances read (BLOCKED unless each covers a dose and a redose); a household of `REDOSE_HOUSEHOLD_MEMBERS` (7) registered - the head and six children; child 1 (`PRODUCT_VARIANT_1`) and child 2 (`PRODUCT_VARIANT_2`) each get a **dose and a redose** (**irreversible**) - the product follows the age band both times, each lowers its own variant's balance by its quantity and leaves the other alone, and no second redose is offered; every card verified; Sync Data. See TEST-CASES RDS-01-10. |

## Roles

Every role signs in through the same launch and login screens; only the
credentials and the screen each role lands on after sync differ. So:

- [`subflows/login.yaml`](subflows/login.yaml) is the **only** login. It types
  whatever it is handed as `LOGIN_USER_ID` / `LOGIN_PASSWORD`.
- `subflows/sign-in/<role>.yaml` is one short file per role. It launches the
  app, hands that role's `.env` pair to `login.yaml`, waits out the sync, gets
  through the **Allow Permissions** screen every role shares, and waits for
  that role's boundary screen. That last wait is the only thing that differs
  per role.
- Every flow carries a role tag, so `.\scripts\run.ps1 -Tags cdd` runs
  everything for one role.

The boundary screen's labels depend on the tenant. The SMC-MC build shows
localised names; the mhbase build shows the raw boundary codes. Each sign-in
subflow's wait lists both.

| Role | Tag | Sign-in subflow | Lands on (SMC-MC UAT) | Lands on (mhbase) |
| --- | --- | --- | --- | --- |
| CDD user | `cdd` | [`sign-in/cdd.yaml`](subflows/sign-in/cdd.yaml) | Facility selection (`Health Facility *`, `Community *`) | `ADMIN_Health Facility *` (single-select search field), `ADMIN_Community *` (multi-select) |
| Health facility stock user | `hf-stock` | [`sign-in/hf-stock.yaml`](subflows/sign-in/hf-stock.yaml) | Same screen as the state stock user — one dropdown labelled `Community *` | One multi-select, `ADMIN_Health Facility *` |
| State stock user | `state-stock` | [`sign-in/state-stock.yaml`](subflows/sign-in/state-stock.yaml) | Boundary selection — one dropdown, labelled `Community *` by the app even though it picks the state | One multi-select, `ADMIN_State *` |
| National stock user | `nat-stock` | Not yet — needs credentials | Not yet observed | Not yet observed |

To add a role: fill its pair in `.env`, sign in once by hand (or via the MCP
tools) to see where it lands, then copy `sign-in/cdd.yaml`, swap the two
variables and the landing-screen wait. Never guess the landing screen — a wait
on the wrong text simply times out after five minutes.

**`LOGIN_USER_ID` / `LOGIN_PASSWORD` must never go in `.env`.** The runner
forwards every `.env` key, and a value arriving that way would compete with the
one the role subflow passes in.

## Adding a flow

A flow that needs a signed-in user starts like this:

```yaml
appId: ${HCM_APP_ID}
name: "<Area> - <what it checks>"
tags:
  - regression        # exactly one test level: smoke or regression
  - <area>            # matches the folder: flows/<area>/
  - <role>            # which user it signs in as: cdd, hf-stock, ...
---
# Launches, signs in as the role and waits out the post-login sync.
- runFlow: ../../subflows/sign-in/<role>.yaml
```

Do not add an `env:` block for `HCM_APP_ID` — see
[Overriding variables](#conventions).

Then:

1. Save it as `flows/<area>/<name>.yaml`.
2. Add its case to [`TEST-CASES.md`](TEST-CASES.md) and its row to the
   [Flows](#flows) table above.
3. If two flows would duplicate the same steps, move those steps into
   `subflows/`.

## Tags

Tags are **user-defined free-form strings**. Maestro attaches no meaning to them —
they exist only so you can run a subset of the suite. There is no fixed vocabulary;
the names below are this project's convention.

```yaml
tags:
  - smoke
  - login
```

Filtering, and how the logic combines:

```bash
maestro test flows --include-tags smoke               # only smoke
maestro test flows --exclude-tags regression          # everything except regression
maestro test flows --include-tags smoke,login         # smoke OR login
maestro test flows --include-tags smoke --exclude-tags flaky
```

- **Within one flag the tags are OR-ed.** `--include-tags smoke,login` runs anything
  carrying either tag. Maestro has no AND operator for tags.
- **The two flags are AND-ed.** Include first, then subtract anything matching an
  exclude tag.
- `config.yaml` also accepts `includeTags:` / `excludeTags:` for permanent
  workspace-level filtering. This project does not use them — its `config.yaml`
  only restricts *discovery* to `flows/**`. **CLI flags always take precedence
  over `config.yaml`.**

### Tag axes

| Axis | Purpose | Used here |
| --- | --- | --- |
| Test level | How deep and how slow the test is | `smoke`, `regression` |
| Feature area | Which part of the app it covers | `login`, `onboarding`, `stock`, `referral`, `registration` |
| Role | Which user the flow signs in as — see [Roles](#roles) | `cdd`, `state-stock`, `hf-stock`; `nat-stock` reserved |
| Platform | Android vs iOS flows | No — Android only |
| Stability | Quarantine known-flaky tests out of CI | Not yet |
| Environment | Which tenant's labels or data the flow depends on. Untagged flows run on any tenant | `mhbase` — exclude with `-ExcludeTags mhbase` when testing another tenant |
| Data | Flows that use up server-side test data, so a rerun needs fresh data | `consumes-data` — exclude with `-ExcludeTags consumes-data` unless fresh data is loaded |
| Device setup | Flows that need the device prepared outside Maestro first | `qr-camera` — run [`prepare-qr-camera`](#qr-codes-on-the-emulator) first, or exclude with `-ExcludeTags qr-camera` |

The feature-area axis is also the folder layout, so `--include-tags login` and
`flows/login` select the same set. Keep `smoke` and `regression` mutually
exclusive: `--include-tags smoke` is then the fast pre-merge gate and the
unfiltered run is the full nightly.

## Anatomy of a flow

Walking through [`flows/login/login-screen.yaml`](flows/login/login-screen.yaml).

### Header block

Everything above the `---` is configuration, not commands.

| Line | Meaning |
| --- | --- |
| `appId: ${HCM_APP_ID}` | The app under test. `${...}` resolves a variable at run time, so the package name is never hardcoded — the runner supplies it from `.env`. This is what lets one suite serve every tenant build. |
| `name: "Login - login screen renders"` | Display name in console output and reports. Falls back to the filename when omitted. Cosmetic, but it is what you read in a failure log. |
| `tags: [smoke, login]` | Filtering labels — see above. |
| `---` | Mandatory separator between the header and the command list. |

There is deliberately no `env:` block. A flow-level default for `HCM_APP_ID`
would beat the value `.env` supplies and pin the flow to one build — see
[Overriding variables](#conventions).

### Commands

```yaml
- runFlow: ../../subflows/launch-app.yaml
```

Runs another flow file inline, as though its commands were pasted at this point.
This is the reuse mechanism: launch, dismissing the location prompt and waiting
for the login screen live in one place and are shared by every flow.

```yaml
- assertVisible:
    text: "User ID.*"
    label: "User ID field is present"
```

Fails the flow if nothing on screen matches. Two non-obvious details:

- **`text` is a regular expression and must match the entire string.**
  `assertVisible: Login` matches only the exact text `Login`. `"User ID.*"` therefore
  means *"User ID" followed by anything*, which is how it tolerates the required-field
  marker the app appends (`User ID*`). A true substring match needs `.*User ID.*`.
- **`label` renames the command in the output.** The log reads
  `User ID field is present` instead of `Assert that "User ID.*" is visible`.
  It has no effect on execution — it is there for whoever reads the failure.

```yaml
- assertVisible:
    text: "Login"
    below: "Password.*"
```

`below` is a **relational selector** (`above`, `leftOf`, `rightOf` and
`containsChild` are its siblings). It is required here because `"Login"` matches two
elements — the screen heading and the submit button. Anchoring below the Password
field disambiguates to the button.

```yaml
- takeScreenshot: artifacts/smoke-login-screen
```

Writes a PNG; the extension is added automatically. Under the runner scripts
the path resolves inside the run's folder —
`artifacts/runs/<stamp>/<maestro stamp>/<flow name>/takeScreenshot/` — see
[Running](#running).

## Command reference for this suite

Every command the flows and subflows currently use:

| Command | Purpose |
| --- | --- |
| `launchApp` | Start the app. Always with `clearState: true` here, for run-to-run consistency, and `permissions: all: unset` so the app asks for permissions as it would on a field device. |
| `runFlow: <file>` | Pull in a subflow. |
| `runFlow: when: visible:` | Conditional block — runs only if the matcher hits, so optional UI is not a failure. |
| `repeat` | Loop a block `times` times, optionally `while` a matcher hits. Every loop here has a `times` cap so an unexpected screen fails instead of hanging. |
| `copyTextFrom` | Copy an element's text into `maestro.copiedText`. Used to read dropdown option names at run time. |
| `runScript` / `evalScript` | Run JavaScript; values persist in `output` for later commands. `dropdown.js` keeps the option list. Scripts never throw — see Conventions. |
| `tapOn` | Tap by text or by relational anchor. |
| `eraseText` | Clear the focused field, so a retry does not append to a partial value. |
| `inputText` | Type into the focused field. |
| `hideKeyboard` | **Not used.** On Android it is a Back press; when the keyboard is already going down, Back reaches the app, which exits from its login screen. See the comment in `login.yaml`. |
| `assertVisible` | Hard assertion; fails the flow. |
| `assertNotVisible` | Hard assertion that something is gone, e.g. a dismissed dialog. Only after the thing was known to be on screen. |
| `extendedWaitUntil` | Poll for `visible:` / `notVisible:` up to `timeout`. The correct tool for anything that waits on the network. |
| `retry` | Re-run a block up to `maxRetries` times. Used to retype the user id when characters are dropped. |
| `waitForAnimationToEnd` | Block until the UI settles. |
| `takeScreenshot` | Capture evidence into the run's folder under `artifacts/runs/`. |

## Authoring flows with Claude Code

Maestro ships an MCP server, which lets a coding agent drive the same device these
flows run against — inspect the live view hierarchy, try a selector, run a flow and
read the failure. Register it once:

```bash
claude mcp add maestro -- maestro mcp
```

Note this is the opposite direction from what the name suggests: **Maestro Studio, the
desktop app, does not embed Claude.** Maestro exposes tools, and the agent consumes
them. Studio remains a separate visual way to do the same inspection by hand.

The agent-side counterpart to Studio is **Maestro Viewer**, a local URL (typically
`http://127.0.0.1:10002/`) showing live device state, the commands of the running
flow, and the agent's tool activity. Keep it open while an agent works.

This is the fastest way to write a selector in this suite, because the app is
Flutter-rendered and the hierarchy is the only source of truth for what can be
matched. Ask for an `inspect_screen` before guessing at a locator.

Caveats specific to this project:

- Credentials pass as an `env` map on the MCP `run` call, not via the `.env`
  forwarding the shell scripts do — which puts them in the agent's transcript.
  For anything that signs in, have the agent run `scripts/run.ps1` (or
  `run.sh`) instead, which reads `.env` without the values ever passing
  through the agent, and keep the MCP tools for credential-free inspection.
  The scripts stay the right entry point for CI and for ordinary local runs.
- The MCP server shells out to the same Maestro CLI, so it needs Java 17 too.
- Do not run the scripts while an agent or Maestro Studio is driving the same
  device. Each installs Maestro's on-device driver, and the second one to
  start kills the first one's connection (`DeviceServerDiedException` — every
  remaining flow in the run then fails within seconds). Touching the emulator
  window mid-run is just as fatal in a quieter way: a notification shade left
  pulled down hides the app, and the next flow times out at launch.

## Layout

```
config.yaml                 restricts the runnable set to flows/**
flows/                      runnable tests, grouped by feature area
  login/
    login-screen.yaml       form renders (no backend)
    login-validation.yaml   blank form is rejected (no backend)
    forgot-password.yaml    contact-administrator dialog (no backend)
    sign-in-cdd.yaml        CDD sign-in through to facility selection
    sign-in-state-stock.yaml  state stock sign-in through to boundary selection
    sign-in-hf-stock.yaml   health facility stock sign-in, same landing
  onboarding/
    state-stock-selects-state.yaml              first ADMIN_State option
    hf-stock-selects-facility.yaml              first ADMIN_Health Facility option
    cdd-selects-facility-and-communities.yaml   first facility + first three communities
  stock/
    state-stock-incoming-receipts.yaml  Manage Stock > Record Stock Receipt, incoming list
    state-stock-accept-receipt.yaml     Cases 2/2a/2b - accept an incoming receipt
    state-stock-dispatch.yaml           dispatch to a health facility, Cases 1-3
    state-stock-return.yaml             return to National, SPAQ1 then SPAQ2
    hf-stock-accept-receipt.yaml        health facility accepts the dispatch, Test Cases 1-6
    hf-stock-dispatch-cdd.yaml          health facility dispatches to a CDD by QR code, Cases 1-3
    hf-stock-return-state.yaml          health facility returns to the state, SPAQ1 then SPAQ2
    state-stock-reconciliation.yaml     stock reconciliation as the state user, Cases 1-3
    hf-stock-reconciliation.yaml        stock reconciliation as the health facility, Cases 1-3
    state-stock-view-reports.yaml       View Reports as the state user, four reports
    hf-stock-view-reports.yaml          View Reports as the health facility, four reports
    state-stock-reject-receipt.yaml     state user rejects an incoming receipt, Test Cases 1-6
    hf-stock-reject-receipt.yaml        health facility rejects the state's dispatch, Test Cases 1-6
    cdd-stock-reject-receipt.yaml       CDD rejects the health facility's dispatch, Test Cases 1-6
    state-stock-view-transactions.yaml  View Transactions as the state user, Test Cases 1-6
    hf-stock-view-transactions.yaml     View Transactions as the health facility, Test Cases 1-6
    cdd-stock-view-transactions.yaml    View Transactions as the CDD, Test Cases 1-6
  referral/
    hf-beneficiary-referral.yaml        four referrals, one per reason, then sync
  registration/
    cdd-low-beneficiary-id.yaml         the CDD's Low Beneficiary IDs popup (Test Case 1)
    cdd-registration-full.yaml          register a household, Insufficient Stock, receive, dose two children
    cdd-consent-no.yaml                 a household whose caregiver refuses consent: Cancel, Submit, search
    cdd-household-utd.yaml              a household of 20, four children, Unable to Deliver with each reason
    cdd-household-redose.yaml           a household of 7, dose and redose for a SPAQ1 and a SPAQ2 child
subflows/                   reusable building blocks, pulled in via runFlow
  launch-app.yaml
  accept-system-dialogs.yaml  answers Android's permission and system prompts
  login.yaml                the one login, for every role
  allow-permissions.yaml    the app's post-sync Allow Permissions screen
  fail.yaml                 fail with a readable message
  sign-in/                  one "sign in as <role>" per role
    cdd.yaml
    state-stock.yaml
    hf-stock.yaml
  home/                     sign in, select the boundary, submit, reach home
    state-stock.yaml
    hf-stock.yaml
    cdd.yaml
  stock/
    download-stock-data.yaml         fetch stock records (home > home)
    open-incoming-transactions.yaml  home > Manage Stock > Record Stock Receipt
    read-first-transaction.yaml      log the first incoming transaction
    incoming-receipts.js    report + expectation check for the incoming list
    read-stock-balance.yaml          a product's home balance, as a number
    open-stock-form.yaml             Record Stock Issued form, Issue or Return
    scan-team-code.yaml              scan a CDD's QR code into Team Code
    enter-quantity.yaml              type the quantity, focus checked
    back-to-home.yaml                Back until home
    accept-receipt/         accepting incoming stock - shared by both receivers
    reject-receipt/         rejecting incoming stock - shared by all three receivers
    view-transactions/      Manage Stock > View Transactions - shared by all three roles
    dispatch/               dispatch (Issue) building blocks
    return/                 return building blocks - state to National, HF to state
    hf-receipt/             the health facility's Test Cases 1-6
    reconciliation/         Stock Reconciliation, either role
    reports/                View Reports, either role
  referral/                 Beneficiary Referral: village, one referral, checklist, list, sync
  registration/             Registration & Delivery as the CDD: IDs, household, members, doses, stock
  dropdown/
    select-first-options.yaml  pick the first N options of a boundary dropdown
    dropdown.js                its book-keeping
prompts/                    the specification prompts, one file each
  prompt-01-…-14-….md       Prompts 1-14, word for word as given
  prompt-15-stock-reject.md rejecting incoming stock, all three receiving roles
  prompt-16-view-transactions.md  View Transactions, all three roles
scripts/                    run.ps1 (Windows) and run.sh (bash) - same behaviour
                            prepare-qr-camera.ps1 / .sh - flash the QR to the emulator camera
assets/qr/cdd_qr.png        the CDD's QR code (QR_CODE_PATH; gitignored, like .env)
artifacts/                  run reports and screenshots (gitignored)
```

Two rules keep this working, and both are easy to break:

1. **`config.yaml` must use `flows/**`, not `flows/*.yaml`.** Maestro does not
   recurse into subdirectories on its own — the single-star pattern matches the
   root of `flows/` only, so nested flows would be silently skipped rather than
   reported as an error.
2. **A flow's `runFlow` paths are relative to the flow file.** Flows sit one level
   deeper than the subflows they call, hence `../../subflows/`. Moving a flow
   between folders means fixing those paths.

### Subflows

| Subflow | Responsibility |
| --- | --- |
| [`launch-app.yaml`](subflows/launch-app.yaml) | Launch with cleared state and no permissions granted, wait out a "System UI isn't responding" dialog or close a "Bluetooth keeps stopping" one if a busy emulator raises them, answer the launch prompts, wait for the login screen. |
| [`accept-system-dialogs.yaml`](subflows/accept-system-dialogs.yaml) | Answer every Android prompt that is up — runtime permissions ("While using the app" where offered, else Allow), the battery-optimisation exemption, Location Accuracy — until none is left. A no-op when nothing is up. |
| [`login.yaml`](subflows/login.yaml) | Fill the credentials form with `LOGIN_USER_ID` / `LOGIN_PASSWORD`, submit it, and fail fast if the app does not leave the login screen. Called only from `sign-in/`. |
| [`allow-permissions.yaml`](subflows/allow-permissions.yaml) | The app's post-sync **Allow Permissions** screen: Grant each permission, tick the background-activity checkbox, Continue. |
| [`sign-in/cdd.yaml`](subflows/sign-in/cdd.yaml) | Launch, sign in as the CDD user, wait out the sync, get through Allow Permissions, wait for facility selection. See [Roles](#roles). |
| [`sign-in/state-stock.yaml`](subflows/sign-in/state-stock.yaml) | Same for the state stock user, waiting for its boundary selection. |
| [`sign-in/hf-stock.yaml`](subflows/sign-in/hf-stock.yaml) | Same for the health facility stock user. |
| [`home/state-stock.yaml`](subflows/home/state-stock.yaml) | `sign-in/state-stock.yaml`, then the first `ADMIN_State` option, then Submit, then wait for the home screen (`Stock Balance`). Every state stock flow that works from home starts here. |
| [`home/hf-stock.yaml`](subflows/home/hf-stock.yaml) | The same for the health facility stock user: the first `ADMIN_Health Facility` option (logged), Submit, then the notice this user's Submit raises — Go Back on `No data found!`, or Download on `Data found!` (the facility's records; then Go To Home Screen) — home, and the Manage Stock card (else `Manage Stock card not displayed on home screen for Health Facility User.`). |
| [`home/cdd.yaml`](subflows/home/cdd.yaml) | The same for the CDD user: the first `ADMIN_Health Facility` and the first three `ADMIN_Community` options (logged), Submit, then the notice Submit raises - `No data found!`, `Data found!` (Download), or `Failed to check data in server`, which is retried twice and then passed with Proceed Without Downloading (it failed three times on 2026-10-21; registering a new household does not need the boundary's existing records) - and home. Logs which it was. |
| [`fail.yaml`](subflows/fail.yaml) | Fail the flow with a plain-English `MESSAGE` that reaches the run summary and `report.html` — for checks whose failure should read as a sentence (`BLOCKED - …`, `MRN mismatch: …`). Run it inside a `runFlow: when:` that detects the failure. |
| [`stock/download-stock-data.yaml`](subflows/stock/download-stock-data.yaml) | From home: Download Stock Data → Download (when `Data Found`) → Go To Home Screen. Copies records to the device; changes nothing on the server. |
| [`stock/open-incoming-transactions.yaml`](subflows/stock/open-incoming-transactions.yaml) | From home: Manage Stock card (scrolled to if needed) → Record Stock Receipt → wait for the list. Sets `output.incoming` to `present` or `absent`. |
| [`stock/read-first-transaction.yaml`](subflows/stock/read-first-transaction.yaml) | Log the first incoming transaction's MRN, product, date, sender and status. |
| [`stock/incoming-receipts.js`](subflows/stock/incoming-receipts.js) | Log whether incoming transactions were found and enforce `HCM_STATE_STOCK_INCOMING_RECEIPTS` when it is set. |
| [`stock/accept-receipt/`](subflows/stock/accept-receipt/) | Accepting incoming stock, shared by the state user (Cases 2, 2a, 2b) and the health facility user (Test Cases 3–5): `init-variants.yaml`, `read-balances.yaml` (home Stock Balance), `count-transactions.yaml` / `check-variants.yaml` (a transaction for each variant), `open-transaction.yaml` (a variant's first transaction → its own Select → Stock Receipt Details, product / MRN / sender / quantity checked), `open-accept-confirmation.yaml`, `case2-popup.yaml` / `case2a-cancel.yaml` (the popup, then Cancel), `accept-transaction.yaml` (… → Confirm → banner, list, count, MRN gone), `accept-both.yaml` (variant 1, then 2), `case2b-confirm.yaml` (the state user's: both, then balances), and `variants.js` / `transaction.js` for the book-keeping. A flow renames the cases in its messages through `output.variants.cases`. |
| [`stock/reject-receipt/`](subflows/stock/reject-receipt/) | Rejecting incoming stock (Prompt 15) for the state user, the health facility and the CDD, over `accept-receipt/`'s transaction reading: `init.yaml` (test data first; the flow passes `ROLE` and `PREREQUISITE`), `reject-receipt.yaml` (the specification's `common/reject_stock.yaml` - Test Cases 1-6, home to home), `open-reject.yaml` (tap Reject; a popup or not, and the popup's title, confirming button and reason field), `cancel-reject.yaml` (Test Case 3), `empty-reason.yaml` (Test Case 4, only for a field marked mandatory), `enter-reason.yaml`, `reject-transaction.yaml` (one variant: reason, Confirm), `read-message.yaml` (the `Stock rejected successfully` banner, looked for straight after Confirm), `reject-outcome.yaml` (back to the list, transaction gone, other variant untouched), `count-all.yaml` (every card per variant, scrolling the whole list - the accept flows count only the cards on screen), `final-check.yaml` (Test Case 6), and `reject.js` for the book-keeping, counting, deviations and report. |
| [`stock/view-transactions/`](subflows/stock/view-transactions/) | View Transactions (Prompt 16) for the state user, the health facility and the CDD: `init.yaml` (test data first; the flow passes `ROLE` and `EXPECTED`), `view-transactions.yaml` (the specification's `common/view_transactions.yaml` - Test Cases 1-6, home to home), `open-view-transactions.yaml` (Test Case 1), `read-cards.yaml` (Test Case 2 - every card, keyed by MRN, scrolling the whole list) over `card-field.yaml` (one part of one card, fenced between its MRN tag and the next card's), `open-details.yaml` (Test Case 3 - one card's Select Transaction, the details compared, Back), `view-qr.yaml` (Test Case 4 - closed with Back: the popup's X has no text), and `view-txn.js` for the book-keeping, expected entries, notes and report. |
| [`stock/reports/`](subflows/stock/reports/) | View Reports for either role: `open-view-reports.yaml` (the card, all four reports offered — `report-offered.yaml` each), `view-report.yaml` (the specification's `common/view_report.yaml` — one report: facility, table state, back), `report-table.yaml` (headers, rows logged, each expected entry looked for) and `reports.js` (patterns, findings, the report). |
| [`stock/reconciliation/`](subflows/stock/reconciliation/) | Stock Reconciliation for either role: `reconcile-variant.yaml` (the specification's `common/stock_reconciliation.yaml` — one variant, Cases 1–3, home to home), `open-variant.yaml` (home → warehouse → variant → Stock in hand), `enter-count.yaml`, `enter-comment.yaml`, `submit.yaml`, `case1-equal.yaml`, `differing-count.yaml` (Cases 2 and 3; Case 2 BLOCKED at stock in hand 0), and `recon.js` — the book-keeping, deviations and report. |
| [`stock/hf-receipt/`](subflows/stock/hf-receipt/) | The health facility flow's own steps: `init.yaml` (test data, before the device is touched), one subflow per test case (`tc1-initial-balance`, `tc2-incoming`, `tc3-details` / `tc3-variant`, `tc4-cancel`, `tc6-final-balance`), and `hf-receipt.js` for the balances, messages and the closing report. |
| [`stock/read-stock-balance.yaml`](subflows/stock/read-stock-balance.yaml) | Read one product's home Stock Balance line into `output.stockBalance.value`, or fail with `Unable to read stock balance for <VARIANT>.` Shared by dispatch and return; [`stock-balance.js`](subflows/stock/stock-balance.js) parses. |
| [`stock/open-stock-form.yaml`](subflows/stock/open-stock-form.yaml) | Home → Manage Stock → Record Stock Issued → `TRANSACTION_TYPE` (`Issue` or `Return`) → Facility To (plus the Team Code scan when a CDD is the recipient) → product → Product Details. Form state from [`stock-form.js`](subflows/stock/stock-form.js). |
| [`stock/scan-team-code.yaml`](subflows/stock/scan-team-code.yaml) | The specification's `scan_qr.yaml`. With Facility To `Delivery team`: Team Code → camera permission if asked → wait for a code → it must name `TARGET_CDD` → Submit (retried past the `Code already scanned` banner) → Team Code shows the CDD. Fails as `QR code scan failed: <reason>.` |
| [`stock/enter-quantity.yaml`](subflows/stock/enter-quantity.yaml) | Fenced focus + focus check + type `QUANTITY` into "Quantity sent" or "Quantity returned". |
| [`stock/back-to-home.yaml`](subflows/stock/back-to-home.yaml) | Android Back until the home screen, stopping there. |
| [`stock/dispatch/`](subflows/stock/dispatch/) | Both dispatch flows — the state to a health facility, the health facility to a CDD; the caller names the recipient (`TARGET`, `TEAM_CODE`, `MISSING`, `ROLE`): `dispatch-variant.yaml` (Cases 1–3 for one product, home to home), `init-dispatch.yaml`, `dispatch-balance.yaml` (the shared balance read, checked per phase), `expect-blocked.yaml` (shared by Case 1 and 2 — never confirms), one subflow per case, and `dispatch.js` for the book-keeping. |
| [`stock/return/`](subflows/stock/return/) | Both return flows — the state to National, the health facility to the state: `return-variant.yaml` (start balance must be `EXPECTED_START_BALANCE` → Return form to `DESTINATION` → `RETURN_QUANTITY` → Submit → MRN → final balance must be `EXPECTED_FINAL_BALANCE`; the caller passes `DESTINATION`, `DESTINATION_KEY`, `ROLE`, `PREREQUISITE`), `finish.yaml` (the first product re-checked, summary) and `return.js` for the book-keeping and messages. |
| [`referral/`](subflows/referral/) | Beneficiary Referral: `open-referral.yaml` (card → village), `create-referral.yaml` (the specification's `common/create_referral.yaml` — one referral, in stages `referral-facility`, `referral-details` with `pick-option` / `enter-field`, `referral-reason`, `fill-checklist`, `referral-submit`; a failed stage fails that record only and `back-to-referrals.yaml` backs out), `fill-checklist.yaml` (every mandatory question: first option, or `CHECKLIST_TEXT_ANSWER` for a text question; walked twice for follow-ups), `verify-list.yaml` (searches each child's name), `go-home.yaml` (side menu → Home; Android Back would walk into the old form pages), `sync-referrals.yaml`, and `referral.js` for names, checklist titles, answers and the report. |
| [`registration/`](subflows/registration/) | Registration & Delivery as the CDD (Prompt 11), over `registration.js` (test data, generated names, steps, boundary rows, deviations, the report): `init.yaml` / `consent-init.yaml` / `utd-init.yaml` / `redose-init.yaml` (test data first - Prompts 11 / 12 / 13 / 14); `household-with-children.yaml` (consent Yes, the head, every child, each submitted - Prompts 13 and 14); `start-registration.yaml` (search, the Low Beneficiary IDs fallback, location - every new registration); `open-registration.yaml` (card → village → search screen), `search-and-register.yaml` (Register Beneficiary empty / 2 characters / the search text), `low-id-popup.yaml` (Test Case 1), `download-ids.yaml` (Step 1); `register-household.yaml` (the specification's `common/register_household.yaml`: search and location, then `CONSENT` `Yes` - Steps 2-8 - or `No` - `consent-no.yaml`, ending on `Ready to Submit?`; a Low Beneficiary IDs popup at the start leads to the download first; `CHECK_SHORT` for the 2-character check) over `beneficiary-location.yaml`, `consent.yaml`, `consent-no.yaml` (No, reason field, reason mandatory, `CONSENT_REASON`), `consent-no-submit.yaml` (Prompt 12 Test Cases 1-3), `household-details.yaml` (`BOUNDS` runs `household-bounds.yaml`) / `household-count.yaml`, `member-form.yaml` (head or child: names, `age-entry.yaml` for each age and its bounds, gender, `mobile-number.yaml`), `add-member.yaml` (the specification's `common/add_member.yaml`) and `household-check.yaml`; `start-dose.yaml`, `eligibility-checklist.yaml` (every question `ANSWER`, follow-ups included), `first-dose.yaml` + `insufficient-stock.yaml` (Steps 9-10); `cdd-accept-stock.yaml` / `cdd-check-transaction.yaml` (Step 11, over `stock/accept-receipt/`); `open-household.yaml`, `deliver-dose.yaml` (the specification's `common/deliver_dose.yaml` - Dose, checklist, Record Cycle Dose, then `record-delivery.yaml`: `read-products.yaml` for the products offered and the age-product rule, quantity, Save Delivery, the delivery checks); `redose.yaml` (the specification's `common/redose.yaml` - the card's Redose, product, quantity, Reason, Submit, Redose Completed, no second redose), `dose-and-redose.yaml` (one Prompt 14 test case, with the balance checks) and `redose-final.yaml` (every card's status); `unable-to-deliver.yaml` (the specification's `common/unable_to_deliver.yaml` - the card's Unable To Deliver: reason, Proceed, Submit, status), `utd-final.yaml` (every child's status, balances unchanged) and `cdd-balances.yaml` (both balances into a phase); `balance-after-doses.yaml` (Step 15); `sync-data.yaml` (home, Sync Data until `No Data available for sync`; `Sync Up Failed` - e.g. `Session Expired` - recorded as a failure), the last step of both full flows; `go-home.yaml` (side menu → Home). |
| [`dropdown/select-first-options.yaml`](subflows/dropdown/select-first-options.yaml) | Select the first `COUNT` options of the dropdown labelled `FIELD`, by position, then collapse it and verify every pick held. Handles both the multi-select fields and the single-select search field. Book-keeping lives in [`dropdown.js`](subflows/dropdown/dropdown.js). |

`sign-in/`, `home/`, `dropdown/`, `stock/`, `referral/` and `registration/` files sit one level deeper than
the others, so their own paths start with `../` — `../launch-app.yaml`,
`../sign-in/state-stock.yaml` and so on. `stock/accept-receipt/` sits two
levels deep: `../../fail.yaml`.

Helper scripts (`*.js`) live in `subflows/` next to the subflows that use
them, so `flows/` holds nothing but tests.

Subflows carry their own `appId`/`name` header so Maestro can resolve them, but
they are **not** tests and must never run on their own — `config.yaml` limits the
runnable set to `flows/**` to enforce that. Note that `subflows/` is deliberately
*not* nested inside `flows/`, which is what keeps the recursive glob safe: add a
new subflow and it still cannot be discovered as a test.

## Conventions

**Selectors.** The app is Flutter-rendered and most of its widgets expose no
resource-id, text or content-desc. Elements are therefore addressed by their
nearest visible label (`tapOn: below: "User ID.*"`). Prefer a text anchor; fall
back to a percentage coordinate only when there is genuinely nothing to match on,
and say so in a comment.

**Waits.** Never `assertVisible` straight after an action. Sign-in pulls the
whole project payload down before handing over the UI, so use
`extendedWaitUntil` with a generous timeout and a `label` explaining what is
being waited on. Post-login sync took about 3 minutes on UAT, so the sign-in
subflows allow 5. No fixed sleeps.

**Prefer positive waits.** `extendedWaitUntil: notVisible:` passes immediately if
the thing you are waiting on has not appeared *yet*, which makes it a silent
false pass. A post-login flow that waits for `notVisible: "Sync in progress"`
passes while the sync dialog is still on screen, because the dialog is raised a
moment after the login screen clears. Wait for the screen the action leads to
instead — a `visible:` assertion cannot pass vacuously. Use `notVisible:` only
for something known to be on screen already.

**Typing into Flutter fields.** The screen paints before the form can accept
input, and `inputText` silently drops characters typed into that gap — only on
the first field touched after a screen appears. Type, then assert what landed,
and retype on mismatch; see the `retry` block in `subflows/login.yaml`. Do not
trust an `inputText` that reported success.

**Clearing a field.** A tap drops the cursor wherever it lands - often inside
the text - and `eraseText` deletes only what is before the cursor, so a tap
then `eraseText` leaves the tail behind ("150" became "180" after typing 18,
2026-10-21). Press `Remote Dpad Right` a few times first, which moves the
cursor to the end, then erase (`subflows/registration/age-entry.yaml`). A
field that stays focused keeps its cursor where typing left it.

**No braces inside `${}`.** Maestro ends a `${...}` expression at its first
`}`, so a function body or an object literal inside one is cut short and the
text is used as written. Build such values in a script and read the result
back (`output.reg.elig.summary` in `registration.js`).

**The keyboard: never hide it, fence around it, check focus before typing.**
- `hideKeyboard` is a Back press on Android. If the keyboard is already going
  down, Back reaches the app, and the login screen's Back exits the app. On
  2026-10-19, after an emulator reboot, that happened twice in a row. None of
  the forms here need the keyboard gone: on the Pixel 9 Pro XL every field and
  button sits above it.
- The keyboard is a window of its own, and its keys are in the hierarchy,
  clickable and "below" every field label, so an unfenced
  `tapOn: below: "Password.*"` tapped a key. Fence each field between its
  label and the next row (`above: "Submit"`, `above: Login`).
- Assert `focused: true` on the field before typing into it. When a tap misses,
  focus stays where it was: on 2026-10-19 the password was typed into User ID,
  in clear text, on screen and into the failure screenshots, which then had to
  be deleted.
- The keyboard has its own `Back` element (`input_method_nav_back`); a bare
  `tapOn: "Back"` can hit it. Leave screens with the `back` command.

**Optional UI.** Prompts that appear only under some conditions — such as the
location prompt — are guarded with `runFlow: when: visible:` so their absence is
not a failure.

**Permissions.** `launchApp` grants every runtime permission unless told
otherwise, and the app then skips both its launch-time notification prompt and
its post-sync Allow Permissions screen — a path no field user takes. So
`launch-app.yaml` launches with `permissions: all: unset`, and the sign-in
subflows go through the screen. Android's prompts are matched by their
`com.android.permissioncontroller` resource ids, not their wording, because
the wording names the app ("Allow SMC-MC to …") and changes per tenant build.

**Checkbox state is not readable.** The Allow Permissions checkbox reports
`checked=false` whether or not it is ticked, so a flow cannot ask whether it
is ticked, and tapping it blindly could untick it. `allow-permissions.yaml`
uses the app as the oracle instead: press Continue, and tick the box only if
the app did not move on.

**Dropdowns: select by position, not by name.** `select-first-options.yaml`
reads the option names off the open menu at run time and then taps them by
the names it read, so it never hardcodes boundary data. Read the names
*before* selecting anything: once an option is picked, its chip and the
`N Selected` summary also sit under the field and would be miscounted as menu
rows. While a multi-select menu is open, a picked option appears twice (row
and chip), and that is how the subflow avoids tapping it a second time and
unticking it.

**Fence every read until one element alone can match.** "Nearest" is no
guide: when several elements match, Maestro favours a clickable one (the
nearest thing below a card's `Sender` label came back as its `Select`
button), `rightOf` alone reaches the status-bar icons, and a loose
"text: digits" pattern matches the status-bar clock. Box each read in on
several sides — between a card's own MRN label and the next card's, between
the rows above and below, and under the screen subtitle — as
`open-transaction.yaml` does. Two facts that shape the fences: `below` and
`above` compare **top edges**, so an element on the anchor's own row a pixel
lower still counts as below it; and a plain (non-relative) match with
`index` follows screen order, top to bottom.

**Labels are printed verbatim.** Maestro 2.10 does not resolve `${...}` in a
`label`, or in an `assertVisible`'s description — the console shows the
placeholder. Keep labels plain text. To surface a run-time value, log it with
`console.log` from a script (it lands in the run's `maestro.log`), or fail
with it through `subflows/fail.yaml`.

**Fail through `fail.yaml`, never by throwing from a script.** A thrown
JavaScript error shows in the step log, but the run summary and `report.html`
print it only as `Unknown error`, and a folder run prints no reason at all. A
failed assertion's text reaches both, so `fail.yaml` fails through an instant
`extendedWaitUntil` on the message itself:
`Assertion is false: "<message>" is visible`. Scripts here leave a failure
reason in `output` instead, and the YAML hands it to `fail.yaml`.

**Overriding variables.** On Maestro 2.10 a flow-level `env:` value **beats**
the `-e` value the runner scripts forward from `.env` — it is not a fallback
default. Verified with a probe flow: `env: PROBE: from-flow-default` plus
`-e PROBE=from-cli` resolves to `from-flow-default`. So:

- Never give a flow an `env:` value for anything `.env` supplies. Every flow
  here once carried `env: HCM_APP_ID: org.egov.bauchi`, and every run silently
  tested the Bauchi build whatever `.env` said. The first three login flows
  still passed, because both builds share a login screen; only sign-in failed.
- A flow that needs its own value — fake credentials for a rejection test, say —
  should still use a name that is not in `.env` (e.g. `HCM_BAD_USER_ID`), so
  nobody has to remember which side wins.

**Comments.** Every non-obvious selector or wait in this repo has a comment
explaining *why* it is shaped that way. That context is the difference between a
five-minute fix and a rewrite when the app changes; keep it up.
