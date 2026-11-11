# DB audit - test cases (SMC Nigeria)

Is each CDD action stored in the app's local DB, field by field? One record per case: do the action in the app, then read that record from the app's own database through its **DB** card ([README.md](README.md)). The ten cases are the Kaduna AZM audit's (HCM-Maestro-Beneficiary-ID-Fix, `db-audit/RESULTS.md`, 2026-11-10/11), ported to this app. Field by field, the plan and the results are in [CDD-field-capture.xlsx](CDD-field-capture.xlsx).

**Status: NOT RUN on this app.** First check that the build has a DB card ([README.md](README.md), "Where we left off").

## How a case runs

- **Flows** do the registrations and consent No. **By hand** (in the app, as a CDD would): the checklist, delivery, referral, Unable To Deliver, redose and edit. The Kaduna run did the same.
- **Checks** run with `db_query.py --check <label>` ([checks.json](checks.json)), naming the records by the first names the flows typed. Each saves its SQL and answer in `artifacts/db-audit/queries/`.
- **Names.** One tag per session, `$t = Get-Date -Format ddHHmm`; head `QAID-DB<case>-H-$t`, child `QAID-DB<case>-C1-$t`, last name `ID_LAST_NAME` (`Test`). The tag keeps each search to one household: names read "--" on this build's cards, so a household is found as the only card listed.
- **Order:** schema, 1, 2, 3, 4, 5, 6, 9, 7, 10, 8, then Sync. Case 7 needs Case 9's delivery a few minutes old (the redose window); Case 10 adds its child to household 9; Case 8 edits household 1.
- **Irreversible.** Every case writes records that reach mhbase UAT at the next sync (Auto Sync or Sync Data). Confirm before running.

```powershell
$t = Get-Date -Format ddHHmm
$run = { param($flow, $name, [string[]]$set) .\scripts\run.ps1 -Flow "db-audit\flows\$flow.yaml" -Set $set -RunDir "artifacts\db-audit\runs\$t-$name" }
$q = { param($check, [string[]]$set) python -I db-audit\scripts\db_query.py --check $check --set @set }
```

## Schema (before Case 1)

```powershell
& $q tables; & $q columns; & $q counts
```

Expected: the tables the Kaduna build had (household, address, individual, name, identifier, household_member, project_beneficiary, task, task_resource, referral, h_f_referral, side_effect, service). A table or column missing here changes the checks that read it: fix [checks.json](checks.json) first.

## Case 1 - registration, then checklist -> referral (sick)

1. `& $run register-household-child c1 "NAME=QAID-DB1-H-$t","CHILD=QAID-DB1-C1-$t"` - consent Yes, 5 members, head 30 y Female, child 24 months Female (`ID_*` keys).
2. `& $q head "HEAD=QAID-DB1-H-$t"`; `& $q household "HEAD=QAID-DB1-H-$t"`; `& $q child "CHILD=QAID-DB1-C1-$t"`; `& $q counts`.
3. By hand, on the child's card: **Dose** -> checklist: sick **Yes**, fever No, SPAQ first time No, side effect No, SP or CTX No -> Submit -> the referral popup -> Refer Beneficiary: the first health facility (or `ELIG_REFERRAL_FACILITY`) -> Submit.
4. `& $q referral "CHILD=QAID-DB1-C1-$t"`; `& $q tasks "CHILD=QAID-DB1-C1-$t"`; `& $q counts`.

**Expected:** every field entered is in the DB:
- **Location:** village and lat/long, in household and address.
- **Consent:** `caregiverConsent`.
- **Household:** member count, and the registration date in project_beneficiary.
- **People:** each person's name, date of birth, gender and pool ID (identifier, = the card's ID), and the head flag.
- **Checklist:** the answers and the referral (facility, child, household, reason) in one h_f_referral row.

No Height (the SMC form has none). **Kaduna:** all captured. The referral was stored in h_f_referral, with the referral table empty and no task; its reason was **SICK**.

## Case 2 - checklist all No -> successful delivery

1. `& $run register-household-child c2 "NAME=QAID-DB2-H-$t","CHILD=QAID-DB2-C1-$t"`
2. By hand: Dose -> checklist all **No** (first time No -> side effect No) -> To Administer -> Record Round Dose -> Delivery Details (the product and quantity as offered, comment **Delivery Successful**) -> Submit.
3. `& $q tasks "CHILD=QAID-DB2-C1-$t"`

**Expected:** one task with status ADMINISTRATION_SUCCESS, holding the answers, the delivery times, the comment, and the child and household. One task_resource holds the product, quantity, delivered flag and comment. **Kaduna:** `task_resource.delivery_comment` was **null**; the comment was only in `task.additional_fields.deliveryComment`.

## Case 3 - checklist -> ineligible (SP or CTX)

1. `& $run register-household-child c3 "NAME=QAID-DB3-H-$t","CHILD=QAID-DB3-C1-$t"`
2. By hand: Dose -> checklist: SP or CTX **Yes**, the others No -> Submit -> the ineligible popup -> confirm. The card should read Ineligible.
3. `& $q tasks "CHILD=QAID-DB3-C1-$t"`

**Expected:** one task with status INELIGIBLE, holding the answers; no task_resource. **Kaduna:** the ineligible task stored the answers under other keys (`ec1` rather than `ec1Value`) and dates as text. Compare the keys with Case 2's.

## Case 4 - checklist -> referral (fever)

1. `& $run register-household-child c4 "NAME=QAID-DB4-H-$t","CHILD=QAID-DB4-C1-$t"`
2. By hand: Dose -> checklist: fever **Yes**, the others No -> referral -> Submit.
3. `& $q referral "CHILD=QAID-DB4-C1-$t"`

