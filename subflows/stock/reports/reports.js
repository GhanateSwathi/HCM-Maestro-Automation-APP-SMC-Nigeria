// Book-keeping for View Reports (Prompt 9), for either role. Maestro's
// JavaScript cannot read the screen: the YAML records what it saw, and reads
// results back from output.reports (the run) and output.rep (the report in
// hand).
//
// Every report runs and each finding is recorded; summary then fails the run
// with all of them - an empty table, an entry not found, a header label left
// untranslated - so one run reports every report.
//
//   ACTION=init      ROLE, ACCOUNT, FACILITY (REPORT_FACILITY; blank takes the
//                    first offered)
//   ACTION=begin     REPORT (its label in View Reports), SOURCE (the prompt
//                    its expected entries come from), EXPECTED (see below)
//   ACTION=facility  maestro.copiedText is the facility picked
//   ACTION=table     STATE loaded | empty | none
//   ACTION=header    the quantity column's header is an untranslated key
//   ACTION=row       maestro.copiedText is a table row, for the log
//   ACTION=entry     INDEX, FOUND ("true"/"false"): the expected entry's row
//   ACTION=done      file the report's result
//   ACTION=summary   log the report; findings become output.reports.failure
//
// EXPECTED lists the entries a report should hold, comma-separated:
//   transaction reports  "<variant> <MRN> <quantity>", e.g.
//                        "SPAQ1 C552-4450-5C9A 500,SPAQ2 B46C-1695-D327 500"
//   reconciliation       "<variant> <manual count>", e.g. "SPAQ1 5,SPAQ1 4"
// Blank: nothing is expected.
//
// A transaction row reads, as one element, "<date>\n<product>\n<MRN>\n
// <waybill>\n<quantity>" (seen 2026-10-19). An entry is found when a row
// holds its product, MRN and quantity in that order. The reconciliation
// table's rows have not been seen yet - every one was empty - so an entry
// there is found when a row holds the product and the count as whole words.
//
// Nothing is thrown - a script error reaches the report only as "Unknown
// error". The YAML fails through fail.yaml.

function unset(value) {
    var t = String(value).trim();
    return t === '' || t === 'undefined';
}
function escape(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// "SPAQ1" -> "SPAQ\s?1": the test data writes products without a space.
function core(name) {
    return escape(name).replace(/([A-Za-z])(\d)/g, '$1\\s?$2');
}

if (ACTION === 'init') {
    output.reports = {
        role: String(ROLE).trim(),
        account: unset(ACCOUNT) ? '(not set)' : String(ACCOUNT).trim(),
        target: unset(FACILITY) ? '' : String(FACILITY).trim(),
        targetPattern: unset(FACILITY) ? '' : escape(String(FACILITY).trim()),
        facility: '',
        facilityPattern: '',
        results: [],
        findings: [],
        failure: ''
    };
} else if (ACTION === 'begin') {
    var reconciliation = /reconciliation/i.test(String(REPORT));
    var entries = unset(EXPECTED) ? [] : String(EXPECTED).split(',')
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s !== ''; })
        .map(function (s) {
            var f = s.split(/\s+/);
            var e = { text: s, variant: f[0] };
            if (reconciliation) {
                e.count = f[1];
                e.pattern = '(?s).*\\b' + core(f[0]) + '\\b.*\\b' + escape(f[1]) + '\\b.*';
            } else {
                e.mrn = f[1];
                e.quantity = f[2];
                e.pattern = '(?s).*\\s' + core(f[0]) + '\\s+' + escape(f[1]) + '\\s.*\\s' + escape(f[2]);
            }
            return e;
        });
    output.rep = {
        name: String(REPORT).trim(),
        slug: String(REPORT).trim().toLowerCase().replace(/\s+/g, '-'),
        source: String(SOURCE).trim(),
        reconciliation: reconciliation,
        entries: entries,
        next: 0,
        found: [],
        missing: [],
        rows: [],
        table: '',
        header: '',
        failure: ''
    };
    var bad = entries.filter(function (e) {
        return reconciliation ? !e.count : !(e.mrn && e.quantity);
    });
    if (bad.length) {
        output.rep.failure = 'Expected ' + output.rep.name + ' entries must read "' +
            (reconciliation ? '<variant> <count>' : '<variant> <MRN> <quantity>') + '"; not "' +
            bad[0].text + '".';
    }
} else if (ACTION === 'facility') {
    output.reports.facility = String(maestro.copiedText).trim();
    output.reports.facilityPattern = escape(output.reports.facility);
    console.log('View Reports facility - ' + output.reports.facility +
        (output.reports.target ? ' (REPORT_FACILITY)' : ' (first available)'));
} else if (ACTION === 'table') {
    var t = output.rep;
    t.table = String(STATE);
    if (t.table === 'empty' && t.entries.length) {
        output.reports.findings.push(t.name + ' table is empty for ' + output.reports.role +
            '; expected transactions from ' + t.source);
    } else if (t.table === 'none') {
        output.reports.findings.push(t.name + ' table did not load for ' + output.reports.role);
    }
    console.log(t.name + ' - table ' + t.table);
} else if (ACTION === 'header') {
    output.rep.header = 'untranslated';
    output.reports.findings.push(output.rep.name + ' shows the quantity column header as the untranslated key ' +
        'STOCKREPORTS_REPORT_DETAILS_TABLE_HEADER_4_LABEL');
} else if (ACTION === 'row') {
    var row = String(maestro.copiedText).replace(/\s*\n\s*/g, ' | ');
    output.rep.rows.push(row);
    console.log(output.rep.name + ' row - ' + row);
} else if (ACTION === 'entry') {
    var r = output.rep;
    var e2 = r.entries[parseInt(INDEX, 10)];
    if (String(FOUND) === 'true') {
        r.found.push(e2.text);
    } else {
        r.missing.push(e2.text);
    }
    console.log(r.name + ' - ' + e2.text + ': ' + (String(FOUND) === 'true' ? 'found' : 'NOT found'));
    r.next = r.next + 1;
} else if (ACTION === 'done') {
    var d = output.rep;
    if (d.missing.length && d.table === 'loaded') {
        output.reports.findings.push(d.name + ' is missing ' + d.missing.length + ' of ' + d.entries.length +
            ' expected entries from ' + d.source + ' (' + d.missing.join('; ') + ')');
    }
    output.reports.results.push(d.name + ': table ' + d.table +
        (d.table === 'loaded' ? ', ' + d.rows.length + ' row(s) read' : '') +
        ', expected entries found ' + d.found.length + ' of ' + d.entries.length +
        (d.missing.length ? ' (missing: ' + d.missing.join('; ') + ')' : '') +
        (d.header ? ', quantity header untranslated' : ''));
} else if (ACTION === 'summary') {
    var s = output.reports;
    console.log('View Reports - ' + s.role + ' ' + s.account + ', facility ' + s.facility +
        '\n  ' + s.results.join('\n  '));
    s.failure = s.findings.length
        ? 'View Reports for ' + s.role + ' differs from the expected data: ' + s.findings.join('; ') + '.'
        : '';
    if (s.failure) {
        console.log(s.failure);
    }
}
