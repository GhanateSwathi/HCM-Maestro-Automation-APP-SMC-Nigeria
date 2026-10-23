// The selected incoming transaction, for open-transaction.yaml: what its card
// in the list said, and whether Stock Receipt Details agrees.
//
//   ACTION=reset    start a new transaction and a new walk down the cards
//   ACTION=here     maestro.copiedText is the current card's "MRN ..." label
//   ACTION=next     maestro.copiedText is the next card's "MRN ..." label
//   ACTION=line     maestro.copiedText is the card's product line
//   ACTION=mrn      maestro.copiedText is the card's "MRN ..." label (kept
//                   as shown, as a selector, and as the bare MRN)
//   ACTION=sender   maestro.copiedText is the card's sender
//   ACTION=compare  WHAT=mrn|sender: maestro.copiedText is the details
//                   screen's value; a mismatch leaves its reason in
//                   output.txn.failure
//
// MRNs on mhbase test data (2026-10-15) are missing: the card reads
// "MRN null_0", "MRN null_1", ... - its position in the list, renumbered as
// transactions are accepted - and Stock Receipt Details shows Material issue
// number "--". A placeholder MRN is logged, not compared; a real one must
// match: "MRN mismatch: expected <card>, found <details>."
//
// Nothing is thrown: a script error reaches the report only as "Unknown
// error". The YAML fails on output.txn.failure via fail.yaml.

// A label as a full-string regex selector, for fencing in one card.
function pattern(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

if (ACTION === 'reset') {
    output.txn = { mrnLabel: '', labelPattern: '', mrn: '', mrnMissing: false, sender: '', failure: '' };
    // k: the card being looked at; here/next: its MRN label and the next
    // card's, as selectors ('' when there is no next card).
    output.scan = { k: 0, here: '', next: '', line: '', found: false };
} else if (ACTION === 'here') {
    output.scan.here = pattern(maestro.copiedText);
    output.scan.next = '';
} else if (ACTION === 'next') {
    output.scan.next = pattern(maestro.copiedText);
} else if (ACTION === 'line') {
    output.scan.line = pattern(maestro.copiedText);
} else if (ACTION === 'mrn') {
    output.txn.mrnLabel = maestro.copiedText;
    output.txn.labelPattern = pattern(maestro.copiedText);
    output.txn.mrn = String(maestro.copiedText).replace(/^\s*MRN\s*/i, '').trim();
    output.txn.mrnMissing = /^null(_\d+)?$/i.test(output.txn.mrn) || output.txn.mrn === '';
} else if (ACTION === 'sender') {
    output.txn.sender = String(maestro.copiedText).trim();
} else if (ACTION === 'compare') {
    var shown = String(maestro.copiedText).trim();
    output.txn.failure = '';
    if (WHAT === 'mrn') {
        if (output.txn.mrnMissing) {
            console.log('No MRN in the data: the card shows "' + output.txn.mrnLabel +
                '", Stock Receipt Details shows "' + shown + '"');
        } else if (shown !== output.txn.mrn) {
            output.txn.failure = 'MRN mismatch: expected ' + output.txn.mrn + ', found ' + shown + '.';
        }
    } else if (shown !== output.txn.sender) {
        output.txn.failure = 'Sender mismatch: the card shows ' + output.txn.sender +
            ', Stock Receipt Details shows ' + shown + '.';
    }
}
