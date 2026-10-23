# Prompt 4 — State User: Return Stock to National

Given in conversation on 2026-10-19, as written below; recovered unchanged from
that session's transcript on 2026-10-23.

- **Implemented by:** [`state-stock-return.yaml`](../flows/stock/state-stock-return.yaml)
- **Test cases:** RTN-01–03 in [TEST-CASES.md](../TEST-CASES.md), which also records
  where the flows differ from this text and why.

---

```
Maestro Mobile App Automation Prompt 4 – State User: Return Stock to National

Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: Verify that the State User can return stock to National for each
product variant, and that the stock balance is updated correctly after the return.

1. Precondition
- Prompt 1 State User flow (AU-SAT-001) must pass: login, synchronization,
  permissions, checkbox + Continue, State boundary selection, home screen loaded.
- Prompt 3 Case 3 must have passed for both SPAQ1 and SPAQ2, leaving a stock
  balance of 10 for each variant.
- Reuse existing subflows (Prompt 1 login, Prompt 3 read_stock_balance.yaml)
  through runFlow. Do not duplicate those steps.
- Use credentials from the secure test configuration. Do not embed passwords.

Test data (pass via environment variables):
- PRODUCT_VARIANT_1 = SPAQ1
- PRODUCT_VARIANT_2 = SPAQ2
- RETURN_QUANTITY = 5
- EXPECTED_START_BALANCE = 10
- EXPECTED_FINAL_BALANCE = 5
- RETURN_DESTINATION = National

2. Navigate to the Return Stock Screen
- On the home screen, verify the "Manage Stock" card is visible.
- Open the return stock option under Manage Stock.
  [TO BE CONFIRMED BY QA – exact option label and navigation path. Identify from
  the UI hierarchy; do not assume.]
- Wait for the return screen to load using an element-based wait.
- Select or verify the return destination is National:
  - If a destination dropdown exists, select RETURN_DESTINATION.
  - If the destination is fixed or auto-filled, verify it displays National.
  - If National is not available, fail with:
    "Return destination National not available."

3. Test Case 1 – Return 5 units of SPAQ1 to National
Steps:
- Select PRODUCT_VARIANT_1 (SPAQ1).
- Read the current stock balance using read_stock_balance.yaml and store it as
  START_BALANCE_SPAQ1.
- Verify START_BALANCE_SPAQ1 equals EXPECTED_START_BALANCE (10).
  If not, mark this case as BLOCKED with:
  "Precondition not met: SPAQ1 balance is <START_BALANCE_SPAQ1>, expected 10.
  Run Prompt 3 first."
- Enter RETURN_QUANTITY (5) in the return quantity field.
- Tap the return/submit action.
- Handle the confirmation popup if one appears and tap Confirm.
  [TO BE CONFIRMED BY QA – whether a popup appears and its title/button labels.]
- Wait for the success result using an element-based wait.
  [TO BE CONFIRMED BY QA – success message or destination screen.]
- Wait for any synchronization to complete.
- Navigate back to the stock balance view for SPAQ1 if needed.
- Re-read the stock balance and verify it equals EXPECTED_FINAL_BALANCE (5).
- If it does not match, fail with:
  "SPAQ1 balance mismatch: expected 5, found <actual> after returning 5 from 10."
- Capture a screenshot.

4. Test Case 2 – Return 5 units of SPAQ2 to National
- Repeat the Test Case 1 steps for PRODUCT_VARIANT_2 (SPAQ2).
- Verify the SPAQ2 starting balance is 10 and the final balance is 5.
- After the SPAQ2 return, re-check that the SPAQ1 balance is still 5, so the
  second return did not affect the first variant.
- Capture a screenshot.

Error handling:
- If the SPAQ1 return fails, report it clearly and still attempt SPAQ2 only if
  SPAQ2 is independent in the UI; mark each variant's result separately.
- If one variant succeeds and the other fails, report a partial return:
  "Partial return: SPAQ1 <result>, SPAQ2 <result> – <error>."
- Do not submit a return for a variant whose starting balance is not 10.

5. Element Identification and Synchronization
- Prefer resource IDs, accessibility IDs, accessibility labels, and visible text.
- Do not use hardcoded coordinates unless no reliable locator exists.
- Read balances at runtime; do not assume them.
- Use element-based waits (extendedWaitUntil) instead of fixed delays.
- On failure, capture a screenshot and report a meaningful error. Do not silently
  skip steps.

6. Validation Checklist
- Return stock screen opens from Manage Stock.
- Return destination is National.
- Each variant's starting balance is 10.
- Return of 5 units succeeds for SPAQ1 and SPAQ2.
- Final balance is 5 for each variant.
- Returning one variant does not change the other variant's balance.

7. Execution Report
For each product variant, report:
- User role and account (State User – AU-SAT-001).
- Return destination (National).
- Product variant.
- Starting balance (expected 10, actual).
- Quantity returned (5).
- Final balance (expected 5, actual).
- Result: passed / failed / BLOCKED, with reason.
- Failed steps, error messages, and screenshots.

Important Instructions
- Generate valid Maestro-compatible flows using supported commands only.
- Do not assume element identifiers; inspect the UI hierarchy or request
  screenshots of the return screen, destination field, quantity field, balance
  display, confirmation popup, and success state.

Flow structure recommendation:
- return_variant.yaml – reusable subflow taking VARIANT: select variant → read
  balance → verify 10 → enter 5 → submit → confirm → verify balance 5
- return_main.yaml – login → navigate to return screen → return_variant.yaml
  with SPAQ1 → return_variant.yaml with SPAQ2 → cross-check SPAQ1 balance
```
