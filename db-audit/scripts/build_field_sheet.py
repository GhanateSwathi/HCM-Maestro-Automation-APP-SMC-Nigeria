"""Build db-audit/CDD-field-capture.xlsx: every field each CDD case checks in
the local DB, captured or not, on this app - beside the Kaduna result.

    python db-audit/scripts/build_field_sheet.py

(Not with -I if openpyxl is in the user's site-packages, which -I skips.)

The plan is the Kaduna AZM audit's (HCM-Maestro-Beneficiary-ID-Fix,
db-audit/, 2026-11-10/11): its 153 field rows are in
db-audit/baseline/kaduna-2.2.122.csv. Rows of fields this app's form does
not have are left out (AZM_ONLY: the AZM checklist's questions and dates,
and the child's Height), and the SMC checklist's questions (Prompt 19) are
planned in their place (SMC_QUESTIONS, CHECKLIST_PLAN). Every planned row
starts as Not tested.

Results go in OBS: one row per field read on this app, matched to the plan
by (case, screen, field ID, table, column). A field the plan lacks (new on
this form) is added as its own row. Then run this again; the case summaries
are CASE_INFO and the dev questions FINDINGS.
"""
import csv
import os
import re

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "CDD-field-capture.xlsx")
BASELINE = os.path.join(ROOT, "baseline", "kaduna-2.2.122.csv")

CAP, NOT, NA, NT = "Captured", "Not captured", "Not applicable", "Not tested"
AS = "Correctly not saved"
STATUSES = [CAP, NOT, AS, NA, NT]

# The CDD's screens, in the order a CDD meets them.
SCREENS = ["Beneficiary Location", "Caregiver Consent", "Household Details", "Beneficiary Details (head)",
           "Child's Details (Add Members)", "Eligibility Assessment", "Refer Beneficiary", "Delivery Details",
           "Redose Details", "Unable To Deliver"]

# Kaduna rows of fields this app's form does not have: the AZM checklist
# (allergy, liver/renal, antibiotics, chronic illness, SP/CTX as ec1-ec5,
# then malaria vaccine, SMC, polio, measles-rubella with dates) and the
# child's Height (no Height field on the SMC form - beneficiary-id/README.md).
AZM_ONLY = {"ec1", "ec2", "ec3", "ec4", "ec5", "malariaVaccine", "malariaVaccineDate", "smc", "smcDate",
            "polio", "polioDate", "measlesRubella", "measlesRubellaDate", "height"}

# The SMC checklist (Prompt 19, read off the app 2026-10-27): (key, label,
# condition). The keys are placeholders until the SMC form config is read;
# the stored key names are what the DB shows.
SMC_QUESTIONS = [
    ("sick", "Is the child sick?", ""),
    ("fever", "Is the child having fever?", ""),
    ("spaqFirstTime", "Is the child given SPAQ for the first time? (Not administered in the previous cycle)", ""),
    ("sideEffectLastCycle", "Is there any side effect to SPAQ which was administered last cycle?", "spaqFirstTime = No"),
    ("spOrCtx", "Child has taken SP or CTX containing drugs in the past 28 days?", ""),
]

# Per checklist case: where the Kaduna build stored the answers, and the
# planned answer per question (TEST-CASES.md).
CHECKLIST_PLAN = {
    1: ("h_f_referral", {"sick": "Yes", "fever": "No", "spaqFirstTime": "No", "sideEffectLastCycle": "No", "spOrCtx": "No"}),
    2: ("task", {"sick": "No", "fever": "No", "spaqFirstTime": "No", "sideEffectLastCycle": "No", "spOrCtx": "No"}),
    3: ("task", {"sick": "No", "fever": "No", "spaqFirstTime": "No", "sideEffectLastCycle": "No", "spOrCtx": "Yes"}),
    4: ("h_f_referral", {"sick": "No", "fever": "Yes", "spaqFirstTime": "No", "sideEffectLastCycle": "No", "spOrCtx": "No"}),
    9: ("task", {"sick": "No", "fever": "No", "spaqFirstTime": "No, then Yes",
                 "sideEffectLastCycle": "Yes, then hidden (first time changed to Yes)", "spOrCtx": "No"}),
}

