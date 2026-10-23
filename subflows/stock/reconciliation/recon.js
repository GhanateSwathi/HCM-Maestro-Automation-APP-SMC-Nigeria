// Book-keeping for Stock Reconciliation (Prompt 8), for either role.
// Maestro's JavaScript cannot read the screen: the YAML copies texts into
// maestro.copiedText or records what it saw, and reads results back from
// output.recon (the run) and output.rv (the product variant in hand).
//
// The specification's rules are checked softly: where the app behaves
// differently, the difference is recorded as a deviation and the run goes
// on, so one run reports every case; summary then fails the run with all of
// them. Hard failures - an unreadable screen, a submission with a comment
// that does not go through - are left in output.recon.failure at once.
//
//   ACTION=init       ROLE, ACCOUNT, COMMENT (RECON_COMMENT), FACILITY
//                     (RECON_FACILITY; blank takes the first offered)
//   ACTION=facility   maestro.copiedText is the warehouse picked
//   ACTION=begin      VARIANT: start on a product variant
//   ACTION=sih        maestro.copiedText is the form's "Stock in hand";
//                     PHASE initial | reopen | case1 | case2 | case3
//   ACTION=prepare    CASE 2 or 3: the count to enter, or BLOCKED
//   ACTION=mandatory  CASE, SHOWN ("true" when Comments is marked with an
//                     asterisk)
//   ACTION=negative   CASE, SUBMITTED ("true" when Submit without a comment
//                     went through), POPUP ("true" when it raised a popup)
//   ACTION=done       file the variant's results
//   ACTION=summary    log the report; deviations and BLOCKED cases become
//                     output.recon.failure
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
// "SPAQ1" -> "SPAQ\s?1": the test data writes products without a space; the
// form lists them as "Spaq 1" (matching ignores case).
function core(name) {
    return escape(name).replace(/([A-Za-z])(\d)/g, '$1\\s?$2');
}

// What each kind of deviation means, worded for the report.
var KINDS = {
    notMarked: 'Comments is not marked mandatory when the count differs from stock in hand',
    notEnforced: 'a count different from stock in hand was submitted without a comment',
    popup: 'Submit without a comment raised a confirmation popup instead of being blocked',
    noUpdate: 'stock in hand did not change to the reconciled count',
    markedWhenEqual: 'Comments is marked mandatory for a count equal to stock in hand',
    changedWhenEqual: 'stock in hand changed after reconciling a count equal to it'
};

function deviate(kind, where) {
    output.recon.deviations.push({ kind: kind, where: where });
    console.log('DEVIATION - ' + where + ': ' + KINDS[kind]);
}

