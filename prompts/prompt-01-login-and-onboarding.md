# Prompt 1 — Login and initial configuration (State User, Health Facility, CDD)

Given in conversation on 2026-10-15, as written below; recovered unchanged from
that session's transcript on 2026-10-23.

- **Implemented by:** [`sign-in-state-stock.yaml`](../flows/login/sign-in-state-stock.yaml), [`sign-in-hf-stock.yaml`](../flows/login/sign-in-hf-stock.yaml), [`sign-in-cdd.yaml`](../flows/login/sign-in-cdd.yaml), [`state-stock-selects-state.yaml`](../flows/onboarding/state-stock-selects-state.yaml), [`hf-stock-selects-facility.yaml`](../flows/onboarding/hf-stock-selects-facility.yaml), [`cdd-selects-facility-and-communities.yaml`](../flows/onboarding/cdd-selects-facility-and-communities.yaml)
- **Test cases:** LGN-04–06, ONB-01–04 in [TEST-CASES.md](../TEST-CASES.md), which also records
  where the flows differ from this text and why.

---

```
Maestro Mobile App Automation Prompt
Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: Automate the login and initial configuration flow for State User, Health Facility, and Distributor/CDD roles.
1. Test Users
Execute the automation for these three user accounts:

State User: AU-SAT-001
Health Facility: AU-HFS-001
Distributor/CDD: AU-CDD-001
Use the credentials configured in the test environment. Do not invent or assume passwords.

2. Common Login Workflow
For each user, perform the following steps:

Launch the application.
Wait for the login screen to appear.
Log in using the credentials for the current user.
Wait until synchronization is complete before proceeding.
Handle Android permission prompts. Whenever a permission prompt appears, click Grant or the appropriate permission approval button. Continue handling prompts until no further required prompts appear.
Locate the required checkbox, select it if it is not already selected, and click Continue.
Wait for the role-specific configuration screen to load.
Execute the dropdown selections defined for the current role.
Verify that all required selections have been applied successfully.
Use element-based waits and appropriate timeouts instead of fixed delays wherever possible.

3. Role-Specific Dropdown Selection
A. State User — AU-SAT-001
Locate the ADMIN_State dropdown.
Open the dropdown and inspect the available options.
Select the first available option dynamically.
Do not hardcode the option text, identifier, or value.
Verify that the first option is selected successfully.
B. Health Facility — AU-HFS-001
Locate the ADMIN_Health Facility dropdown.
Open the dropdown and inspect the available options.
Select the appropriate Health Facility option dynamically, based on the available runtime data or the test environment.
Do not hardcode dropdown option values.
Verify that the selected Health Facility is displayed correctly.
If no specific facility is configured in the test data, use the first available option as the default and record that selection.

C. Distributor/CDD — AU-CDD-001
Locate the ADMIN_Health Facility dropdown.
Open it and select the appropriate Health Facility option dynamically.
Locate the ADMIN_Community dropdown.
Expand the dropdown to display the available Community options and their checkboxes.
Identify the first three available options at runtime.
Select the checkboxes for the first three options without deselecting any previously selected option.
Do not hardcode Community names or values.
Verify that the first three available Community options are selected.
Confirm that all three selections remain checked after the dropdown is collapsed.
If fewer than three Community options are available, select the available options and report the result as a test failure or exception according to the test requirements.

4. Element Identification and Synchronization
Prefer accessibility identifiers, resource IDs, accessibility labels, and visible text when identifying elements.
Do not use hardcoded screen coordinates unless no reliable element locator is available.
Do not hardcode dropdown option names when the requirement is to select by position.
Inspect the available options at runtime and select them by their current order.
Wait for synchronization to complete before interacting with subsequent screens.
Handle permission prompts conditionally because they may not appear on every run.
Avoid selecting the same checkbox twice if doing so would deselect it.
If an element cannot be found, wait until the configured timeout expires, capture a screenshot if supported, and report a meaningful error.
Do not silently skip failed steps.
5. Test Execution
Run the workflow independently for all three roles.

Test Case 1: State User
Launch app → Login → Wait for synchronization → Grant permissions when prompted → Select checkbox → Continue → Select the first available ADMIN_State option → Verify selection.

Test Case 2: Health Facility
Launch app → Login → Wait for synchronization → Grant permissions when prompted → Select checkbox → Continue → Select the appropriate ADMIN_Health Facility option → Verify selection.

Test Case 3: Distributor/CDD
Launch app → Login → Wait for synchronization → Grant permissions when prompted → Select checkbox → Continue → Select the appropriate ADMIN_Health Facility option → Select the first three available ADMIN_Community options → Verify all selections.

6. Validation and Error Handling
Validate the following conditions:

The application launches successfully.
Login succeeds for each valid test account.
Synchronization completes before the next step.
Required permission prompts are handled correctly.
The checkbox and Continue action work as expected.
The correct role-specific dropdowns are displayed.
Dropdown options are identified dynamically.
The correct number of options is selected.
Existing checkbox selections are preserved.
Empty dropdowns, insufficient options, failed login, and synchronization timeouts are reported clearly.
7. Execution Report
At the end of execution, provide a summary for each role containing:

User role and test account.
Login status.
Synchronization status.
Permission handling status.
Dropdown selection results.
Verification results.
Failed steps and error messages.
Screenshots or other failure evidence, if supported.
Important Instructions
Generate valid Maestro-compatible automation flows using supported Maestro commands. Do not invent unsupported commands or assume that element identifiers are available without inspecting the application.

If a required element cannot be identified from the available information, inspect the application's UI hierarchy or request the relevant screenshot/UI details before deciding on a locator.

Keep the flows maintainable by reusing common login steps where Maestro supports reusable subflows. Use separate role-specific flows or clearly separated branches for the State User, Health Facility, and Distributor/CDD workflows.

Important before you run it
A prompt describes what the automation should do, but it does not guarantee that Maestro will generate a fully executable flow without inspecting your app.

Credentials: Provide passwords through your secure test configuration rather than embedding them in the prompt.

Dynamic dropdowns: The flow must inspect the actual UI hierarchy or visible options to determine which option is first. Merely avoiding literal strings does not guarantee dynamic selection.

Permission prompts: Android system dialogs may need to be handled differently depending on the Android version and app permissions.

App launch: Confirm that the APK is installed on the target emulator or device before running the flow.

My recommendation: Start by asking Maestro to automate the State User flow first. Once login, synchronization, permissions, and the ADMIN_State dropdown work, extend the same common workflow to the Health Facility and Distributor/CDD roles.

This will make troubleshooting much easier than generating and debugging all three flows at once.
```