CASES = {
    1: "Case 1 - registration, checklist -> referral (sick)",
    2: "Case 2 - checklist all No -> successful delivery",
    3: "Case 3 - checklist -> ineligible (SP or CTX)",
    4: "Case 4 - checklist -> referral (fever)",
    5: "Case 5 - Consent No",
    6: "Case 6 - Unable to Deliver",
    7: "Case 7 - Redose (Case 9's child, right after its delivery)",
    8: "Case 8 - Revisit and edit household 1",
    9: "Case 9 - a hidden answer (side effect Yes, then hidden) -> delivery",
    10: "Case 10 - Abandoned checklist",
}

# (case, status, action, household head, child, when, expected in (Kaduna), result / what to check)
RUN = "<run>"
CASE_INFO = [
    (1, "Not run", "New household (head + 1 child); checklist sick = Yes -> Refer Beneficiary",
     f"QAID-DB1-H-{RUN}", f"QAID-DB1-C1-{RUN}", "-",
     "household, address, individual, name, identifier, household_member, project_beneficiary; h_f_referral (Kaduna: 1 row; referral table 0 rows, no task)",
     "Every field entered captured? Referral reason stored as the trigger (sick)?"),
    (2, "Not run", "New household; checklist all No -> Record Round Dose -> Delivery Successful",
     f"QAID-DB2-H-{RUN}", f"QAID-DB2-C1-{RUN}", "-", "task (ADMINISTRATION_SUCCESS), task_resource",
     "Kaduna: task_resource.delivery_comment null although Delivery Successful was chosen - same here?"),
    (3, "Not run", "New household; checklist SP or CTX = Yes -> Ineligible",
     f"QAID-DB3-H-{RUN}", f"QAID-DB3-C1-{RUN}", "-", "task (INELIGIBLE), no task_resource",
     "Kaduna stored the ineligible answers under other keys and date formats than delivery / referral - same here?"),
    (4, "Not run", "New household; checklist fever = Yes -> Refer Beneficiary",
     f"QAID-DB4-H-{RUN}", f"QAID-DB4-C1-{RUN}", "-", "h_f_referral",
     "Referral reason stored as fever, or SICK again as on Kaduna (adapted: the SMC checklist has no dated questions to repeat Kaduna's Case 4)"),
    (5, "Not run", "New household: search QAID-DB5-H -> Register -> location -> Caregiver Consent No, reason CONSENT_REASON -> Submit",
     f"QAID-DB5-H-{RUN} (search text only)", "-", "-",
     "household and its address only (Kaduna: no member, individual, name or project_beneficiary)",
     "Kaduna stored member_count 1 and isHeadOfFamily true for nobody - same here?"),
    (6, "Not run", "New household + child; child's card Unable To Deliver -> a reason, a comment -> Proceed -> Submit",
     f"QAID-DB6-H-{RUN}", f"QAID-DB6-C1-{RUN}", "-", "task (status = the reason), an address row; no task_resource",
     "Reason kept only as the status, actual start/end null (Kaduna) - same here?"),
    (7, "Not run", "Case 9's child, right after its delivery: Redose -> reason Others -> comment -> Submit",
     f"QAID-DB9-H-{RUN}", f"QAID-DB9-C1-{RUN}", "-", "a new task (Kaduna: VISITED, taskType REDOSE) + task_resource",
     "Status of a given redose (Kaduna: VISITED); delivery_comment REDOSE"),
    (8, "Not run", "Reopen household 1: check the overview, Edit Individual on the head, add a test mobile number (HEAD_MOBILE) -> Submit",
     f"QAID-DB1-H-{RUN}", "-", "-", "individual (same row updated)",
     "Values come back; same row; row_version / audit_modified_time unchanged on Kaduna"),
    (9, "Not run", "New household + child; checklist: first time No -> side effect Yes -> first time changed to Yes (side effect hides); others No -> delivery",
     f"QAID-DB9-H-{RUN}", f"QAID-DB9-C1-{RUN}", "-", "task (ADMINISTRATION_SUCCESS), task_resource",
     "The hidden Yes is neither stored nor acted on (no referral). Adapted from Kaduna's SMC Yes -> No"),
    (10, "Not run", "Child QAID-DB10-C1 added to household 9; Dose -> checklist sick No, fever No -> the app's Back",
     f"QAID-DB9-H-{RUN}", f"QAID-DB10-C1-{RUN}", "-", "nothing: no task, h_f_referral, referral or service row",
     "Correctly not saved? A discard warning?"),
]

