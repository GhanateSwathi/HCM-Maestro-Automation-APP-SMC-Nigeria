# Prompt 13 — CDD: Household with 20 Members and Unable to Deliver (4 Reasons)

Given in conversation on 2026-10-22, as written below; recovered unchanged from
that session's transcript on 2026-10-23.

- **Implemented by:** [`cdd-household-utd.yaml`](../flows/registration/cdd-household-utd.yaml)
- **Test cases:** UTD-01–09 in [TEST-CASES.md](../TEST-CASES.md), which also records
  where the flows differ from this text and why.
- **Note:** The product check before Unable to Deliver was dropped at the user's request on 2026-10-22; TEST-CASES.md has the details.

---

```
Maestro Mobile App Automation Prompt 13 – CDD: Household with 20 Members and Unable to Deliver (4 Reasons)

Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: Verify that the CDD user can register a household with consent Yes and
20 total household members, add four child beneficiaries, and record Unable to
Deliver for each child with a different reason, without reducing stock.

1. Precondition
- Prompt 1 Test Case 3 (Distributor/CDD login, AU-CDD-001) must pass.
- Prompt 11 must have passed: beneficiary IDs downloaded, and the CDD has
  accepted stock for SPAQ1 and SPAQ2.
- Reuse existing subflows through runFlow:
  - Prompt 1 login, permissions, and boundary selection subflows
  - Prompt 11 register_household.yaml (CONSENT = YES), add_member.yaml,
    eligibility_checklist.yaml, open_household.yaml, read_stock_balance.yaml
- Use credentials from the secure test configuration. Do not embed passwords.

Test data (pass via environment variables):
- TEST_USER = AU-CDD-001
- REGISTRATION_VILLAGE = the same village as Prompt 11, or the first available
- TEST_LATITUDE / TEST_LONGITUDE = the same mock coordinates as Prompt 11
- CONSENT = YES
- HOUSEHOLD_MEMBERS = 20
- HEAD_AGE_YEARS = 35, HEAD_AGE_MONTHS = 0
- HEAD_GENDER = Female or Male
- HEAD_MOBILE = an 11-digit test mobile number (not a real person's number)
- Child members (two per age band, so both products are covered):
  - CHILD_1: 6 months (SPAQ1 band)
  - CHILD_2: 9 months (SPAQ1 band)
  - CHILD_3: 24 months (SPAQ2 band)
  - CHILD_4: 48 months (SPAQ2 band)
- UTD_REASON_1 to UTD_REASON_4 = the four Unable to Deliver reasons
  [TO BE CONFIRMED BY QA – exact reason names. If not configured, read the reason
  dropdown at runtime and use its options in order, 1 to 4.]

Unique names (generated at runtime with evalScript):
- HEAD_FIRST_NAME = "AutoUTDHead<timestamp>", HEAD_LAST_NAME = "Test"
- CHILD_n_FIRST_NAME = "AutoUTDChild<n><timestamp>", CHILD_n_LAST_NAME = "Test"
  (n = 1 to 4)
- SEARCH_TEXT = the first 3 or more characters of HEAD_FIRST_NAME

2. Login and Register the Household
- Run the Prompt 1 Distributor/CDD flow and wait for the home screen.
- Read the CDD stock balances for SPAQ1 and SPAQ2 with read_stock_balance.yaml.
  Store them as START_BALANCE_SPAQ1 and START_BALANCE_SPAQ2.
- Open "Registration & Delivery", select REGISTRATION_VILLAGE, type SEARCH_TEXT,
  and tap "Register Beneficiary".
- Beneficiary Location: grant the location permission if shown, set the mock
  location with setLocation, wait for lat/long to be captured, tap "Save Location".
- Caregiver Consent: tap "Yes", then "Submit".
- Household Details: enter HOUSEHOLD_MEMBERS (20). Verify 20 is accepted (it is
  the maximum allowed), and tap "Save Household Details".
- Beneficiary Details (head of household): enter HEAD_FIRST_NAME,
  HEAD_LAST_NAME, HEAD_AGE_YEARS, HEAD_AGE_MONTHS, HEAD_GENDER, and HEAD_MOBILE,
  then tap "Save Beneficiary".
- Verify the Household Overview screen shows the head of household.

3. Add the Four Child Members
For each CHILD_n (n = 1 to 4), run add_member.yaml:
- Tap "Add Member".
- Enter CHILD_n_FIRST_NAME, CHILD_n_LAST_NAME, the child's age in months, and a gender.
- Tap "Save Beneficiary".
- Verify the child appears on the Household Overview screen.

After all four children are added:
- Verify the Household Overview shows the head of household and all four children
  (5 members registered out of a household total of 20).
  [TO BE CONFIRMED BY QA – whether the app allows submitting with fewer members
  registered than the household total. If all 20 must be registered, add 15 more
  generated members with add_member.yaml before submitting.]
- Tap "Submit" in the "Ready to Submit" popup.
- Tap "View Household Details" and verify all registered members are shown.

4. Unable to Deliver – one reason per child
Run unable_to_deliver.yaml for each child, with a different reason each time:

| Test case | Child | Age | Product band | Reason |
| --- | --- | --- | --- | --- |
| 1 | CHILD_1 | 6 months | SPAQ1 | UTD_REASON_1 |
| 2 | CHILD_2 | 9 months | SPAQ1 | UTD_REASON_2 |
| 3 | CHILD_3 | 24 months | SPAQ2 | UTD_REASON_3 |
| 4 | CHILD_4 | 48 months | SPAQ2 | UTD_REASON_4 |

unable_to_deliver.yaml steps (parameters: MEMBER_NAME, EXPECTED_PRODUCT, REASON):
- Open MEMBER_NAME from the household details and tap "Dose".
- If the eligibility checklist appears, answer all questions "No" and submit
  through "Ready to Submit".
- On the delivery screen, verify EXPECTED_PRODUCT is the product shown.
- Tap "Unable to Deliver".
  [TO BE CONFIRMED BY QA – where this action is, e.g. on the delivery screen or on
  the member's card.]
- Open the reason dropdown and select REASON.
  - If reasons are read at runtime, verify the dropdown has at least 4 options,
    and select option n for child n. If fewer than 4 exist, select what is
    available and report a failure.
- Enter a comment if the form requires one.
  [TO BE CONFIRMED BY QA – whether a comment is required.]
- Tap "Submit", and Confirm if a popup appears.
- Verify the success message or status update.
  [TO BE CONFIRMED BY QA – success message, and how the child's status is shown
  afterward, e.g. "Not delivered" with the reason.]
- Verify the dose was NOT recorded for this child.
- Capture a screenshot.
- Return to the household details screen.

Error handling:
- If one child fails, report it, return to the household details screen, and
  continue with the next child. Report each child separately.
- Never reuse a reason already applied to another child in this run.

5. Final Verification
- On the household details screen, verify each child shows its Unable to Deliver
  status and its reason.
- Read the CDD stock balances again and verify:
  - SPAQ1 balance = START_BALANCE_SPAQ1 (unchanged)
  - SPAQ2 balance = START_BALANCE_SPAQ2 (unchanged)
- If a balance changed, fail with:
  "Stock reduced after Unable to Deliver for <variant>: expected <start>,
  found <actual>."
- Capture a screenshot.

6. Element Identification and Synchronization
- Prefer resource IDs, accessibility IDs, accessibility labels, and visible text.
- Do not use hardcoded coordinates unless no reliable locator exists.
- Locate each child by its generated name, not by list position.
- Use scrollUntilVisible when the member list is longer than the screen.
- Use element-based waits (extendedWaitUntil) instead of fixed delays.
- On failure, capture a screenshot and report a meaningful error. Do not silently
  skip steps.

7. Validation Checklist
- Household is registered with consent Yes and 20 total members.
- Head of household and four children are saved and shown.
- Each child shows the correct product band on the delivery screen.
- Unable to Deliver can be recorded with each of the four reasons.
- Each child shows its Unable to Deliver status and reason.
- No dose is recorded, and CDD stock balances are unchanged.

8. Execution Report
- User role and account (Distributor/CDD – AU-CDD-001).
- Village, generated names, and search text used.
- Household total entered (20) and members registered (count).
- For each child: name, age, expected product, product shown, reason selected,
  result, and status shown afterward.
- CDD stock balances before and after (SPAQ1, SPAQ2).
- Failed steps, error messages, and screenshots.

Flow structure recommendation:
- common/unable_to_deliver.yaml – taking MEMBER_NAME, EXPECTED_PRODUCT, and REASON
- cdd/cdd_household_20_utd.yaml – login → read start balances → register
  household (consent Yes, 20 members) → add 4 children → submit →
  unable_to_deliver.yaml × 4 → final verification
```
