# Prompt 18 — CDD: Search Beneficiary by Near by Households and by ID

Written 2026-10-27 in the format of Prompts 1–14, from the Search Beneficiary
screen as AU-CDD-001 saw it that day and the app's flow configuration
(egovernments/health-campaign-field-worker-app, `registration_smc_flows.dart`).

- **Implemented by:** [`cdd-search-nearby-and-id.yaml`](../flows/registration/cdd-search-nearby-and-id.yaml)
- **Test cases:** SRC-01–11 in [TEST-CASES.md](../TEST-CASES.md), which also records
  where the flow differs from this text and why.

---

```
Maestro Mobile App Automation Prompt 18 – CDD: Search Beneficiary by Near by Households and by ID

Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: Verify that the Distributor/CDD can find a household on the Search
Beneficiary screen without typing a name - with "Near by households" (the
households registered around the device's location) and with "Search by ID"
(a member's beneficiary ID) - and that turning either switch off returns the
screen to the name search.

1. Precondition
- Prompt 1 Test Case 3 (Distributor/CDD login, AU-CDD-001) must pass.
- The device's location is available: location permission granted at Allow
  Permissions, GPS on. "Near by households" stays disabled until the app has
  a position.
- Search reads the households on the device. A fresh sign-in holds none while
  the CDD's boundary data download fails, so the flow first adds its own
  household (new records) where the device is.
- Reuse existing subflows through runFlow:
  - Prompt 1 login, permissions, and boundary selection subflows
  - Prompt 11 registration subflows (beneficiary ID download, location,
    consent Yes, household details, head of household, Add Members)
- Use credentials from the secure test configuration. Do not embed passwords.

Test data (pass via environment variables):
- TEST_USER = AU-CDD-001
- REGISTRATION_VILLAGE = the first available village, or the one Prompt 11 uses
- TEST_LATITUDE / TEST_LONGITUDE = blank, so the household is registered at
  the device's own position (and is therefore "near by")
- SEARCH_HOUSEHOLD_MEMBERS = 2
- SEARCH_HEAD_AGE_YEARS = 30, SEARCH_HEAD_AGE_MONTHS = 0
- SEARCH_CHILD_1_AGE_MONTHS = 6
- SEARCH_HEAD_GENDER / SEARCH_CHILD_GENDER = blank (the first offered)
- SEARCH_UNKNOWN_ID = 000000000000 (an ID no beneficiary has)

Unique names (generated at runtime with evalScript):
- HEAD_FIRST_NAME = "AutoSearchHead<timestamp>"
- CHILD_FIRST_NAME = "AutoSearchChild1<timestamp>"

2. Login and Add New Records
- Run the Prompt 1 Distributor/CDD flow and wait for the home screen.
- Tap "Registration & Delivery", select REGISTRATION_VILLAGE, type
  HEAD_FIRST_NAME and tap "Register Beneficiary".
- If the "Low Beneficiary IDs" popup appears, download the IDs (Prompt 11
  Step 1). If "Limit exceeded to fetch Beneficiary IDs" appears, tap
  "Re-Fetch IDs".
- Capture the location, answer consent Yes, enter a household of
  SEARCH_HOUSEHOLD_MEMBERS, save the head of household, then Add Members ->
  child 1 -> Save Beneficiary -> Submit.
- Read child 1's beneficiary ID from the success screen ("Token ID: <id>")
  as BENEFICIARY_ID.
- Verify Household Overview lists the head of household and child 1.
- Go home, reopen Registration & Delivery and the same village. The search
  field is empty.

3. Test Case 1 – The search options
- Verify "Near by households" and "Search by ID" are displayed, each with a
  switch, both off.
- Verify the search field shows "Name of the individual".

4. Test Case 2 – Near by households on
- Turn "Near by households" on (the switch left of its label).
- Without typing anything, verify households are listed and that the
  household added in Step 2 is among them (its head's row: age and gender).
  [TO BE CONFIRMED BY QA – the radius (5 km in the app's sample configuration)
  and whether each card shows a distance.]
- Capture a screenshot.

5. Test Case 3 – Near by households off
- Turn "Near by households" off.
- Verify the list clears and the name search is back.

6. Test Case 4 – Search by ID on
- Turn "Search by ID" on.
- Verify the field's hint changes from "Name of the individual" to "Id Search".

7. Test Case 5 – Search by the full ID
- Type BENEFICIARY_ID.
- Verify the household is listed, with child 1's row (age and gender).
- Capture a screenshot.

8. Test Case 6 – Search by part of the ID
- Type the first 6 digits of BENEFICIARY_ID.
- Record whether the household is listed.
  [TO BE CONFIRMED BY QA – whether a partial ID should match.]

9. Test Case 7 – A name in ID mode
- Type HEAD_FIRST_NAME.
- Verify nothing is listed: ID mode does not search names.

10. Test Case 8 – An unknown ID
- Type SEARCH_UNKNOWN_ID.
- Verify nothing is listed.
  [TO BE CONFIRMED BY QA – whether a "no results" message should show.]

11. Test Case 9 – Search by ID off
- Turn "Search by ID" off.
- Verify the hint reads "Name of the individual" again and the field is cleared.
- Type HEAD_FIRST_NAME and verify the household is listed by name.

12. Test Case 10 – Open the household found by ID
- Turn "Search by ID" on, type BENEFICIARY_ID and tap "Open".
- Verify Household Overview lists child 1 with BENEFICIARY_ID.

13. Test Case 11 – Sync
- Go home and run Sync Data until "No Data available for sync".

14. Element Identification and Synchronization
- Prefer resource IDs, accessibility IDs, accessibility labels, and visible text.
- The switches carry no text and report no on/off state: tap the one left of
  its label, and judge its state by what the screen does (the list, the hint).
- Do not use hardcoded coordinates unless no reliable locator exists.
- Use element-based waits (extendedWaitUntil) instead of fixed delays.
- On failure, capture a screenshot and report a meaningful error. Do not silently
  skip steps.

15. Validation Checklist
- A household is added and child 1's beneficiary ID is read.
- Both switches are shown, off by default, with the name search active.
- Near by households lists the household added, without a name typed.
- Turning Near by households off clears the list.
- Search by ID changes the hint to "Id Search".
- The full ID finds the household; a name and an unknown ID find nothing.
- Turning Search by ID off brings the name search back, field cleared.
- The household found by ID opens on Household Overview with that ID.
- The new records sync.

16. Execution Report
- User and village; the household added (names, ages, genders) and
  BENEFICIARY_ID.
- Near by households: what was listed and whether the household was among it.
- Each ID search: the text typed and what was listed.
- Partial-ID result (for QA to confirm).
- Sync result.
- Failed steps, deviations, error messages, and screenshots.

Flow structure recommendation:
- cdd/cdd_search_nearby_and_id.yaml – login → add records (Prompt 11
  subflows) → reopen the village → Test Cases 1 to 11
- common/search_type.yaml – replace the search text and wait for the answer
- registration/search_nearby.yaml – Test Cases 1 to 3
- registration/search_by_id.yaml – Test Cases 4 to 10
```
