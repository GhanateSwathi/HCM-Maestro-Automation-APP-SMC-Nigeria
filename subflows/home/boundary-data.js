// Book-keeping for the boundary data check after Submit on boundary selection
// (boundary-data.yaml) - Prompt 17, for the health facility and the CDD.
//
//   ACTION=init     ROLE, CHOICE (BOUNDARY_DATA_CHOICE: Download or Proceed;
//                   default Download), RETRIES (BOUNDARY_DATA_RETRIES; default
//                   2). A bad value leaves its reason in output.bd.failure
//   ACTION=seen     WHAT: the first answer the app gave (data-found, no-data,
//                   failed-check, home)
//   ACTION=retry    one more Retry after "Failed to check data in server"
//   ACTION=done     OUTCOME, DETAIL: how the check ended
//   ACTION=report   log the result; Test Cases covered this run in
//                   output.bd.covered
//
// Nothing is thrown: a script error reaches the report only as "Unknown
// error". The YAML fails on output.bd.failure through fail.yaml.

function isSet(value) {
    var s = String(value).trim();
    return s !== '' && s !== 'undefined';
}

var b = output.bd;

if (ACTION === 'init') {
    var choice = isSet(CHOICE) ? String(CHOICE).trim().toLowerCase() : 'download';
    var retries = isSet(RETRIES) ? String(RETRIES).trim() : '2';
    output.bd = {
        role: isSet(ROLE) ? String(ROLE).trim() : 'the user',
        choice: choice === 'proceed' ? 'Proceed' : 'Download',
        maxRetries: /^\d+$/.test(retries) ? parseInt(retries, 10) : 2,
        tries: 0,
        stop: false,
        first: '',
        outcome: '',
        detail: '',
        failure: ''
    };
    if (choice !== 'download' && choice !== 'proceed') {
        output.bd.failure = 'BOUNDARY_DATA_CHOICE must be Download or Proceed, not "' + String(CHOICE).trim() + '".';
    } else if (!/^\d+$/.test(retries)) {
        output.bd.failure = 'BOUNDARY_DATA_RETRIES must be a whole number, not "' + retries + '".';
    }
} else if (ACTION === 'seen') {
    if (!b.first) {
        b.first = String(WHAT);
    }
} else if (ACTION === 'retry') {
    b.tries = b.tries + 1;
    console.log('Boundary data - "Failed to check data in server"; Retry ' + b.tries + ' of ' + b.maxRetries);
} else if (ACTION === 'done') {
    b.outcome = String(OUTCOME);
    b.detail = String(DETAIL);
} else if (ACTION === 'report') {
    var names = {
        'data-found': 'Data found!',
        'no-data': 'No data found!',
        'failed-check': 'Failed to check data in server',
        'home': 'no notice - straight to home'
    };
    // Which of Prompt 17's test cases this run's answers exercised.
    var covered = ['Test Case 1'];
    if (b.first === 'failed-check' || b.tries > 0) {
        covered.push('Test Case 5');
    }
    if (b.outcome === 'data-found-download') {
        covered.push('Test Case 2', 'Test Case 3');
    } else if (b.outcome === 'data-found-proceed') {
        covered.push('Test Case 2', 'Test Case 4');
    } else if (b.outcome === 'no-data') {
        covered.push('Test Case 6');
    }
    covered.push('Test Case 7');
    b.covered = covered.join(', ');
    console.log('Boundary data - ' + b.role + ': first answer ' + (names[b.first] || b.first) +
        (b.tries ? ', ' + b.tries + ' Retr' + (b.tries === 1 ? 'y' : 'ies') : '') + ' - ' + b.detail +
        '. Covered: ' + b.covered);
}