if (ACTION === 'init') {
    output.recon = {
        role: String(ROLE).trim(),
        account: unset(ACCOUNT) ? '(not set)' : String(ACCOUNT).trim(),
        comment: unset(COMMENT) ? '' : String(COMMENT).trim(),
        commentPattern: unset(COMMENT) ? '' : escape(String(COMMENT).trim()),
        target: unset(FACILITY) ? '' : String(FACILITY).trim(),
        targetPattern: unset(FACILITY) ? '' : escape(String(FACILITY).trim()),
        facility: '',
        facilityPattern: '',
        submitted: false,
        deviations: [],
        blocked: [],
        results: [],
        failure: ''
    };
    if (!output.recon.comment) {
        output.recon.failure = 'RECON_COMMENT must be set in .env (the comment for a differing count).';
    }
} else if (ACTION === 'facility') {
    output.recon.facility = String(maestro.copiedText).trim();
    output.recon.facilityPattern = escape(output.recon.facility);
} else if (ACTION === 'begin') {
    var name = String(VARIANT).trim();
    output.rv = {
        variant: name,
        product: core(name),
        sih: NaN,
        original: NaN,
        count: NaN,
        less: NaN,
        greater: NaN,
        after: { case1: NaN, case2: NaN, case3: NaN },
        skip: false,
        blocked: false,
        shown: false,
        lines: []
    };
    output.recon.failure = unset(VARIANT) ? 'PRODUCT_VARIANT_1 and PRODUCT_VARIANT_2 must be set in .env.' : '';
} else if (ACTION === 'sih') {
    var rv = output.rv;
    var text = String(maestro.copiedText).trim();
    var value = /^-?\d+$/.test(text) ? parseInt(text, 10) : NaN;
    output.recon.failure = '';
    if (isNaN(value)) {
        output.recon.failure = 'Unable to read Stock in hand for ' + rv.variant +
            ' on Stock Reconciliation (read "' + text + '").';
    } else {
        rv.sih = value;
        console.log('Stock in hand ' + rv.variant + ' (' + PHASE + '): ' + value);
        if (PHASE === 'initial') {
            rv.original = value;
            // Below 0 no count in the cases can be entered or makes sense, so
            // nothing is submitted for the variant. Seen 2026-10-19 for the
            // state user after a wipe: SPAQ 1 Received 0, Issued 490 -> -490.
            if (value < 0) {
                rv.skip = true;
                var why = 'BLOCKED - ' + rv.variant + ' Cases 1 to 3: Precondition not met: Stock in hand is ' +
                    value + ', expected at least 1.';
                output.recon.blocked.push(why);
                rv.lines.push('Cases 1 to 3 BLOCKED (stock in hand ' + value + ')');
                console.log(why);
            }
        } else if (PHASE === 'case1') {
            rv.after.case1 = value;
            if (value !== rv.original) {
                deviate('changedWhenEqual', rv.variant + ' Case 1 (' + rv.original + ' -> ' + value + ')');
            }
        } else if (PHASE === 'case2' || PHASE === 'case3') {
            rv.after[PHASE] = value;
            if (value !== rv.count) {
                deviate('noUpdate', rv.variant + ' Case ' + PHASE.slice(-1) + ' (reconciled ' + rv.count +
                    ', stock in hand ' + value + ')');
            }
        }
    }
} else if (ACTION === 'prepare') {
    var p = output.rv;
    p.blocked = false;
    if (CASE === '2') {
        if (p.sih <= 0) {
            p.blocked = true;
            var reason = 'BLOCKED - ' + p.variant + ' Case 2: Stock in hand is ' + p.sih +
                '; cannot enter a count lower than stock in hand.';
            output.recon.blocked.push(reason);
            p.lines.push('Case 2 BLOCKED (stock in hand ' + p.sih + ')');
            console.log(reason);
        } else {
            p.less = p.sih - 1;
            p.count = p.less;
        }
    } else {
        // From the stock in hand read after Case 2 (or the original, if Case
        // 2 was blocked).
        p.greater = p.sih + 1;
        p.count = p.greater;
    }
    if (!p.blocked) {
        console.log(p.variant + ' Case ' + CASE + ' - count ' + p.count + ' against stock in hand ' + p.sih);
    }
} else if (ACTION === 'mandatory') {
    var m = output.rv;
    var shown = String(SHOWN) === 'true';
    if (CASE === '1' && shown) {
        deviate('markedWhenEqual', m.variant + ' Case 1');
    } else if (CASE !== '1' && !shown) {
        deviate('notMarked', m.variant + ' Case ' + CASE);
    }
} else if (ACTION === 'negative') {
    var n = output.rv;
    if (String(SUBMITTED) === 'true') {
        deviate('notEnforced', n.variant + ' Case ' + CASE + ' (count ' + n.count + ')');
        n.lines.push('Case ' + CASE + ' count ' + n.count + ': NOT blocked without a comment');
    } else if (String(POPUP) === 'true') {
        deviate('popup', n.variant + ' Case ' + CASE + ' (count ' + n.count + ', popup cancelled)');
        n.lines.push('Case ' + CASE + ' count ' + n.count + ': popup without a comment (cancelled)');
    } else {
        n.lines.push('Case ' + CASE + ' count ' + n.count + ': blocked without a comment');
    }
} else if (ACTION === 'done') {
    var d = output.rv;
    if (d.skip) {
        output.recon.results.push(d.variant + ' - stock in hand ' + d.original + '; ' + d.lines.join('; '));
    } else output.recon.results.push(d.variant + ' - stock in hand ' + d.original +
        '; Case 1 count ' + d.original + ' submitted without a comment, stock in hand after ' + d.after.case1 +
        '; ' + d.lines.join('; ') +
        (isNaN(d.after.case2) ? '' : '; Case 2 submitted with a comment, stock in hand after ' + d.after.case2 +
            ' (expected ' + d.less + ')') +
        '; Case 3 submitted with a comment, stock in hand after ' + d.after.case3 + ' (expected ' + d.greater + ')' +
        '; final ' + d.sih + ' against original ' + d.original);
} else if (ACTION === 'summary') {
    var s = output.recon;
    console.log('Stock reconciliation - ' + s.role + ' ' + s.account + ', warehouse ' + s.facility +
        '\n  ' + s.results.join('\n  '));
    var groups = {};
    var order = [];
    s.deviations.forEach(function (dv) {
        if (!groups[dv.kind]) { groups[dv.kind] = []; order.push(dv.kind); }
        groups[dv.kind].push(dv.where);
    });
    var parts = order.map(function (k) { return KINDS[k] + ' (' + groups[k].join(', ') + ')'; });
    s.failure = '';
    if (parts.length || s.blocked.length) {
        s.failure = 'Stock reconciliation for ' + s.role + ' differs from the specification: ' +
            parts.concat(s.blocked.map(function (b) { return b.replace(/\.$/, ''); })).join('; ');
        if (!/\.$/.test(s.failure)) {
            s.failure += '.';
        }
        console.log(s.failure);
    }
}
