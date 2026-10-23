// Book-keeping for View Transactions - Prompt 16, Test Cases 1-6, shared by
// the state user, the health facility and the CDD. Maestro's JavaScript cannot
// read the screen; the YAML copies texts into maestro.copiedText and reads the
// results back from output.vt.
//
// What the screen shows, read off the app as AU-SAT-001, 2026-10-23: one card
// per MRN - an "MRN <mrn>" tag and the date ("19 Oct 2026"), "Receiver" over
// the other party's id, "View QR" (dispatches), one product line per product
// ("SPAQ 2: 490") and "Select Transaction". From the app's source it lists the
// stock records the signed-in user created, rejected ones left out.
//
//   ACTION=init        ROLE, EXPECTED (VIEW_TXN_EXPECTED_<role>): run after
//                      init-variants.yaml. A malformed entry leaves its reason
//                      in output.vt.failure
//   ACTION=scanStart   a new walk down the list
//   ACTION=here        maestro.copiedText: this card's "MRN ..." label
//   ACTION=next        maestro.copiedText: the next card's "MRN ..." label
//   ACTION=date / party / partyId / qr
//                      maestro.copiedText: that part of this card
//   ACTION=line        INDEX: maestro.copiedText is this card's line for
//                      variant INDEX ("SPAQ 1: 490")
//   ACTION=cardDone    keep this card once a product line has been read
//   ACTION=page        after each scroll position: done once a position shows
//                      no card not seen before
//   ACTION=scanEnd     log the list; pick the cards Test Cases 3 and 4 open
//   ACTION=target      INDEX: open target INDEX (output.vt.targets) next
//   ACTION=detail      WHAT=resource|type|sender|mrn|quantity:
//                      maestro.copiedText is that value on the details screen;
//                      a mismatch with the card leaves its reason in
//                      output.vt.failure
//   ACTION=detailDone  BACK_TO: where Back from the details landed
//   ACTION=expected    check the expected entries against the list
//   ACTION=summary     log the execution report; missing entries, if any, in
//                      output.vt.failure
//
// Nothing is thrown: a script error reaches the report only as "Unknown
// error". The YAML fails on output.vt.failure through fail.yaml.

