// State for open-stock-form.yaml - the Record Stock Issued form, used to
// dispatch (Issue) and to return (Return).
//
//   ACTION=init      VARIANT (the product), TARGET (the Facility To option to
//                    pick; blank or unset takes the first offered), MISSING
//                    (the failure message when TARGET is not offered), and
//                    optionally TEAM_CODE (the recipient a "Delivery team"
//                    dispatch scans by QR - the health facility to a CDD) and
//                    ROLE (who is signed in, for messages; "State User" when
//                    unset)
//   ACTION=facility  maestro.copiedText is the Facility To option picked
//   ACTION=scanned   maestro.copiedText is the scanner's entry for the code it
//                    read ("AU-CDD-001||<uuid>"); a different recipient leaves
//                    its reason in output.form.failure
//
// Nothing is thrown - a script error reaches the report only as "Unknown
// error".

// "SPAQ1" -> "SPAQ\s?1": the test data writes product names without a space,
// the app with one ("SPAQ 1").
function core(name) {
    return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/([A-Za-z])(\d)/g, '$1\\s?$2');
}
function escape(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function unset(value) {
    var t = String(value).trim();
    return t === '' || t === 'undefined';
}
// A caller that does not pass a variable leaves it undeclared here, so the
// optional ones are read through typeof.
function optional(value, fallback) {
    return unset(value) ? fallback : String(value).trim();
}

if (ACTION === 'init') {
    var variant = String(VARIANT).trim();
    var teamCode = optional(typeof TEAM_CODE === 'undefined' ? '' : TEAM_CODE, '');
    var role = optional(typeof ROLE === 'undefined' ? '' : ROLE, 'State User');
    output.form = {
        variant: variant,
        // The product's row in Select product, and its chip: "SPAQ 1".
        product: core(variant),
        target: unset(TARGET) ? '' : String(TARGET).trim(),
        targetPattern: unset(TARGET) ? '' : escape(String(TARGET).trim()),
        missing: String(MISSING),
        role: role,
        teamCode: teamCode,
        teamCodePattern: escape(teamCode),
        scanned: '',
        facility: '',
        facilityPattern: '',
        failure: ''
    };
} else if (ACTION === 'facility') {
    output.form.facility = String(maestro.copiedText).trim();
    output.form.facilityPattern = escape(output.form.facility);
    console.log('Facility To selected: ' + output.form.facility +
        (output.form.target ? ' (configured)' : ' (first available)'));
} else if (ACTION === 'scanned') {
    // The QR holds "<user name>||<user id>"; the scanner lists it, shortened.
    // Only the user name is compared and logged.
    var f = output.form;
    f.scanned = String(maestro.copiedText).split('||')[0].trim();
    f.failure = '';
    if (f.scanned.toLowerCase() !== f.teamCode.toLowerCase()) {
        f.failure = 'QR code scan failed: scanned ' + (f.scanned || 'nothing readable') +
            ', expected ' + f.teamCode + '.';
    } else {
        f.facility = f.facility + ' - Team Code ' + f.scanned;
        console.log('QR code scanned (emulator virtual camera): Team Code ' + f.scanned);
    }
}
