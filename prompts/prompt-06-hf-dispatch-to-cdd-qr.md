# Prompt 6 — Health Facility: Dispatch Stock to CDD (with QR Code Scan)

Given in conversation on 2026-10-19, as written below; recovered unchanged from
that session's transcript on 2026-10-23.

- **Implemented by:** [`hf-stock-dispatch-cdd.yaml`](../flows/stock/hf-stock-dispatch-cdd.yaml)
- **Test cases:** CDD-01–04 in [TEST-CASES.md](../TEST-CASES.md), which also records
  where the flows differ from this text and why.
- **Note:** The CDD's QR code was attached as an image with this prompt; it is kept at `assets/qr/cdd_qr.png` (`QR_CODE_PATH`, gitignored).

---

```
Maestro Mobile App Automation Prompt 6 – Health Facility: Dispatch Stock to CDD (with QR Code Scan)

Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: Verify that the Health Facility user can dispatch stock to the
Distributor/CDD using a QR code scan, with correct quantity validations, and that
the stock balance is updated correctly after dispatch.

1. Precondition
- Prompt 5 (Health Facility stock acceptance) must have passed for SPAQ1 and SPAQ2,
  so the Health Facility has stock available.
- Prompt 1 Test Case 2 (Health Facility login) must pass.
- Reuse existing subflows through runFlow:
  - Prompt 1 login and Health Facility selection subflows
  - Prompt 3 read_stock_balance.yaml and the dispatch case structure
- Use credentials from the secure test configuration. Do not embed passwords.
- The QR code image must be present in the project at the configured path.

Test data (pass via environment variables):
- TEST_USER = AU-HFS-001
- TARGET_CDD = AU-CDD-001 (the CDD that will receive and accept stock in the next prompt)
- PRODUCT_VARIANT = SPAQ1 (repeat for SPAQ2)
- REMAINING_BALANCE = 10
- QR_CODE_PATH = assets/qr/cdd_qr.png (relative to the Maestro project root)

Project structure (QR code location):
maestro/
├── flows/
│   ├── common/
│   │   ├── login.yaml
│   │   ├── permissions.yaml
│   │   ├── read_stock_balance.yaml
│   │   └── scan_qr.yaml
│   └── health_facility/
│       └── hf_dispatch_cdd.yaml
└── assets/
    └── qr/
        └── cdd_qr.png

2. Login and Navigate to the Dispatch Screen
- Run the Prompt 1 Health Facility flow: login as AU-HFS-001, wait for
  synchronization, handle permissions, checkbox + Continue, select the Health
  Facility boundary, confirm.
- Wait for the home screen to load and verify the "Manage Stock" card is visible.
- Open the stock dispatch option under Manage Stock.
  [TO BE CONFIRMED BY QA – exact option label and navigation path.]
- Wait for the dispatch screen to load using an element-based wait.

3. QR Code Scan (scan_qr.yaml – reusable subflow)
- Tap the QR scan action on the dispatch screen.
  [TO BE CONFIRMED BY QA – label/ID of the scan button.]
- Handle the camera permission prompt conditionally (grant it if shown).
- Scan the QR code using one of these methods (confirm which the app supports):
  Method A – Gallery import (preferred):
    - Before opening the scanner, use addMedia with QR_CODE_PATH to add the QR
      image to the device gallery.
    - In the scanner, tap the gallery/upload option and select the added image.
  Method B – Emulator virtual camera:
    - The emulator must be pre-configured (outside Maestro) to display the QR
      image in its virtual scene camera.
    - Open the scanner and wait for the scan to complete automatically.
- Wait for the scan result using an element-based wait.
- Verify the scanned result is applied:
  [TO BE CONFIRMED BY QA – what the QR code contains and what the screen shows
  after scanning, e.g. the CDD name/ID, or product/batch details.]
- If the QR code identifies the recipient, verify it matches TARGET_CDD.
- If scanning fails or times out, capture a screenshot and fail with:
  "QR code scan failed: <reason>." Do not continue the dispatch cases.

4. Select the Recipient and Product, and Read the Balance
- Verify or select the recipient CDD (TARGET_CDD), if not already filled by the
  QR scan. Do not select a different CDD.
- Select PRODUCT_VARIANT.
- Read the current stock balance using read_stock_balance.yaml and store it as
  CURRENT_BALANCE.
- If the balance cannot be read, fail with a clear message.

Execution order:
- Run Case 1 and Case 2 (validation cases, no stock movement) before Case 3.

5. Test Case 1 – Dispatch quantity 0 is not allowed
- Enter 0 in the dispatch quantity field and attempt to submit.
- Verify dispatch is blocked (validation message shown or submit disabled).
  [TO BE CONFIRMED BY QA – exact error message or disabled behavior.]
- Verify the balance still equals CURRENT_BALANCE.
- Clear the field and capture a screenshot.

6. Test Case 2 – Dispatch quantity greater than stock balance is not allowed
- Compute OVER_QUANTITY = CURRENT_BALANCE + 1 with evalScript.
- Enter OVER_QUANTITY and attempt to submit.
- Verify dispatch is blocked.
  [TO BE CONFIRMED BY QA – exact error message or disabled behavior.]
- Verify the balance still equals CURRENT_BALANCE.
- Clear the field and capture a screenshot.

7. Test Case 3 – Dispatch stock leaving a balance of 10
- If CURRENT_BALANCE is 10 or less, mark this case BLOCKED with:
  "Insufficient stock: balance <CURRENT_BALANCE>; cannot dispatch while leaving 10."
- Compute DISPATCH_QUANTITY = CURRENT_BALANCE − REMAINING_BALANCE with evalScript.
  Example: balance 90 → dispatch 80 → remaining balance 10.
- Enter DISPATCH_QUANTITY and submit.
- Handle the confirmation popup if one appears and tap Confirm.
  [TO BE CONFIRMED BY QA – popup and success message details.]
- Wait for the success result and any synchronization.
- Re-read the balance and verify it equals REMAINING_BALANCE (10).
- If it does not match, fail with:
  "Balance mismatch: expected 10, found <actual> after dispatching
  <DISPATCH_QUANTITY> from <CURRENT_BALANCE>."
- Capture any MRN/reference number shown after dispatch for use by the CDD
  acceptance prompt.
- Capture a screenshot.

8. Element Identification and Synchronization
- Prefer resource IDs, accessibility IDs, accessibility labels, and visible text.
- Do not use hardcoded coordinates unless no reliable locator exists.
- Do not hardcode balances or quantities; read and compute them at runtime.
- Use element-based waits (extendedWaitUntil) instead of fixed delays.
- On failure, capture a screenshot and report a meaningful error. Do not silently
  skip steps.

9. Execution Report
For each product variant, report:
- User role and account (Health Facility – AU-HFS-001).
- QR scan method used (gallery or virtual camera) and scan result.
- Recipient CDD (expected AU-CDD-001, actual).
- Initial stock balance.
- Case 1 result (quantity 0).
- Case 2 result (quantity = balance + 1, with the value used).
- Case 3 result (DISPATCH_QUANTITY, expected and actual final balance, and the
  MRN/reference captured), or BLOCKED with reason.
- Failed steps, error messages, and screenshots.

Important Instructions
- Generate valid Maestro-compatible flows using supported commands only
  (addMedia, copyTextFrom, evalScript, inputText, runFlow with conditions,
  assertVisible, extendedWaitUntil, takeScreenshot).
- Do not assume element identifiers; inspect the UI hierarchy or request
  screenshots of the dispatch screen, QR scanner screen, scan result, quantity
  field, balance display, error messages, and success state.
```
