# Prompt 16 — Common View Transactions (State User, Health Facility and CDD)

Written 2026-10-23 in the format of Prompts 1–14, from the View Transactions
screen as read off the app (state user, AU-SAT-001) and the app's source.

- **Implemented by:** [`state-stock-view-transactions.yaml`](../flows/stock/state-stock-view-transactions.yaml), [`hf-stock-view-transactions.yaml`](../flows/stock/hf-stock-view-transactions.yaml), [`cdd-stock-view-transactions.yaml`](../flows/stock/cdd-stock-view-transactions.yaml)
- **Test cases:** VTX-01–06 in [TEST-CASES.md](../TEST-CASES.md), which also records
  where the flows differ from this text and why.

---

```
Maestro Mobile App Automation Prompt 16 – Common View Transactions (State User, Health Facility and CDD)

Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: Verify that the State User, the Health Facility user and the
Distributor/CDD can open Manage Stock → View Transactions, see the stock
transactions they recorded, open each transaction's details, view the QR code
of a dispatch, and return to Manage Stock. This screen only reads data; nothing
is submitted.

1. Precondition
- Prompt 1 login must pass for the role under test:
  - State User: AU-SAT-001
  - Health Facility: AU-HFS-001
  - Distributor/CDD: AU-CDD-001
- Run Download Stock Data before opening the screen. The list is built from the
  stock records on the device, so a fresh login shows nothing until the records
  are downloaded.
- Reuse existing subflows through runFlow:
  - Prompt 1 login, permissions, and boundary selection subflows
  - common/download_stock_data.yaml
- Use credentials from the secure test configuration. Do not embed passwords.

Test data (pass via environment variables):
- TEST_USER = the account under test
- PRODUCT_VARIANT_1 = SPAQ1, PRODUCT_VARIANT_2 = SPAQ2
- VIEW_TXN_EXPECTED_STATE / VIEW_TXN_EXPECTED_HF / VIEW_TXN_EXPECTED_CDD
  (optional) = transactions the role's list must contain, comma-separated,
  each "<variant> <quantity>" or "<variant> <MRN> <quantity>",
  e.g. "SPAQ1 490,SPAQ2 490". Blank: no expected entries; the list is logged.

2. Test Case 1 – Open View Transactions
- From the home screen, tap the "Manage Stock" card.
- Verify the "View Transactions" button is displayed at the foot of Manage Stock.
- Tap "View Transactions".
- Verify the screen title "View Transactions" and the subtitle
  "View all stock transactions".
- Capture a screenshot.

3. Test Case 2 – Transaction list
- Wait for the list to load.
- If no transaction is shown, verify the empty-state message and capture it.
  [TO BE CONFIRMED BY QA – exact empty-state text.]
- Otherwise read every card, scrolling to the end of the list. Each card shows:
  - an "MRN <number>" tag and the date (dd MMM yyyy)
  - "Receiver" or "Sender" with the other party's ID
  - one product line per product, e.g. "SPAQ 1: 490"
  - "View QR" (dispatches only) and "Select Transaction"
- Log each card: MRN, date, party, product and quantity.
- Verify every card shows an MRN and at least one product line.
- Capture a screenshot.

4. Test Case 3 – Transaction details
- For the first card of each product variant (SPAQ1, then SPAQ2), tap its own
  "Select Transaction".
- Verify the details screen shows Resource, Transaction Type, Transaction reason,
  Sender, MRN number, Waybill number, Batch number, Quantity received and Comment.
- Verify the MRN number equals the card's MRN, Resource equals the card's
  product, and the quantity equals the card's quantity. On a mismatch, fail with:
  "Transaction details mismatch for <MRN>: <field> shows <value>, the card shows <value>."
- Log the Transaction Type and the Sender.
- [TO BE CONFIRMED BY QA – the details screen is titled "Stock Receipt Details"
  and labels the quantity "Quantity received" even for a dispatched transaction,
  and it shows the Sender but no Receiver.]
- Tap "Back".
- [TO BE CONFIRMED BY QA – Back from the details returns to Manage Stock, not to
  View Transactions.] Reopen View Transactions if needed.
- Capture a screenshot of each details screen.

5. Test Case 4 – View QR
- On the first card that shows "View QR", tap "View QR".
- Verify a "QR Code" popup with a QR image is displayed.
- Close the popup and verify View Transactions is still displayed.
- If no card shows "View QR", report the case as not applicable.
- Capture a screenshot.

6. Test Case 5 – Expected transactions are listed (only when the expected
   entries are set)
- For each expected entry, verify a card with that product and quantity (and
  MRN, when given) is listed.
- Report each missing entry:
  "View Transactions is missing <entry> for <role>."
- [TO BE CONFIRMED BY QA – after the receiver accepts a dispatch, the sender's
  View Transactions may show the dispatch under a different MRN from the one it
  was recorded with; give the MRN only when it is known to be stable.]

7. Test Case 6 – Back to Manage Stock
- On View Transactions, tap "Back".
- Verify the Manage Stock screen is displayed ("Record Stock Receipt" and
  "Record Stock Issued").

8. Element Identification and Synchronization
- Prefer resource IDs, accessibility IDs, accessibility labels, and visible text.
- Fence every card element between its own MRN tag and the next card's, so the
  "Select Transaction" or "View QR" tapped is the card's own.
- Do not use hardcoded coordinates unless no reliable locator exists.
- Use element-based waits (extendedWaitUntil) instead of fixed delays.
- On failure, capture a screenshot and report a meaningful error. Do not silently
  skip steps.

9. Validation Checklist
- Manage Stock shows View Transactions, and it opens the list.
- The list shows the user's transactions (or the empty state), each with an MRN,
  a date, a party and a product line.
- The details of a transaction match its card.
- View QR shows the QR code popup for a dispatch, and it closes.
- The expected transactions are listed (when set).
- Back returns to Manage Stock.

10. Execution Report
- User role and account.
- Number of transactions listed, and each card's MRN, date, party, product and
  quantity.
- Details checked (MRN, resource, quantity, transaction type, sender).
- View QR result.
- Expected entries found / missing (if set).
- Back result.
- Points for QA (screen titles and labels, where Back leads).
- Failed steps, error messages, and screenshots.

Flow structure recommendation:
- common/view_transactions.yaml – reusable subflow taking ROLE and EXPECTED:
  open → read list → details → View QR → expected entries → back
- state_user/state_view_transactions.yaml – login → download → view_transactions.yaml
- health_facility/hf_view_transactions.yaml – login → download → view_transactions.yaml
- cdd/cdd_view_transactions.yaml – login → download → view_transactions.yaml
```
