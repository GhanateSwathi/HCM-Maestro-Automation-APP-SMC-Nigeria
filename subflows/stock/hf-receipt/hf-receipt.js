// Book-keeping for the health facility user's acceptance of the state's
// dispatch (flows/stock/hf-stock-accept-receipt.yaml, Test Cases 1-6). The
// acceptance itself is accept-receipt/'s, shared with the state user; this
// adds what only the health facility checks: the opening balance, the
// quantities the state dispatched, and the closing balance.
//
//   ACTION=init     TEST_USER, USER_ID (the .env user signing in),
//                   EXPECTED_INITIAL, QTY_1 / QTY_2 (DISPATCHED_QTY_* for
//                   PRODUCT_VARIANT_1 / _2). Run after init-variants.yaml:
//                   renames the cases and sets output.variants.expected.
//   ACTION=initial  INDEX: output.stockBalance.value is that variant's
//                   balance before anything is accepted
//   ACTION=opening  after both: BLOCKED reason, if any, in output.hf.failure
//   ACTION=final    INDEX: output.stockBalance.value after both acceptances
//   ACTION=closing  after both: the balance check, reason in output.hf.failure
//   ACTION=summary  log the execution report
//
// Nothing is thrown - a script error reaches the report only as "Unknown
// error". The YAML fails on output.hf.failure through fail.yaml.

function isSet(value) {
    var s = String(value).trim();
    return s !== '' && s !== 'undefined';
}
function wholeNumber(value) {
    var s = String(value).trim();
    return /^\d+$/.test(s) ? parseInt(s, 10) : NaN;
}

if (ACTION === 'init') {
    var pv = output.variants;
    output.hf = {
        user: isSet(TEST_USER) ? String(TEST_USER).trim() : '(TEST_USER not set)',
        expectedInitial: wholeNumber(EXPECTED_INITIAL),
        initial: [NaN, NaN],
        final: [NaN, NaN],
        facility: output.dropdown && output.dropdown.options ? output.dropdown.options[0] : '',
        firstMrn: '',
        cancel: '',
        failure: ''
    };
    pv.expected = [wholeNumber(QTY_1), wholeNumber(QTY_2)];
    pv.cases = {
        blocked: 'BLOCKED - Test Cases 3 to 6',
        popup: 'Test Case 4',
        cancel: 'Test Case 4',
        accept: 'Test Case 5'
    };
    // All three are optional since 2026-10-23: they change with every run, so
    // blank means "take what the app shows" - Test Case 1 logs the opening
    // balance, Test Case 3 checks the card against Stock Receipt Details, and
    // Test Case 6 checks the balance rose by what was received. A value that
    // is set must be a whole number.
    var bad = [];
    if (isSet(EXPECTED_INITIAL) && isNaN(output.hf.expectedInitial)) {
        bad.push('EXPECTED_INITIAL_BALANCE');
    }
    if (isSet(QTY_1) && (isNaN(pv.expected[0]) || pv.expected[0] === 0)) {
        bad.push('DISPATCHED_QTY_' + pv.names[0]);
    }
    if (isSet(QTY_2) && (isNaN(pv.expected[1]) || pv.expected[1] === 0)) {
        bad.push('DISPATCHED_QTY_' + pv.names[1]);
    }
    if (bad.length) {
        output.hf.failure = 'In .env, set as whole numbers or leave blank: ' + bad.join(', ') + '.';
    } else if (isSet(TEST_USER) && isSet(USER_ID) &&
            String(TEST_USER).trim().toLowerCase() !== String(USER_ID).trim().toLowerCase()) {
        // Names TEST_USER only: the .env account is not repeated in the report.
        output.hf.failure = 'TEST_USER ' + output.hf.user +
            ' is not the health facility stock user .env signs in with (HCM_HF_STOCK_USER_ID).';
    }
} else if (ACTION === 'initial') {
    output.hf.initial[parseInt(INDEX, 10)] = output.stockBalance.value;
} else if (ACTION === 'opening') {
    var oh = output.hf;
    var names = output.variants.names;
    var wrong = [];
    // Without EXPECTED_INITIAL_BALANCE the opening balance is only logged.
    for (var i = 0; i < 2; i++) {
        if (!isNaN(oh.expectedInitial) && oh.initial[i] !== oh.expectedInitial) {
            wrong.push(names[i] + ' initial balance is ' + oh.initial[i] + ', expected ' + oh.expectedInitial + '.');
        }
    }
    console.log('Test Case 1 - initial balance ' + names[0] + ' ' + oh.initial[0] + ', ' +
        names[1] + ' ' + oh.initial[1] +
        (isNaN(oh.expectedInitial) ? ' (no expected value set - logged only)' : ' (expected ' + oh.expectedInitial + ')'));
    oh.failure = wrong.length ? 'BLOCKED - Test Cases 2 to 6: Precondition not met: ' + wrong.join(' ') : '';
} else if (ACTION === 'final') {
    output.hf.final[parseInt(INDEX, 10)] = output.stockBalance.value;
} else if (ACTION === 'closing') {
    var ch = output.hf;
    var cv = output.variants;
    var problems = [];
    for (var j = 0; j < 2; j++) {
        var expected = ch.initial[j] + cv.received[j];
        if (ch.final[j] !== expected) {
            // A negative balance shows as 0 on home (2026-10-26; see
            // accept-receipt/variants.js) - logged for QA, not failed.
            var hidden = ch.final[j] - cv.received[j];
            if (ch.initial[j] === 0 && ch.final[j] === 0) {
                // Both shown as 0: the real balances are hidden, so the rise
                // cannot be checked here (2026-10-26, health facility).
                console.log('NOTE - UNVERIFIED - ' + cv.names[j] + ' Stock Balance shows 0 before and after accepting ' +
                    cv.received[j] + ' - a negative balance shows as 0 on home, so the balance cannot confirm the receipt');
            } else if (ch.initial[j] === 0 && hidden < 0 && ch.final[j] > 0) {
                console.log('NOTE - ' + cv.names[j] + ' Stock Balance was shown as 0 before accepting; it was really ' +
                    hidden + ' (a negative balance shows as 0 on home) - ' + hidden + ' + ' + cv.received[j] +
                    ' = ' + ch.final[j]);
            } else {
                problems.push('Balance mismatch for ' + cv.names[j] + ': expected ' + expected +
                    ', found ' + ch.final[j] + '.');
            }
        }
    }
    ch.failure = problems.join(' ');
} else if (ACTION === 'summary') {
    var sh = output.hf;
    var sv = output.variants;
    var lines = [
        'Prompt 5 - Health Facility accepts incoming stock',
        'User: Health Facility - ' + sh.user,
        'Health Facility selected: ' + sh.facility,
        'Initial balance (expected ' + sh.expectedInitial + '): ' +
            sv.names[0] + ' ' + sh.initial[0] + ', ' + sv.names[1] + ' ' + sh.initial[1],
        'Incoming transaction found: yes - first ' + sh.firstMrn,
        'Received vs dispatched: ' + sv.names[0] + ' ' + sv.received[0] + ' / ' + sv.expected[0] + ', ' +
            sv.names[1] + ' ' + sv.received[1] + ' / ' + sv.expected[1],
        'Cancel: ' + sh.cancel,
        'Accepted: ' + sv.accepted.join(' then '),
        'Final balance (expected / actual): ' +
            sv.names[0] + ' ' + (sh.initial[0] + sv.received[0]) + ' / ' + sh.final[0] + ', ' +
            sv.names[1] + ' ' + (sh.initial[1] + sv.received[1]) + ' / ' + sh.final[1]
    ];
    console.log(lines.join('\n  '));
}
