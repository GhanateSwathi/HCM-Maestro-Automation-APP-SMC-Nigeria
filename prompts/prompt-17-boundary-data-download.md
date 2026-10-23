# Prompt 17 — Boundary Data Download after Login (Health Facility and CDD)

Written 2026-10-23 in the format of Prompts 1–14, from the three answers the
app gave AU-HFS-001 and AU-CDD-001 between 2026-10-19 and 2026-10-23.

- **Implemented by:** [`hf-stock-boundary-data.yaml`](../flows/onboarding/hf-stock-boundary-data.yaml), [`cdd-boundary-data.yaml`](../flows/onboarding/cdd-boundary-data.yaml), over [`subflows/home/boundary-data.yaml`](../subflows/home/boundary-data.yaml) — which every health facility and CDD flow now runs after its boundary Submit
- **Test cases:** BDD-01–07 in [TEST-CASES.md](../TEST-CASES.md).

---

```
Maestro Mobile App Automation Prompt 17 – Boundary Data Download after Login (Health Facility and CDD)

Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: Verify that after the Health Facility user and the Distributor/CDD
select their boundary and tap Submit, the app checks the server for the
boundary's records and that every answer it can give is handled: data found
(Download, or Proceed Without Downloading), no data found (Go Back to home),
and a failed check (Retry, or Proceed Without Downloading). Each path must end
on the role's home screen.

1. Precondition
- Prompt 1 login, permissions and boundary selection must pass for the role:
  - Health Facility: AU-HFS-001 – the first ADMIN_Health Facility option
  - Distributor/CDD: AU-CDD-001 – the first ADMIN_Health Facility option and
    the first three ADMIN_Community options
- The State User is not covered: its Submit goes straight to the home screen.
- Reuse existing subflows through runFlow:
  - Prompt 1 login, permissions, and boundary selection subflows
- Use credentials from the secure test configuration. Do not embed passwords.
- Downloading copies the boundary's records to the device. It changes nothing
  on the server, so this prompt is safe to run repeatedly.

Test data (pass via environment variables):
- TEST_USER = AU-HFS-001 or AU-CDD-001
- BOUNDARY_DATA_CHOICE = Download (default) or Proceed – what to do when data
  is found
- BOUNDARY_DATA_RETRIES = 2 (default) – how many times to tap Retry when the
  server check fails, before proceeding without downloading

Note: which answer the app gives depends on the server and the boundary, not
on the test. Handle all three in one reusable subflow, report which one was
shown, and cover the test cases of that answer. Run the prompt again (or with
BOUNDARY_DATA_CHOICE = Proceed) to cover the others.

2. Test Case 1 – The app checks the boundary's data after Submit
- Select the boundary and tap "Submit".
- Wait (element-based, up to 5 minutes) for one of:
  - "Data found!"
  - "No data found!"
  - "Failed to check data in server"
  - the home screen (no notice)
- Report which one was shown and capture a screenshot.

3. Test Case 2 – Data found: both choices are offered
- Verify "Data found!" with the message "There are records found for the
  selected area..." [TO BE CONFIRMED BY QA – full message text].
- Verify "Download" and "Proceed Without Downloading" are displayed.
- Capture a screenshot.

4. Test Case 3 – Data found: Download
(when BOUNDARY_DATA_CHOICE = Download)
- Tap "Download".
- Wait until the download completes and "Go To Home Screen" is displayed.
- Verify the completion message, e.g. "Health facility data download
  completed" [TO BE CONFIRMED BY QA – the CDD's message].
- Capture a screenshot.
- Tap "Go To Home Screen".

5. Test Case 4 – Data found: Proceed Without Downloading
(when BOUNDARY_DATA_CHOICE = Proceed)
- Tap "Proceed Without Downloading".
- Verify the app goes to the home screen without downloading.

6. Test Case 5 – Failed to check data in server: Retry, then proceed
- Verify "Failed to check data in server" with "Retry" and
  "Proceed Without Downloading".
- Tap "Retry" and wait for the check to answer again.
- Repeat up to BOUNDARY_DATA_RETRIES times while the check keeps failing. If a
  retry answers "Data found!" or "No data found!", continue with that case.
- If it still fails, capture a screenshot and tap "Proceed Without Downloading".
- Report how many retries were made and the final result.

7. Test Case 6 – No data found: Go Back to home
- Verify "No data found!" with "There are no new records found for the
  selected boundary" and "Go Back".
- Capture a screenshot.
- Tap "Go Back".

8. Test Case 7 – Home screen
- Verify the role's home screen is displayed:
  - Health Facility: Stock Balance, Manage Stock, Download Stock Data
  - Distributor/CDD: Registration & Delivery, Stock Balance, Manage Stock
- Capture a screenshot.

9. Element Identification and Synchronization
- Prefer resource IDs, accessibility IDs, accessibility labels, and visible text.
- Match "Data found!" and "No data found!" as full strings so they are not
  confused with each other.
- Do not use hardcoded coordinates unless no reliable locator exists.
- Use element-based waits (extendedWaitUntil) instead of fixed delays; the
  check and the download can take minutes on UAT.
- On failure, capture a screenshot and report a meaningful error. Do not silently
  skip steps.

10. Validation Checklist
- Submit leads to one of the three notices, or straight to home.
- Data found offers Download and Proceed Without Downloading.
- Download completes and Go To Home Screen leads home.
- Proceed Without Downloading leads home.
- A failed check offers Retry and Proceed Without Downloading; Retry checks
  again; proceeding leads home.
- No data found offers Go Back, which leads home.
- The role's home screen is displayed.

11. Execution Report
- User role and account, and the boundary selected.
- The first answer shown after Submit.
- Retries made (if the check failed) and their results.
- The choice made (Download / Proceed Without Downloading / Go Back) and the
  completion message (if downloaded).
- Home screen reached, and its cards.
- Test cases covered by this run.
- Failed steps, error messages, and screenshots.

Flow structure recommendation:
- common/boundary_data.yaml – reusable subflow taking HOME_SCREEN, ROLE,
  BOUNDARY_DATA_CHOICE and BOUNDARY_DATA_RETRIES; used after every Health
  Facility and CDD boundary Submit, not only by this prompt
- health_facility/hf_boundary_data.yaml – login → facility → Submit →
  boundary_data.yaml → home checks
- cdd/cdd_boundary_data.yaml – login → facility and communities → Submit →
  boundary_data.yaml → home checks
```
