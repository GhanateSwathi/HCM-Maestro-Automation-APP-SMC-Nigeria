// Book-keeping for accepting incoming stock - the state user's Case 2/2a/2b
// and the health facility user's Test Cases 3-5. Maestro's JavaScript cannot
// read the screen; the YAML copies texts into maestro.copiedText or records
// what it saw, and reads results back from output.variants, output.v and
// output.txn.
//
// What the app does (com.digit.hcm 2.2.113, mhbase, read 2026-10-15): each
// incoming transaction carries ONE product, shown on its card as
// "SPAQ 1: 100". So "accept SPAQ1, then SPAQ2" means accepting the first
// SPAQ1 transaction, then the first SPAQ2 one.
//
// Messages name the cases through output.variants.cases, which init fills
// with the state user's names; a flow with its own numbering overwrites it
// after init (hf-receipt.js). output.variants.expected holds the quantity
// each variant should arrive with - unset (NaN) unless the flow sets it.
//
//   ACTION=init      from VARIANT_1 / VARIANT_2 (PRODUCT_VARIANT_1/2 in .env)
//   ACTION=precheck  after count-transactions.yaml has filled
//                    output.variants.counts: BLOCKED reason, if any, in
//                    output.variants.failure
//   ACTION=begin     work on variant INDEX (0 or 1): fills output.v
//   ACTION=quantity  maestro.copiedText is the card's "SPAQ 1: 100" line
//   ACTION=received  maestro.copiedText is Stock Receipt Details' Quantity
//                    ("500"); a mismatch with the card, or with the expected
//                    quantity, leaves its reason in output.variants.failure
//   ACTION=balance   maestro.copiedText is a home "200 SPAQ 1" line; PHASE
//                    is "before" or "after"
//   ACTION=accepted  record output.v as accepted (COUNT_AFTER = the list's
//                    count for it after Confirm)
//   ACTION=final     check the balances, build the summary
//
// Nothing is thrown: a script error reaches the report only as "Unknown
// error". Failures are left in output for the YAML to fail on via fail.yaml.

// "SPAQ1" -> "SPAQ\s?1": the test data writes product names without a space,
// the app with one ("SPAQ 1"), so accept either.
function core(name) {
    return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/([A-Za-z])(\d)/g, '$1\\s?$2');
}
function leadingNumber(text) {
    var m = String(text).match(/-?\d+/);
    return m ? parseInt(m[0], 10) : NaN;
}
function trailingNumber(text) {
    var m = String(text).match(/(\d+)\s*$/);
    return m ? parseInt(m[1], 10) : NaN;
}

