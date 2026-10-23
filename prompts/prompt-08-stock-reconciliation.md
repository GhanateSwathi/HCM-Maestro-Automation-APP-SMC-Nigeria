# Prompt 8 — Common Stock Reconciliation (State User and Health Facility)

Given in conversation on 2026-10-19, as written below; recovered unchanged from
that session's transcript on 2026-10-23.

- **Implemented by:** [`state-stock-reconciliation.yaml`](../flows/stock/state-stock-reconciliation.yaml), [`hf-stock-reconciliation.yaml`](../flows/stock/hf-stock-reconciliation.yaml)
- **Test cases:** REC-01–04 in [TEST-CASES.md](../TEST-CASES.md), which also records
  where the flows differ from this text and why.
- **Note:** Given again, unchanged, together with Prompts 9 and 10 on 2026-10-21.

---

```
Maestro Mobile App Automation Prompt 8 – Common Stock Reconciliation (State User and Health Facility)

Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: Verify the stock reconciliation flow for the State User and the Health
Facility, including the rule that a comment is optional when the manual count
equals the stock in hand, and mandatory when it is less or greater.

1. Precondition
- Prompt 1 login must pass for the selected role:
  - State User: AU-SAT-001 (Prompt 1 Test Case 1)
  - Health Facility: AU-HFS-001 (Prompt 1 Test Case 2)
- The facility being reconciled must have stock in hand of at least 1 for each
  variant (expected 5 after Prompt 4 for State, and after Prompt 7 for Health
  Facility).
- Reuse existing subflows through runFlow:
  - Prompt 1 login, permissions, and boundary selection subflows
  - Prompt 3 read_stock_balance.yaml (or an equivalent subflow for reading the
    stock in hand on the reconciliation screen)
- Use credentials from the secure test configuration. Do not embed passwords.

Test data (pass via environment variables):
- ROLE = STATE or HEALTH_FACILITY
- TEST_USER = AU-SAT-001 or AU-HFS-001 (matching ROLE)
- RECON_FACILITY = optional; if not set, select the first available option from
  the facility dropdown and record the selection
- PRODUCT_VARIANT_1 = SPAQ1
- PRODUCT_VARIANT_2 = SPAQ2
- RECON_COMMENT = "Automation test – reconciliation discrepancy"

2. Login and Navigate to Stock Reconciliation
- Run the Prompt 1 login flow for ROLE: login, synchronization, permissions,
  checkbox + Continue, boundary selection, confirm.
- Wait for the home screen to load.
- Tap "Stock Reconciliation".
  [TO BE CONFIRMED BY QA – whether it is a home screen card or an option under
  Manage Stock.]
- Wait for the Stock Reconciliation screen to load using an element-based wait.

3. Facility Selection
- Open the facility dropdown.
- Select RECON_FACILITY if configured; otherwise select the first available option
  dynamically. Do not hardcode facility names.
- Verify the selected facility is displayed.
- If the dropdown is empty, fail with:
  "No facilities available in Stock Reconciliation dropdown for <ROLE>."

4. Read Stock in Hand
- Select PRODUCT_VARIANT (run sections 4–7 once per variant).
  [TO BE CONFIRMED BY QA – whether variants are selected individually or all
  variants are listed on one screen.]
- Read the "Stock in Hand" value with copyTextFrom and parse it with evalScript.
  Store it as SIH.
- If SIH cannot be read or is not numeric, fail with a clear message.
- Log SIH in the report.

Execution order (per variant):
- Run Case 1 → Case 2 → Case 3 in this order. Case 2 reduces the stock in hand by 1,
  and Case 3 increases it by 1 from the new value, so the stock in hand returns to
  its original value at the end of the run.

5. Test Case 1 – Manual count equal to stock in hand (comment optional)
- Enter SIH in the manual count field.
- Leave the comment field empty.
- Verify the comment field is not marked as mandatory.
  [TO BE CONFIRMED BY QA – how mandatory fields are indicated, e.g. an asterisk or
  error text.]
- Tap submit.
- Handle the confirmation popup if one appears and tap Confirm.
- Verify the reconciliation is submitted successfully.
  [TO BE CONFIRMED BY QA – success message or destination screen.]
- Re-read the stock in hand and verify it still equals SIH.
- Capture a screenshot.
- Report: "Reconciliation with matching count submitted without a comment."

6. Test Case 2 – Manual count less than stock in hand (comment mandatory)
Precondition check:
- If SIH is 0, mark Case 2 BLOCKED with:
  "Stock in hand is 0; cannot enter a count lower than stock in hand."

Negative check (without comment):
- Compute LESS_COUNT = SIH − 1 with evalScript.
- Enter LESS_COUNT in the manual count field.
- Leave the comment field empty.
- Verify the comment field becomes mandatory.
- Tap submit.
- Verify submission is blocked: a validation message is shown or the submit
  action is disabled.
  [TO BE CONFIRMED BY QA – exact validation message or disabled behavior.]
- Verify no success message appears.
- Capture a screenshot.

Positive check (with comment):
- Enter RECON_COMMENT in the comment field.
- Tap submit and handle the confirmation popup if one appears.
- Verify the reconciliation is submitted successfully.
- Re-read the stock in hand and verify it equals LESS_COUNT.
  [TO BE CONFIRMED BY QA – confirm that the stock in hand updates to the manual
  count after reconciliation.]
- Store the new value as SIH_AFTER_CASE2.
- Capture a screenshot.

7. Test Case 3 – Manual count greater than stock in hand (comment mandatory)
Negative check (without comment):
- Compute GREATER_COUNT = SIH_AFTER_CASE2 + 1 with evalScript.
- Enter GREATER_COUNT in the manual count field.
- Leave the comment field empty.
- Verify the comment field becomes mandatory.
- Tap submit.
- Verify submission is blocked.
- Verify no success message appears.
- Capture a screenshot.

Positive check (with comment):
- Enter RECON_COMMENT in the comment field.
- Tap submit and handle the confirmation popup if one appears.
- Verify the reconciliation is submitted successfully.
- Re-read the stock in hand and verify it equals GREATER_COUNT (which equals the
  original SIH).
- Capture a screenshot.

8. Element Identification and Synchronization
- Prefer resource IDs, accessibility IDs, accessibility labels, and visible text.
- Do not use hardcoded coordinates unless no reliable locator exists.
- Do not hardcode stock in hand or count values; read and compute them at runtime.
- Clear the manual count and comment fields before each new entry.
- Use element-based waits (extendedWaitUntil) instead of fixed delays.
- Wait for any synchronization after submission before re-reading stock in hand.
- On failure, capture a screenshot and report a meaningful error. Do not silently
  skip steps.

9. Validation Checklist
- Stock Reconciliation opens for both State User and Health Facility.
- Facility dropdown options are identified and selected dynamically.
- Stock in hand is read correctly for each variant.
- Equal count: comment optional, submission succeeds, stock in hand unchanged.
- Lower count: comment mandatory, blocked without comment, succeeds with comment.
- Higher count: comment mandatory, blocked without comment, succeeds with comment.
- Stock in hand updates correctly after each reconciliation.

10. Execution Report
For each role and each product variant, report:
- User role and account.
- Selected facility.
- Product variant.
- Initial stock in hand (SIH).
- Case 1 result (equal count, no comment).
- Case 2 results (count used, blocked without comment, submitted with comment,
  stock in hand after).
- Case 3 results (count used, blocked without comment, submitted with comment,
  stock in hand after).
- Final stock in hand versus the original SIH.
- Failed steps, error messages, screenshots, and BLOCKED cases with reasons.

Flow structure recommendation:
- common/stock_reconciliation.yaml – reusable subflow taking ROLE, TEST_USER,
  RECON_FACILITY, and VARIANT: navigate → select facility → read SIH → Case 1
  → Case 2 → Case 3
- state_user/state_reconciliation.yaml – calls the common subflow with
  ROLE=STATE, TEST_USER=AU-SAT-001, for SPAQ1 and SPAQ2
- health_facility/hf_reconciliation.yaml – calls the common subflow with
  ROLE=HEALTH_FACILITY, TEST_USER=AU-HFS-001, for SPAQ1 and SPAQ2
```
