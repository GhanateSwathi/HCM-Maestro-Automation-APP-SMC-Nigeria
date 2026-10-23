// Reads one product's home Stock Balance line, for read-stock-balance.yaml.
//
//   ACTION=pattern  VARIANT ("SPAQ1") -> output.stockBalance.line, a selector
//                   for its home line ("10 SPAQ 1")
//   ACTION=parse    maestro.copiedText is that line (or "none") ->
//                   output.stockBalance.value, or output.stockBalance.failure
//
// Nothing is thrown - a script error reaches the report only as "Unknown
// error". The YAML fails on output.stockBalance.failure through fail.yaml.

// "SPAQ1" -> "SPAQ\s?1": the test data writes product names without a space,
// the app with one ("SPAQ 1").
function core(name) {
    return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/([A-Za-z])(\d)/g, '$1\\s?$2');
}

if (ACTION === 'pattern') {
    var v = String(VARIANT).trim();
    output.stockBalance = {
        variant: v,
        line: '\\d+\\s+' + core(v) + '\\b',
        value: NaN,
        failure: ''
    };
} else if (ACTION === 'parse') {
    var b = output.stockBalance;
    var m = String(maestro.copiedText).match(/^\s*(\d+)\b/);
    b.value = m ? parseInt(m[1], 10) : NaN;
    b.failure = m ? '' : 'Unable to read stock balance for ' + b.variant + '.';
    console.log('Stock balance ' + b.variant + ': ' + (m ? m[1] : 'unreadable'));
}
