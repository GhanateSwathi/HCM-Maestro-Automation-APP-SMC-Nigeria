// Bookkeeping for select-first-options.yaml. Maestro's JavaScript cannot read
// the screen, so the YAML copies each option's text into maestro.copiedText and
// this script files it away in output.dropdown, where the YAML reads it back.
//
//   ACTION=reset     start a new selection of COUNT options from FIELD
//   ACTION=remember  store maestro.copiedText as the next option, both as shown
//                    (for the log) and escaped for use in a full-string regex
//                    selector (for tapping and asserting)
//   ACTION=check     if the menu offered fewer than COUNT options, leave the
//                    reason in output.dropdown.failure for the YAML to fail on
//
// Maestro 2.10 prints labels verbatim, without resolving ${...}, so anything
// that names a runtime value goes through here instead: console.log lands in
// the run's maestro.log. Failures are not thrown from here: a script error
// reaches the report only as "Unknown error", so the YAML fails through
// subflows/fail.yaml instead.

if (ACTION === 'reset') {
    output.dropdown = {
        // FIELD is a selector regex ("ADMIN_State.*"); keep the log readable.
        field: FIELD.replace(/\.\*$/, ''),
        want: parseInt(COUNT, 10),
        // Option rows carry their name as text. The pattern excludes everything
        // else that can sit between a field and Submit: other fields' labels,
        // which all end in the required marker " *", and the "N Selected"
        // summary and "Clear All" chip a multi-select field shows.
        optionPattern: '(?!.* \\*$)(?!\\d+ Selected$)(?!Clear All$).+',
        options: [],
        patterns: [],
        next: 0,
        failure: ''
    };
} else if (ACTION === 'remember') {
    var text = maestro.copiedText;
    output.dropdown.options.push(text);
    output.dropdown.patterns.push(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    console.log(output.dropdown.field + ' option ' + output.dropdown.options.length + ': ' + text);
} else if (ACTION === 'check') {
    var found = output.dropdown.options.length;
    var summary = output.dropdown.field + ' - selected ' + found + ' of ' +
        output.dropdown.want + ' required: ' + output.dropdown.options.join(', ');
    console.log(summary);
    if (found < output.dropdown.want) {
        output.dropdown.failure = 'Too few options. ' + summary;
    }
}
