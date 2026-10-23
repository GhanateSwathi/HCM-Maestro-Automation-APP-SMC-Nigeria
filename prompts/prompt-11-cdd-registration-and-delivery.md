# Prompt 11 — CDD: Beneficiary Registration, Stock Receipt, and Dose Delivery

Given in conversation on 2026-10-21, as written below; recovered unchanged from
that session's transcript on 2026-10-23.

- **Implemented by:** [`cdd-registration-full.yaml`](../flows/registration/cdd-registration-full.yaml), [`cdd-low-beneficiary-id.yaml`](../flows/registration/cdd-low-beneficiary-id.yaml)
- **Test cases:** REG-01–16 in [TEST-CASES.md](../TEST-CASES.md), which also records
  where the flows differ from this text and why.

---

```
Maestro Mobile App Automation Prompt 11 – CDD: Beneficiary Registration, Stock Receipt, and Dose Delivery

Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: Log in as the Distributor/CDD user, verify the Low Beneficiary ID popup,
download beneficiary IDs, register a household, verify that recording a dose shows
Insufficient Stock when the CDD has no stock, accept the incoming stock, then
deliver doses to two children and verify the age-based product rule:
3–11 months → SPAQ1, 12–59 months → SPAQ2.

1. Precondition
- Prompt 1 Test Case 3 (Distributor/CDD login, AU-CDD-001) must pass: login,
  synchronization, permissions, checkbox + Continue, ADMIN_Health Facility and
  ADMIN_Community selections.
- The CDD must not have any beneficiary IDs downloaded (fresh install or cleared
  app data), so the Low Beneficiary ID popup appears.
- The Health Facility dispatch to the CDD (Prompt 6) must be completed but not yet
  accepted by the CDD, so the first dose attempt shows Insufficient Stock.
- Reuse existing subflows through runFlow:
  - Prompt 1 login, permissions, and boundary selection subflows
  - Prompt 2 accept_variant.yaml and open_stock_receipt_details.yaml
  - Prompt 3 read_stock_balance.yaml
- Use credentials from the secure test configuration. Do not embed passwords.

Test data (pass via environment variables):
- TEST_USER = AU-CDD-001
- REGISTRATION_VILLAGE = optional; if not set, select the first available village
- TEST_LATITUDE / TEST_LONGITUDE = mock GPS coordinates inside the village area
  [TO BE CONFIRMED BY QA]
- HOUSEHOLD_MEMBERS = 3 (head of household + 2 children; allowed range 1–30)
- HEAD_AGE_YEARS = 30, HEAD_AGE_MONTHS = 0 (must be over 18 years, max 149 years)
- HEAD_GENDER = Female or Male
- HEAD_MOBILE = an 11-digit test mobile number (not a real person's number)
- CHILD_1_AGE_MONTHS = 6 (band 3–11 months → expected product SPAQ1)
- CHILD_1_GENDER = Female or Male
- CHILD_2_AGE = 3 years / 36 months (band 12–59 months → expected product SPAQ2)
  [TO BE CONFIRMED BY QA – whether the Add Member form takes months only (36) or
  years and months (3 years, 0 months)]
- CHILD_2_GENDER = Female or Male
- EXPECTED_CDD_RECEIVED_SPAQ1 / EXPECTED_CDD_RECEIVED_SPAQ2 = the Prompt 6
  dispatch quantities per variant
- PRODUCT_VARIANT_1 = SPAQ1, PRODUCT_VARIANT_2 = SPAQ2

Unique names (generated at runtime with evalScript):
- HEAD_FIRST_NAME = "AutoHead<timestamp>", HEAD_LAST_NAME = "Test"
- CHILD_1_FIRST_NAME = "AutoChild1<timestamp>", CHILD_1_LAST_NAME = "Test"
- CHILD_2_FIRST_NAME = "AutoChild2<timestamp>", CHILD_2_LAST_NAME = "Test"
- SEARCH_TEXT = the first 3 or more characters of HEAD_FIRST_NAME, so the search
  matches no existing beneficiary.

2. Login and Navigate to Registration & Delivery
- Run the Prompt 1 Distributor/CDD flow.
- Wait for the home screen to load.
- Tap "Registration & Delivery" and wait for the screen to load.

3. Test Case 1 – Low Beneficiary ID popup
- Select REGISTRATION_VILLAGE, or the first available village.
- Type SEARCH_TEXT (at least 3 characters) in the search bar.
- Verify the "Register Beneficiary" button becomes enabled, and tap it.
- Verify the "Low Beneficiary ID" popup is displayed, with a "Download" action.
  [TO BE CONFIRMED BY QA – exact popup title and message.]
- Capture a screenshot.
- If the registration screen opens instead, fail with:
  "Low Beneficiary ID popup not shown; beneficiary IDs may already be downloaded."

4. Test Case 2 – Register household, Insufficient Stock, receive stock, deliver doses

Step 1 – Download beneficiary IDs:
- In the Low Beneficiary ID popup, tap "Download".
- Verify the app redirects to the Beneficiary IDs screen.
- Tap "Download Beneficiary IDs".
- Wait until the download completes, using an element-based wait with a suitable
  timeout. [TO BE CONFIRMED BY QA – how completion is shown.]
- Capture the downloaded ID count, if shown.
- If the download fails or times out, fail with:
  "Beneficiary ID download failed: <message>."
- Tap "Close", then tap the back button.

Step 2 – Reopen Registration & Delivery:
- Open "Registration & Delivery" again and select the same village.
- Type SEARCH_TEXT, verify "Register Beneficiary" is enabled, and tap it.
- Verify the Low Beneficiary ID popup does NOT appear.

Step 3 – Beneficiary Location:
- Wait for the Beneficiary Location screen.
- Grant the location permission prompt if shown.
- Set the mock location with setLocation using TEST_LATITUDE and TEST_LONGITUDE.
- Wait until latitude and longitude are captured and displayed.
- If not captured within the timeout, fail with "Beneficiary location not captured."
- Tap "Save Location".

Step 4 – Caregiver Consent (Yes):
- Verify the "Yes" and "No" options are displayed.
- Tap "Yes", then tap "Submit".
- (Consent is a parameter of register_household.yaml, so the "No" case can reuse
  this flow later.)

Step 5 – Household Details (total members, min 1, max 30):
- Enter 0 → verify a validation error is shown or saving is blocked.
- Enter 31 → verify a validation error is shown or saving is blocked.
- Clear the field, enter HOUSEHOLD_MEMBERS (3), and tap "Save Household Details".
  [TO BE CONFIRMED BY QA – exact validation messages, and whether the member count
  must match this total.]

Step 6 – Beneficiary Details (Head of Household):
- Enter HEAD_FIRST_NAME and HEAD_LAST_NAME.
- Age (over 18 years, max 149 years):
  - Enter 17 years → verify it is rejected.
  - Enter 150 years → verify it is rejected.
  - Clear and enter HEAD_AGE_YEARS and HEAD_AGE_MONTHS.
  [TO BE CONFIRMED BY QA – whether exactly 18 years is accepted.]
- Select HEAD_GENDER.
- Mobile number (exactly 11 digits):
  - Enter 10 digits → verify it is rejected.
  - Enter 12 digits → verify the extra digit is blocked or a validation error shows.
  - Clear and enter HEAD_MOBILE.
- Tap "Save Beneficiary".

Step 7 – Household Overview and Add Member (Child 1):
- Verify the head of household is listed on the Household Overview screen.
- Tap "Add Member".
- Enter CHILD_1_FIRST_NAME and CHILD_1_LAST_NAME.
- Age (3 to 59 months):
  - Enter 2 months → verify it is rejected.
  - Enter 60 months → verify it is rejected.
  - Clear and enter CHILD_1_AGE_MONTHS (6).
- Select CHILD_1_GENDER.
- Tap "Save Beneficiary".

Step 8 – Submit the household:
- Verify the "Ready to Submit" popup is displayed, and tap "Submit".
- Tap "View Household Details".
- Verify the head of household and child 1 are shown.

Step 9 – Eligibility checklist (Child 1):
- Tap the "Dose" button for child 1.
- Answer every eligibility question "No" and verify all answers are "No".
- Verify the "Ready to Submit" popup, and tap "Submit".

Step 10 – Record Cycle Dose (Insufficient Stock):
- Tap "Record Cycle Dose".
- Verify the "Insufficient Stock" message is displayed.
  [TO BE CONFIRMED BY QA – exact text, and whether it is a popup, toast, or inline.]
- Verify the dose is NOT recorded.
- Capture a screenshot.
- If the dose is recorded, fail with:
  "Dose recorded without stock; Insufficient Stock check failed."
- Tap "Go Back", then navigate back until the home screen is visible.

Step 11 – CDD accepts the incoming stock:
- Verify the "Manage Stock" card is visible.
- Read the SPAQ1 and SPAQ2 balances with read_stock_balance.yaml and verify both are 0.
- Open "Record Stock Receipt".
- Find the incoming transaction from the Health Facility (match the MRN captured
  in Prompt 6, if available). If none exists, fail with:
  "No incoming stock for CDD; Prompt 6 dispatch not received." Mark Steps 12–15
  as BLOCKED.
- Tap "Select" on that transaction and verify Stock Receipt Details shows the same MRN.
- Verify the quantities equal EXPECTED_CDD_RECEIVED_SPAQ1 and
  EXPECTED_CDD_RECEIVED_SPAQ2.
- Run accept_variant.yaml for SPAQ1, then for SPAQ2 (Accept Stock → Accept
  Confirmation → Confirm), verifying the other variant's state after each.
- Wait for synchronization, then verify:
  - SPAQ1 balance = EXPECTED_CDD_RECEIVED_SPAQ1
  - SPAQ2 balance = EXPECTED_CDD_RECEIVED_SPAQ2
- Store these as CDD_BALANCE_SPAQ1 and CDD_BALANCE_SPAQ2.
- Capture a screenshot.

Step 12 – Give the dose to child 1 (6 months → SPAQ1):
- Open "Registration & Delivery", select the same village, search SEARCH_TEXT, and
  open the same household.
- Open child 1 and tap "Dose".
- If the eligibility checklist appears again, answer all "No" and submit.
  [TO BE CONFIRMED BY QA – whether it is shown again.]
- On the delivery screen, verify SPAQ1 is offered and SPAQ2 is NOT offered.
  Otherwise fail with:
  "Age-product mismatch: child aged 6 months should receive SPAQ1; delivery
  screen shows <products shown>."
- Capture the SPAQ1 dose quantity as DOSE_QTY_CHILD_1.
- Tap "Record Cycle Dose" (Confirm if a popup appears).
- Verify the dose is recorded successfully. [TO BE CONFIRMED BY QA – success message.]
- Capture a screenshot.

Step 13 – Add child 2 (3 years):
- From the household details, tap "Add Member".
- Enter CHILD_2_FIRST_NAME, CHILD_2_LAST_NAME, CHILD_2_AGE, and CHILD_2_GENDER.
- Tap "Save Beneficiary", and submit through "Ready to Submit" if shown.
- Verify the household now shows the head of household, child 1, and child 2.

Step 14 – Give the dose to child 2 (36 months → SPAQ2):
- Open child 2 and tap "Dose".
- Answer every eligibility question "No" and submit through "Ready to Submit".
- On the delivery screen, verify SPAQ2 is offered and SPAQ1 is NOT offered.
  Otherwise fail with:
  "Age-product mismatch: child aged 36 months should receive SPAQ2; delivery
  screen shows <products shown>."
- Capture the SPAQ2 dose quantity as DOSE_QTY_CHILD_2.
- Tap "Record Cycle Dose" (Confirm if a popup appears).
- Verify the dose is recorded successfully.
- Capture a screenshot.

Step 15 – Verify CDD stock balances after the doses:
- Navigate to the stock balance view and verify:
  - SPAQ1 balance = CDD_BALANCE_SPAQ1 − DOSE_QTY_CHILD_1
  - SPAQ2 balance = CDD_BALANCE_SPAQ2 − DOSE_QTY_CHILD_2
  [TO BE CONFIRMED BY QA – whether balances update immediately or after sync.]
- On mismatch, fail with:
  "CDD balance mismatch for <variant>: expected <expected>, found <actual>."
- Capture a screenshot.

5. Element Identification and Synchronization
- Prefer resource IDs, accessibility IDs, accessibility labels, and visible text.
- Do not use hardcoded coordinates unless no reliable locator exists.
- Do not hardcode village names, MRNs, balances, or dose quantities; use test data
  or capture them at runtime.
- Clear each input field before entering a new value during boundary checks.
- Use element-based waits (extendedWaitUntil) instead of fixed delays, especially
  for the ID download, location capture, and sync.
- Handle permission prompts conditionally.
- On failure, capture a screenshot and report a meaningful error. Do not silently
  skip steps.

6. Validation Checklist
- Low Beneficiary ID popup appears when no IDs are downloaded.
- Download redirects to the Beneficiary IDs screen, and the download completes.
- Register Beneficiary is enabled after typing at least 3 characters.
- Location is captured before saving.
- Consent Yes leads to Household Details.
- Boundaries are enforced for household members, head age, mobile number, and child age.
- Head of household and children are saved and shown in the household.
- The eligibility checklist with all "No" answers can be submitted.
- Record Cycle Dose shows Insufficient Stock when the CDD has no stock.
- CDD stock balance is 0 before receipt and matches the dispatched quantities after.
- A child aged 3–11 months is offered SPAQ1 only.
- A child aged 12–59 months is offered SPAQ2 only.
- Doses are recorded once stock is available.
- CDD stock balances decrease by the dose quantities delivered.

7. Execution Report
- User role and account (Distributor/CDD – AU-CDD-001).
- Case 1: Low Beneficiary ID popup result.
- Case 2:
  - Beneficiary ID download result and ID count.
  - Village selected and search text used.
  - Location captured (lat/long).
  - Consent selected (Yes).
  - Boundary check results per field (value entered, expected, actual).
  - Head of household and children: names, ages, genders.
  - Household submission and eligibility checklist results.
  - Insufficient Stock result.
  - CDD balances before receipt, after receipt, and after doses, per variant.
  - Incoming MRN accepted, and per-variant acceptance result.
  - Child 1 and child 2: product offered, dose quantity, dose result.
  - Age-product mapping result for each child.
- Failed steps, error messages, and screenshots.

Important Instructions
- Generate valid Maestro-compatible flows using supported commands only
  (setLocation, copyTextFrom, evalScript, inputText, eraseText, runFlow with
  conditions, assertVisible, assertNotVisible, extendedWaitUntil,
  scrollUntilVisible, takeScreenshot).
- Do not assume element identifiers; inspect the UI hierarchy or request
  screenshots of each screen in this flow.

Flow structure recommendation:
- cdd/cdd_low_beneficiary_id.yaml – Case 1
- common/download_beneficiary_ids.yaml – Step 1
- common/register_household.yaml – Steps 2–8, taking CONSENT as a parameter
- common/add_member.yaml – reused in Steps 7 and 13
- common/eligibility_checklist.yaml – taking the answers as a parameter
- cdd/cdd_accept_stock.yaml – Step 11, reusing accept_variant.yaml and
  read_stock_balance.yaml
- common/open_household.yaml – village → search → open household
- common/deliver_dose.yaml – taking MEMBER_NAME and EXPECTED_PRODUCT
- cdd/cdd_registration_full.yaml – runs Case 1, then Steps 1–15 in order
```