**Expected:** an h_f_referral row whose reason is **fever**. **Adapted:** Kaduna's Case 4 repeated Case 2's SMC and polio dates, but the SMC checklist has no dated questions. This case instead tests Kaduna's open point that every referral reason was stored as SICK.

## Case 5 - caregiver consent No

1. `& $run consent-no c5 "NAME=QAID-DB5-H-$t"` - reason `CONSENT_REASON` from `.env`.
2. `& $q consent-no "HEAD=QAID-DB5-H-$t"`

**Expected:** the household and its address, with `caregiverConsent` false and the reason. There should be no household_member, individual, name or project_beneficiary row. The search text is not stored. **Kaduna:** as expected, but the household stored `member_count` 1 and `isHeadOfFamily` "true" for nobody.

## Case 6 - Unable to Deliver

1. `& $run register-household-child c6 "NAME=QAID-DB6-H-$t","CHILD=QAID-DB6-C1-$t"`
2. By hand, on the child's card: **Unable To Deliver** -> a reason (Beneficiary absent if listed, else the first) -> comment `QA test - absent` -> Proceed -> Submit.
3. `& $q tasks "CHILD=QAID-DB6-C1-$t"`

**Expected:** a task whose status is the reason, with the comment and an address row for its location; no task_resource. **Kaduna:** the reason was kept only as the status (BENEFICIARY_ABSENT), and actual start/end were null.

## Case 9 - a hidden answer, then delivery

1. `& $run register-household-child c9 "NAME=QAID-DB9-H-$t","CHILD=QAID-DB9-C1-$t"`
2. By hand: Dose -> checklist:
   - Sick No, fever No.
   - SPAQ first time **No**; the side-effect question appears; answer it **Yes**.
   - Change first time to **Yes**; the side-effect question disappears.
   - SP or CTX No.
   - Submit, then To Administer -> Record Round Dose -> Delivery Successful -> Submit.
3. `& $q tasks "CHILD=QAID-DB9-C1-$t"`

**Expected:** delivery, not referral: the hidden Yes is not acted on. The task stores no side-effect answer, or stores it as not shown; check which. A referral popup at step 2 is a FAIL. **Adapted from Kaduna's** SMC Yes (with a date) -> No, where the date was correctly dropped. That run also had `task_resource.delivery_comment` null.

## Case 7 - redose

Within minutes of Case 9's delivery: on Kaduna, Redose was greyed out for a delivery a day old.

1. `& $run open-household c7 "NAME=QAID-DB9-H-$t"`
2. By hand, on the child's card: **Redose** -> date and product as prefilled -> reason **Others** -> comment `QA test` -> Submit.
3. `& $q tasks "CHILD=QAID-DB9-C1-$t"`

**Expected:** a new task for the redose, with the date, reason, comment and a task_resource; the delivery task is unchanged. The card should read Redose Completed. **Kaduna:** the redose task had status **VISITED** (taskType REDOSE), and its task_resource.delivery_comment was "REDOSE".

## Case 10 - abandoned checklist

1. `& $run add-child c10 "NAME=QAID-DB9-H-$t","CHILD=QAID-DB10-C1-$t","AGE_MONTHS=36"` - its own age, as members are told apart by age on this build.
2. By hand, on the new child's card: Dose -> checklist sick No, fever No -> the app's **Back**.
3. `& $q abandoned "CHILD=QAID-DB10-C1-$t"`

**Expected:** no task, h_f_referral, referral or service row for the child (project_beneficiary: 1, from Add Members); the card still offers Dose. **Kaduna:** correctly not saved, and Back gave no "discard changes?" warning.

## Case 8 - revisit and edit household 1

1. `& $q head-edit "HEAD=QAID-DB1-H-$t"` (before).
2. `& $run open-household c8 "NAME=QAID-DB1-H-$t"` - the overview should show what Case 1 entered.
3. By hand: **Edit Individual** on the head -> the values come back -> mobile number: a test number the user gives, never an invented one (`HEAD_MOBILE` - this app wants 11 digits) -> Next -> Submit.
4. `& $q head-edit "HEAD=QAID-DB1-H-$t"` (after).

**Expected:**
- The same individual row is updated: the mobile number is stored, and no new individual, name or identifier is made.
- `client_modified_time` moves.

**Kaduna:**
- `row_version` and `audit_modified_time` did not change.
- The edit added an `identifiers` key.
- The head's edit form was titled "Child's Details".
- The mobile number had to be 10 digits.

## After the cases

- `.\scripts\run.ps1 -Flow db-audit\flows\sync.yaml -RunDir artifacts\db-audit\runs\$t-sync` - sends every record to mhbase UAT (irreversible).
- Put each field's result in `OBS` in [scripts/build_field_sheet.py](scripts/build_field_sheet.py), the case summaries in `CASE_INFO` and the answers to the Kaduna findings in `FINDINGS`. Then run `python db-audit\scripts\build_field_sheet.py`.

## Results

| Case | Date | Device | Result | Notes |
| --- | --- | --- | --- | --- |
| Schema | - | - | NOT RUN | |
| 1 | - | - | NOT RUN | |
| 2 | - | - | NOT RUN | |
| 3 | - | - | NOT RUN | |
| 4 | - | - | NOT RUN | |
| 5 | - | - | NOT RUN | |
| 6 | - | - | NOT RUN | |
| 9 | - | - | NOT RUN | |
| 7 | - | - | NOT RUN | |
| 10 | - | - | NOT RUN | |
| 8 | - | - | NOT RUN | |
