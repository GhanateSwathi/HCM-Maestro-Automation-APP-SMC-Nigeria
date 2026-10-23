// Book-keeping for Beneficiary Referral (Prompt 10). Maestro's JavaScript
// cannot read the screen: the YAML copies texts into maestro.copiedText,
// this script files them in output.referral (the run) and output.ref (the
// record in hand), and the YAML reads results back.
//
// A record that cannot be made (its reason not offered, the wrong checklist,
// no success screen) is recorded as failed and the run moves on to the next
// reason, as the specification asks; summary then fails the run listing
// every failure.
//
//   ACTION=init       TEST_USER, AGE (CHILD_AGE_MONTHS), GENDER, CYCLE,
//                     VILLAGE (each optional: blank takes the first offered),
//                     TEXT (CHECKLIST_TEXT_ANSWER)
//   ACTION=village    maestro.copiedText is the village picked
//   ACTION=begin      REASON: start a record - its child name and the
//                     checklist title to expect
//   ACTION=picked     WHAT (facility | cycle | gender): maestro.copiedText
//   ACTION=label      INDEX: maestro.copiedText is the INDEX-th line under
//                     the reason question, top to bottom
//   ACTION=reason     after the labels: the reason's position, or a failure
//   ACTION=question   maestro.copiedText is a checklist question
//   ACTION=answer     maestro.copiedText is the answer given to it (TYPED
//                     "true" when it was typed into a text field)
//   ACTION=fail       WHY: this record failed; later steps are skipped
//   ACTION=success    maestro.copiedText is the success message
//   ACTION=refid      maestro.copiedText is a referral id, if one was shown
//   ACTION=done       file the record's result
//   ACTION=listed     INDEX, FOUND: a created record in the referral list
//   ACTION=sync       RESULT ok | failed, MESSAGE
//   ACTION=summary    log the report; failures become output.referral.failure
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
// "Drug side effect from the current cycle" -> "SideEffectCurrentCycle".
function slug(reason) {
    return String(reason).split(/[^A-Za-z0-9]+/)
        .filter(function (w) { return w && !/^(drug|from|the)$/i.test(w); })
        .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); })
        .join('');
}
// The checklist each reason opens is titled after it, minus "Drug" and
// "the" (read off the app 2026-10-21): "Side effect from current cycle
// checklist", "Side effect from previous cycle Checklist", "Fever
// Checklist", "Sick Checklist".
function titlePattern(reason) {
    var words = String(reason).split(/\s+/)
        .filter(function (w) { return w && !/^(drug|the)$/i.test(w); })
        .map(escape);
    return '(?i)' + words.join('\\s+') + '\\s+checklist';
}

