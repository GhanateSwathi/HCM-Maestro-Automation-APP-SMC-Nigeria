# Prompt 19 — CDD: Eligibility Checklist Leading to Referral or Ineligible

Written 2026-10-27 in the format of Prompts 1–14, from the eligibility
checklist, its popup and the Refer Beneficiary form as AU-CDD-001 saw them
that day (runs 20261027-142832 to -144801).

- **Implemented by:** [`cdd-eligibility-referral.yaml`](../flows/registration/cdd-eligibility-referral.yaml)
- **Test cases:** ELG-01–06 in [TEST-CASES.md](../TEST-CASES.md), which also records
  where the flow differs from this text and why.

---

```
Maestro Mobile App Automation Prompt 19 – CDD: Eligibility Checklist Leading to Referral or Ineligible

Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: Verify that the Distributor/CDD's eligibility checklist sends a
child to the referral flow when the child is sick, has fever, or had a side
effect from last cycle's SPAQ, and marks the child ineligible when the child
has taken SP or CTX containing drugs in the past 28 days.

1. Precondition
- Prompt 1 Test Case 3 (Distributor/CDD login, AU-CDD-001) must pass.
- Beneficiary IDs can be downloaded (Prompt 11 Step 1; "Re-Fetch IDs" if the
  limit popup appears).
- No stock is needed: no dose is given in this prompt.
- Reuse existing subflows through runFlow:
  - Prompt 1 login, permissions, and boundary selection subflows
  - Prompt 11 registration subflows (household, head, Add Members) and the
    eligibility checklist
- Use credentials from the secure test configuration. Do not embed passwords.

Test data (pass via environment variables):
- TEST_USER = AU-CDD-001
- REGISTRATION_VILLAGE = the first available village, or the one Prompt 11 uses
- ELIG_HOUSEHOLD_MEMBERS = 5 (the head and four children)
- ELIG_HEAD_AGE_YEARS = 34, ELIG_HEAD_AGE_MONTHS = 0
- ELIG_CHILD_1_AGE_MONTHS = 6, ELIG_CHILD_2_AGE_MONTHS = 9,
  ELIG_CHILD_3_AGE_MONTHS = 24, ELIG_CHILD_4_AGE_MONTHS = 48
- ELIG_HEAD_GENDER / ELIG_CHILD_GENDER = blank (the first offered)
- ELIG_REFERRAL_FACILITY = blank (the first health facility offered)

Unique names (generated at runtime with evalScript):
- HEAD_FIRST_NAME = "AutoEligHead<timestamp>"
- CHILD_n_FIRST_NAME = "AutoEligChild<n><timestamp>"

The checklist (read off the app 2026-10-27), each question with Yes / No:
- Is the child sick?
- Is the child having fever?
- Is the child given SPAQ for the first time?(Not administered in the
  previous cycle) – answering No adds:
  - Is there any side effect to SPAQ which was administered last cycle?
- Child has taken SP or CTX containing drugs in the past 28 days?

2. Login and Register the Household
- Run the Prompt 1 Distributor/CDD flow and wait for the home screen.
- Register a household with consent Yes and ELIG_HOUSEHOLD_MEMBERS members:
  the head of household, then children 1 to 4, each submitted.
- Read each child's beneficiary ID ("Token ID") from its success screen.
- Verify Household Overview lists all five.

3. Test Case 1 – Sick: referral popup, Cancel, referral
- On child 1's card tap "Dose". The Eligibility Assessment opens.
- Answer "Is the child sick?" Yes and every other question No.
- Tap "Save Delivery".
- Verify the popup "Ready to submit ?" says "Based on responses you are going
  to 'referral flow'. Are you sure you want to proceed?" with Submit and Cancel.
- Tap "Cancel". Verify the checklist is back with the answers kept.
- Tap "Save Delivery" again, then "Submit".
- Verify "Refer Beneficiary" opens with "Administrative unit" = the village
  and "Referred by" = CDD, both read-only, and "Health facility" empty.
- Tap "Submit" with no facility: verify "This field is required".
- Select ELIG_REFERRAL_FACILITY (or the first offered) and tap "Submit".
- Verify "Referral recorded successfully" and "ID-<child 1's beneficiary ID>",
  with "View Household Details" and "Go Back".
- Tap "View Household Details". Verify child 1's card shows
  "Beneficiary Referred" and no longer offers Dose.
- Capture screenshots at the popup, the form and the card.

4. Test Case 2 – Fever: referral
- On child 2's card tap "Dose". Answer "Is the child having fever?" Yes and
  every other question No.
- Save Delivery -> verify the referral popup -> Submit -> Refer Beneficiary ->
  select the facility -> Submit -> "Referral recorded successfully".
- Verify child 2's card shows "Beneficiary Referred".

5. Test Case 3 – Side effect from last cycle's SPAQ: referral
- On child 3's card tap "Dose". Answer "Is the child given SPAQ for the first
  time?" No, so the side-effect question appears; answer it Yes, and every
  other question No.
- As Test Case 2: referral popup, Refer Beneficiary, "Referral recorded
  successfully", child 3's card shows "Beneficiary Referred".

6. Test Case 4 – SP or CTX taken: ineligible
- On child 4's card tap "Dose". Answer "Child has taken SP or CTX containing
  drugs in the past 28 days?" Yes and every other question No.
- Tap "Save Delivery". Verify the popup states the child is ineligible.
  [TO BE CONFIRMED BY QA – the popup's exact wording.]
- Tap "Submit".
- Verify the referral form does NOT open, the app returns to Household
  Overview, and child 4's card shows an ineligible status with no Dose.
  [TO BE CONFIRMED BY QA – the status label.]

7. Test Case 5 – Final verification
- On Household Overview verify children 1 to 3 show "Beneficiary Referred"
  and child 4 the ineligible status.

8. Test Case 6 – Sync
- Go home and run Sync Data until "No Data available for sync".

9. Element Identification and Synchronization
- Prefer resource IDs, accessibility IDs, accessibility labels, and visible text.
- The Yes / No radio buttons carry no text and report no state: tap the one
  left of its label, below its question.
- Do not use hardcoded coordinates unless no reliable locator exists.
- Use element-based waits (extendedWaitUntil) instead of fixed delays.
- On failure, capture a screenshot and report a meaningful error. Do not silently
  skip steps.

10. Validation Checklist
- A Yes to sick, fever or the side-effect question shows the referral popup.
- Cancel keeps the answers; Submit opens Refer Beneficiary.
- The health facility is mandatory; the referral is recorded with the
  child's ID; the card shows Beneficiary Referred, without Dose.
- A Yes to SP or CTX shows the ineligible popup and marks the child
  ineligible without the referral form.
- The records sync.

11. Execution Report
- User, village, and the household registered (names, ages, IDs).
- For each child: the question answered Yes, the popup text, the form's
  values and facility (referral), the success message, and the card status.
- Sync result.
- Failed steps, deviations, error messages, and screenshots.

Flow structure recommendation:
- cdd/cdd_eligibility_referral.yaml – login → household of 5 → Test Cases 1
  to 6
- registration/elig_case.yaml – one child: Dose, checklist with one Yes,
  the popup, then the referral form or the ineligible outcome, the card
- registration/elig_refer.yaml – the Refer Beneficiary form
```
