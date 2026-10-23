# Prompt 12 — CDD: Household Registration with Caregiver Consent (No)

Given in conversation on 2026-10-22, as written below; recovered unchanged from
that session's transcript on 2026-10-23.

- **Implemented by:** [`cdd-consent-no.yaml`](../flows/registration/cdd-consent-no.yaml)
- **Test cases:** CNS-01–07 in [TEST-CASES.md](../TEST-CASES.md), which also records
  where the flows differ from this text and why.

---

```
Maestro Mobile App Automation Prompt 12 – CDD: Household Registration with Caregiver Consent (No)

Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: Verify that the CDD user can register a household where caregiver
consent is No, that Cancel in the Ready to Submit popup returns to the Caregiver
Consent screen, and that Submit completes the registration and returns the user
to search.

1. Precondition
- Prompt 1 Test Case 3 (Distributor/CDD login, AU-CDD-001) must pass.
- Prompt 11 Case 2 Step 1 must have passed, so beneficiary IDs are already
  downloaded and the Low Beneficiary ID popup does not appear.
- Reuse existing subflows through runFlow:
  - Prompt 1 login, permissions, and boundary selection subflows
  - Prompt 11 register_household.yaml (Steps 2–3: reopen, search, register,
    location) with CONSENT = NO
- Use credentials from the secure test configuration. Do not embed passwords.

Test data (pass via environment variables):
- TEST_USER = AU-CDD-001
- REGISTRATION_VILLAGE = the same village used in Prompt 11, or the first
  available village
- TEST_LATITUDE / TEST_LONGITUDE = the same mock coordinates as Prompt 11
- CONSENT = NO
- CONSENT_REASON = test

Unique names (generated at runtime with evalScript):
- HEAD_FIRST_NAME = "AutoNoConsent<timestamp>"
- SEARCH_TEXT = the first 3 or more characters of HEAD_FIRST_NAME, so the search
  matches no existing household (including the Prompt 11 household).

2. Login and Start a New Registration
- Run the Prompt 1 Distributor/CDD flow and wait for the home screen.
- Tap "Registration & Delivery" and wait for the screen to load.
- Select REGISTRATION_VILLAGE.
- Type SEARCH_TEXT in the search bar.
- Verify "Register Beneficiary" is enabled, and tap it.
- Verify the Low Beneficiary ID popup does NOT appear. If it does, fail with:
  "Low Beneficiary ID popup shown; run Prompt 11 ID download first."

3. Beneficiary Location
- Wait for the Beneficiary Location screen.
- Grant the location permission prompt if shown.
- Set the mock location with setLocation using TEST_LATITUDE and TEST_LONGITUDE.
- Wait until latitude and longitude are captured and displayed.
- Tap "Save Location".

4. Caregiver Consent (No)
- Wait for the Caregiver Consent screen.
- Verify the "Yes" and "No" options are displayed.
- Tap "No".
- Verify a reason field appears.
  [TO BE CONFIRMED BY QA – whether the reason is a text field or a dropdown.]
- Optional negative check: leave the reason empty, tap "Submit", and verify it is
  blocked with a validation message.
  [TO BE CONFIRMED BY QA – whether the reason is mandatory when consent is No.]
- Enter CONSENT_REASON ("test").
- Tap "Submit".

5. Test Case 1 – Ready to Submit popup, Cancel
- Verify the "Ready to Submit" popup is displayed, with "Submit" and "Cancel" actions.
- Tap "Cancel".
- Verify the popup is dismissed (assertNotVisible on the popup title).
- Verify the user is back on the Caregiver Consent screen.
- Verify "No" is still selected and the reason still shows "test".
  [TO BE CONFIRMED BY QA – whether the selection and reason are kept after Cancel.
  If they are cleared, re-select "No" and re-enter the reason before Case 2.]
- Verify the household has NOT been registered (no success screen shown).
- Capture a screenshot.
- Report: "Cancel returned to Caregiver Consent; household not submitted."

6. Test Case 2 – Ready to Submit popup, Submit
- On the Caregiver Consent screen, tap "Submit".
- Verify the "Ready to Submit" popup is displayed again.
- Tap "Submit" in the popup.
- Wait for the success screen using an element-based wait.
- Verify the success message is displayed.
  [TO BE CONFIRMED BY QA – exact success message text.]
- Verify the flow did NOT continue to Household Details or Beneficiary Details,
  since consent was No.
- Capture a screenshot.
- Tap "Back to Search".
- Verify the app returns to the Registration & Delivery search screen.

7. Test Case 3 – Verify the household record after submission (optional)
- In the search bar, type SEARCH_TEXT again.
- Verify how the consent-refused household is shown.
  [TO BE CONFIRMED BY QA – whether it appears in search results with a "consent
  refused" status, or does not appear at all.]
- Verify that no dose action is available for this household, if it appears.
- Capture a screenshot.

8. Element Identification and Synchronization
- Prefer resource IDs, accessibility IDs, accessibility labels, and visible text.
- Do not use hardcoded coordinates unless no reliable locator exists.
- Use element-based waits (extendedWaitUntil) instead of fixed delays.
- Handle permission prompts conditionally.
- On failure, capture a screenshot and report a meaningful error. Do not silently
  skip steps.

9. Validation Checklist
- Register Beneficiary opens without the Low Beneficiary ID popup.
- Location is captured and saved.
- Consent No shows the reason field, and the reason can be entered.
- Submit shows the Ready to Submit popup.
- Cancel returns to the Caregiver Consent screen without submitting.
- Submit shows the success screen without going to Household Details.
- Back to Search returns to the search screen.

10. Execution Report
- User role and account (Distributor/CDD – AU-CDD-001).
- Village selected and the generated name and search text used.
- Location captured (lat/long).
- Consent selected (No) and the reason entered.
- Reason-mandatory check result (if run).
- Case 1: Cancel result, and whether consent and reason were kept.
- Case 2: Submit result, success message, and Back to Search result.
- Case 3: how the consent-refused household appears in search (if run).
- Failed steps, error messages, and screenshots.

Flow structure recommendation:
- Reuse common/register_household.yaml with CONSENT = NO, which stops at the
  Caregiver Consent screen and branches with runFlow when CONSENT is NO.
- common/consent_no.yaml – tap No → enter reason → Submit
- cdd/cdd_consent_no.yaml – login → new registration → location → consent_no.yaml
  → Case 1 (Cancel) → Case 2 (Submit) → Back to Search → Case 3
```
