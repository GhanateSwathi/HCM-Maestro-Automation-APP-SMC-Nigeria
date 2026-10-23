# Prompt 9 — Common View Reports (State User and Health Facility)

Given in conversation on 2026-10-19, as written below; recovered unchanged from
that session's transcript on 2026-10-23.

- **Implemented by:** [`state-stock-view-reports.yaml`](../flows/stock/state-stock-view-reports.yaml), [`hf-stock-view-reports.yaml`](../flows/stock/hf-stock-view-reports.yaml)
- **Test cases:** VR-01–05 in [TEST-CASES.md](../TEST-CASES.md), which also records
  where the flows differ from this text and why.
- **Note:** Given again, unchanged, together with Prompts 8 and 10 on 2026-10-21.

---

```
Maestro Mobile App Automation Prompt 9 – Common View Reports (State User and Health Facility)

Application Details
App name: file-based-download-mhbase-tenant.apk
Automation tool: Maestro
Platform: Android
Objective: Verify that the State User and the Health Facility can open View
Reports, view the Stock Received, Stock Issued, Stock Returned, and Stock
Reconciliation transaction tables, and that each table shows the transactions
performed in the earlier test prompts.

1. Precondition
- Prompt 1 login must pass for the selected role:
  - State User: AU-SAT-001
  - Health Facility: AU-HFS-001
- The earlier transaction prompts must have run, and their execution reports
  must provide the expected values (MRNs/references and quantities).
- Reuse existing Prompt 1 login, permissions, and boundary selection subflows
  through runFlow.
- Use credentials from the secure test configuration. Do not embed passwords.

Test data (pass via environment variables):
- ROLE = STATE or HEALTH_FACILITY
- TEST_USER = AU-SAT-001 or AU-HFS-001 (matching ROLE)
- REPORT_FACILITY = optional; if a facility filter exists and this is not set,
  select the first available option and record it
- PRODUCT_VARIANT_1 = SPAQ1
- PRODUCT_VARIANT_2 = SPAQ2
- Expected values per role and report, taken from earlier execution reports
  (see the expected-data table below)

Expected data per role:

State User (AU-SAT-001):
- Stock Received: the receipt accepted in Prompt 2 (MRN, SPAQ1 and SPAQ2 quantities)
- Stock Issued: the dispatch to the Health Facility in Prompt 3
  (DISPATCH_QUANTITY per variant, recipient Health Facility)
- Stock Returned: the return to National in Prompt 4 (5 per variant)
- Stock Reconciliation: the Prompt 8 entries for State
  (equal, less, and greater counts per variant, with comments where entered)

Health Facility (AU-HFS-001):
- Stock Received: the receipt accepted in Prompt 5 (MRN, SPAQ1 and SPAQ2 quantities)
- Stock Issued: the dispatch to the CDD in Prompt 6
  (DISPATCH_QUANTITY per variant, recipient CDD)
- Stock Returned: the return to State in Prompt 7 (5 per variant)
- Stock Reconciliation: the Prompt 8 entries for Health Facility

2. Login and Navigate to View Reports
- Run the Prompt 1 login flow for ROLE: login, synchronization, permissions,
  checkbox + Continue, boundary selection, confirm.
- Wait for the home screen to load.
- Tap "View Reports".
  [TO BE CONFIRMED BY QA – whether it is a home screen card or an option under
  Manage Stock.]
- Wait for the View Reports screen to load using an element-based wait.
- Verify all four report options are visible:
  Stock Received, Stock Issued, Stock Returned, Stock Reconciliation.
  [TO BE CONFIRMED BY QA – exact labels in the app.]
- If any report option is missing, fail with:
  "<Report name> not available in View Reports for <ROLE>."

3. Common Report Check (view_report.yaml – reusable subflow)
Takes REPORT_TYPE and the expected values for that report.

Steps:
- Tap the REPORT_TYPE option.
- Apply filters if the report screen has them (facility, product, date range):
  - Facility: REPORT_FACILITY, or the first available option.
  - Product: run once per variant if the report is filtered by product.
  - Date range: include the date the earlier transactions were performed.
  [TO BE CONFIRMED BY QA – which filters exist and whether they are mandatory.]
- Wait for the transaction table to load using an element-based wait.
- Verify the table column headers are displayed.
  [TO BE CONFIRMED BY QA – expected column headers for each report type.]
- Check the table state:
  - Rows present: continue to verification.
  - Empty state shown: fail with
    "<REPORT_TYPE> table is empty for <ROLE>; expected transactions from
    <source prompt>."
  - Neither rows nor an empty state within the timeout: fail with
    "<REPORT_TYPE> table did not load for <ROLE>."
- Verify the expected transaction rows:
  - Locate each expected entry by its MRN/reference number (if shown) or by the
    product variant and quantity.
  - Scroll vertically (and horizontally, if the table is wider than the screen)
    until the entry is visible or the end of the table is reached.
  - Verify the quantity in the same row matches the expected value, using a
    relative locator tied to the MRN or variant cell.
  - Verify other row details where shown, such as the sender/recipient
    facility, product variant, and transaction date.
  - Do not hardcode values in the flow; read them from test data.
- Capture a screenshot of the table.
- Navigate back to the View Reports screen.

4. Test Case 1 – Stock Received report
- Run view_report.yaml with REPORT_TYPE = Stock Received and the expected
  received values for ROLE.
- Verify the receipt rows for SPAQ1 and SPAQ2 match the accepted quantities.

5. Test Case 2 – Stock Issued report
- Run view_report.yaml with REPORT_TYPE = Stock Issued and the expected issued
  values for ROLE.
- Verify the recipient matches: the Health Facility for State, and the CDD for
  Health Facility.

6. Test Case 3 – Stock Returned report
- Run view_report.yaml with REPORT_TYPE = Stock Returned and the expected
  return values for ROLE.
- Verify the destination matches: National for State, and the State for
  Health Facility.
- Verify the returned quantity is 5 for each variant.

7. Test Case 4 – Stock Reconciliation report
- Run view_report.yaml with REPORT_TYPE = Stock Reconciliation and the expected
  reconciliation values for ROLE.
- For each variant, verify the three reconciliation entries from Prompt 8:
  - Equal count: manual count equals stock in hand, no comment.
  - Less count: manual count is SIH − 1, with the comment.
  - Greater count: manual count is SIH, with the comment.
  [TO BE CONFIRMED BY QA – which columns the reconciliation table shows, such as
  stock in hand, manual count, difference, and comment.]

8. Element Identification and Synchronization
- Prefer resource IDs, accessibility IDs, accessibility labels, and visible text.
- Do not use hardcoded coordinates unless no reliable locator exists.
- Locate rows by MRN/reference or variant, not by fixed row position, because
  other transactions may exist in the table.
- Use element-based waits (extendedWaitUntil) instead of fixed delays.
- Use scrollUntilVisible with a timeout when searching for rows.
- On failure, capture a screenshot and report a meaningful error. Do not silently
  skip steps.

9. Validation Checklist
- View Reports opens for both State User and Health Facility.
- All four report options are available.
- Each report table loads with the correct column headers.
- Each expected transaction appears with the correct quantity and details.
- Empty tables and load failures are reported clearly.

10. Execution Report
For each role, report:
- User role and account.
- Filters applied (facility, product, date range).
- For each report type:
  - Table loaded: yes/no.
  - Expected entries found: count found versus expected.
  - Mismatched values (expected versus actual).
  - Missing entries.
- Failed steps, error messages, and screenshots.

Flow structure recommendation:
- common/view_report.yaml – reusable subflow taking REPORT_TYPE and expected
  values
- state_user/state_view_reports.yaml – calls view_report.yaml for all four
  report types with the State expected data
- health_facility/hf_view_reports.yaml – calls view_report.yaml for all four
  report types with the Health Facility expected data
```