if (ACTION === 'init') {
    var names = [String(VARIANT_1).trim(), String(VARIANT_2).trim()];
    output.variants = {
        names: names,
        // A card's product line, e.g. "SPAQ 1: 100". The word boundary keeps
        // SPAQ 1 from matching SPAQ 10.
        lines: [
            core(names[0]) + '\\b\\s*:\\s*\\d+',
            core(names[1]) + '\\b\\s*:\\s*\\d+'
        ],
        // Stock Receipt Details' Resource value, e.g. "SPAQ 1".
        resources: [core(names[0]), core(names[1])],
        // A home Stock Balance line, e.g. "200 SPAQ 1".
        balanceLines: ['\\d+\\s+' + core(names[0]), '\\d+\\s+' + core(names[1])],
        counts: [0, 0],
        countsBefore: [0, 0],
        balanceBefore: [NaN, NaN],
        balanceAfter: [NaN, NaN],
        quantities: [0, 0],
        received: [NaN, NaN],
        expected: [NaN, NaN],
        accepted: [],
        // The accepted transactions' MRN labels as shown, and as selectors -
        // '' where the data has no real MRN: a placeholder ("MRN null_0")
        // passes to the next transaction, so its absence proves nothing.
        acceptedMrns: [],
        acceptedLabels: [],
        cases: {
            blocked: 'BLOCKED - Case 2, 2a and 2b',
            popup: 'Case 2',
            cancel: 'Case 2a',
            accept: 'Case 2b'
        },
        failure: '',
        summary: ''
    };
    if (names[0] === '' || names[0] === 'undefined' || names[1] === '' || names[1] === 'undefined') {
        output.variants.failure =
            'PRODUCT_VARIANT_1 and PRODUCT_VARIANT_2 must both be set in .env (e.g. SPAQ1 and SPAQ2).';
    }
} else if (ACTION === 'precheck') {
    var pv = output.variants;
    var found = [];
    for (var k = 0; k < 2; k++) {
        if (pv.counts[k] > 0) {
            found.push(pv.names[k] + ' (' + pv.counts[k] + ')');
        }
    }
    console.log('Incoming transactions: ' + pv.names[0] + ' x' + pv.counts[0] + ', ' +
        pv.names[1] + ' x' + pv.counts[1]);
    if (pv.counts[0] === 0 || pv.counts[1] === 0) {
        pv.failure = pv.cases.blocked + ': Expected product variants ' + pv.names.join(' and ') +
            '; found ' + (found.length ? found.join(', ') : 'neither') + '.';
    }
} else if (ACTION === 'begin') {
    var bv = output.variants;
    var i = parseInt(INDEX, 10);
    output.v = {
        index: i,
        name: bv.names[i],
        line: bv.lines[i],
        resource: bv.resources[i],
        // Once a variant has been accepted, any failure is a partial acceptance.
        prefix: bv.accepted.length
            ? 'Partial acceptance: ' + bv.accepted.join(', ') + ' accepted, ' + bv.names[i] + ' failed – '
            : ''
    };
} else if (ACTION === 'quantity') {
    output.variants.quantities[output.v.index] = trailingNumber(maestro.copiedText);
} else if (ACTION === 'received') {
    var rv = output.variants;
    var ri = output.v.index;
    var shown = String(maestro.copiedText).trim();
    rv.received[ri] = /^\d+$/.test(shown) ? parseInt(shown, 10) : NaN;
    rv.failure = '';
    if (isNaN(rv.received[ri])) {
        rv.failure = 'Unable to read the quantity on Stock Receipt Details for ' + rv.names[ri] + '.';
    } else if (!isNaN(rv.expected[ri]) && rv.received[ri] !== rv.expected[ri]) {
        rv.failure = 'Quantity mismatch for ' + rv.names[ri] + ': dispatched ' + rv.expected[ri] +
            ', shown as received ' + rv.received[ri] + '.';
    } else if (rv.received[ri] !== rv.quantities[ri]) {
        rv.failure = 'Quantity mismatch for ' + rv.names[ri] + ': the card shows ' + rv.quantities[ri] +
            ', Stock Receipt Details shows ' + rv.received[ri] + '.';
    }
    console.log(rv.names[ri] + ' quantity on Stock Receipt Details: ' + shown +
        (isNaN(rv.expected[ri]) ? '' : ' (dispatched ' + rv.expected[ri] + ')'));
} else if (ACTION === 'balance') {
    var target = PHASE === 'after' ? output.variants.balanceAfter : output.variants.balanceBefore;
    target[parseInt(INDEX, 10)] = leadingNumber(maestro.copiedText);
} else if (ACTION === 'accepted') {
    output.variants.accepted.push(output.v.name);
    output.variants.acceptedMrns.push(output.txn.mrnLabel);
    output.variants.acceptedLabels.push(output.txn.mrnMissing ? '' : output.txn.labelPattern);
    console.log(output.variants.cases.accept + ' - ' + output.v.name + ' accepted (' + output.txn.mrnLabel +
        '): "Stock accepted successfully", ' +
        'its incoming count went from ' + output.variants.countsBefore[output.v.index] +
        ' to ' + COUNT_AFTER);
} else if (ACTION === 'final') {
    var fv = output.variants;
    var problems = [];
    for (var j = 0; j < 2; j++) {
        var expected = fv.balanceBefore[j] + fv.quantities[j];
        if (fv.balanceAfter[j] !== expected) {
            problems.push(fv.names[j] + ' balance ' + fv.balanceAfter[j] + ', expected ' +
                fv.balanceBefore[j] + ' + ' + fv.quantities[j] + ' = ' + expected);
        }
    }
    fv.summary = fv.cases.accept + ' - accepted ' + fv.accepted.join(' then ') + '; Stock Balance ' +
        fv.names[0] + ' ' + fv.balanceBefore[0] + ' -> ' + fv.balanceAfter[0] + ', ' +
        fv.names[1] + ' ' + fv.balanceBefore[1] + ' -> ' + fv.balanceAfter[1] + '.';
    console.log(fv.summary);
    if (problems.length) {
        fv.failure = fv.cases.accept + ' - stock accepted, but the balance did not rise by the quantity received: ' +
            problems.join('; ') + '.';
    }
}