# Results read on this app: (case, screen, field ID, table, column, entered,
# stored in DB, status, notes). Empty until the cases run.
OBS = [
]

# The Kaduna findings, each to check on this app: (area, Kaduna finding,
# question for the dev, result on this app).
FINDINGS = [
    ("Delivery comment (Cases 2, 9)", "task_resource.delivery_comment is null although Delivery Successful was chosen; the value is only in task.additional_fields.deliveryComment.",
     "Is the task_resource.delivery_comment column meant to be filled?", "Not checked yet"),
    ("Checklist storage (Cases 1-4)", "The same answers are stored under different keys and formats on the delivery / referral path (ec1Value..., epoch-ms dates) and the ineligible path (ec1..., text dates); no height on the ineligible task.",
     "Should every path store one set of keys and one date format?", "Not checked yet"),
    ("Referral reason (Cases 1, 4)", "Every checklist referral is stored with symptom / referralReasons / referralSymptom = SICK, whatever the trigger.",
     "Is SICK intended for every checklist referral?", "Not checked yet"),
    ("Referral table (Cases 1, 4)", "The CDD's referral is stored in h_f_referral; the referral table stays empty and no task row is made.", "", "Not checked yet"),
    ("Checklist Submit (Case 10)", "The checklist's Submit saves nothing by itself; its answers are stored with the referral, delivery or ineligible record. An abandoned checklist leaves no record and gives no warning.", "", "Not checked yet"),
    ("Unable to Deliver (Case 6)", "The reason is kept only as task.status (e.g. BENEFICIARY_ABSENT); no reason key; actual_start_date / actual_end_date null.",
     "Is the status enough for reports that need the reason?", "Not checked yet"),
    ("Redose window (Case 7)", "Redose is disabled once the redose window has passed (isRedoseWindowExpired); a day-old delivery could not be redosed.", "", "Not checked yet"),
    ("Redose status (Case 7)", "A redose is a new task with status VISITED (taskType REDOSE), not ADMINISTRATION_SUCCESS; its task_resource.delivery_comment is REDOSE.",
     "Is VISITED the intended status for a given redose?", "Not checked yet"),
    ("Edit (Case 8)", "Editing the head updates the same row and stores the mobile number, but row_version stays null and audit_modified_time keeps the registration time; the edit adds an identifiers key; the head's edit form is titled Child's Details.",
     "Are row_version and audit_modified_time meant to change on a local edit?", "Not checked yet"),
    ("Consent No (Case 5)", "The refused household is saved with member_count 1, memberCount \"1\" and isHeadOfFamily \"true\", although no person is registered.",
     "Should a consent-No household store member_count 0 and no head flag?", "Not checked yet"),
    ("Dates", "Formats differ across one record: date_of_birth dd/MM/yyyy; date_of_registration epoch ms; task dateOfRegistration text with microseconds.", "", "Not checked yet"),
]


