# Prompt 2 — State User: Manage Stock → Record Stock Receipt

Given in conversation on 2026-10-15, as written below; recovered unchanged from
that session's transcript on 2026-10-23.

- **Implemented by:** [`state-stock-incoming-receipts.yaml`](../flows/stock/state-stock-incoming-receipts.yaml), [`state-stock-accept-receipt.yaml`](../flows/stock/state-stock-accept-receipt.yaml)
- **Test cases:** STK-01–06 in [TEST-CASES.md](../TEST-CASES.md), which also records
  where the flows differ from this text and why.

---

```
Maestro Mobile App Automation Prompt 2 – State User: Manage Stock → Record Stock Receipt

Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: After the State User logs in and selects the State boundary, verify the
Manage Stock card on the home screen, open Record Stock Receipt, and check whether
any incoming transactions exist.

1. Precondition
- Prompt 1 automation for the State User (AU-SAT-001) must pass.
- Reuse the existing Prompt 1 subflows (login, synchronization wait, permission
  handling, checkbox + Continue, ADMIN_State selection) through runFlow.
  Do not duplicate those steps.
- Use the credentials configured in the test environment. Do not invent or embed
  passwords.

2. Boundary Selection and Home Screen Navigation
- After the first available ADMIN_State option is selected (per Prompt 1), tap the
  confirmation/submit action on the boundary screen if one exists (inspect the UI
  hierarchy to identify it; do not assume its label).
- Wait for the home screen to load using an element-based wait on a stable home
  screen element, not a fixed delay.
- If the app performs another synchronization after boundary selection, wait for it
  to complete before continuing.
- Verify the home screen is displayed. Fail with a clear message if it does not
  load within the configured timeout.

3. Manage Stock Card Verification
- Locate the "Manage Stock" card on the home screen.
- If the card is not immediately visible, scroll until it is visible or until the
  end of the screen is reached.
- Assert that the Manage Stock card is visible.
- If it is not found, capture a screenshot and report:
  "Manage Stock card not displayed on home screen for State User."
  Do not continue to the next step.

4. Navigate to Record Stock Receipt
- Open the Manage Stock card if Record Stock Receipt is nested inside it
  (confirm the navigation path from the UI hierarchy).
- Locate and tap "Record Stock Receipt".
- Wait for the Record Stock Receipt screen to load using an element-based wait.
- Verify the screen title or a unique identifying element of the Record Stock
  Receipt screen.

5. Test Case 1 – Incoming Transactions Check
Objective: Determine whether any incoming transactions are available on the Record
Stock Receipt screen.

Steps:
- Wait for the transaction list or its loading indicator to finish loading.
- Check for one of the two possible states:

  State A – Incoming transactions are present:
  - Verify at least one transaction item is visible in the list (check the first
    item by index or by a list-item identifier from the UI hierarchy).
  - Do not hardcode transaction IDs, names, or values.
  - Capture and log details of the first visible transaction (for example
    transaction ID, sender, date, or quantity, if displayed), using copyTextFrom
    where supported.
  - Capture a screenshot of the list.
  - Report: "Incoming transactions found."

  State B – No incoming transactions:
  - Verify the empty-state message or element is displayed (identify its exact
    text or ID from the UI hierarchy; do not assume the wording).
  - Capture a screenshot of the empty state.
  - Report: "No incoming transactions available."

- Use Maestro conditional execution (runFlow with a `when: visible` condition) to
  branch between State A and State B.
- If neither a transaction item nor an empty-state element appears within the
  timeout, fail the test and report:
  "Record Stock Receipt screen did not show transactions or an empty state."

Expected result handling:
- Both State A and State B are valid outcomes unless the test data specifies that
  incoming transactions must exist. If expected test data is configured, fail the
  test when the observed state does not match it.

6. Element Identification and Synchronization
- Prefer resource IDs, accessibility IDs, accessibility labels, and visible text.
- Do not use hardcoded screen coordinates unless no reliable locator exists.
- Use extendedWaitUntil or equivalent element-based waits with appropriate timeouts.
- Do not silently skip failed steps.
- On any failure, capture a screenshot and report a meaningful error.

7. Validation Checklist
- Home screen loads after State boundary selection.
- Manage Stock card is visible.
- Record Stock Receipt opens successfully.
- Transaction list finishes loading.
- Presence or absence of incoming transactions is detected and reported correctly.
- Timeouts and missing elements are reported clearly.

8. Execution Report
Provide a summary containing:
- User role and test account (State User – AU-SAT-001).
- Prompt 1 precondition status.
- Boundary selection and home screen navigation status.
- Manage Stock card verification result.
- Record Stock Receipt navigation result.
- Test Case 1 result: transactions found / no transactions / failed, with details
  of the first transaction if found.
- Failed steps, error messages, and screenshots.

Important Instructions
- Generate valid Maestro-compatible flows using supported Maestro commands only.
- Do not assume element identifiers; inspect the UI hierarchy or request
  screenshots of the home screen, Manage Stock card, Record Stock Receipt screen,
  and both list states (with and without transactions).
- Keep this as a separate flow file (e.g. state_user_stock_receipt.yaml) that calls
  the Prompt 1 State User subflow first, so later test cases can reuse it.
```
