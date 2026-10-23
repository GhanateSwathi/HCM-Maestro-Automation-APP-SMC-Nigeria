// Book-keeping for the dispatch flows - the state to a health facility
// (Prompt 3) and the health facility to a CDD (Prompt 6). Maestro's JavaScript cannot
// read the screen: the YAML copies texts into maestro.copiedText or reads them
// through shared subflows, this script files them in output.dispatch, and the
// YAML reads results back. The form itself (product, facility) is
// ../stock-form.js's; balances come from ../read-stock-balance.yaml.
//
//   ACTION=plan      VARIANTS from .env PRODUCT_VARIANT - one product, or
//                    several comma-separated ("SPAQ1,SPAQ2") - into
//                    output.plan, dispatched one after another in one session
//   ACTION=init      VARIANT (from the plan), REMAINING from .env
//                    (REMAINING_BALANCE)
//   ACTION=balance   output.stockBalance.value has just been read; PHASE is
//                    current, check or final
//   ACTION=error     maestro.copiedText is the validation message under the
//                    quantity; CASE names the case
//   ACTION=case3     decide Case 3: BLOCKED, or the quantity to dispatch
//   ACTION=done      file this variant's results into output.plan.results
//   ACTION=summary   log every variant's results
//
// Nothing is thrown - a script error reaches the report only as "Unknown
// error". Failures go in output.dispatch.failure for the YAML to fail on
// through subflows/fail.yaml.

function unset(value) {
    var v = String(value).trim();
    return v === '' || v === 'undefined';
}

if (ACTION === 'plan') {
    var list = unset(VARIANTS) ? [] : String(VARIANTS).split(',')
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s !== ''; });
    output.plan = { variants: list, next: 0, results: [], failure: '' };
    if (!list.length) {
        output.plan.failure = 'PRODUCT_VARIANT must be set in .env (e.g. SPAQ1, or SPAQ1,SPAQ2).';
    }
} else if (ACTION === 'init') {
    output.dispatch = {
        variant: String(VARIANT).trim(),
        remaining: parseInt(String(REMAINING).trim(), 10),
        balance: NaN,
        over: NaN,
        quantity: NaN,
        finalBalance: NaN,
        mrn: '',
        errors: {},
        failure: ''
    };
    if (unset(VARIANT)) {
        output.dispatch.failure = 'PRODUCT_VARIANT must be set in .env (e.g. SPAQ1).';
    } else if (isNaN(output.dispatch.remaining)) {
        output.dispatch.failure = 'REMAINING_BALANCE must be a number in .env (e.g. 10).';
    }
} else if (ACTION === 'balance') {
    var d = output.dispatch;
    var value = output.stockBalance.value;
    d.failure = '';
    if (PHASE === 'current') {
        d.balance = value;
        d.over = value + 1;
        console.log('CURRENT_BALANCE for ' + d.variant + ': ' + value);
    } else if (PHASE === 'check') {
        console.log('Balance after Cases 1 and 2: ' + value);
        if (value !== d.balance) {
            d.failure = 'Stock balance changed during the validation cases: ' + d.variant +
                ' was ' + d.balance + ', now ' + value + ', though nothing was dispatched.';
        }
    } else if (PHASE === 'final') {
        d.finalBalance = value;
        console.log('Final balance for ' + d.variant + ': ' + value);
        if (value !== d.remaining) {
            d.failure = 'Balance mismatch: expected ' + d.remaining + ', found ' + value +
                ' after dispatching ' + d.quantity + ' from ' + d.balance + '.';
        }
    }
} else if (ACTION === 'error') {
    output.dispatch.errors[CASE] = String(maestro.copiedText);
    console.log('Case ' + CASE + ' validation message: ' + maestro.copiedText);
} else if (ACTION === 'case3') {
    var c = output.dispatch;
    c.failure = '';
    if (!(c.balance > c.remaining)) {
        c.failure = 'BLOCKED - Case 3: Insufficient stock: balance ' + c.balance +
            '; cannot dispatch while leaving ' + c.remaining + '.';
    } else {
        c.quantity = c.balance - c.remaining;
        console.log('Case 3 - DISPATCH_QUANTITY = ' + c.balance + ' - ' + c.remaining + ' = ' + c.quantity);
    }
} else if (ACTION === 'done') {
    var r = output.dispatch;
    var scan = output.form.teamCode
        ? ' (QR scanned by the emulator virtual camera: ' + output.form.scanned + ', expected ' +
            output.form.teamCode + ')'
        : '';
    output.plan.results.push(r.variant + ': to ' + output.form.facility + scan + ', balance ' + r.balance +
        ', Case 1 blocked ("' + r.errors['1'] + '"), Case 2 blocked at ' + r.over + ' ("' + r.errors['2'] +
        '"), Case 3 dispatched ' + r.quantity + ', final balance ' + r.finalBalance + ' (expected ' +
        r.remaining + ')' + (r.mrn ? ', MRN ' + r.mrn : ''));
    output.plan.next = output.plan.next + 1;
} else if (ACTION === 'summary') {
    console.log('Dispatch summary - ' + output.plan.results.join(' | '));
}