def plan_rows():
    """The planned rows: the Kaduna rows this form has, and the SMC checklist."""
    rows = []
    with open(BASELINE, encoding="utf-8", newline="") as f:
        base = list(csv.DictReader(f))
    for i, b in enumerate(base):
        if b["Field ID"] in AZM_ONLY:
            continue
        case = int(b["Case"])
        tag = lambda s: re.sub(r"QAID-DB(\d+)-(H|C1)\b", rf"QAID-DB\1-\2-{RUN}", s)
        rows.append({
            "case": case, "flow": b["Flow"], "screen": b["Screen"], "field": b["Field ID"], "label": b["Field label"],
            "type": b["Field type"], "mandatory": b["Mandatory"], "conditional": b["Conditional"],
            "parent": b["Parent field / condition"], "table": b["Table"], "column": tag(b["Column / key"]),
            "entered": "-", "stored": "-", "status": NT, "notes": "",
            "k_entered": b["Value entered"], "k_stored": b["Value stored in DB"], "k_status": b["Status"],
            "order": (case, SCREENS.index(b["Screen"]), i)})
    for case, (table, answers) in CHECKLIST_PLAN.items():
        for j, (key, label, cond) in enumerate(SMC_QUESTIONS):
            rows.append({
                "case": case, "flow": "CHECKLIST", "screen": "Eligibility Assessment", "field": key, "label": label,
                "type": "radio (Yes / No)", "mandatory": "-", "conditional": "Yes" if cond else "No", "parent": cond,
                "table": table, "column": "additional_fields (key to read off the DB)",
                "entered": "-", "stored": "-", "status": NT, "notes": f"Plan: {answers[key]}",
                "k_entered": "-", "k_stored": "-", "k_status": "AZM checklist asks other questions (baseline CSV)",
                "order": (case, SCREENS.index("Eligibility Assessment"), -10 + j)})
    return rows


