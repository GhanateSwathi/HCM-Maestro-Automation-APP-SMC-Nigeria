# Prompt 14 — CDD: Household with 6 Children, Dose and Redose

Given in conversation on 2026-10-22, as written below; recovered unchanged from
that session's transcript on 2026-10-23.

- **Implemented by:** [`cdd-household-redose.yaml`](../flows/registration/cdd-household-redose.yaml)
- **Test cases:** RDS-01–10 in [TEST-CASES.md](../TEST-CASES.md), which also records
  where the flows differ from this text and why.

---

```
Maestro Mobile App Automation Prompt 14 – CDD: Household with 6 Children, Dose and Redose

Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: Verify that the CDD user can register a household of 7 members (head of
household + 6 children), give a dose and then a redose to the same beneficiary for
child 1 (SPAQ1) and child 2 (SPAQ2), and that stock is deducted correctly for each
dose and redose.

1. Precondition
- Prompt 1 Test Case 3 (Distributor/CDD login, AU-CDD-001) must pass.
- Prompt 11 must have passed: beneficiary IDs downloaded, and the CDD has stock
  for SPAQ1 and SPAQ2.
- The CDD stock balance must cover two doses of each product (a dose and a redose).
  If it does not, mark the redose cases BLOCKED with the balance found.
- Reuse existing subflows through runFlow:
  - Prompt 1 login, permissions, and boundary selection subflows
  - Prompt 11 register_household.yaml (CONSENT = YES), add_member.yaml,
    eligibility_checklist.yaml, open_household.yaml, deliver_dose.yaml,
    read_stock_balance.yaml
- Use credentials from the secure test configuration. Do not embed passwords.

Test data (pass via environment variables):
- TEST_USER = AU-CDD-001
- REGISTRATION_VILLAGE = the same village as Prompt 11, or the first available
- TEST_LATITUDE / TEST_LONGITUDE = the same mock coordinates as Prompt 11
- CONSENT = YES
- HOUSEHOLD_MEMBERS = 7
- HEAD_AGE_YEARS = 32, HEAD_AGE_MONTHS = 0
- HEAD_GENDER = Female or Male
- HEAD_MOBILE = an 11-digit test mobile number (not a real person's number)
- Children:
  - CHILD_1: 6 months (SPAQ1) – dose + redose in this prompt
  - CHILD_2: 24 months (SPAQ2) – dose + redose in this prompt
  - CHILD_3: 4 months (SPAQ1)
  - CHILD_4: 10 months (SPAQ1)
  - CHILD_5: 15 months (SPAQ2)
  - CHILD_6: 50 months (SPAQ2)
  (Children 3–6 are registered to complete the 7-member household and are
  available for later test cases.)
- REDOSE_REASON = [TO BE CONFIRMED BY QA – e.g. "Vomited within 30 minutes", if
  the redose form asks for a reason]

Unique names (generated at runtime with evalScript):
- HEAD_FIRST_NAME = "AutoRedoseHead<timestamp>", HEAD_LAST_NAME = "Test"
- CHILD_n_FIRST_NAME = "AutoRedoseChild<n><timestamp>", CHILD_n_LAST_NAME = "Test"
  (n = 1 to 6)
- SEARCH_TEXT = the first 3 or more characters of HEAD_FIRST_NAME

2. Login and Register the Household
- Run the Prompt 1 Distributor/CDD flow and wait for the home screen.
- Read the CDD stock balances with read_stock_balance.yaml and store them as
  START_BALANCE_SPAQ1 and START_BALANCE_SPAQ2.
- Open "Registration & Delivery", select REGISTRATION_VILLAGE, type SEARCH_TEXT,
  and tap "Register Beneficiary".
- Beneficiary Location: grant the location permission if shown, set the mock
  location with setLocation, wait for lat/long to be captured, tap "Save Location".
- Caregiver Consent: tap "Yes", then "Submit".
- Household Details: enter HOUSEHOLD_MEMBERS (7), and tap "Save Household Details".
- Beneficiary Details: enter the head of household's details, then tap
  "Save Beneficiary".

3. Add the Six Children
- For each CHILD_n (n = 1 to 6), run add_member.yaml with the child's name, age,
  and gender, and verify the child appears on the Household Overview screen.
- Verify the Household Overview shows 7 members: the head of household and six
  children.
- Tap "Submit" in the "Ready to Submit" popup.
- Tap "View Household Details" and verify all 7 members are shown.

4. Test Case 1 – Child 1 (6 months, SPAQ1): dose, then redose

Step 1 – Dose:
- Run deliver_dose.yaml with MEMBER_NAME = CHILD_1 and EXPECTED_PRODUCT = SPAQ1:
  Dose → eligibility checklist all "No" → submit → verify SPAQ1 is offered and
  SPAQ2 is not → capture the dose quantity as DOSE_QTY_C1 → Record Cycle Dose →
  verify success.
- Read the SPAQ1 balance and verify:
  SPAQ1 = START_BALANCE_SPAQ1 − DOSE_QTY_C1
- Capture a screenshot.

Step 2 – Redose (same beneficiary):
- Return to the household details and open CHILD_1.
- Verify the redose action is now available for CHILD_1.
  [TO BE CONFIRMED BY QA – label of the redose action and where it appears, and
  whether it is only available within a time window after the dose.]
- Tap the redose action.
- Fill the redose form or checklist, and enter REDOSE_REASON if a reason is asked for.
  [TO BE CONFIRMED BY QA – the redose form's fields.]
- Verify the product offered for redose is SPAQ1, and that SPAQ2 is not offered.
- Capture the redose quantity as REDOSE_QTY_C1.
- Tap the record or submit action, and Confirm if a popup appears.
- Verify the redose is recorded successfully.
  [TO BE CONFIRMED BY QA – success message, and how the dose and redose are shown
  on the child's record.]
- Read the SPAQ1 balance and verify:
  SPAQ1 = START_BALANCE_SPAQ1 − DOSE_QTY_C1 − REDOSE_QTY_C1
- Store the result as BALANCE_SPAQ1_AFTER_C1.
- Capture a screenshot.

Step 3 – Redose limit (optional negative check):
- Open CHILD_1 again and verify a second redose is not offered.
  [TO BE CONFIRMED BY QA – whether only one redose is allowed per dose.]

5. Test Case 2 – Child 2 (24 months, SPAQ2): dose, then redose
- Repeat the Test Case 1 steps for CHILD_2 with EXPECTED_PRODUCT = SPAQ2:
  - Dose: verify SPAQ2 is offered and SPAQ1 is not, capture DOSE_QTY_C2, record
    the dose, and verify:
    SPAQ2 = START_BALANCE_SPAQ2 − DOSE_QTY_C2
  - Redose: verify the redose action, verify SPAQ2 is offered for redose, capture
    REDOSE_QTY_C2, record the redose, and verify:
    SPAQ2 = START_BALANCE_SPAQ2 − DOSE_QTY_C2 − REDOSE_QTY_C2
  - Redose limit (optional): verify a second redose is not offered.
- Verify the SPAQ1 balance is still BALANCE_SPAQ1_AFTER_C1, so child 2's doses did
  not affect SPAQ1.
- Capture a screenshot.

Error handling:
- If a dose fails, do not attempt the redose for that child; mark it BLOCKED.
- If child 1 fails, still run child 2, and report each child separately.
- On a balance mismatch, fail with:
  "<variant> balance mismatch after <dose/redose> for <child>: expected
  <expected>, found <actual>."

6. Final Verification
- On the household details screen, verify:
  - CHILD_1 shows a dose and a redose recorded (SPAQ1).
  - CHILD_2 shows a dose and a redose recorded (SPAQ2).
  - Children 3–6 show no doses recorded.
- Capture a screenshot.

7. Element Identification and Synchronization
- Prefer resource IDs, accessibility IDs, accessibility labels, and visible text.
- Do not use hardcoded coordinates unless no reliable locator exists.
- Locate each child by its generated name, not by list position.
- Do not hardcode dose quantities or balances; capture them at runtime.
- Use element-based waits (extendedWaitUntil) instead of fixed delays.
- On failure, capture a screenshot and report a meaningful error. Do not silently
  skip steps.

8. Validation Checklist
- Household is registered with consent Yes and 7 members (head + 6 children).
- Child 1 (6 months) is offered SPAQ1 for both the dose and the redose.
- Child 2 (24 months) is offered SPAQ2 for both the dose and the redose.
- The redose action appears only after a dose is recorded.
- The dose and the redose each deduct stock from the correct product.
- One child's doses do not affect the other product's balance.

9. Execution Report
- User role and account (Distributor/CDD – AU-CDD-001).
- Village, generated names, and search text used.
- Members registered (7 expected, actual).
- For child 1 and child 2: age, product offered for the dose and the redose,
  dose quantity, redose quantity, result of each, and the balance after each.
- Redose limit check results (if run).
- CDD stock balances at the start and the end (SPAQ1, SPAQ2).
- Failed steps, error messages, and screenshots.

Flow structure recommendation:
- common/redose.yaml – taking MEMBER_NAME, EXPECTED_PRODUCT, and REDOSE_REASON
- cdd/cdd_household_redose.yaml – login → read start balances → register
  household (7 members) → add 6 children → submit → child 1 dose + redose →
  child 2 dose + redose → final verification
```
