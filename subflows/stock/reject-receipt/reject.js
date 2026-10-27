// Book-keeping for rejecting incoming stock - Prompt 15, Test Cases 1-6,
// shared by the state user, the health facility and the CDD. Finding and
// opening the transaction is accept-receipt/'s (open-transaction.yaml,
// variants.js, transaction.js); this adds what only a rejection checks.
//
// What the app should do, from its source (egovernments/
// health-campaign-field-worker-app, main, read 2026-10-23) - not yet read off
// the installed build:
//   - Reject is the form's secondary button. The tenant's config decides
//     whether it asks first. When it does, the popup has a title, an optional
//     description, optional text fields (a mandatory one left empty shows
//     "<label> is required"), a confirming button and Cancel. When it does
//     not, the tap rejects at once.
//   - A rejected dispatch is marked REJECTED: the receiver's incoming list
//     leaves it out, the receiver's balance never counts it, and the sender's
//     balance gets the quantity back when the sender next downloads stock.
// So the popup, the reason field and the message are checked softly: each
// difference from Prompt 15 is a DEVIATION, and the run fails at the end
// listing them. A transaction still listed, or a balance that moved, fails at
// once.
//
//   ACTION=init      ROLE, PREREQUISITE, REASON (REJECT_REASON); run after
//                    init-variants.yaml - renames the cases. A missing or
//                    non-ASCII reason leaves its message in output.rej.failure
//   ACTION=popup     POPUP=yes|no: did Reject raise a popup for output.v
//   ACTION=title     maestro.copiedText: the popup's title, or "none"
//   ACTION=confirm   maestro.copiedText: its confirming button, or "none"
//   ACTION=field     maestro.copiedText: its reason field's label, or "none"
//   ACTION=empty     REFUSED=yes|no: Confirm with the reason empty;
//                    maestro.copiedText the error shown, or "none"
//   ACTION=outcome   maestro.copiedText: the message after rejecting, or "none"
//   ACTION=rejected  record output.v as rejected
//   ACTION=listCheck after count-all.yaml in Test Case 6: each variant's count
//                    less what was rejected, or the reason in output.rej.failure
//   ACTION=final     after read-balances.yaml PHASE=after: the balances check
//   ACTION=summary   log the execution report; the deviations, if any, in
//                    output.rej.failure
//
// Counting the whole incoming list (count-all.yaml), card by card, keyed by
// MRN label so a card seen at two scroll positions counts once:
//   ACTION=countStart              a new count
//   ACTION=countHere / countNext   maestro.copiedText: this card's / the
//                                  next card's "MRN ..." label
//   ACTION=countMark               INDEX: this card carries variant INDEX
//   ACTION=countPage               after each scroll position: done once a
//                                  position shows no card not seen before
//   ACTION=countEnd                the counts into output.variants.counts
//
// Nothing is thrown: a script error reaches the report only as "Unknown
// error". The YAML fails on output.rej.failure through fail.yaml.