def main():
    rows = plan_rows()
    index = {(r["case"], r["screen"], r["field"], r["table"], r["column"]): r for r in rows}
    for n, (case, screen, field, table, column, entered, stored, status, notes) in enumerate(OBS):
        if status not in STATUSES:
            raise SystemExit(f"OBS row {n}: status {status!r} is none of {STATUSES}")
        r = index.get((case, screen, field, table, column))
        if r is None:  # a field the plan lacks: new on this form
            r = {"case": case, "flow": "-", "screen": screen, "field": field, "label": "-", "type": "-",
                 "mandatory": "-", "conditional": "-", "parent": "-", "table": table, "column": column,
                 "k_entered": "-", "k_stored": "-", "k_status": "not in the Kaduna audit",
                 "order": (case, SCREENS.index(screen) if screen in SCREENS else 99, 1000 + n)}
            rows.append(r)
        r.update(entered=entered, stored=stored, status=status, notes=notes)
    rows.sort(key=lambda r: r["order"])
    table_rows = [[r["case"], "REGISTRATION", r["flow"], r["screen"], r["field"], r["label"], r["type"], r["mandatory"],
                   r["conditional"], r["parent"], r["entered"], r["table"], r["column"], r["stored"], r["status"],
                   r["notes"], r["k_entered"], r["k_stored"], r["k_status"]] for r in rows]

    headers = ["Case", "Module", "Flow", "Screen", "Field ID", "Field label", "Field type", "Mandatory", "Conditional",
               "Parent field / condition", "Value entered", "Table", "Column / key", "Value stored in DB", "Status", "Notes",
               "Kaduna 2.2.122: entered", "Kaduna 2.2.122: stored", "Kaduna 2.2.122: status"]
    widths = [6, 16, 18, 26, 20, 40, 16, 11, 12, 30, 24, 22, 36, 32, 15, 36, 28, 38, 18]

    font = Font(name="Arial", size=10)
    bold = Font(name="Arial", size=10, bold=True)
    grey = Font(name="Arial", size=10, color="595959")
    head_fill = PatternFill("solid", fgColor="1F3864")
    kad_fill = PatternFill("solid", fgColor="595959")
    head_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    fills = {CAP: "E2EFDA", NOT: "F8CBAD", AS: "DDEBF7", NA: "EDEDED", NT: "FFF2CC"}
    thin = Side(style="thin", color="BFBFBF")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    wrap = Alignment(wrap_text=True, vertical="top")

    wb = Workbook()

    def table_sheet(ws, data):
        ws.append(headers)
        for c in ws[1]:
            c.font, c.fill, c.alignment, c.border = head_font, head_fill, Alignment(wrap_text=True, vertical="center"), border
        for c in ws[1][16:]:
            c.fill = kad_fill
        for r in data:
            ws.append(r)
            for c in ws[ws.max_row]:
                c.font, c.alignment, c.border = font, wrap, border
            for c in ws[ws.max_row][16:]:
                c.font = grey
            ws.cell(ws.max_row, 15).fill = PatternFill("solid", fgColor=fills[r[14]])
            ws.cell(ws.max_row, 15).font = bold
        for i, w in enumerate(widths, 1):
            ws.column_dimensions[get_column_letter(i)].width = w
        ws.freeze_panes = "F2"
        ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{ws.max_row}"

    # ---- Summary -----------------------------------------------------------------------
    ws = wb.active
    ws.title = "Summary"
    ws["A1"] = "CDD actions - fields captured / not captured in the local DB (SMC Nigeria app)"
    ws["A1"].font = Font(name="Arial", size=14, bold=True)
    info = [
        ("App", "HCM_APP_ID of the root .env (com.digit.hcm, mhbase UAT), CDD HCM_CDD_USER_ID - NOT RUN YET (db-audit/README.md)"),
        ("Method", "One record per case; each record read from the app's own local DB through its DB card (Drift viewer, SQL: db-audit/checks.json)"),
        ("Plan", "The Kaduna AZM 2.2.122 audit's rows (db-audit/baseline/kaduna-2.2.122.csv; grey columns), less the AZM-only fields, plus the SMC checklist"),
    ]
    for i, (k, v) in enumerate(info, 3):
        ws.cell(i, 1, k).font = bold
        ws.cell(i, 2, v).font = font
    ws["A7"] = "Status"
    ws["B7"] = "Meaning"
    for c in (ws["A7"], ws["B7"]):
        c.font, c.fill = head_font, head_fill
    legend = [
        (CAP, "The value entered is in the DB (table / column / key shown)"),
        (NOT, "Entered, but not in the column expected for it"),
        (AS, "Nothing is stored, and nothing should be (e.g. no person without consent, no record for an abandoned checklist)"),
        (NA, "Not shown in that case (hidden field, or its condition not met), or optional and left blank"),
        (NT, "Planned, not read on this app yet"),
    ]
    for i, (s, m) in enumerate(legend, 8):
        ws.cell(i, 1, s).font = bold
        ws.cell(i, 1).fill = PatternFill("solid", fgColor=fills[s])
        ws.cell(i, 2, m).font = font

    ws["A13"] = "Case"
    for j, s in enumerate(STATUSES + ["Total"], 2):
        ws.cell(13, j, s)
    for c in ws[13][:len(STATUSES) + 2]:
        c.font, c.fill, c.alignment = head_font, head_fill, Alignment(wrap_text=True)
    case_keys = list(CASES)
    for i, k in enumerate(case_keys, 14):
        ws.cell(i, 1, CASES[k]).font = font
        ws.cell(i, 1).alignment = Alignment(wrap_text=True, vertical="top")
        for j, s in enumerate(STATUSES, 2):
            ws.cell(i, j, f"=COUNTIFS('All fields'!$A:$A,{k},'All fields'!$O:$O,\"{s}\")").font = font
        ws.cell(i, 2 + len(STATUSES), f"=SUM(B{i}:{get_column_letter(1 + len(STATUSES))}{i})").font = bold
    tot = 14 + len(case_keys)
    ws.cell(tot, 1, "Total").font = bold
    for j in range(2, 3 + len(STATUSES)):
        col = get_column_letter(j)
        ws.cell(tot, j, f"=SUM({col}14:{col}{tot - 1})").font = bold
    ws.cell(tot + 2, 1, "Kaduna findings to check on this app").font = bold
    ws.cell(tot + 2, 2, "=COUNTA(Findings!A:A)-1").font = bold
    ws.cell(tot + 2, 3, "see the Findings sheet").font = font
    ws.column_dimensions["A"].width = 70
    for col in "BCDEFG":
        ws.column_dimensions[col].width = 16
    for r in (3, 4, 5):
        ws.cell(r, 2).alignment = Alignment(wrap_text=False)

    # ---- Cases ---------------------------------------------------------------------------
    wc = wb.create_sheet("Cases")
    wc.append(["Case", "Status", "What to do in the app", "Household head", "Child",
               "When", "Stored in (Kaduna)", "What to check", "Field rows",
               "Captured", "Not captured", "Not tested"])
    for c in wc[1]:
        c.font, c.fill, c.alignment, c.border = head_font, head_fill, Alignment(wrap_text=True, vertical="center"), border
    for info in CASE_INFO:
        r = wc.max_row + 1
        wc.append(list(info) + [
            f"=COUNTIFS('All fields'!$A:$A,A{r})",
            f"=COUNTIFS('All fields'!$A:$A,A{r},'All fields'!$O:$O,\"{CAP}\")",
            f"=COUNTIFS('All fields'!$A:$A,A{r},'All fields'!$O:$O,\"{NOT}\")",
            f"=COUNTIFS('All fields'!$A:$A,A{r},'All fields'!$O:$O,\"{NT}\")"])
        for c in wc[r]:
            c.font, c.alignment, c.border = font, wrap, border
        wc.cell(r, 2).font = bold
        wc.cell(r, 2).fill = PatternFill("solid", fgColor=fills[CAP] if info[1] == "Done" else fills[NT])
    for i, w in enumerate([6, 12, 44, 24, 24, 16, 40, 52, 10, 10, 10, 10], 1):
        wc.column_dimensions[get_column_letter(i)].width = w
    wc.freeze_panes = "C2"
    wc.auto_filter.ref = f"A1:L{wc.max_row}"

    # ---- Field sheets ---------------------------------------------------------------------
    table_sheet(wb.create_sheet("All fields"), table_rows)
    # One tab per status, so "Not captured" holds only the real gaps.
    for s in STATUSES:
        part = [r for r in table_rows if r[14] == s]
        if part or s in (CAP, NOT):
            table_sheet(wb.create_sheet(s), part)

    # ---- Findings -----------------------------------------------------------------------
    wf = wb.create_sheet("Findings")
    wf.append(["Area", "Kaduna 2.2.122 finding", "Question for the dev", "On this app"])
    for c in wf[1]:
        c.font, c.fill, c.border = head_font, head_fill, border
    for f in FINDINGS:
        wf.append(list(f))
        for c in wf[wf.max_row]:
            c.font, c.alignment, c.border = font, wrap, border
    for i, w in enumerate([28, 80, 44, 30], 1):
        wf.column_dimensions[get_column_letter(i)].width = w
    wf.freeze_panes = "A2"

    wb.save(OUT)
    recalc()
    print(OUT, len(table_rows), "rows;", {s: sum(1 for r in table_rows if r[14] == s) for s in STATUSES})


def recalc():
    """openpyxl saves formulas without values; a round trip through
    LibreOffice stores the computed counts, so previewers show them too."""
    import shutil
    import subprocess
    import tempfile
    soffice = shutil.which("soffice") or r"C:\Program Files\LibreOffice\program\soffice.exe"
    if not os.path.exists(soffice):
        print("LibreOffice not found - Summary counts are computed when Excel opens the file")
        return
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run([soffice, "--headless", "--norestore", "--calc", "--convert-to",
                        "xlsx:Calc MS Excel 2007 XML", "--outdir", tmp, OUT], check=True, capture_output=True)
        shutil.copyfile(os.path.join(tmp, os.path.basename(OUT)), OUT)


if __name__ == "__main__":
    main()
