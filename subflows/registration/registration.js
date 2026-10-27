// Book-keeping for CDD registration and dose delivery (Prompt 11). Maestro's
// JavaScript cannot read the screen: the YAML copies texts into
// maestro.copiedText, this script files them in output.reg, and the YAML
// reads results back.
//
// The specification's boundary rules and expected texts are checked softly:
// each difference is a DEVIATION, logged and listed in the report, and the
// run fails once at the end. What stops the run (a missing screen, a step
// that cannot be done) fails at once through fail.yaml.
//
//   ACTION=init       the test data (see .env.example); names and the
//                     search text are generated here
//   ACTION=init-consent  the consent-No registration's test data (Prompt
//                     12): TEST_USER, VILLAGE, LATITUDE, LONGITUDE, REASON;
//                     the head's name is AutoNoConsent<stamp>
//   ACTION=init-utd   the Unable to Deliver household's test data (Prompt
//                     13, the UTD_* keys): a head and four children,
//                     AutoUTDHead<stamp> / AutoUTDChild<n><stamp>
//   ACTION=init-redose  the dose-and-redose household's (Prompt 14, the
//                     REDOSE_* keys): a head and six children,
//                     AutoRedoseHead<stamp> / AutoRedoseChild<n><stamp>
//   ACTION=village    maestro.copiedText is the village picked
//   ACTION=step       STEP, RESULT (PASSED | FAILED | BLOCKED | DEVIATION),
//                     DETAIL: one line of the report
//   ACTION=boundary   FIELD, VALUE, EXPECTED, ACTUAL, OK ("true"/"false")
//   ACTION=copied     WHAT: file maestro.copiedText as output.reg[WHAT]
//   ACTION=member     WHO (head | child1 | child2): output.m is that member
//   ACTION=gender     maestro.copiedText is the gender picked for output.m
//   ACTION=token      maestro.copiedText is "Token ID: <id>" for output.m
//   ACTION=age        FIELD, VALUE, EXPECTED (rejected | accepted), SHOWN
//                     ("true" when the age error showed): one boundary row
//   ACTION=product    maestro.copiedText is a product offered for output.m
//   ACTION=products   after them: the age-product rule; reason in
//                     output.reg.productFailure
//   ACTION=dose       maestro.copiedText is the quantity distributed, filed
//                     as output.m[FIELD] - "dose" (default) or "redose"
//   ACTION=checklist  start an eligibility checklist (ANSWER: Yes | No)
//   ACTION=seen       maestro.copiedText is a question on screen; the first
//                     one not yet answered becomes output.reg.elig.next
//   ACTION=answered   the question in output.reg.elig.next was answered
//   ACTION=balance    PHASE (before | after | doses), INDEX (0 | 1):
//                     output.stockBalance.value is that variant's balance
//   ACTION=opening    after both "before" balances: BLOCKED reason, if any,
//                     in output.reg.stockFailure
//   ACTION=mrncheck   output.txn is the transaction about to be accepted: is
//                     its MRN one of CDD_INCOMING_MRNS? reason in
//                     output.reg.stockFailure
//   ACTION=received   after both "after" balances: each must be before +
//                     received; reason in output.reg.stockFailure
//   ACTION=doses      after both "doses" balances: each must be after - the
//                     dose given; reason in output.reg.stockFailure
//   ACTION=unchanged  after both "end" balances: each must equal its "start"
//                     balance; reason in output.reg.stockFailure
//   ACTION=utd-label  INDEX: maestro.copiedText is the INDEX-th reason on
//                     Unable to Deliver, top to bottom
//   ACTION=utd-pick   choose output.m's reason - its UTD_REASON_n, else the
//                     n-th offered - never one used before; sets
//                     output.m.position, or output.m.utdFailure
//   ACTION=utd-status maestro.copiedText is output.m's card status after
//                     Unable to Deliver
//   ACTION=utd-done   file output.m's Unable to Deliver result
//   ACTION=utd-summary  log the report; failures become output.reg.failure
//   ACTION=check-balance  KIND (dose | redose), PHASE: after output.m's dose
//                     or redose, its variant's balance (balances[PHASE]) must
//                     be the last one read less the quantity, and the other
//                     variant's unchanged; a mismatch is recorded as a failure
//   ACTION=cover      after the "start" balances: each variant must cover a
//                     dose and a redose (2 or more), else a BLOCKED reason in
//                     output.reg.stockFailure
//   ACTION=final-card FIRST: child output.reg.children[ci]'s first status
//                     line, maestro.copiedText its next: dosed in the run ->
//                     "Administered success" + "Redose Completed", else
//                     "Not Administered"; kept in output.reg.cards
//   ACTION=redose-summary  log the report; failures become output.reg.failure
//   ACTION=summary    log the report; failures become output.reg.failure
//   ACTION=consent-summary  the same for the consent-No registration
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
function pad(n) {
    return (n < 10 ? '0' : '') + n;
}
function whole(value, min, max) {
    var t = String(value).trim();
    if (!/^\d+$/.test(t)) {
        return null;
    }
    var n = parseInt(t, 10);
    return n >= min && n <= max ? n : null;
}
function degrees(value, limit) {
    var t = String(value).trim();
    if (!/^-?\d+(\.\d+)?$/.test(t)) {
        return null;
    }
    var n = parseFloat(t);
    return Math.abs(n) <= limit ? t : null;
}
function optional(value) {
    return unset(value) ? '' : String(value).trim();
}
// A member's line on Household Overview: "FEMALE | 30y 0m".
function cardPattern(m) {
    return '(?i)' + escape(m.gender) + ' \\| ' + escape(m.age);
}
function makeStamp() {
    var now = new Date();
    return now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) +
        pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
}
// The form takes an age as Year(s) and Month(s); Household Overview shows
// "<y>y <m>m". A child's product follows its age band: 3 to 11 months
// PRODUCT_VARIANT_1, 12 to 59 PRODUCT_VARIANT_2.
function childAge(c, r) {
    c.years = Math.floor(c.months / 12) ? String(Math.floor(c.months / 12)) : '';
    c.monthsField = String(c.months % 12);
    c.age = Math.floor(c.months / 12) + 'y ' + (c.months % 12) + 'm';
    c.expected = c.months < 12 ? r.variant1 : r.variant2;
    c.other = c.months < 12 ? r.variant2 : r.variant1;
}
function headAge(h, r) {
    h.years = String(r.headYears);
    h.months = String(r.headMonths);
    h.monthsField = h.months;
    h.age = r.headYears + 'y ' + r.headMonths + 'm';
}
// Both blank keeps the emulator's own GPS fix; else both decimal degrees.
function readLocation(r, lat, lon, missing) {
    r.latitude = unset(lat) ? '' : degrees(lat, 90);
    r.longitude = unset(lon) ? '' : degrees(lon, 180);
    if (r.latitude === null || r.longitude === null || (r.latitude === '') !== (r.longitude === '')) {
        missing.push('TEST_LATITUDE / TEST_LONGITUDE (both decimal degrees inside the village, or both blank)');
    }
    r.location = r.latitude ? r.latitude + ', ' + r.longitude + ' (setLocation)' :
        'the emulator\'s own GPS fix (TEST_LATITUDE / TEST_LONGITUDE blank)';
}

