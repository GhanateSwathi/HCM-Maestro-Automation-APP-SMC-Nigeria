"""Run one SELECT in the app's DB viewer and print the row.

    python -I db-audit/scripts/db_query.py --check <label> --set HEAD=<name> [CHILD=<name>] [--device emulator-5554]
    python -I db-audit/scripts/db_query.py <label> "<SQL returning one column j>" [--device emulator-5554]
    python -I db-audit/scripts/db_query.py --list

--check runs a check from db-audit/checks.json, its {HEAD} / {CHILD} filled
in from --set (the given names the case's flows typed). The second form
runs any SELECT under a label of your own.

Three steps on the device:
  1. flows/db-query-open.yaml - home -> DB -> Edit Query, the field empty;
  2. adb shell input text - types the SQL (Maestro's inputText types ~2
     characters a second and gives up after 120 s; adb's is near instant);
  3. flows/db-query-run.yaml - runs it and logs DBROW|<label>|<cell>.
The SQL must return a single column named j - typically json_object(...).
No % in it (adb input text reads %s as a space). Output: the parsed JSON,
also saved to artifacts/db-audit/queries/<yyyyMMdd-HHmmss>-<label>.json.
Read-only: pass SELECTs only.

Both Maestro parts run through scripts/run.ps1, so .env is forwarded and
the app is the root .env's HCM_APP_ID. Ported from the Kaduna AZM suite
(HCM-Maestro-Beneficiary-ID-Fix, db-audit/, 2026-11-10), which also pinned
the Kaduna boundary; here the boundary is answered as beneficiary-id's
home.yaml answers it.
"""
import base64
import datetime
import glob
import json
import os
import re
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHECKS = os.path.join(ROOT, "db-audit", "checks.json")
SPECIAL = set("()<>|;&*~\"'`$\\!?[]{}#")


def maestro(flow, device, run_dir, extra):
    q = lambda s: "'" + s.replace("'", "''") + "'"
    sets = ", ".join(q(s) for s in extra + [f"DEVICE_ID={device}"])
    cmd = (f"& {q(os.path.join(ROOT, 'scripts', 'run.ps1'))} -Flow {q(os.path.join(ROOT, 'db-audit', 'flows', flow))} "
           f"-Device {q(device)} -RunDir {q(run_dir)} -Set @({sets}); exit $LASTEXITCODE")
    enc = base64.b64encode(cmd.encode("utf-16-le")).decode()
    return subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", enc],
                          capture_output=True, text=True, encoding="utf-8", errors="replace")


def adb_type(device, text):
    # In pieces, with a pause after each: `input text` returns once the key
    # events are queued, and a Maestro session starting while the app still
    # works through them drops the rest - a 560-character SELECT arrived as
    # its first 42 characters (Kaduna build, 2026-11-10 14:39).
    # The field slows as its text grows: at 40-character pieces 0.4 s apart a
    # 729-character SELECT lost 32 characters in its middle (15:48). Pieces
    # of 30, and a pause that grows with the text.
    for i in range(0, len(text), 30):
        piece = text[i:i + 30]
        esc = "".join("%s" if c == " " else ("\\" + c if c in SPECIAL else c) for c in piece)
        subprocess.run(["adb", "-s", device, "shell", "input", "text", esc], check=True, capture_output=True)
        time.sleep(0.6 + i / 500)
    time.sleep(3)


def field_text(device):
    """The SQL field's text on Edit Query, read from the view hierarchy."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import screen
    items = screen.read(device)
    # The field is the first text after the "Edit Query" title; empty, it
    # shows its hint "Enter your custom query".
    for i, (_, t) in enumerate(items):
        if t == "Edit Query" and i + 1 < len(items):
            nxt = items[i + 1][1]
            return "" if nxt == "Enter your custom query" else nxt
    return ""


def clear_field(device, n):
    subprocess.run(["adb", "-s", device, "shell", "input", "keyevent", "123"], capture_output=True)  # MOVE_END
    for _ in range(0, n + 20, 50):
        subprocess.run(["adb", "-s", device, "shell", "input", "keyevent", *(["67"] * 50)], capture_output=True)


def load_checks():
    with open(CHECKS, encoding="utf-8") as f:
        return {c["label"]: c for c in json.load(f)["checks"]}


def check_sql(label, values):
    checks = load_checks()
    if label not in checks:
        sys.exit(f"No check {label!r} in checks.json; --list shows them.")
    sql = checks[label]["sql"]
    for k, v in values.items():
        if not re.fullmatch(r"[A-Za-z0-9 _.-]+", v):
            sys.exit(f"{k}={v!r}: names here are letters, digits, '-', '_', '.' and spaces only.")
        sql = sql.replace("{" + k + "}", v)
    left = sorted(set(re.findall(r"\{([A-Z_]+)\}", sql)))
    if left:
        sys.exit(f"Check {label!r} needs --set {' '.join(k + '=...' for k in left)}")
    return sql


def run(label, sql, device):
    if "%" in sql:
        sys.exit("No % in the SQL (adb input text reads %s as a space); use instr() instead of LIKE.")
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    base = os.path.join(ROOT, "artifacts", "db-audit", "queries", f"{stamp}-{label}")
    r = maestro("db-query-open.yaml", device, base + "-open", [])
    if r.returncode != 0:
        print(r.stdout[-1500:])
        sys.exit(f"Could not open the SQL editor; see {base}-open")
    adb_type(device, sql)
    typed = field_text(device)
    if typed != sql:
        clear_field(device, len(typed))
        adb_type(device, sql)
        typed = field_text(device)
        if typed != sql:
            sys.exit(f"The SQL field holds {typed[:80]!r}... not the SQL - not run.")
    r = maestro("db-query-run.yaml", device, base, [f"LABEL={label}"])
    row = None
    for log in glob.glob(os.path.join(base, "**", "maestro.log"), recursive=True):
        for line in open(log, encoding="utf-8", errors="replace"):
            m = re.search(r"JsConsole: DBROW\|" + re.escape(label) + r"\|(.*)$", line)
            if m:
                row = m.group(1).strip()
    if row is None:
        print(r.stdout[-1500:])
        sys.exit(f"No DBROW line - the query run failed; see {base}")
    result = None
    if row != "NONE":
        try:
            result = json.loads(row)
        except json.JSONDecodeError:
            result = row
    with open(base + ".json", "w", encoding="utf-8") as f:
        json.dump({"label": label, "sql": sql, "result": result}, f, indent=1, ensure_ascii=False)
    return result


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    args = sys.argv[1:]
    device = "emulator-5554"
    if "--device" in args:
        i = args.index("--device")
        device = args[i + 1]
        del args[i:i + 2]
    if args[:1] == ["--list"]:
        for c in load_checks().values():
            print(f"{c['label']:12} cases {c['cases']:18} {c['purpose']}")
        return
    if args[:1] == ["--check"]:
        label = args[1]
        values = {}
        if "--set" in args:
            for kv in args[args.index("--set") + 1:]:
                k, _, v = kv.partition("=")
                values[k] = v
        sql = check_sql(label, values)
        # The saved file is named after the check and the names it read.
        label = "-".join([label] + [v for v in values.values() if v])
    else:
        label, sql = args[0], args[1]
    print(json.dumps(run(label, sql, device), indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