function isSet(value) {
    var s = String(value).trim();
    return s !== '' && s !== 'undefined';
}
// Copied text, or '' when the YAML cleared the clipboard to "none".
function copied() {
    var s = String(maestro.copiedText).trim();
    return s === 'none' ? '' : s;
}
// A text as a full-string regex selector.
function pattern(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// "SPAQ1" / "SPAQ 1" -> "SPAQ1", for comparing product names.
function squash(text) {
    return String(text).replace(/\s+/g, '').toUpperCase();
}
function trailingNumber(text) {
    var m = String(text).match(/(\d+)\s*$/);
    return m ? parseInt(m[1], 10) : NaN;
}
function note(v, text) {
    if (v.notes.indexOf(text) < 0) {
        v.notes.push(text);
        console.log('NOTE - ' + text);
    }
}

var v = output.vt;

if (ACTION === 'init') {
    output.vt = {
        role: isSet(ROLE) ? String(ROLE).trim() : 'the user',
        expected: [],
        cards: [],
        complete: {},
        labels: {},
        scan: { k: 0, here: '', next: '', page: 0, added: 0, done: false },
        cur: null,
        targets: [],
        qrTarget: -1,
        target: null,
        details: [],
        qr: 'not run',
        back: 'not run',
        emptyText: '',
        missing: [],
        notes: [],
        failure: ''
    };
    v = output.vt;
    if (isSet(EXPECTED)) {
        var bad = [];
        String(EXPECTED).split(',').forEach(function (entry) {
            var parts = entry.trim().split(/\s+/);
            if (parts.length === 2 && /^\d+$/.test(parts[1])) {
                v.expected.push({ raw: entry.trim(), variant: parts[0], mrn: '', qty: parseInt(parts[1], 10) });
            } else if (parts.length === 3 && /^\d+$/.test(parts[2])) {
                v.expected.push({ raw: entry.trim(), variant: parts[0], mrn: parts[1], qty: parseInt(parts[2], 10) });
            } else if (entry.trim() !== '') {
                bad.push('"' + entry.trim() + '"');
            }
        });
        if (bad.length) {
            v.failure = 'VIEW_TXN_EXPECTED_* entries must read "<variant> <quantity>" or ' +
                '"<variant> <MRN> <quantity>"; not ' + bad.join(', ') + '.';
        }
    }
} else if (ACTION === 'scanStart') {
    v.scan = { k: 0, here: '', next: '', page: 0, added: 0, done: false };
} else if (ACTION === 'here') {
    var label = String(maestro.copiedText).trim();
    v.scan.here = pattern(label);
    v.scan.next = '';
    if (!(label in v.labels)) {
        v.labels[label] = true;
        v.scan.added = v.scan.added + 1;
    }
    // A card already read is skipped; its fields are known.
    v.cur = {
        label: label,
        mrn: label.replace(/^\s*MRN\s*/i, '').trim(),
        skip: label in v.complete,
        date: '',
        party: '',
        partyPattern: '',
        partyId: '',
        lines: [],
        linePattern: '',
        qr: false
    };
} else if (ACTION === 'next') {
    v.scan.next = pattern(String(maestro.copiedText).trim());
} else if (ACTION === 'date') {
    v.cur.date = copied();
} else if (ACTION === 'party') {
    v.cur.party = copied();
    v.cur.partyPattern = pattern(v.cur.party);
} else if (ACTION === 'partyId') {
    v.cur.partyId = copied();
} else if (ACTION === 'qr') {
    v.cur.qr = true;
} else if (ACTION === 'line') {
    var shown = copied();
    var i = parseInt(INDEX, 10);
    if (shown) {
        v.cur.lines.push({ index: i, variant: output.variants.names[i], text: shown, qty: trailingNumber(shown) });
        if (!v.cur.linePattern) {
            v.cur.linePattern = pattern(shown);
        }
    }
} else if (ACTION === 'cardDone') {
    var c = v.cur;
    if (!c.skip && c.lines.length) {
        v.complete[c.label] = true;
        v.cards.push({
            label: c.label,
            mrn: c.mrn,
            date: c.date,
            party: c.party,
            partyId: c.partyId,
            lines: c.lines,
            qr: c.qr
        });
    }
} else if (ACTION === 'page') {
    v.scan.page = v.scan.page + 1;
    // The first position always scrolls once, to see whether there is more.
    v.scan.done = v.scan.page > 1 && v.scan.added === 0;
    v.scan.added = 0;
} else if (ACTION === 'scanEnd') {
    var rows = v.cards.map(function (card, n) {
        return (n + 1) + '. ' + card.label + ' | ' + (card.date || 'no date') + ' | ' +
            (card.party ? card.party + ' ' + (card.partyId || '?') : 'no party') + ' | ' +
            card.lines.map(function (l) { return l.text; }).join(', ') + (card.qr ? ' | View QR' : '');
    });
    console.log('Test Case 2 - ' + v.cards.length + ' transaction(s) listed for ' + v.role +
        (rows.length ? ':\n  ' + rows.join('\n  ') : ''));
    // Test Case 3 opens the first card of each variant; Test Case 4 the first
    // card offering View QR.
    v.targets = [];
    for (var vi = 0; vi < 2; vi++) {
        for (var n = 0; n < v.cards.length; n++) {
            var has = v.cards[n].lines.some(function (l) { return l.index === vi; });
            if (has) {
                if (v.targets.indexOf(n) < 0) {
                    v.targets.push(n);
                }
                break;
            }
        }
    }
    v.qrTarget = -1;
    for (var q = 0; q < v.cards.length; q++) {
        if (v.cards[q].qr) {
            v.qrTarget = q;
            break;
        }
    }
    v.unlabelled = v.cards.filter(function (card) { return !card.mrn; }).length;
} else if (ACTION === 'target') {
    var t = parseInt(INDEX, 10);
    var card = t >= 0 ? v.cards[t] : null;
    var after = card && t + 1 < v.cards.length ? v.cards[t + 1] : null;
    v.target = card ? {
        index: t,
        card: card,
        labelPattern: pattern(card.label),
        nextPattern: after ? pattern(after.label) : '',
        line: card.lines[0],
        found: {}
    } : null;
    v.failure = '';
} else if (ACTION === 'detail') {
    var tg = v.target;
    var value = copied();
    tg.found[WHAT] = value;
    var problem = '';
    if (WHAT === 'mrn' && value !== tg.card.mrn) {
        problem = 'MRN number shows ' + (value || 'nothing') + ', the card shows ' + tg.card.mrn;
    } else if (WHAT === 'resource' && squash(value) !== squash(tg.line.variant)) {
        problem = 'Resource shows ' + (value || 'nothing') + ', the card shows ' + tg.line.text;
    } else if (WHAT === 'quantity' && trailingNumber(value) !== tg.line.qty) {
        problem = 'the quantity shows ' + (value || 'nothing') + ', the card shows ' + tg.line.qty;
    }
    if (problem) {
        v.failure = 'Test Case 3 - transaction details mismatch for ' + tg.card.label + ': ' + problem + '.';
    }
} else if (ACTION === 'detailDone') {
    var dt = v.target;
    var type = dt.found.type || '?';
    v.details.push(dt.card.label + ' - ' + dt.line.text + ', ' + type + ', sender ' + (dt.found.sender || '?') +
        ', quantity ' + (dt.found.quantity || '?'));
    console.log('Test Case 3 PASSED - details of ' + dt.card.label + ' match the card (' + dt.line.text +
        '); Transaction Type ' + type + ', Sender ' + (dt.found.sender || '?'));
    note(v, 'the details screen is titled "Stock Receipt Details" and labels the quantity "Quantity received" ' +
        'for every transaction type (seen for ' + type + ').');
    if (String(BACK_TO) === 'manage stock') {
        note(v, 'Back from a transaction\'s details returns to Manage Stock, not to View Transactions.');
    }
} else if (ACTION === 'expected') {
    v.missing = [];
    v.expected.forEach(function (e) {
        var hit = v.cards.some(function (card) {
            return card.lines.some(function (l) {
                return squash(l.variant) === squash(e.variant) && l.qty === e.qty;
            }) && (!e.mrn || card.mrn === e.mrn);
        });
        if (!hit) {
            v.missing.push(e.raw);
        }
    });
    if (v.expected.length) {
        console.log('Test Case 5 - expected ' + v.expected.length + ', missing ' + v.missing.length +
            (v.missing.length ? ': ' + v.missing.join(', ') : ''));
    }
} else if (ACTION === 'summary') {
    var lines = [
        'Prompt 16 - ' + v.role + ' View Transactions',
        'Listed: ' + v.cards.length + (v.cards.length ? '' : ' (' + (v.emptyText || 'no empty-state text read') + ')'),
        'Details checked: ' + (v.details.length ? v.details.join('; ') : 'none'),
        'View QR: ' + v.qr,
        'Expected entries: ' + (v.expected.length
            ? (v.expected.length - v.missing.length) + ' of ' + v.expected.length + ' found' +
                (v.missing.length ? ' - missing ' + v.missing.join(', ') : '')
            : 'none set'),
        'Back: ' + v.back,
        'Points for QA: ' + (v.notes.length ? v.notes.join(' ') : 'none')
    ];
    console.log(lines.join('\n  '));
    v.failure = v.missing.length
        ? 'Test Case 5 - View Transactions is missing ' + v.missing.join(', ') + ' for ' + v.role + '.'
        : '';
}
