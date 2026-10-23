# Prompt 5 — Health Facility: Accept Incoming Stock

Given in conversation on 2026-10-19, as written below; recovered unchanged from
that session's transcript on 2026-10-23.

- **Implemented by:** [`hf-stock-accept-receipt.yaml`](../flows/stock/hf-stock-accept-receipt.yaml)
- **Test cases:** HFR-01–06 in [TEST-CASES.md](../TEST-CASES.md), which also records
  where the flows differ from this text and why.

---

```
Maestro Mobile App Automation Prompt 5 – Health Facility: Accept Incoming Stock

Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: Log in as the Health Facility user, verify the initial stock balance
is zero, accept the incoming stock dispatched by the State User for SPAQ1 and
SPAQ2, and verify the updated stock balances.

1. Precondition
- Prompt 3 (State User dispatch) must have passed for SPAQ1 and SPAQ2, dispatching
  stock to the same Health Facility that AU-HFS-001 is assigned to.
- Record the dispatch quantities from the Prompt 3 report and pass them as test data.
- Prompt 1 Test Case 2 (Health Facility login) must pass: login, synchronization,
  permissions, checkbox + Continue, ADMIN_Health Facility selection.
- Reuse existing subflows through runFlow:
  - Prompt 1 login and Health Facility selection subflows
  - Prompt 2 common_open_stock_receipt_details.yaml and accept_variant.yaml
  - Prompt 3 read_stock_balance.yaml
- Use credentials from the secure test configuration. Do not embed passwords.

Test data (pass via environment variables):
- TEST_USER = AU-HFS-001
- PRODUCT_VARIANT_1 = SPAQ1
- PRODUCT_VARIANT_2 = SPAQ2
- EXPECTED_INITIAL_BALANCE = 0
- DISPATCHED_QTY_SPAQ1 = <value from Prompt 3 report>
- DISPATCHED_QTY_SPAQ2 = <value from Prompt 3 report>

2. Login and Navigate to Home Screen
- Run the Prompt 1 Health Facility flow: login as AU-HFS-001, wait for
  synchronization, handle permission prompts, select checkbox, Continue.
- Select the Health Facility boundary:
  - It must be the same Health Facility that received the dispatch in Prompt 3.
  - If the Prompt 3 facility is configured as test data, select that facility;
    otherwise select the first available option and record it.
- Confirm the boundary selection if a confirmation action exists.
- Wait for the home screen to load using an element-based wait.
- Verify the "Manage Stock" card is visible.

3. Test Case 1 – Verify initial stock balance is zero
- Navigate to the stock balance view.
  [TO BE CONFIRMED BY QA – where the Health Facility user views stock balance.]
- For SPAQ1 and SPAQ2, read the balance using read_stock_balance.yaml.
- Verify each balance equals EXPECTED_INITIAL_BALANCE (0).
  - If the variant is not listed at all, treat that as a balance of 0 only if the
    app shows no record for zero stock (confirm this behavior with QA), and report
    it as "No stock record; treated as 0."
- If a balance is not 0, mark the remaining cases BLOCKED with:
  "Precondition not met: <variant> initial balance is <actual>, expected 0."
- Capture a screenshot.

4. Test Case 2 – Check incoming transactions
- From Manage Stock, open "Record Stock Receipt".
- Wait for the transaction list to finish loading.
- Verify at least one incoming transaction with an MRN number is present.
  - If none is present, report:
    "No incoming transactions for Health Facility; State dispatch not received."
    Mark the remaining cases as BLOCKED.
- Capture the MRN of the first incoming transaction using copyTextFrom.
- Capture a screenshot.

5. Test Case 3 – Open Stock Receipt Details and verify contents
- Tap "Select" on the transaction with the captured MRN (use a relative locator
  tied to that MRN row).
- Wait for the Stock Receipt Details screen.
- Verify the displayed MRN matches the captured MRN.
- Verify both SPAQ1 and SPAQ2 records are displayed.
- For each variant, capture the received quantity shown on the details screen
  (copyTextFrom + evalScript to parse the number). Store these as
  RECEIVED_QTY_SPAQ1 and RECEIVED_QTY_SPAQ2.
- Verify RECEIVED_QTY_SPAQ1 equals DISPATCHED_QTY_SPAQ1, and RECEIVED_QTY_SPAQ2
  equals DISPATCHED_QTY_SPAQ2.
  If they do not match, fail with:
  "Quantity mismatch for <variant>: dispatched <X>, shown as received <Y>."

6. Test Case 4 – Accept Confirmation popup (Cancel)
- On the SPAQ1 record, tap "Accept Stock".
- Verify the "Accept Confirmation" popup shows the Confirm and Cancel buttons.
- Tap "Cancel".
- Verify the popup is dismissed and the user stays on Stock Receipt Details.
- Verify SPAQ1 and SPAQ2 are both still pending (not accepted).
- Capture a screenshot.

7. Test Case 5 – Accept SPAQ1 and SPAQ2 one by one (Confirm)
- Run accept_variant.yaml with VARIANT = SPAQ1:
  tap SPAQ1's Accept Stock → wait for popup → Confirm → verify SPAQ1 accepted
  and SPAQ2 still pending.
- Run accept_variant.yaml with VARIANT = SPAQ2:
  tap SPAQ2's Accept Stock → wait for popup → Confirm → verify SPAQ2 accepted
  and SPAQ1 still accepted.
  [TO BE CONFIRMED BY QA – how an accepted record is shown, the success message,
  and the post-acceptance screen.]
- If SPAQ1 fails, stop and do not attempt SPAQ2.
- If SPAQ1 passes and SPAQ2 fails, report a partial acceptance.
- Capture a screenshot after each acceptance.

8. Test Case 6 – Verify updated stock balance
- Wait for any synchronization to complete.
- Navigate to the stock balance view.
- Read the balance for each variant using read_stock_balance.yaml.
- Verify:
  - SPAQ1 balance = 0 + RECEIVED_QTY_SPAQ1
  - SPAQ2 balance = 0 + RECEIVED_QTY_SPAQ2
- If a balance does not match, fail with:
  "Balance mismatch for <variant>: expected <expected>, found <actual>."
- Verify the accepted MRN no longer appears in the incoming transactions list.
  [TO BE CONFIRMED BY QA – expected behavior.]
- Capture a screenshot.

9. Element Identification and Synchronization
- Prefer resource IDs, accessibility IDs, accessibility labels, and visible text.
- Do not use hardcoded coordinates unless no reliable locator exists.
- Do not hardcode MRN numbers, quantities, or balances; capture them at runtime.
- Use element-based waits (extendedWaitUntil) instead of fixed delays.
- On failure, capture a screenshot and report a meaningful error. Do not silently
  skip steps.

10. Execution Report
- User role and account (Health Facility – AU-HFS-001).
- Selected Health Facility (and whether it matches the Prompt 3 destination).
- Initial balances for SPAQ1 and SPAQ2 (expected 0, actual).
- Incoming transaction found: yes/no, with the captured MRN.
- Received quantities versus dispatched quantities, per variant.
- Cancel behavior result.
- Per-variant acceptance result.
- Final balances (expected versus actual), per variant.
- Failed steps, error messages, screenshots, and BLOCKED cases with reasons.

Flow structure recommendation:
- hf_main.yaml – login (Prompt 1 HF) → verify zero balance → Record Stock Receipt
  → open details → cancel check → accept SPAQ1 → accept SPAQ2 → verify balances
- Reuse common_open_stock_receipt_details.yaml, accept_variant.yaml, and
  read_stock_balance.yaml from the earlier prompts.
```
