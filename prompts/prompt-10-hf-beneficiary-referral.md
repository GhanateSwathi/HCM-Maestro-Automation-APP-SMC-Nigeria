# Prompt 10 — Health Facility: Create Beneficiary Referral (Direct)

Given in conversation on 2026-10-21, as written below; recovered unchanged from
that session's transcript on 2026-10-23.

- **Implemented by:** [`hf-beneficiary-referral.yaml`](../flows/referral/hf-beneficiary-referral.yaml)
- **Test cases:** REF-01–07 in [TEST-CASES.md](../TEST-CASES.md), which also records
  where the flows differ from this text and why.

---

```
Maestro Mobile App Automation Prompt 10 – Health Facility: Create Beneficiary Referral (Direct)

Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: Verify that the Health Facility user can create beneficiary referrals
directly, one record for each of the four referral reasons, complete the
reason-specific checklist for each, and sync all four records.

1. Precondition
- Prompt 1 Test Case 2 (Health Facility login, AU-HFS-001) must pass.
- Reuse the Prompt 1 login, permissions, and boundary selection subflows through
  runFlow.
- Use credentials from the secure test configuration. Do not embed passwords.

Test data (pass via environment variables):
- TEST_USER = AU-HFS-001
- REFERRAL_VILLAGE = optional; if not set, select the first available village
  and record it
- REFERRAL_CYCLE = optional; if not set, select the first available cycle
- REASON_1 = Fever
- REASON_2 = Sick
- REASON_3 = Drug side effect from the current cycle 
- REASON_4 = Drug side effect from the previous cycle 
- CHILD_AGE_MONTHS = a valid age in months for the referral form
 3 months to 59 months – the allowed age range]
- CHILD_GENDER = optional; if not set, select the first available gender option
- Checklist answers per reason (see section 6)

Child names:
- Generate a unique child name for each record at runtime, for example
  "AutoChild_<reason>_<timestamp>", using evalScript. This makes each record
  identifiable after creation and sync, and avoids clashes with earlier runs.
- Store each generated name for verification and for the execution report.

2. Login and Navigate to Beneficiary Referral
- Run the Prompt 1 Health Facility flow: login as AU-HFS-001, wait for
  synchronization, handle permissions, checkbox + Continue, select the Health
  Facility boundary, confirm.
- Wait for the home screen to load.
- Tap "Beneficiary Referral".
- Wait for the Beneficiary Referral screen to load using an element-based wait.

3. Village Selection
- Select REFERRAL_VILLAGE if configured; otherwise select the first available
  village dynamically. Do not hardcode village names.
- Verify the selected village is displayed.
- If no villages are available, fail with:
  "No villages available in Beneficiary Referral for AU-HFS-001."

4. Create Referral Record (create_referral.yaml – reusable subflow)
Takes REASON, CHILD_NAME, and the checklist answers for that reason.

Step 1 – Start a new referral:
- Tap "Create New Referral".
- Wait for the Health Facility Details screen.

Step 2 – Health Facility Details:
- Tap the health facility shown on the screen.
  [TO BE CONFIRMED BY QA – whether this is a dropdown, a selectable card, or a
  pre-filled field, and whether it must match the logged-in Health Facility.]
- Verify the health facility is selected.
- Tap "Next".
- Wait for the Referral Details screen.

Step 3 – Referral Details form:
- Cycle: open the dropdown and select REFERRAL_CYCLE, or the first available
  option. Verify the selection.
- Name of the child: enter CHILD_NAME.
- Age in months: enter CHILD_AGE_MONTHS.
- Gender: open the dropdown and select CHILD_GENDER, or the first available
  option. Verify the selection.
- Reason: open the reason dropdown and select REASON.
  - If REASON is not in the dropdown, fail with:
    "Referral reason <REASON> not available."
- Verify all fields show the entered or selected values.

Step 4 – Reason-specific checklist:
- After the reason is selected (and Next is tapped, if required), wait for the
  checklist screen for REASON.
  [TO BE CONFIRMED BY QA – whether the checklist opens automatically after the
  reason is selected or after tapping Next.]
- Verify the checklist title or header matches REASON.
- Fill every mandatory checklist question using the answers configured for REASON.
- Tap "Submit".
- Handle a confirmation popup if one appears and tap Confirm.

Step 5 – Success screen:
- Wait for the success screen using an element-based wait.
- Verify the success message is displayed.
  [TO BE CONFIRMED BY QA – exact success message text.]
- Capture any referral ID shown on the success screen.
- Capture a screenshot.
- Tap "Go Back".
- Verify the app returns to the Beneficiary Referral screen, so the next record
  can be created.

5. Test Cases – One referral per reason
Run create_referral.yaml four times, in this order:
- Test Case 1: REASON = REASON_1 ,CHILD_NAME =
 AutoChild_Fever_<timestamp>
- Test Case 2: REASON = REASON_2 , CHILD_NAME = 
AutoChild_Sick_<timestamp>
- Test Case 3: REASON = REASON_3, CHILD_NAME = AutoChild_<REASON_3>_<timestamp>
- Test Case 4: REASON = REASON_4, CHILD_NAME = AutoChild_<REASON_4>_<timestamp>

Error handling:
- If one record fails, capture a screenshot, report the failure for that reason,
  return to the Beneficiary Referral screen, and continue with the next reason.
  Each reason's result is reported separately.
- Do not start sync until all four create attempts have finished.

6. Checklist Data per Reason
For each reason, provide the checklist questions and the answers to select:
- REASON_1 – questions and answers]
- REASON_2 – questions and answers]
- REASON_3: – questions and answers]
- REASON_4: – questions and answers]
If no specific answers are configured, answer each mandatory question with the
first available option and record the selections.

7. Verify Created Records Before Sync
- On the Beneficiary Referral screen, verify all four child names appear in the
  referral list (use scrollUntilVisible for each name).
- Verify each record shows as pending sync, if the app shows a sync status.
  [TO BE CONFIRMED BY QA – how unsynced records are indicated.]
- Capture a screenshot.

8. Sync the Four Records
- Trigger sync.
  [TO BE CONFIRMED BY QA – location of the sync action, e.g. home screen sync
  button or a menu option.]
- Wait for synchronization to complete using an element-based wait with an
  appropriate timeout.
- Verify sync succeeded:
  - A sync success message is shown, and/or
  - The pending-sync count is 0, and/or
  - Each of the four records shows as synced.
  [TO BE CONFIRMED BY QA – how sync success is shown.]
- If sync fails or times out, capture a screenshot and fail with:
  "Referral sync failed: <message>."
- Capture a screenshot.

9. Element Identification and Synchronization
- Prefer resource IDs, accessibility IDs, accessibility labels, and visible text.
- Do not use hardcoded coordinates unless no reliable locator exists.
- Do not hardcode village, cycle, or gender values; use test data or select by
  position at runtime.
- Use element-based waits (extendedWaitUntil) instead of fixed delays.
- On failure, capture a screenshot and report a meaningful error. Do not silently
  skip steps.

10. Validation Checklist
- Beneficiary Referral opens for the Health Facility user.
- Village is selected.
- Create New Referral opens the Health Facility Details screen.
- Health facility is selected, and Next opens Referral Details.
- Cycle, child name, age, gender, and reason are entered correctly.
- The correct checklist opens for each reason and can be submitted.
- The success screen appears, and Go Back returns to the referral screen.
- Four records are created, one per reason.
- All four records sync successfully.

11. Execution Report
- User role and account (Health Facility – AU-HFS-001).
- Village and cycle selected.
- For each reason:
  - Child name, age, and gender used.
  - Checklist answers selected.
  - Submission result and referral ID (if shown).
- Records visible before sync: 4 expected, actual count.
- Sync result and per-record sync status.
- Failed steps, error messages, and screenshots.

Flow structure recommendation:
- common/create_referral.yaml – reusable subflow taking REASON, CHILD_NAME, and
  checklist answers
- common/checklists/checklist_<reason>.yaml – one subflow per reason's checklist,
  since each reason has different questions
- health_facility/hf_beneficiary_referral.yaml – login → Beneficiary Referral →
  select village → create_referral.yaml × 4 → verify list → sync → verify sync
```
