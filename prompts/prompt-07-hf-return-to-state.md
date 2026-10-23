# Prompt 7 — Health Facility: Return Stock to State

Given in conversation on 2026-10-19, as written below; recovered unchanged from
that session's transcript on 2026-10-23.

- **Implemented by:** [`hf-stock-return-state.yaml`](../flows/stock/hf-stock-return-state.yaml)
- **Test cases:** HRT-01–03 in [TEST-CASES.md](../TEST-CASES.md), which also records
  where the flows differ from this text and why.

---

```
Maestro Mobile App Automation Prompt 7 – Health Facility: Return Stock to State

Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: Verify that the Health Facility user can return stock to the State for
each product variant, and that the stock balance is updated correctly after the
return.

1. Precondition
- Prompt 1 Test Case 2 (Health Facility login, AU-HFS-001) must pass.
- Prompt 6 Case 3 must have passed for both SPAQ1 and SPAQ2, leaving a stock
  balance of 10 for each variant at the Health Facility.
- Reuse existing subflows through runFlow:
  - Prompt 1 login and Health Facility selection subflows
  - Prompt 3 read_stock_balance.yaml
  - Prompt 4 return_variant.yaml (parameterized for destination and variant)
- Use credentials from the secure test configuration. Do not embed passwords.

Test data (pass via environment variables):
- TEST_USER = AU-HFS-001
- PRODUCT_VARIANT_1 = SPAQ1
- PRODUCT_VARIANT_2 = SPAQ2
- RETURN_QUANTITY = 5
- EXPECTED_START_BALANCE = 10
- EXPECTED_FINAL_BALANCE = 5
- RETURN_DESTINATION = the State that dispatched stock to this Health Facility
  in Prompt 3 (configure the exact State name as test data)

2. Login and Navigate to the Return Stock Screen
- Run the Prompt 1 Health Facility flow: login as AU-HFS-001, wait for
  synchronization, handle permissions, checkbox + Continue, select the Health
  Facility boundary, confirm.
- Wait for the home screen and verify the "Manage Stock" card is visible.
- Open the return stock option under Manage Stock.
  [TO BE CONFIRMED BY QA – exact option label and navigation path.]
- Wait for the return screen to load using an element-based wait.
- Select or verify the return destination is RETURN_DESTINATION (the State):
  - If a destination dropdown exists, select RETURN_DESTINATION.
  - If the destination is fixed or auto-filled, verify it displays the State.
  - If the State is not available, fail with:
    "Return destination <RETURN_DESTINATION> not available."
- If the return flow requires a QR code scan, run scan_qr.yaml from Prompt 6
  with the appropriate QR image.
  [TO BE CONFIRMED BY QA – whether a QR scan is required for returns.]

3. Test Case 1 – Return 5 units of SPAQ1 to State
- Select PRODUCT_VARIANT_1 (SPAQ1).
- Read the current balance with read_stock_balance.yaml and store it as
  START_BALANCE_SPAQ1.
- Verify START_BALANCE_SPAQ1 equals EXPECTED_START_BALANCE (10).
  If not, mark this case BLOCKED with:
  "Precondition not met: SPAQ1 balance is <START_BALANCE_SPAQ1>, expected 10.
  Run Prompt 6 first."
- Enter RETURN_QUANTITY (5) and tap the return/submit action.
- Handle the confirmation popup if one appears and tap Confirm.
  [TO BE CONFIRMED BY QA – popup and success message details.]
- Wait for the success result and any synchronization.
- Re-read the balance and verify it equals EXPECTED_FINAL_BALANCE (5).
- If it does not match, fail with:
  "SPAQ1 balance mismatch: expected 5, found <actual> after returning 5 from 10."
- Capture any MRN/reference number shown after the return (for the State User's
  acceptance of the returned stock).
- Capture a screenshot.

4. Test Case 2 – Return 5 units of SPAQ2 to State
- Repeat the Test Case 1 steps for PRODUCT_VARIANT_2 (SPAQ2).
- Verify the SPAQ2 starting balance is 10 and the final balance is 5.
- After the SPAQ2 return, re-check that the SPAQ1 balance is still 5.
- Capture a screenshot.

Error handling:
- Report each variant's result separately.
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
- Return destination is the correct State.
- Each variant's starting balance is 10.
- Return of 5 units succeeds for SPAQ1 and SPAQ2.
- Final balance is 5 for each variant.
- Returning one variant does not change the other variant's balance.

7. Execution Report
For each product variant, report:
- User role and account (Health Facility – AU-HFS-001).
- Return destination (State name).
- Product variant.
- Starting balance (expected 10, actual).
- Quantity returned (5).
- Final balance (expected 5, actual).
- MRN/reference captured after the return.
- Result: passed / failed / BLOCKED, with reason.
- Failed steps, error messages, and screenshots.

Flow structure recommendation:
- hf_return_state.yaml – login (HF) → navigate to return screen → verify
  destination → return_variant.yaml with SPAQ1 → return_variant.yaml with SPAQ2
  → cross-check SPAQ1 balance
- Reuse return_variant.yaml from Prompt 4 by passing RETURN_DESTINATION as a
  parameter, so the same subflow serves both State → National and HF → State.
```