if (ACTION === 'init') {
    var now = new Date();
    output.referral = {
        user: unset(TEST_USER) ? '(TEST_USER not set)' : String(TEST_USER).trim(),
        age: String(AGE).trim(),
        gender: unset(GENDER) ? '' : String(GENDER).trim(),
        genderPattern: unset(GENDER) ? '' : escape(String(GENDER).trim()),
        cycle: unset(CYCLE) ? '' : String(CYCLE).trim(),
        cyclePattern: unset(CYCLE) ? '' : escape(String(CYCLE).trim()),
        villageTarget: unset(VILLAGE) ? '' : String(VILLAGE).trim(),
        villagePattern: unset(VILLAGE) ? '' : escape(String(VILLAGE).trim()),
        village: '',
        text: unset(TEXT) ? '' : String(TEXT).trim(),
        stamp: now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) +
            pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()),
        records: [],
        names: [],
        listed: [],
        sync: '',
        failures: [],
        failure: ''
    };
    var age = parseInt(output.referral.age, 10);
    var missing = [];
    if (!/^\d+$/.test(output.referral.age) || age < 3 || age > 59) {
        missing.push('CHILD_AGE_MONTHS (a whole number of months, 3 to 59)');
    }
    if (!output.referral.text) {
        missing.push('CHECKLIST_TEXT_ANSWER (typed into a checklist\'s text questions)');
    }
    if (missing.length) {
        output.referral.failure = 'Set in .env: ' + missing.join('; ') + '.';
    }
} else if (ACTION === 'village') {
    output.referral.village = String(maestro.copiedText).trim();
    output.referral.villageSelector = escape(output.referral.village);
    console.log('Beneficiary Referral village - ' + output.referral.village +
        (output.referral.villageTarget ? ' (REFERRAL_VILLAGE)' : ' (first available)'));
} else if (ACTION === 'begin') {
    var reason = String(REASON).trim();
    output.ref = {
        reason: reason,
        reasonPattern: escape(reason),
        slug: slug(reason),
        typed: false,
        name: 'AutoChild_' + slug(reason) + '_' + output.referral.stamp,
        title: titlePattern(reason),
        labels: [],
        position: -1,
        facility: '',
        cycle: '',
        gender: '',
        question: '',
        answers: {},
        order: [],
        message: '',
        id: '',
        skip: unset(REASON),
        failure: unset(REASON) ? 'Reason not set in .env.' : ''
    };
    output.referral.names.push(output.ref.name);
    console.log('Referral - ' + reason + ': child ' + output.ref.name);
} else if (ACTION === 'picked') {
    output.ref[String(WHAT)] = String(maestro.copiedText).trim();
    output.ref[String(WHAT) + 'Selector'] = escape(output.ref[String(WHAT)]);
} else if (ACTION === 'label') {
    output.ref.labels[parseInt(INDEX, 10)] = String(maestro.copiedText).trim();
} else if (ACTION === 'reason') {
    var r = output.ref;
    r.position = -1;
    for (var i = 0; i < r.labels.length; i++) {
        if (r.labels[i] && r.labels[i].toLowerCase() === r.reason.toLowerCase()) {
            r.position = i;
            break;
        }
    }
    if (r.position < 0) {
        r.skip = true;
        r.failure = 'Referral reason ' + r.reason + ' not available.';
        console.log(r.failure + ' Offered: ' + r.labels.filter(Boolean).join(', '));
    }
} else if (ACTION === 'question') {
    output.ref.question = String(maestro.copiedText).replace(/\s*\*\s*$/, '').trim();
    if (output.ref.order.indexOf(output.ref.question) < 0) {
        output.ref.order.push(output.ref.question);
    }
} else if (ACTION === 'answer') {
    output.ref.answers[output.ref.question] = String(maestro.copiedText).trim() +
        (String(TYPED) === 'true' ? ' (typed)' : '');
} else if (ACTION === 'fail') {
    output.ref.skip = true;
    output.ref.failure = String(WHY);
    console.log('Referral ' + output.ref.reason + ' FAILED - ' + output.ref.failure);
} else if (ACTION === 'success') {
    output.ref.message = String(maestro.copiedText).trim();
} else if (ACTION === 'refid') {
    output.ref.id = String(maestro.copiedText).trim();
} else if (ACTION === 'done') {
    var d = output.ref;
    var answers = d.order.map(function (q) { return q + ' = ' + d.answers[q]; });
    var line = d.reason + ': child ' + d.name + ', age ' + output.referral.age + ' months, gender ' + d.gender +
        ', cycle ' + d.cycle + ', facility ' + d.facility +
        (answers.length ? '; checklist - ' + answers.join('; ') : '') +
        '; ' + (d.failure ? 'FAILED - ' + d.failure : 'submitted' + (d.message ? ' ("' + d.message + '")' : '') +
        (d.id ? ', referral id ' + d.id : ', no referral id shown'));
    output.referral.records.push({ reason: d.reason, name: d.name, ok: !d.failure, line: line });
    if (d.failure) {
        output.referral.failures.push(d.reason + ' - ' + d.failure);
    }
    console.log('Referral record - ' + line);
} else if (ACTION === 'listed') {
    var rec = output.referral.records[parseInt(INDEX, 10)];
    var found = String(FOUND) === 'true';
    output.referral.listed.push(rec.name + (found ? ' listed' : ' NOT listed'));
    if (rec.ok && !found) {
        output.referral.failures.push(rec.reason + ' - ' + rec.name + ' is not in the referral list after it was submitted');
    }
} else if (ACTION === 'sync') {
    output.referral.sync = String(RESULT) === 'ok' ? 'synced - ' + String(MESSAGE) : 'FAILED - ' + String(MESSAGE);
    if (String(RESULT) !== 'ok') {
        output.referral.failures.push('Referral sync failed: ' + String(MESSAGE) + '.');
    }
} else if (ACTION === 'summary') {
    var s = output.referral;
    var made = s.records.filter(function (x) { return x.ok; }).length;
    console.log('Beneficiary Referral - Health Facility ' + s.user + ', village ' + s.village +
        '\n  ' + s.records.map(function (x) { return x.line; }).join('\n  ') +
        '\n  Records created: ' + made + ' of ' + s.records.length +
        '\n  Referral list: ' + s.listed.join(', ') +
        '\n  Sync: ' + s.sync);
    s.failure = s.failures.length
        ? 'Beneficiary Referral - ' + made + ' of ' + s.records.length + ' records created; ' + s.failures.join('; ')
        : '';
    if (s.failure && !/\.$/.test(s.failure)) {
        s.failure += '.';
    }
}
