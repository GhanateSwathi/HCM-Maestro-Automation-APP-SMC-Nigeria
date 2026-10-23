# Prompt 3 — State User: Dispatch Stock to Health Facility

Given in conversation on 2026-10-19, as written below; recovered unchanged from
that session's transcript on 2026-10-23.

- **Implemented by:** [`state-stock-dispatch.yaml`](../flows/stock/state-stock-dispatch.yaml)
- **Test cases:** DSP-01–04 in [TEST-CASES.md](../TEST-CASES.md), which also records
  where the flows differ from this text and why.

---

```
Maestro Mobile App Automation Prompt 3 – State User: Dispatch Stock to Health Facility

Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: Verify that the State User can dispatch stock to a Health Facility with
correct quantity validations, and that the stock balance is updated correctly
after dispatch.

1. Precondition
- Prompt 1 State User flow (AU-SAT-001) must pass: login, synchronization,
  permissions, checkbox + Continue, State boundary selection, home screen loaded.
- Reuse the Prompt 1 subflows through runFlow. Do not duplicate those steps.
- Use credentials from the secure test configuration. Do not embed passwords.

Test data (pass via environment variables):
- PRODUCT_VARIANT = SPAQ1 (repeat the flow with SPAQ2 if both variants must be tested)
- REMAINING_BALANCE = 10 (the balance that must remain after a successful dispatch)
- TARGET_HEALTH_FACILITY = optional; if not set, select the first available Health
  Facility dynamically and record the selection.

2. Navigate to the Dispatch Screen
- On the home screen, verify the "Manage Stock" card is visible.
- Open the stock dispatch/issue option under Manage Stock.
  [TO BE CONFIRMED BY QA – exact option label and navigation path. Identify from
  the UI hierarchy; do not assume.]
- Wait for the dispatch screen to load using an element-based wait.
- Select the destination Health Facility:
  - Use TARGET_HEALTH_FACILITY if configured.
  - Otherwise, open the Health Facility dropdown and select the first available
    option dynamically. Do not hardcode facility names.
  - Verify the selected facility is displayed.
- Select the product variant PRODUCT_VARIANT.

3. Read the Current Stock Balance
- Locate the stock balance element for the selected product variant.
- Capture its value with copyTextFrom.
- Extract the numeric value with evalScript (for example, strip non-digit
  characters and parse as an integer), and store it as CURRENT_BALANCE.
- If the balance cannot be read or is not numeric, fail with:
  "Unable to read stock balance for <PRODUCT_VARIANT>."
- Log CURRENT_BALANCE in the report.

Execution order:
- Run Case 1 and Case 2 (validation cases, no stock movement) before Case 3
  (actual dispatch), so the balance stays unchanged for the validation checks.

4. Test Case 1 – Dispatch quantity 0 is not allowed
- Enter 0 in the dispatch quantity field.
- Attempt to proceed (tap the dispatch/submit action).
- Verify that dispatch is blocked:
  - A validation error message is displayed, OR the submit action is disabled.
  [TO BE CONFIRMED BY QA – exact error message text or disabled-state behavior.]
- Verify no confirmation popup or success message appears.
- Re-read the stock balance and verify it still equals CURRENT_BALANCE.
- Clear the quantity field.
- Capture a screenshot.
- Report: "Dispatch with quantity 0 blocked as expected."

5. Test Case 2 – Dispatch quantity greater than stock balance is not allowed
- Compute OVER_QUANTITY = CURRENT_BALANCE + 1 using evalScript.
- Enter OVER_QUANTITY in the dispatch quantity field.
- Attempt to proceed.
- Verify that dispatch is blocked:
  - A validation error message is displayed, OR the submit action is disabled.
  [TO BE CONFIRMED BY QA – exact error message text or disabled-state behavior.]
- Verify no confirmation popup or success message appears.
- Re-read the stock balance and verify it still equals CURRENT_BALANCE.
- Clear the quantity field.
- Capture a screenshot.
- Report: "Dispatch above stock balance blocked as expected."

6. Test Case 3 – Dispatch stock leaving a balance of 10
Precondition check:
- CURRENT_BALANCE must be greater than REMAINING_BALANCE (at least 11).
- If CURRENT_BALANCE is 10 or less, mark Case 3 as BLOCKED with:
  "Insufficient stock: balance <CURRENT_BALANCE>; cannot dispatch while leaving 10."

Steps:
- Compute DISPATCH_QUANTITY = CURRENT_BALANCE − REMAINING_BALANCE using evalScript.
  Example: balance 100 → dispatch 90 → expected remaining balance 10.
- Enter DISPATCH_QUANTITY in the dispatch quantity field.
- Tap the dispatch/submit action.
- Handle the confirmation popup if one appears and tap Confirm.
  [TO BE CONFIRMED BY QA – whether a popup appears and its title/button labels.]
- Wait for the success result using an element-based wait.
  [TO BE CONFIRMED BY QA – success message or destination screen.]
- Navigate back to the stock balance view for PRODUCT_VARIANT if needed.
- Re-read the stock balance and verify it equals REMAINING_BALANCE (10).
- If the balance does not match, fail with:
  "Balance mismatch: expected 10, found <actual balance> after dispatching
  <DISPATCH_QUANTITY> from <CURRENT_BALANCE>."
- Capture a screenshot.
- Report: CURRENT_BALANCE, DISPATCH_QUANTITY, selected Health Facility, and
  the final balance.

7. Element Identification and Synchronization
- Prefer resource IDs, accessibility IDs, accessibility labels, and visible text.
- Do not use hardcoded coordinates unless no reliable locator exists.
- Do not hardcode stock balance or quantity values; read and compute at runtime.
- Use element-based waits (extendedWaitUntil) instead of fixed delays.
- Wait for any sync after dispatch to complete before re-reading the balance.
- On failure, capture a screenshot and report a meaningful error. Do not silently
  skip steps.

8. Validation Checklist
- Dispatch screen opens from Manage Stock.
- Health Facility and product variant are selected correctly.
- Current stock balance is read and parsed correctly.
- Quantity 0 is rejected, and the balance is unchanged.
- Quantity above the balance is rejected, and the balance is unchanged.
- Valid dispatch succeeds, and the remaining balance equals 10.

9. Execution Report
For each product variant tested, report:
- User role and account (State User – AU-SAT-001).
- Selected Health Facility.
- Product variant.
- Initial stock balance (CURRENT_BALANCE).
- Case 1 result (quantity 0).
- Case 2 result (quantity = balance + 1, with the value used).
- Case 3 result (DISPATCH_QUANTITY, expected and actual final balance), or
  BLOCKED with reason.
- Failed steps, error messages, and screenshots.

Important Instructions
- Generate valid Maestro-compatible flows using supported commands only
  (copyTextFrom, evalScript, inputText, runFlow with conditions, assertVisible,
  extendedWaitUntil, takeScreenshot).
- Do not assume element identifiers; inspect the UI hierarchy or request
  screenshots of the dispatch screen, quantity field, balance display, error
  messages, and success state.

Flow structure recommendation:
- read_stock_balance.yaml – reusable: capture and parse the balance for a VARIANT
- dispatch_case1_zero.yaml
- dispatch_case2_over_balance.yaml
- dispatch_case3_valid.yaml
- dispatch_main.yaml – login → navigate → read balance → Case 1 → Case 2 → Case 3
```
