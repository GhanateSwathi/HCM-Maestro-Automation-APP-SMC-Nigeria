// Book-keeping for the return flows - the state to National (Prompt 4) and
// the health facility to the state (Prompt 7). Maestro's JavaScript cannot
// read the screen: balances come from ../read-stock-balance.yaml
// (output.stockBalance.value), the form from ../stock-form.js, and this
// script files the results in output.ret.
//
//   ACTION=init     VARIANT, QUANTITY (RETURN_QUANTITY), START
//                   (EXPECTED_START_BALANCE), FINAL (EXPECTED_FINAL_BALANCE),
//                   DESTINATION, and for messages DESTINATION_KEY (its .env
//                   key; RETURN_DESTINATION when unset) and PREREQUISITE (the
//                   prompt to run first; Prompt 3 when unset)
//   ACTION=balance  output.stockBalance.value has just been read for the
//                   current variant; PHASE is start or final
//   ACTION=recheck  output.stockBalance.value is VARIANT's balance re-read
//                   after a later variant's return
//   ACTION=done     file this variant's result
//   ACTION=summary  log every variant's result
//
// Nothing is thrown - a script error reaches the report only as "Unknown
// error". Failures go in output.ret.failure for the YAML to fail on through
// subflows/fail.yaml. Once a variant has been returned, any later failure
// reads as a partial return.

function unset(value) {
    var t = String(value).trim();
    return t === '' || t === 'undefined';
}

if (!output.returns) {
    output.returns = { done: [] };
}

if (ACTION === 'init') {
    var variant = String(VARIANT).trim();
    var done = output.returns.done;
    output.ret = {
        variant: variant,
        quantity: parseInt(String(QUANTITY).trim(), 10),
        start: parseInt(String(START).trim(), 10),
        final: parseInt(String(FINAL).trim(), 10),
        destination: String(DESTINATION).trim(),
        // A caller that does not pass these leaves them undeclared here.
        destinationKey: unset(typeof DESTINATION_KEY === 'undefined' ? '' : DESTINATION_KEY)
            ? 'RETURN_DESTINATION' : String(DESTINATION_KEY).trim(),
        prerequisite: unset(typeof PREREQUISITE === 'undefined' ? '' : PREREQUISITE)
            ? 'Prompt 3' : String(PREREQUISITE).trim(),
        startBalance: NaN,
        finalBalance: NaN,
        mrn: '',
        failure: '',
        prefix: done.length
            ? 'Partial return: ' + done.map(function (r) { return r.variant + ' returned (' + r.from + ' -> ' + r.to + ')'; }).join(', ') +
              ', ' + variant + ' failed – '
            : ''
    };
    var r = output.ret;
    if (unset(VARIANT)) {
        r.failure = 'PRODUCT_VARIANT_1 and PRODUCT_VARIANT_2 must be set in .env (e.g. SPAQ1 and SPAQ2).';
    } else if (isNaN(r.quantity) || isNaN(r.start) || isNaN(r.final)) {
        r.failure = 'RETURN_QUANTITY, EXPECTED_START_BALANCE and EXPECTED_FINAL_BALANCE must be numbers in .env (e.g. 5, 10, 5).';
    } else if (unset(DESTINATION)) {
        r.failure = r.destinationKey + ' must be set in .env.';
    }
} else if (ACTION === 'balance') {
    var b = output.ret;
    var value = output.stockBalance.value;
    b.failure = '';
    if (PHASE === 'start') {
        b.startBalance = value;
        console.log('START_BALANCE_' + b.variant + ': ' + value + ' (expected ' + b.start + ')');
        if (value !== b.start) {
            // Never return from a balance other than the expected one.
            b.failure = b.prefix + 'Precondition not met: ' + b.variant + ' balance is ' + value +
                ', expected ' + b.start + '. Run ' + b.prerequisite + ' first.';
        }
    } else if (PHASE === 'final') {
        b.finalBalance = value;
        console.log('Final balance ' + b.variant + ': ' + value + ' (expected ' + b.final + ')');
        if (value !== b.final) {
            b.failure = b.prefix + b.variant + ' balance mismatch: expected ' + b.final + ', found ' + value +
                ' after returning ' + b.quantity + ' from ' + b.startBalance + '.';
        }
    }
} else if (ACTION === 'recheck') {
    var v = String(VARIANT).trim();
    var expected = parseInt(String(FINAL).trim(), 10);
    var now = output.stockBalance.value;
    output.returns.recheckFailure = '';
    console.log('Re-check ' + v + ' after the later return: ' + now + ' (expected ' + expected + ')');
    if (now !== expected) {
        output.returns.recheckFailure = v + ' balance changed after a later return: expected ' + expected +
            ', found ' + now + '.';
    }
} else if (ACTION === 'done') {
    output.returns.done.push({
        variant: output.ret.variant,
        from: output.ret.startBalance,
        to: output.ret.finalBalance,
        quantity: output.ret.quantity,
        destination: output.form.facility,
        mrn: output.ret.mrn
    });
} else if (ACTION === 'summary') {
    console.log('Return summary - ' + output.returns.done.map(function (r) {
        return r.variant + ': returned ' + r.quantity + ' to ' + r.destination + ', balance ' + r.from + ' -> ' + r.to +
            (r.mrn ? ', MRN ' + r.mrn : '');
    }).join(' | '));
}