function isSet(value) {
    var s = String(value).trim();
    return s !== '' && s !== 'undefined';
}
// Copied text, or '' when the YAML cleared the clipboard to "none" and
// nothing was copied.
function copied() {
    var s = String(maestro.copiedText).trim();
    return s === 'none' ? '' : s;
}
// A text as a full-string regex selector.
function pattern(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function deviate(r, text) {
    r.deviations.push(text);
    console.log('DEVIATION - ' + text);
}

var r = output.rej;

if (ACTION === 'init') {
    var reason = isSet(REASON) ? String(REASON).trim() : '';
    output.rej = {
        role: isSet(ROLE) ? String(ROLE).trim() : 'the user',
        prerequisite: isSet(PREREQUISITE) ? String(PREREQUISITE).trim() : "the sender's dispatch",
        reason: reason,
        reasonPattern: pattern(reason),
        // open: a reject popup is up now. pending: Reject has acted (no popup,
        // or Confirm pressed) and its outcome is not checked yet.
        open: false,
        pending: false,
        asks: [],
        title: '',
        closeCheck: 'Cancel',
        confirmLabel: '',
        confirmPattern: '',
        field: '',
        fieldLabel: '',
        fieldPattern: '',
        fieldSeen: false,
        popupSummary: '',
        cancel: 'not run',
        emptyCheck: 'not run',
        messages: [],
        // What each variant's incoming count should be now - the counts
        // before, less one per transaction rejected.
        expectedCounts: [0, 0],
        rejectedMrns: [],
        rejectedLabels: [],
        rejectedQuantities: [],
        deviations: [],
        failure: ''
    };
    output.variants.cases = {
        blocked: 'BLOCKED - Test Cases 1 to 6',
        popup: 'Test Case 2',
        cancel: 'Test Case 3',
        accept: 'Test Case 5'
    };
    if (reason === '') {
        output.rej.failure = 'REJECT_REASON must be set in .env - the reason typed when stock is rejected ' +
            '(e.g. Automation test - stock rejected).';
    } else if (/[^\x20-\x7E]/.test(reason)) {
        output.rej.failure = "REJECT_REASON must be plain ASCII - Maestro's inputText on Android types nothing else.";
    }
} else if (ACTION === 'popup') {
    r.open = String(POPUP) === 'yes';
    r.pending = !r.open;
    r.asks.push(output.v.name + (r.open ? ' - popup' : ' - no popup'));
    if (!r.open) {
        deviate(r, 'Test Case 2 - Reject on the ' + output.v.name + ' transaction (' + output.txn.mrnLabel +
            ') raised no confirmation popup; the tap alone acted on it.');
    }
} else if (ACTION === 'title') {
    r.title = copied();
    // Known to be on screen while the popup is up, so waiting for it to go
    // cannot pass early. Without a title, Cancel stands in.
    r.closeCheck = r.title ? pattern(r.title) : 'Cancel';
} else if (ACTION === 'confirm') {
    r.confirmLabel = copied();
    r.confirmPattern = r.confirmLabel ? pattern(r.confirmLabel) : '';
    r.failure = r.confirmLabel ? '' : output.v.prefix + 'Test Case 2 - the reject popup for ' + output.v.name +
        ' offers no confirming button (looked for Confirm, Reject, Yes, Submit, Proceed and OK); ' +
        'it was cancelled and nothing was rejected.';
} else if (ACTION === 'field') {
    var label = copied();
    r.field = label === '' ? 'none' : (/\*\s*$/.test(label) ? 'mandatory' : 'optional');
    r.fieldLabel = label;
    r.fieldPattern = label ? pattern(label) : '';
    // The popup is the same for every transaction; report its field once.
    if (!r.fieldSeen) {
        r.fieldSeen = true;
        if (r.field === 'none') {
            deviate(r, 'Test Case 4 - the reject popup asks for no reason, so a rejection carries none.');
        } else if (r.field === 'optional') {
            deviate(r, 'Test Case 4 - the reject popup\'s reason field (' + label + ') is not marked mandatory; ' +
                'Confirm with it empty was not tried, so nothing was rejected without a reason.');
        }
    }
    r.popupSummary = '"' + (r.title || 'no title read') + '" with ' + r.confirmLabel + ' and Cancel; reason field ' +
        (r.field === 'none' ? 'none' : '"' + r.fieldLabel + '" (' + r.field + ')');
} else if (ACTION === 'empty') {
    var error = copied();
    if (String(REFUSED) === 'yes') {
        r.emptyCheck = 'refused' + (error ? ' - "' + error + '"' : ', with no message');
        console.log('Test Case 4 PASSED - Confirm with the reason empty was refused' +
            (error ? ': "' + error + '"' : ' (no message shown)') + '; the popup stayed up');
    } else {
        r.open = false;
        r.pending = true;
        r.emptyCheck = 'went through - rejected without a reason';
        deviate(r, 'Test Case 4 - Confirm with the mandatory reason empty went through: the ' + output.v.name +
            ' transaction (' + output.txn.mrnLabel + ') was rejected without a reason.');
    }
} else if (ACTION === 'outcome') {
    var message = copied();
    r.messages.push(output.v.name + ' - ' + (message ? '"' + message + '"' : 'no message'));
    if (!message) {
        deviate(r, 'Test Case 5 - no message about the rejection showed after rejecting ' + output.v.name +
            ' (' + output.txn.mrnLabel + ').');
    }
} else if (ACTION === 'rejected') {
    // Recorded on the message and, for a real MRN, the MRN gone from the list
    // (reject-outcome.yaml). No whole-list count per rejection - 4-5 minutes
    // each on 17 cards (2026-10-26); Test Case 6 counts once, after Download
    // Stock Data (ACTION=listCheck).
    var rv = output.variants;
    var i = output.v.index;
    r.expectedCounts[i] = r.expectedCounts[i] - 1;
    r.failure = '';
    rv.rejected.push(rv.names[i]);
    r.rejectedMrns.push(output.txn.mrnLabel);
    // '' for a placeholder MRN ("MRN null_0"): it passes to the next
    // transaction as the list renumbers, so its absence proves nothing.
    r.rejectedLabels.push(output.txn.mrnMissing ? '' : output.txn.labelPattern);
    r.rejectedQuantities.push(rv.quantities[i]);
    console.log('Test Case 5 - ' + rv.names[i] + ' rejected (' + output.txn.mrnLabel + ', quantity ' +
        rv.quantities[i] + ')' + (output.txn.mrnMissing ? '' : '; the MRN left Incoming Transactions'));
} else if (ACTION === 'listCheck') {
    // Test Case 6, after Download Stock Data: each variant's incoming count
    // is its count before less what was rejected of it. More means a
    // rejection did not take; fewer means another transaction went too.
    var lv = output.variants;
    var off = [];
    for (var li = 0; li < 2; li++) {
        if (lv.counts[li] !== r.expectedCounts[li]) {
            off.push(lv.names[li] + ' ' + lv.counts[li] + ' listed, expected ' + r.expectedCounts[li] +
                ' (' + lv.countsBefore[li] + ' before, less what was rejected)');
        }
    }
    console.log('Test Case 6 - incoming after Download Stock Data: ' + lv.names[0] + ' ' + lv.counts[0] + ', ' +
        lv.names[1] + ' ' + lv.counts[1] + ' (expected ' + r.expectedCounts[0] + ', ' + r.expectedCounts[1] + ')');
    r.failure = off.length ? 'Test Case 6 - the incoming list does not match the rejections: ' + off.join('; ') + '.' : '';
} else if (ACTION === 'final') {
    var fv = output.variants;
    var moved = [];
    for (var j = 0; j < 2; j++) {
        if (fv.balanceAfter[j] !== fv.balanceBefore[j]) {
            moved.push(fv.names[j] + ' ' + fv.balanceBefore[j] + ' -> ' + fv.balanceAfter[j]);
        }
    }
    console.log('Test Case 6 - Stock Balance ' + fv.names[0] + ' ' + fv.balanceBefore[0] + ' -> ' +
        fv.balanceAfter[0] + ', ' + fv.names[1] + ' ' + fv.balanceBefore[1] + ' -> ' + fv.balanceAfter[1]);
    r.failure = moved.length
        ? 'Test Case 6 - stock was rejected, but the balance changed: ' + moved.join(', ') +
            '. Rejected stock must not reach the ' + r.role + "'s stock."
        : '';
} else if (ACTION === 'countStart') {
    // labels: every MRN label seen (any product), for knowing when the end of
    // the list is reached; marked: the cards counted, label -> variant.
    output.cnt = { labels: {}, marked: {}, counts: [0, 0], k: 0, here: '', hereLabel: '', next: '',
        page: 0, added: 0, done: false };
} else if (ACTION === 'countHere') {
    var ch = output.cnt;
    ch.hereLabel = String(maestro.copiedText).trim();
    ch.here = pattern(ch.hereLabel);
    ch.next = '';
    if (!(ch.hereLabel in ch.labels)) {
        ch.labels[ch.hereLabel] = true;
        ch.added = ch.added + 1;
    }
} else if (ACTION === 'countNext') {
    output.cnt.next = pattern(String(maestro.copiedText).trim());
} else if (ACTION === 'countMark') {
    var cm = output.cnt;
    var vi = parseInt(INDEX, 10);
    if (!(cm.hereLabel in cm.marked)) {
        cm.marked[cm.hereLabel] = vi;
        cm.counts[vi] = cm.counts[vi] + 1;
    }
} else if (ACTION === 'countPage') {
    var cp = output.cnt;
    cp.page = cp.page + 1;
    // The first position always scrolls once, to see whether there is more.
    cp.done = cp.page > 1 && cp.added === 0;
    cp.added = 0;
} else if (ACTION === 'countEnd') {
    var ce = output.cnt;
    output.variants.counts = ce.counts.slice();
    console.log('Incoming transactions, whole list (' + ce.page + ' scroll positions): ' +
        output.variants.names[0] + ' x' + ce.counts[0] + ', ' + output.variants.names[1] + ' x' + ce.counts[1] +
        ' of ' + Object.keys(ce.labels).length + ' cards');
} else if (ACTION === 'summary') {
    var sv = output.variants;
    var rejected = [];
    for (var k = 0; k < r.rejectedMrns.length; k++) {
        rejected.push(sv.rejected[k] + ' ' + r.rejectedMrns[k] + ' (' + r.rejectedQuantities[k] + ')');
    }
    var lines = [
        'Prompt 15 - ' + r.role + ' rejects incoming stock',
        'Incoming before: ' + sv.names[0] + ' x' + sv.countsBefore[0] + ', ' + sv.names[1] + ' x' + sv.countsBefore[1],
        'Reject asks first: ' + r.asks.join(', ') + (r.popupSummary ? ' - ' + r.popupSummary : ''),
        'Cancel: ' + r.cancel,
        'Empty reason: ' + r.emptyCheck,
        'Reason typed: ' + r.reason,
        'Rejected: ' + (rejected.length ? rejected.join(', ') : 'none'),
        'Messages: ' + (r.messages.length ? r.messages.join('; ') : 'none'),
        'Stock Balance before / after: ' + sv.names[0] + ' ' + sv.balanceBefore[0] + ' / ' + sv.balanceAfter[0] +
            ', ' + sv.names[1] + ' ' + sv.balanceBefore[1] + ' / ' + sv.balanceAfter[1],
        'Deviations: ' + (r.deviations.length ? r.deviations.length : 'none')
    ];
    console.log(lines.join('\n  '));
    r.failure = r.deviations.length
        ? 'Stock rejection for ' + r.role + ' differs from Prompt 15: ' + r.deviations.join(' ')
        : '';
}
