# Prompt 15 — Common Reject Incoming Stock (State User, Health Facility and CDD)

Written 2026-10-23 and rewritten the same day in the format of Prompts 1–14,
with the strings read off the app as the state user (AU-SAT-001). It is the
counterpart of the accept prompts —
[Prompt 2](prompt-02-state-stock-receipt.md) for the state user,
[Prompt 5](prompt-05-hf-accept-stock.md) for the health facility,
[Prompt 11](prompt-11-cdd-registration-and-delivery.md) Step 11 for the CDD.

- **Implemented by:** [`state-stock-reject-receipt.yaml`](../flows/stock/state-stock-reject-receipt.yaml), [`hf-stock-reject-receipt.yaml`](../flows/stock/hf-stock-reject-receipt.yaml), [`cdd-stock-reject-receipt.yaml`](../flows/stock/cdd-stock-reject-receipt.yaml)
- **Test cases:** RJT-01–06 in [TEST-CASES.md](../TEST-CASES.md), which also records
  where the flows differ from this text and why.

---

```
Maestro Mobile App Automation Prompt 15 – Common Reject Incoming Stock (State User, Health Facility and CDD)

Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: Verify that the State User can reject an incoming stock transaction
from Manage Stock → Record Stock Receipt: the reject confirmation popup, Cancel,
the mandatory reason, and the rejection itself, and that rejected stock never
reaches the user's stock balance. The same flow runs for the Health Facility
and the Distributor/CDD on the stock they receive.

1. Precondition
- Prompt 1 Test Case 1 (State User login, AU-SAT-001) must pass.
- The State User must have incoming transactions in Record Stock Receipt:
  National has dispatched SPAQ1 and SPAQ2 to the state, and they have not been
  accepted or rejected yet. One transaction carries one product, so there is
  one incoming transaction for each product variant.
- For the other roles, the same precondition with their sender:
  - Health Facility (AU-HFS-001): the State User's dispatch (Prompt 3)
  - Distributor/CDD (AU-CDD-001): the Health Facility's dispatch (Prompt 6)
- Reuse existing subflows through runFlow:
  - Prompt 1 login, permissions, and boundary selection subflows
  - common/download_stock_data.yaml
  - Prompt 2's subflows that find a product's transaction and check its
    Stock Receipt Details (product, MRN, sender, quantity)
- Use credentials from the secure test configuration. Do not embed passwords.
- Rejecting is irreversible and writes to UAT. Every run consumes one incoming
  transaction per product variant, so the sender must dispatch fresh stock
  before each run.

Test data (pass via environment variables):
- TEST_USER = AU-SAT-001 (or AU-HFS-001 / AU-CDD-001)
- PRODUCT_VARIANT_1 = SPAQ1, PRODUCT_VARIANT_2 = SPAQ2
- REJECT_REASON = "Automation test - stock rejected" (ASCII only)

2. Login and Open the Incoming Transactions
- Run the Prompt 1 State User flow and wait for the home screen.
- Tap "Download Stock Data" and complete it (Download, or "No Data Found"),
  then return to the home screen. The incoming list is empty without it.
- Read the "Stock Balance" for SPAQ1 and SPAQ2 and record them.
- Tap "Manage Stock" → "Record Stock Receipt".
- Wait for "Incoming Transactions" / "View and accept incoming stock
  transactions".
- If "No Incoming Transactions" is shown, fail with:
  "BLOCKED - Test Cases 1 to 6: No incoming transactions for State User; the
  National dispatch not received."
- Count every transaction card per product, scrolling to the end of the list
  (only three cards fit on screen). If either product has no transaction, fail
  with: "BLOCKED - Test Cases 1 to 6: Expected product variants SPAQ1 and
  SPAQ2; found <products found>." Reject nothing in a blocked run.

3. Test Case 1 – Stock Receipt Details offers Reject
- Tap "Select" on the first SPAQ1 transaction (the card's own Select).
- Verify Stock Receipt Details shows the card's product (Resource), MRN
  (Material issue number), sender (Received from) and quantity.
- Verify both "Accept Stock" and "Reject" are displayed.
- Capture a screenshot.

4. Test Case 2 – Reject asks for confirmation
- Tap "Reject".
- Verify the "Reject Confirmation" popup with "Are you sure you want to
  reject this stock?", a "Reason for rejection *" text field, "Confirm" and
  "Cancel".
- If the stock is rejected at once without a popup, report it as a deviation
  and go straight to Test Case 5's checks for this transaction.
- Capture a screenshot.

5. Test Case 3 – Cancel leaves the stock pending
- Tap "Cancel".
- Verify the popup is dismissed and Stock Receipt Details is still shown for
  the same product, with "Accept Stock" and "Reject" still offered.
- Tap "Back" and verify both products still have every incoming transaction
  they had.
- Report: "Cancel returned to Stock Receipt Details; stock not rejected."
- Capture a screenshot.

6. Test Case 4 – The reason is mandatory
- Open the same SPAQ1 transaction and tap "Reject" again.
- Leave "Reason for rejection *" empty and tap "Confirm".
- Verify the rejection is blocked: "Reason for Rejection is required" is shown
  and the popup stays open.
- If Confirm goes through without a reason, report it as a deviation.
  [TO BE CONFIRMED BY QA – a reason is required for every rejection.]
- Capture a screenshot.

7. Test Case 5 – Reject SPAQ1, then SPAQ2
- Enter REJECT_REASON in "Reason for rejection *" and tap "Confirm".
- Verify the green "Stock rejected successfully" message (it disappears after
  a few seconds) and that the app returns to Manage Stock.
- Open "Record Stock Receipt" and verify the rejected transaction is no longer
  listed, and that SPAQ2's transactions are unchanged.
- Repeat for the first SPAQ2 transaction: Select → Reject → REJECT_REASON →
  Confirm → "Stock rejected successfully" → gone from the list.
- If SPAQ2 fails after SPAQ1 was rejected, fail with:
  "Partial rejection: SPAQ1 rejected, SPAQ2 failed – <reason>."
- Capture a screenshot after each rejection.

8. Test Case 6 – Nothing was received
- Return to the home screen.
- Verify each Stock Balance equals the balance read before: rejected stock
  never reaches the receiver. If not, fail with: "Test Case 6 - stock was
  rejected, but the balance changed: <variant> <before> -> <after>."
- Run "Download Stock Data" again and open "Record Stock Receipt".
- Verify the rejected transactions are not listed again.
- Capture a screenshot.

9. Element Identification and Synchronization
- Prefer resource IDs, accessibility IDs, accessibility labels, and visible text.
- Fence every card element between its own MRN label and the next card's, so
  the "Select" tapped is the card's own.
- Count the incoming list by scrolling to its end, not only the cards on
  screen.
- Look for "Stock rejected successfully" immediately after Confirm; it only
  shows for a few seconds.
- Do not use hardcoded coordinates unless no reliable locator exists.
- Use element-based waits (extendedWaitUntil) instead of fixed delays.
- On failure, capture a screenshot and report a meaningful error. Do not silently
  skip steps.

10. Validation Checklist
- Incoming transactions exist for SPAQ1 and SPAQ2 before anything is rejected.
- Stock Receipt Details matches the card and offers Accept Stock and Reject.
- Reject opens the Reject Confirmation popup with a mandatory reason.
- Cancel closes the popup and rejects nothing.
- Confirm with an empty reason is blocked.
- Confirm with a reason shows "Stock rejected successfully" and removes the
  transaction from the incoming list.
- Stock Balance is unchanged after both rejections, and the rejected
  transactions do not come back after Download Stock Data.

11. Execution Report
- User role and account (State User – AU-SAT-001).
- Stock Balance of SPAQ1 and SPAQ2 before and after.
- Incoming transactions before, per product.
- Popup title, buttons and reason field; Cancel result; empty-reason result.
- Each rejected transaction: product, MRN, sender, quantity, reason, and the
  message shown.
- Incoming transactions after, and the Download Stock Data re-check.
- Deviations, failed steps, error messages, and screenshots.

Flow structure recommendation:
- common/reject_stock.yaml – reusable subflow taking ROLE: incoming list →
  Test Case 1 → popup → Cancel → reason check → reject SPAQ1 → reject SPAQ2 →
  balances
- state_user/state_reject_stock.yaml – login → download → reject_stock.yaml
- health_facility/hf_reject_stock.yaml – login → download → reject_stock.yaml
- cdd/cdd_reject_stock.yaml – login → download → reject_stock.yaml
```