// A household of a head and children for Prompts 13 and 14, from their own
// .env keys (o.key: UTD_ / REDOSE_): <prefix>Head<stamp> and
// <prefix>Child<n><stamp>, last name Test. o.reasons (Prompt 13): the
// Unable to Deliver reasons, all set or all blank, all different.
function household(o) {
    var hs = makeStamp();
    var h = {
        user: unset(TEST_USER) ? '' : String(TEST_USER).trim(),
        stamp: hs,
        villageTarget: optional(VILLAGE),
        villagePattern: escape(optional(VILLAGE)),
        village: '',
        members: whole(o.members, 1, 30),
        headYears: whole(o.headYears, 18, 149),
        headMonths: whole(o.headMonths, 0, 11),
        mobile: unset(MOBILE) ? '' : (/^\d{11}$/.test(String(MOBILE).trim()) ? String(MOBILE).trim() : null),
        variant1: optional(VARIANT_1),
        variant2: optional(VARIANT_2),
        steps: [],
        boundaries: [],
        deviations: [],
        failures: [],
        failure: ''
    };
    h.head = { first: o.prefix + 'Head' + hs, last: 'Test', gender: optional(o.headGender), label: 'head of household' };
    h.searchText = h.head.first;
    var missing = [];
    readLocation(h, LATITUDE, LONGITUDE, missing);
    h.children = [];
    for (var i = 0; i < o.ages.length; i++) {
        var ch = {
            first: o.prefix + 'Child' + (i + 1) + hs,
            last: 'Test',
            gender: optional(o.childGender),
            months: whole(o.ages[i], 3, 59),
            label: 'child ' + (i + 1),
            index: i,
            // Blank: the app's reason n is used for child n.
            reason: o.reasons.length ? optional(o.reasons[i]) : ''
        };
        if (ch.months === null) {
            missing.push(o.key + 'CHILD_' + (i + 1) + '_AGE_MONTHS (3 to 59)');
        }
        h['child' + (i + 1)] = ch;
        h.children.push(ch);
    }
    if (h.members === null) {
        missing.push(o.key + 'HOUSEHOLD_MEMBERS (1 to 30)');
    }
    if (h.headYears === null || h.headMonths === null) {
        missing.push(o.key + 'HEAD_AGE_YEARS (18 to 149) / ' + o.key + 'HEAD_AGE_MONTHS (0 to 11)');
    }
    if (h.mobile === null) {
        missing.push('HEAD_MOBILE (exactly 11 digits, a test number, or blank)');
    }
    if (!h.variant1 || !h.variant2) {
        missing.push('PRODUCT_VARIANT_1 / PRODUCT_VARIANT_2');
    }
    var given = h.children.map(function (x) { return x.reason; }).filter(Boolean);
    if (given.length && given.length < o.reasons.length) {
        missing.push(o.key + 'REASON_1 to ' + o.key + 'REASON_' + o.reasons.length + ' (all, or all blank to read them off the app)');
    } else if (given.some(function (x, k) { return given.indexOf(x) !== k; })) {
        missing.push(o.key + 'REASON_1 to ' + o.key + 'REASON_' + o.reasons.length + ' (all different)');
    }
    if (missing.length) {
        h.failure = 'Set in .env: ' + missing.join('; ') + '.';
    } else {
        headAge(h.head, h);
        h.children.forEach(function (x) { childAge(x, h); });
    }
    console.log(o.title + ' test data - user ' + h.user + ', search text ' + h.searchText + ', head ' + h.head.first +
        ', children ' + h.children.map(function (x) { return x.first + ' (' + x.months + ' months)'; }).join(', '));
    return h;
}
if (ACTION === 'init-consent') {
    var cs = makeStamp();
    var c = {
        user: unset(TEST_USER) ? '' : String(TEST_USER).trim(),
        stamp: cs,
        villageTarget: optional(VILLAGE),
        villagePattern: escape(optional(VILLAGE)),
        village: '',
        reason: optional(REASON),
        reasonSelector: escape(optional(REASON)),
        steps: [],
        boundaries: [],
        deviations: [],
        failures: [],
        failure: ''
    };
    c.head = { first: 'AutoNoConsent' + cs, last: '', gender: '', label: 'head of household' };
    // The whole generated name: unique to this run, so the search matches no
    // existing household - Prompt 11's included.
    c.searchText = c.head.first;
    var cmissing = [];
    readLocation(c, LATITUDE, LONGITUDE, cmissing);
    if (!c.reason) {
        cmissing.push('CONSENT_REASON (typed as the reason for consent No; ASCII only)');
    }
    if (cmissing.length) {
        c.failure = 'Set in .env: ' + cmissing.join('; ') + '.';
    }
    output.reg = c;
    console.log('Consent No test data - user ' + c.user + ', name and search text ' + c.searchText +
        ', reason ' + c.reason);
} else if (ACTION === 'init-utd') {
    output.reg = household({
        prefix: 'AutoUTD', key: 'UTD_', title: 'Unable to Deliver',
        members: MEMBERS, headYears: HEAD_YEARS, headMonths: HEAD_MONTHS, headGender: HEAD_GENDER,
        ages: [CHILD_1_MONTHS, CHILD_2_MONTHS, CHILD_3_MONTHS, CHILD_4_MONTHS], childGender: CHILD_GENDER,
        reasons: [REASON_1, REASON_2, REASON_3, REASON_4]
    });
} else if (ACTION === 'init-redose') {
    output.reg = household({
        prefix: 'AutoRedose', key: 'REDOSE_', title: 'Dose and redose',
        members: MEMBERS, headYears: HEAD_YEARS, headMonths: HEAD_MONTHS, headGender: HEAD_GENDER,
        ages: [CHILD_1_MONTHS, CHILD_2_MONTHS, CHILD_3_MONTHS, CHILD_4_MONTHS, CHILD_5_MONTHS, CHILD_6_MONTHS],
        childGender: CHILD_GENDER, reasons: []
    });
    output.reg.redoseReason = optional(REDOSE_REASON);} else if (ACTION === 'init') {
    var stamp = makeStamp();
    var r = {
        user: unset(TEST_USER) ? '' : String(TEST_USER).trim(),
        stamp: stamp,
        villageTarget: optional(VILLAGE),
        villagePattern: escape(optional(VILLAGE)),
        village: '',
        members: whole(MEMBERS, 1, 30),
        headYears: whole(HEAD_YEARS, 18, 149),
        headMonths: whole(HEAD_MONTHS, 0, 11),
        // Blank: the mobile number and its boundary checks are skipped.
        mobile: unset(MOBILE) ? '' : (/^\d{11}$/.test(String(MOBILE).trim()) ? String(MOBILE).trim() : null),
        child1Months: whole(CHILD_1_MONTHS, 3, 11),
        child2Months: whole(CHILD_2_MONTHS, 12, 59),
        variant1: optional(VARIANT_1),
        variant2: optional(VARIANT_2),
        received1: whole(QTY_1, 1, 1000000),
        received2: whole(QTY_2, 1, 1000000),
        mrns: optional(MRNS) ? optional(MRNS).split(',').map(function (m) { return m.trim(); }).filter(Boolean) : [],
        lastName: 'Test',
        steps: [],
        boundaries: [],
        deviations: [],
        failures: [],
        failure: ''
    };
    r.head = { first: 'AutoHead' + stamp, last: 'Test', gender: optional(HEAD_GENDER) };
    r.child1 = { first: 'AutoChild1' + stamp, last: 'Test', gender: optional(CHILD_1_GENDER), months: r.child1Months };
    r.child2 = { first: 'AutoChild2' + stamp, last: 'Test', gender: optional(CHILD_2_GENDER), months: r.child2Months };
    // The whole generated first name: unique to this run, so the search
    // matches no existing beneficiary (a shorter prefix would match earlier
    // runs' households).
    r.searchText = r.head.first;
    var missing = [];
    readLocation(r, LATITUDE, LONGITUDE, missing);
    if (r.members === null) {
        missing.push('HOUSEHOLD_MEMBERS (1 to 30)');
    }
    if (r.headYears === null || r.headMonths === null) {
        missing.push('HEAD_AGE_YEARS (18 to 149) / HEAD_AGE_MONTHS (0 to 11)');
    }
    if (r.mobile === null) {
        missing.push('HEAD_MOBILE (exactly 11 digits, a test number, or blank)');
    }
    if (r.child1Months === null) {
        missing.push('CHILD_1_AGE_MONTHS (3 to 11)');
    }
    if (r.child2Months === null) {
        missing.push('CHILD_2_AGE_MONTHS (12 to 59)');
    }
    if (!r.variant1 || !r.variant2) {
        missing.push('PRODUCT_VARIANT_1 / PRODUCT_VARIANT_2');
    }
    // Optional since 2026-10-23: blank, Step 11 takes the quantity Stock
    // Receipt Details shows (read during the run) instead of a value that
    // changes with every dispatch. A value that is set must be a whole number.
    if ((optional(QTY_1) && r.received1 === null) || (optional(QTY_2) && r.received2 === null)) {
        missing.push('EXPECTED_CDD_RECEIVED_SPAQ1 / _SPAQ2 (whole numbers, or blank to take what the app shows)');
    }
    if (missing.length) {
        r.failure = 'Set in .env: ' + missing.join('; ') + '.';
    } else {
        // Boundary values, derived from the test data rather than invented.
        r.mobileShort = r.mobile ? r.mobile.slice(0, 10) : '';
        r.mobileLong = r.mobile ? r.mobile + r.mobile.charAt(10) : '';
        headAge(r.head, r);
        childAge(r.child1, r);
        childAge(r.child2, r);
    }
    r.head.label = 'head of household';
    r.child1.label = 'child 1';
    r.child2.label = 'child 2';
    r.children = [r.child1, r.child2];
    output.reg = r;
    console.log('Registration test data - user ' + r.user + ', search text ' + r.searchText +
        ', head ' + r.head.first + ' ' + r.head.last + ', children ' + r.child1.first + ' (' + CHILD_1_MONTHS +
        ' months), ' + r.child2.first + ' (' + CHILD_2_MONTHS + ' months)');
} else if (ACTION === 'village') {
    output.reg.village = String(maestro.copiedText).trim();
    output.reg.villageSelector = escape(output.reg.village);
    console.log('Registration village - ' + output.reg.village +
        (output.reg.villageTarget ? ' (REGISTRATION_VILLAGE)' : ' (first available)'));
} else if (ACTION === 'step') {
    var result = String(RESULT);
    var lineText = String(STEP) + ' - ' + result + (unset(DETAIL) ? '' : ' - ' + String(DETAIL));
    output.reg.steps.push(lineText);
    if (result === 'DEVIATION') {
        output.reg.deviations.push(String(STEP) + ': ' + String(DETAIL));
    } else if (result === 'FAILED' || result === 'BLOCKED') {
        output.reg.failures.push(String(STEP) + ': ' + result + (unset(DETAIL) ? '' : ' - ' + String(DETAIL)));
    }
    console.log(lineText);
} else if (ACTION === 'boundary') {
    var ok = String(OK) === 'true';
    var b = String(FIELD) + ' ' + String(VALUE) + ': expected ' + String(EXPECTED) + ', actual ' + String(ACTUAL);
    output.reg.boundaries.push(b + (ok ? '' : ' (DEVIATION)'));
    if (!ok) {
        output.reg.deviations.push(b);
    }
    console.log('Boundary - ' + b + (ok ? '' : ' - DEVIATION'));
} else if (ACTION === 'copied') {
    output.reg[String(WHAT)] = String(maestro.copiedText).trim();
} else if (ACTION === 'member') {
    output.m = output.reg[String(WHO)];
    output.m.who = String(WHO);
    output.m.firstSelector = escape(output.m.first);
    output.m.genderSelector = escape(output.m.gender);
    output.m.card = cardPattern(output.m);
} else if (ACTION === 'gender') {
    output.m.gender = String(maestro.copiedText).trim();
    output.m.genderSelector = escape(output.m.gender);
    output.m.card = cardPattern(output.m);
} else if (ACTION === 'token') {
    var tm = String(maestro.copiedText).match(/(\d+)\s*$/);
    output.m.id = tm ? tm[1] : '';
} else if (ACTION === 'age') {
    var rejected = String(SHOWN) === 'true';
    var expectRejected = String(EXPECTED) === 'rejected';
    var row = output.m.label + ' age ' + String(VALUE) + ' ' + String(FIELD) + ': expected ' + String(EXPECTED) +
        ', actual ' + (rejected ? 'rejected - "' + String(MESSAGE) + '"' : 'accepted - no error, date of birth ' + String(DOB));
    output.reg.boundaries.push(row + (rejected === expectRejected ? '' : ' (DEVIATION)'));
    if (rejected !== expectRejected) {
        output.reg.deviations.push(row);
    }
    console.log('Boundary - ' + row + (rejected === expectRejected ? '' : ' - DEVIATION'));
} else if (ACTION === 'product') {
    output.m.products = output.m.products || [];
    output.m.products.push(String(maestro.copiedText).trim());
} else if (ACTION === 'products') {
    // "SPAQ1" in the test data, "SPAQ 1" on screen.
    var squash = function (t) { return String(t).replace(/\s+/g, '').toLowerCase(); };
    var shown = (output.m.products || []).map(squash);
    var pm = output.m;
    output.reg.productFailure = shown.indexOf(squash(pm.expected)) >= 0 && shown.indexOf(squash(pm.other)) < 0 ? '' :
        'Age-product mismatch: child aged ' + pm.months + ' months should receive ' + pm.expected +
        '; delivery screen shows ' + ((pm.products || []).join(', ') || 'no product') + '.';
    console.log('Delivery - ' + pm.label + ' (' + pm.months + ' months): offered ' + (pm.products || []).join(', ') +
        '; expected ' + pm.expected + ' only');
} else if (ACTION === 'dose') {
    // FIELD: "dose", or "redose" for a redose (Prompt 14).
    output.m[typeof FIELD === 'undefined' || unset(FIELD) ? 'dose' : String(FIELD)] =
        parseInt(String(maestro.copiedText).trim(), 10);
} else if (ACTION === 'checklist') {
    output.reg.elig = {
        answer: String(ANSWER),
        // The answer's radio is the n-th clickable below its question: Yes
        // first, then No.
        position: String(ANSWER) === 'Yes' ? 0 : 1,
        answered: [],
        next: '',
        nextSelector: '',
        k: 0,
        done: false
    };
} else if (ACTION === 'seen') {
    var e = output.reg.elig;
    var q = String(maestro.copiedText).trim();
    if (!e.next && e.answered.indexOf(q) < 0) {
        e.next = q;
        e.nextSelector = escape(q);
    }
} else if (ACTION === 'answered') {
    var el = output.reg.elig;
    el.answered.push(el.next);
    // For the report line - a function inside a YAML ${} would end it at
    // its first closing brace.
    el.summary = el.answered.map(function (x) { return x.replace(/\s*\*$/, ''); }).join('; ');
    console.log('Eligibility - ' + el.next.replace(/\s*\*$/, '') + ' = ' + el.answer);
} else if (ACTION === 'balance') {
    var phase = String(PHASE);
    output.reg.balances = output.reg.balances || {};
    output.reg.balances[phase] = output.reg.balances[phase] || [NaN, NaN];
    output.reg.balances[phase][parseInt(INDEX, 10)] = output.stockBalance.value;
} else if (ACTION === 'opening') {
    var ob = output.reg.balances.before;
    output.reg.stockFailure = ob[0] === 0 && ob[1] === 0 ? '' :
        'BLOCKED - Steps 11 to 15: the CDD already holds stock - ' + output.reg.variant1 + ' ' + ob[0] + ', ' +
        output.reg.variant2 + ' ' + ob[1] + '; expected 0 before the receipt.';
} else if (ACTION === 'mrncheck') {
    var mr = output.reg;
    mr.stockFailure = '';
    if (mr.mrns.length && mr.mrns.indexOf(output.txn.mrn) < 0) {
        mr.stockFailure = 'BLOCKED - Steps 11 to 15: the incoming ' + output.v.name + ' transaction is ' +
            output.txn.mrn + ', not one of CDD_INCOMING_MRNS (' + mr.mrns.join(', ') + '); nothing accepted.';
    }
    mr.incomingMrns = mr.incomingMrns || [];
    mr.incomingMrns[output.v.index] = output.txn.mrn;
    console.log('Step 11 - incoming ' + output.v.name + ' transaction ' + output.txn.mrn + ' from ' +
        output.txn.sender + ', quantity ' + output.variants.received[output.v.index] +
        (mr.mrns.length ? (mr.stockFailure ? ' - NOT a CDD_INCOMING_MRNS entry' : ' - matches CDD_INCOMING_MRNS') : ''));
} else if (ACTION === 'received') {
    var rb = output.reg.balances;
    var rr = output.reg;
    var wrong = [];
    // What was received: EXPECTED_CDD_RECEIVED_* when set, else the quantity
    // read off Stock Receipt Details for the accepted transaction.
    var got = [
        rr.received1 !== null ? rr.received1 : output.variants.received[0],
        rr.received2 !== null ? rr.received2 : output.variants.received[1]
    ];
    var names = [rr.variant1, rr.variant2];
    for (var vi = 0; vi < 2; vi++) {
        var want = rb.before[vi] + got[vi];
        if (rb.after[vi] !== want) {
            wrong.push('CDD balance mismatch for ' + names[vi] + ': expected ' + want + ', found ' + rb.after[vi] + '.');
        }
    }
    rr.stockFailure = wrong.join(' ');
} else if (ACTION === 'doses') {
    var db = output.reg.balances;
    var dr = output.reg;
    var given = [dr.child1.dose, dr.child2.dose];
    var vnames = [dr.variant1, dr.variant2];
    var off = [];
    dr.expectedAfterDoses = [];
    for (var di = 0; di < 2; di++) {
        dr.expectedAfterDoses[di] = db.after[di] - given[di];
        if (db.doses[di] !== dr.expectedAfterDoses[di]) {
            off.push('CDD balance mismatch for ' + vnames[di] + ': expected ' + dr.expectedAfterDoses[di] +
                ', found ' + db.doses[di] + '.');
        }
    }
    dr.stockFailure = off.join(' ');
} else if (ACTION === 'unchanged') {
    var ub = output.reg.balances;
    var un = [output.reg.variant1, output.reg.variant2];
    var moved = [];
    for (var uj = 0; uj < 2; uj++) {
        if (ub.end[uj] !== ub.start[uj]) {
            moved.push('Stock reduced after Unable to Deliver for ' + un[uj] + ': expected ' + ub.start[uj] +
                ', found ' + ub.end[uj] + '.');
        }
    }
    output.reg.stockFailure = moved.join(' ');
} else if (ACTION === 'utd-label') {
    output.reg.utdLabels = output.reg.utdLabels || [];
    output.reg.utdLabels[parseInt(INDEX, 10)] = String(maestro.copiedText).trim();
    // The first label anchors "left of" for the radios.
    output.reg.utdFirst = escape(output.reg.utdLabels[0] || '');
} else if (ACTION === 'utd-pick') {
    var pr = output.reg;
    var pm = output.m;
    var labels = (pr.utdLabels || []).filter(Boolean);
    pr.utdUsed = pr.utdUsed || [];
    pm.position = -1;
    pm.utdFailure = '';
    if (labels.length < 4) {
        pm.utdFailure = 'Unable to Deliver offers ' + labels.length + ' reasons (' + labels.join(', ') + '); 4 expected';
    }
    if (pm.reason) {
        for (var li = 0; li < labels.length; li++) {
            if (labels[li].toLowerCase() === pm.reason.toLowerCase()) {
                pm.position = li;
            }
        }
        if (pm.position < 0) {
            pm.utdFailure = 'reason ' + pm.reason + ' is not offered (' + labels.join(', ') + ')';
        }
    } else if (pm.index < labels.length) {
        pm.position = pm.index;
    } else if (labels.length) {
        // Fewer than four: the next one not used yet, and the shortfall is
        // reported (above).
        for (var lj = 0; lj < labels.length && pm.position < 0; lj++) {
            if (pr.utdUsed.indexOf(labels[lj]) < 0) {
                pm.position = lj;
            }
        }
    }
    if (pm.position >= 0 && pr.utdUsed.indexOf(labels[pm.position]) >= 0) {
        pm.utdFailure = 'reason ' + labels[pm.position] + ' was already used for another child';
        pm.position = -1;
    }
    pm.reasonChosen = pm.position >= 0 ? labels[pm.position] : '';
    if (pm.reasonChosen) {
        pr.utdUsed.push(pm.reasonChosen);
    }
    console.log('Unable to Deliver - ' + pm.label + ': reasons offered ' + labels.join(', ') + '; chosen ' +
        (pm.reasonChosen || 'none') + (pm.utdFailure ? ' - ' + pm.utdFailure : ''));
} else if (ACTION === 'utd-status') {
    var sm = output.m;
    sm.status = String(maestro.copiedText).trim();
    // "Beneficiary died" is reported as "Beneficiary Died".
    var last = function (t) { return String(t).trim().split(/\s+/).pop().toLowerCase(); };
    if (sm.reasonChosen && last(sm.status) !== last(sm.reasonChosen)) {
        sm.utdFailure = (sm.utdFailure ? sm.utdFailure + '; ' : '') + 'the card shows ' + sm.status +
            ' after ' + sm.reasonChosen;
    }
} else if (ACTION === 'utd-done') {
    var dm = output.m;
    var dline = dm.label + ' - ' + dm.first + ' ' + dm.last + ', ' + dm.age + ' (' + dm.months + ' months), ID ' + dm.id +
        '; reason ' + (dm.reasonChosen || '(none)') + (dm.confirm ? ' - "' + dm.confirm + '"' : '') +
        '; status afterwards ' + (dm.status || '(not read)');
    var problems = [dm.utdFailure].filter(Boolean);
    output.reg.steps.push('Test Case ' + (dm.index + 1) + ' - Unable to Deliver, ' + dline + ' - ' +
        (problems.length ? 'FAILED - ' + problems.join('; ') : 'PASSED'));
    if (problems.length) {
        output.reg.failures.push('Test Case ' + (dm.index + 1) + ' (' + dm.label + '): ' + problems.join('; '));
    }
    console.log('Test Case ' + (dm.index + 1) + ' - ' + dline + (problems.length ? ' - FAILED - ' + problems.join('; ') : ' - PASSED'));
} else if (ACTION === 'utd-summary') {
    var t = output.reg;
    var tb = t.balances || {};
    console.log('CDD household with Unable to Deliver - Distributor/CDD ' + t.user +
        '\n  Village ' + t.village + ', search text ' + t.searchText + ', location ' + t.location +
        '\n  Household total ' + t.members + ', members registered ' + (t.children.length + 1) +
        ' - head ' + t.head.first + ' ' + t.head.last + ' (' + t.head.age + ', ' + t.head.gender + ')' +
        '\n  Balances ' + t.variant1 + ' / ' + t.variant2 + ': start ' + (tb.start || []).join(' / ') +
        ', end ' + (tb.end || []).join(' / ') +
        '\n  ' + t.steps.join('\n  ') +
        (t.deviations.length ? '\n  Deviations: ' + t.deviations.length : '') +
        (t.failures.length ? '\n  Failed: ' + t.failures.length : ''));
    var tp = t.failures.concat(t.deviations.map(function (d) { return 'DEVIATION - ' + d; }));
    t.failure = tp.length ? 'CDD household with Unable to Deliver - ' + tp.join('; ') : '';
    if (t.failure && !/\.$/.test(t.failure)) {
        t.failure += '.';
    }
} else if (ACTION === 'check-balance') {
    var cb = output.reg;
    var cm = output.m;
    var kind = String(KIND);
    cb.current = cb.current || cb.balances.start.slice();
    var vi2 = cm.expected === cb.variant1 ? 0 : 1;
    var now = cb.balances[String(PHASE)];
    var qty = cm[kind];
    var want2 = cb.current[vi2] - qty;
    var names2 = [cb.variant1, cb.variant2];
    var wrong2 = [];
    if (now[vi2] !== want2) {
        wrong2.push(names2[vi2] + ' balance mismatch after ' + kind + ' for ' + cm.label + ': expected ' + want2 +
            ', found ' + now[vi2] + '.');
    }
    if (now[1 - vi2] !== cb.current[1 - vi2]) {
        wrong2.push(names2[1 - vi2] + ' balance mismatch after ' + kind + ' for ' + cm.label + ': expected ' +
            cb.current[1 - vi2] + ', found ' + now[1 - vi2] + '.');
    }
    var cline = 'Balance after ' + kind + ' (' + cm.label + ') - ' + names2[vi2] + ' ' + cb.current[vi2] + ' - ' + qty +
        ' = ' + now[vi2] + ', ' + names2[1 - vi2] + ' ' + now[1 - vi2];
    cb.steps.push(cline + (wrong2.length ? ' - FAILED - ' + wrong2.join(' ') : ' - PASSED'));
    if (wrong2.length) {
        cb.failures.push(wrong2.join(' '));
    }
    console.log(cline + (wrong2.length ? ' - FAILED - ' + wrong2.join(' ') : ' - PASSED'));
    cm['after_' + kind] = now.slice();
    cb.current = now.slice();
} else if (ACTION === 'cover') {
    var cs0 = output.reg.balances.start;
    var short = [];
    [output.reg.variant1, output.reg.variant2].forEach(function (v, i) {
        if (!(cs0[i] >= 2)) {
            short.push(v + ' ' + cs0[i]);
        }
    });
    output.reg.stockFailure = short.length ? 'BLOCKED - dose and redose cases: the CDD balance does not cover a dose and a redose (' +
        short.join(', ') + ').' : '';
} else if (ACTION === 'final-card') {
    var fr = output.reg;
    var fc = fr.children[fr.ci];
    var first = String(FIRST).trim();
    var next = String(maestro.copiedText).trim();
    fr.cards = fr.ci === 0 ? [] : (fr.cards || []);
    fr.cardProblems = fr.ci === 0 ? [] : (fr.cardProblems || []);
    var dosedHere = fc.dose !== undefined;
    var ok = dosedHere ? /^administered success$/i.test(first) && /^redose completed$/i.test(next)
        : /^not administered$/i.test(first);
    var shown = fc.label + ' ' + first + (dosedHere || !/^dose$/i.test(next) ? ', ' + next : '');
    fr.cards.push(shown + (ok ? '' : ' (expected ' + (dosedHere ? 'Administered success, Redose Completed' : 'Not Administered') + ')'));
    if (!ok) {
        fr.cardProblems.push(shown);
        fr.failures.push('Final verification: ' + fc.label + ' shows ' + first + ', ' + next);
    }
} else if (ACTION === 'redose-summary') {
    var q = output.reg;
    var qb = q.balances || {};
    var dosed = q.children.filter(function (x) { return x.dose !== undefined; });
    console.log('CDD household with dose and redose - Distributor/CDD ' + q.user +
        '\n  Village ' + q.village + ', search text ' + q.searchText + ', location ' + q.location +
        '\n  Members registered ' + (q.children.length + 1) + ' of ' + q.members + ' - head ' + q.head.first + ' ' +
        q.head.last + ' (' + q.head.age + ', ' + q.head.gender + ')' +
        '\n  ' + dosed.map(function (x) {
            return x.label + ' (' + x.months + ' months): offered ' + (x.products || []).join(', ') + ', dose ' + x.dose +
                ', redose ' + (x.redose === undefined ? '(none)' : x.redose) +
                (x.redoseReason ? ' (' + x.redoseReason + ')' : '');
        }).join('\n  ') +
        '\n  Balances ' + q.variant1 + ' / ' + q.variant2 + ': start ' + (qb.start || []).join(' / ') +
        ', end ' + (q.current || []).join(' / ') +
        '\n  ' + q.steps.join('\n  ') +
        (q.deviations.length ? '\n  Deviations: ' + q.deviations.length : '') +
        (q.failures.length ? '\n  Failed: ' + q.failures.length : ''));
    var qp = q.failures.concat(q.deviations.map(function (d) { return 'DEVIATION - ' + d; }));
    q.failure = qp.length ? 'CDD household with dose and redose - ' + qp.join('; ') : '';
    if (q.failure && !/\.$/.test(q.failure)) {
        q.failure += '.';
    }
} else if (ACTION === 'summary') {
    var s = output.reg;
    var b = s.balances || {};
    var fig = function (phase, i) { return b[phase] ? b[phase][i] : '(not read)'; };
    var who = function (m) {
        return m.label + ' - ' + m.first + ' ' + m.last + ', ' + m.age + ', ' + (m.gender || '(gender not picked)') +
            (m.id ? ', ID ' + m.id : '') +
            (m.products ? '; offered ' + m.products.join(', ') + ', dose ' + m.dose : '');
    };
    console.log('CDD registration and dose delivery - Distributor/CDD ' + s.user +
        '\n  Village ' + s.village + ', search text ' + s.searchText + ', location ' + s.location +
        '\n  Members: ' + [who(s.head), who(s.child1), who(s.child2)].join('; ') +
        '\n  Balances ' + s.variant1 + ' / ' + s.variant2 + ': before receipt ' + fig('before', 0) + ' / ' + fig('before', 1) +
        ', after receipt ' + fig('after', 0) + ' / ' + fig('after', 1) +
        ', after doses ' + fig('doses', 0) + ' / ' + fig('doses', 1) +
        (s.incomingMrns ? '; MRNs accepted ' + s.incomingMrns.join(', ') : '') +
        '\n  ' + s.steps.join('\n  ') +
        (s.boundaries.length ? '\n  Boundary checks:\n    ' + s.boundaries.join('\n    ') : '') +
        (s.deviations.length ? '\n  Deviations: ' + s.deviations.length : '') +
        (s.failures.length ? '\n  Failed / blocked: ' + s.failures.length : ''));
    var problems = s.failures.concat(s.deviations.map(function (d) { return 'DEVIATION - ' + d; }));
    s.failure = problems.length ? 'CDD registration - ' + problems.join('; ') : '';
    if (s.failure && !/\.$/.test(s.failure)) {
        s.failure += '.';
    }
} else if (ACTION === 'consent-summary') {
    var k = output.reg;
    console.log('CDD registration, consent No - Distributor/CDD ' + k.user +
        '\n  Village ' + k.village + ', generated name and search text ' + k.searchText +
        ', location ' + k.location + ', consent No, reason "' + k.reason + '"' +
        '\n  ' + k.steps.join('\n  ') +
        (k.deviations.length ? '\n  Deviations: ' + k.deviations.length : '') +
        (k.failures.length ? '\n  Failed / blocked: ' + k.failures.length : ''));
    var kp = k.failures.concat(k.deviations.map(function (d) { return 'DEVIATION - ' + d; }));
    k.failure = kp.length ? 'CDD registration, consent No - ' + kp.join('; ') : '';
    if (k.failure && !/\.$/.test(k.failure)) {
        k.failure += '.';
    }
}
