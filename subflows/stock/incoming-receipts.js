// Reports what the Incoming Transactions screen showed and, if the test data
// says which outcome to expect, leaves the reason in output.incomingFailure
// when it differs, for the flow to fail on through subflows/fail.yaml.
//
//   OBSERVED  "present" or "absent", from open-incoming-transactions.yaml
//   EXPECTED  HCM_STATE_STOCK_INCOMING_RECEIPTS from .env: "present",
//             "absent", or blank for either. A key missing from .env arrives
//             as the string "undefined", which also means either.
//
// console.log lands in the run's maestro.log. Failures are not thrown: a
// script error reaches the report only as "Unknown error".

var verdict = OBSERVED === 'present'
    ? 'Incoming transactions found.'
    : 'No incoming transactions available.';
console.log(verdict);

var expected = String(EXPECTED).trim().toLowerCase();
if (expected === 'undefined') {
    expected = '';
}
output.incomingFailure = '';
if (expected !== '' && expected !== 'present' && expected !== 'absent') {
    output.incomingFailure = 'HCM_STATE_STOCK_INCOMING_RECEIPTS must be present, absent or blank, not "' +
        EXPECTED + '".';
} else if (expected !== '' && expected !== OBSERVED) {
    output.incomingFailure = verdict + ' The test data expects incoming transactions to be ' + expected + '.';
}
