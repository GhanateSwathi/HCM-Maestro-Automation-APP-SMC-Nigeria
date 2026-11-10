<#
.SYNOPSIS
    Runs one Beneficiary ID case on the device with the plan's log check
    around it, then records its PASS / FAIL / BLOCKED and ID ledger rows in
    the report.

.DESCRIPTION
    The case's flow comes from beneficiary-id\scripts\cases.csv: one file, or
    a case folder whose files run as one Maestro run each, in name order,
    through the root suite's scripts\run.ps1 (.env forwarded as -e). The app
    stays where a part leaves it - only the first part opens it, and nothing
    here clears it - and each part's "VAR|NAME|VALUE" lines are passed to the
    parts after it as -e NAME=VALUE. Short parts also keep a lost Maestro
    session cheap to repeat (see Test-PartLost).

    Every part gets QAID_RUN, a tag for this run (ddHHmm of its start), which
    the cases add to the names they register - QAID-P1-A-<tag> - so a search
    never finds an earlier run's household; and DEVICE_ID, the device it runs
    on, which its ledger rows name.

    Parts that share a stage number ("2-register-a.yaml" and
    "2-register-b@2.yaml") run at the same time, one per device: the two
    emulators of X9, X9b and D5 do each step together, signed in as the same
    CDD. The next stage starts when both are done.

    The device log is recorded for the whole run ("adb logcat -c" before,
    logcat throughout) into <run>\<case>.log; its UPDATE_IDENTIFIER_STATUS
    lines go to <run>\<case>-id-status.log and their "reallocated" count is
    checked against cases.csv by report.py, which then rebuilds
    artifacts\beneficiary-id\report\ (results.xlsx, report.html) and
    beneficiary-id\TEST-CASES.md.

    Ported from the Beneficiary ID Fix suite (HCM-Maestro-Beneficiary-ID-Fix,
    AZM builds, 2026-10-30 to 11-04).

.EXAMPLE
    .\beneficiary-id\scripts\run-case.ps1 -Case P1
    .\beneficiary-id\scripts\run-case.ps1 -Case X9 -Device emulator-5554 -Device2 emulator-5556
    .\beneficiary-id\scripts\run-case.ps1 -Case D6 -Resume artifacts\beneficiary-id\runs\<run> -From 3-relogin
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $Case,
    # adb serial; defaults to DEVICE_ID in .env, else the one device connected.
    [string] $Device,
    # The second device, for the parts named "...@2.yaml" (X9, X9b, D5);
    # defaults to DEVICE_ID_2 in .env.
    [string] $Device2,
    # Carry on a run that stopped: its folder
    # (artifacts\beneficiary-id\runs\<...>-<case>) and the first part to run
    # again (e.g. 3-checks). The VARs of the parts before it are read from
    # that folder, and the result is recorded for the whole run.
    [string] $Resume,
    [string] $From
)

$ErrorActionPreference = 'Stop'
$suite = Split-Path -Parent $PSScriptRoot
$root = Split-Path -Parent $suite

$row = Import-Csv (Join-Path $PSScriptRoot 'cases.csv') | Where-Object Case -eq $Case
if (-not $row) { throw "Unknown case $Case - see beneficiary-id\scripts\cases.csv." }
if (-not $row.Flow) { throw "Case $Case has no flow yet (beneficiary-id\scripts\cases.csv)." }

# Key presence only is read here for the device; values are passed on by
# run.ps1, never printed.
$envMap = @{}
foreach ($line in Get-Content (Join-Path $root '.env')) {
    if ($line -match '^\s*([^#=]+?)\s*=\s*(.*)$') { $envMap[$Matches[1]] = $Matches[2].Trim() }
}
if (-not $Device) { $Device = $envMap['DEVICE_ID'] }
if (-not $Device) {
    $connected = @(adb devices | Select-String -Pattern '^(\S+)\s+device$' | ForEach-Object { $_.Matches[0].Groups[1].Value })
    if ($connected.Count -eq 1) { $Device = $connected[0] }
}
if (-not $Device) { throw "No device: pass -Device, set DEVICE_ID in .env, or connect exactly one device." }

# A fresh emulator installs Maestro's driver on the first run, which took
# longer than Maestro's default wait (2026-11-02, "Android driver did not
# start up in time"). Inherited by run.ps1 and the parallel parts.
if (-not $env:MAESTRO_DRIVER_STARTUP_TIMEOUT) { $env:MAESTRO_DRIVER_STARTUP_TIMEOUT = '180000' }

if ($Resume) {
    $runDir = (Resolve-Path $Resume).Path
    if (-not $From) { throw "-Resume needs -From <part>, the first part to run again." }
    # Each stretch of the run keeps its own device log; the log check reads them all.
    $log = Join-Path $runDir ('{0}.resume-{1}.log' -f $Case, (Get-Date -Format 'HHmmss'))
    # The run's tag comes from its folder (yyyyMMdd-HHmmss-<case>): the
    # names registered before the stop carry it.
    if ((Split-Path -Leaf $runDir) -notmatch '^\d{6}(\d{2})-(\d{4})\d{2}-') { throw "Cannot read the run's start from $runDir (yyyyMMdd-HHmmss-<case>)." }
    $runTag = $Matches[1] + $Matches[2]
} else {
    $stamp = Get-Date
    $runDir = Join-Path $root ('artifacts\beneficiary-id\runs\{0}-{1}' -f $stamp.ToString('yyyyMMdd-HHmmss'), $Case)
    New-Item -ItemType Directory -Force $runDir | Out-Null
    $log = Join-Path $runDir "$Case.log"
    $runTag = $stamp.ToString('ddHHmm')
}
Write-Host "Case $Case, run tag $runTag (names QAID-<case>-<letter>-$runTag), output $runDir"

$target = Join-Path $suite $row.Flow
$parts = if (Test-Path $target -PathType Container) {
    @(Get-ChildItem $target -Filter *.yaml | Sort-Object Name)
} else { @(Get-Item $target) }

# Two-device cases (X9, X9b, D5): a part named "...@2.yaml" runs on the
# second device. Every part is told which device it runs on (DEVICE_ID), so
# the IDs it records in the ledger name their device.
$devices = @($Device)
if ($parts | Where-Object BaseName -match '@2$') {
    if (-not $Device2) { $Device2 = $envMap['DEVICE_ID_2'] }
    if (-not $Device2) { throw "Case $Case has parts for a second device: pass -Device2 or set DEVICE_ID_2 in .env." }
    $devices += $Device2
}

# Log check, before the case: raise the app's "flutter" tag to Verbose (a
# phone that logs at Error level drops the app's Info lines; harmless on an
# emulator), clear the log, then record it for the whole run - a dump at the
# end could miss early lines once the ring buffer wraps. The second device's
# log goes to <case>.device2.log beside it.
$logcats = @()
foreach ($d in $devices) {
    adb -s $d shell setprop log.tag.flutter V | Out-Null
    adb -s $d logcat -c | Out-Null
    $out = if ($d -eq $Device) { $log } else { $log -replace '\.log$', '.device2.log' }
    $logcats += Start-Process -FilePath 'adb' -ArgumentList '-s', $d, 'logcat', '-v', 'time' `
        -RedirectStandardOutput $out -NoNewWindow -PassThru
}
$vars = [ordered]@{}
$code = 0
$runPs1 = Join-Path $root 'scripts\run.ps1'

# A part Maestro lost - it stopped with no failed check: no maestro.log at
# all (the driver never started), a connection error, or a log that just
# ends. On the emulator (2026-11-02) adb drops the device for a moment
# whenever a Maestro session starts, which killed runs 3-6 s in. Such a part
# is run again, up to twice: every part starts by waiting for the screen the
# previous one left, so a retry after the app has moved on stops there
# instead of registering anyone twice.
function Test-PartLost([string] $dir) {
    $logs = @(Get-ChildItem $dir -Recurse -Filter maestro.log -ErrorAction SilentlyContinue)
    if (-not $logs) { return $true }
    $text = ($logs | Get-Content -Raw) -join "`n"
    if ($text -match 'Assertion is false|Element not found') { return $false }
    return ($text -match 'DeviceServerDiedException|device offline|did not start up in time|StatusRuntimeException: UNAVAILABLE') -or
           ($text -notmatch 'onCommandFinished: .* FAILED')
}

function Get-PartDevice($part) { if ($part.BaseName -match '@2$') { $Device2 } else { $Device } }

# A part of a stage with two parts runs in its own PowerShell, so both
# devices' Maestro runs go at once (tested 2026-11-03: two Maestro 2.10 runs,
# one per emulator, do not get in each other's way). Its output goes to
# <part>\console.log, shown here line by line with the device in front.
function Start-PartProcess($part, [string] $device, [string] $partDir, [string[]] $set) {
    New-Item -ItemType Directory -Force $partDir | Out-Null
    $q = { param($s) "'" + ($s -replace "'", "''") + "'" }
    $cmd = '& {0} -Flow {1} -Device {2} -RunDir {3} -Set @({4}); exit $LASTEXITCODE' -f (& $q $runPs1),
        (& $q $part.FullName), (& $q $device), (& $q $partDir), (($set | ForEach-Object { & $q $_ }) -join ',')
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($cmd))
    $p = Start-Process -FilePath 'powershell.exe' -NoNewWindow -PassThru `
        -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $encoded `
        -RedirectStandardOutput (Join-Path $partDir 'console.log') -RedirectStandardError (Join-Path $partDir 'console-err.log')
    $null = $p.Handle  # Windows PowerShell reads ExitCode only once the handle was taken
    [pscustomobject]@{ Process = $p; Device = $device; Out = (Join-Path $partDir 'console.log'); Shown = 0 }
}

function Show-PartOutput($runs) {
    foreach ($r in $runs) {
        $lines = @(Get-Content $r.Out -ErrorAction SilentlyContinue)
        for (; $r.Shown -lt $lines.Count; $r.Shown++) { Write-Host "[$($r.Device)] $($lines[$r.Shown])" }
    }
}

$stages = @($parts | Group-Object { if ($_.BaseName -match '^(\d+)-') { $Matches[1] } else { $_.BaseName } })
try {
    foreach ($stage in $stages) {
        $set = @("QAID_RUN=$runTag") + @($vars.GetEnumerator() | ForEach-Object { '{0}={1}' -f $_.Key, $_.Value })
        $todo = @()
        foreach ($part in $stage.Group) {
            $partDir = Join-Path $runDir $part.BaseName
            # Already run (-Resume): only its VARs are needed.
            if ($Resume -and $part.BaseName -lt $From) { continue }
            if ($Resume -and (Test-Path $partDir)) {
                # The stopped run's attempt at this part: kept like a lost attempt.
                Rename-Item $partDir ('{0}.lost-resume-{1}' -f $part.BaseName, (Get-Date -Format 'HHmmss'))
            }
            $todo += $part
        }
        for ($attempt = 1; $todo; $attempt++) {
            foreach ($part in $todo) {
                Write-Host "Part $($part.BaseName) on $(Get-PartDevice $part)$(if ($attempt -gt 1) { " (attempt $attempt)" }) with $($set -join ', ')"
            }
            $codes = @{}
            if ($todo.Count -eq 1) {
                $part = $todo[0]
                & $runPs1 -Flow $part.FullName -Device (Get-PartDevice $part) -RunDir (Join-Path $runDir $part.BaseName) -Set ($set + "DEVICE_ID=$(Get-PartDevice $part)")
                $codes[$part.BaseName] = $LASTEXITCODE
            } else {
                Write-Host "Parts $(($todo | ForEach-Object BaseName) -join ' and ') at the same time"
                $runs = @(foreach ($part in $todo) {
                    Start-PartProcess $part (Get-PartDevice $part) (Join-Path $runDir $part.BaseName) ($set + "DEVICE_ID=$(Get-PartDevice $part)")
                })
                while ($runs | Where-Object { -not $_.Process.HasExited }) { Show-PartOutput $runs; Start-Sleep -Seconds 3 }
                Show-PartOutput $runs
                for ($i = 0; $i -lt $todo.Count; $i++) { $codes[$todo[$i].BaseName] = $runs[$i].Process.ExitCode }
            }
            $retry = @()
            foreach ($part in $todo) {
                $partDir = Join-Path $runDir $part.BaseName
                $c = $codes[$part.BaseName]
                if ($c -ne 0 -and $attempt -lt 3 -and (Test-PartLost $partDir)) {
                    Write-Host "Maestro lost the device during part $($part.BaseName) - running it again."
                    Rename-Item $partDir ('{0}.lost-{1}' -f $part.BaseName, $attempt)
                    adb -s (Get-PartDevice $part) wait-for-device | Out-Null
                    $retry += $part
                } elseif ($c -ne 0 -and $code -eq 0) { $code = $c }
            }
            if ($retry) { Start-Sleep -Seconds 5 }
            $todo = $retry
        }
        foreach ($part in $stage.Group) {
            foreach ($hit in Get-ChildItem (Join-Path $runDir $part.BaseName) -Recurse -Filter maestro.log -ErrorAction SilentlyContinue | Select-String -Pattern 'JsConsole: VAR\|([^|]+)\|(.*)$') {
                $vars[$hit.Matches[0].Groups[1].Value] = $hit.Matches[0].Groups[2].Value.Trim()
            }
        }
        if ($code -ne 0) { break }
    }
} finally {
    Start-Sleep -Seconds 2
    foreach ($l in $logcats) { if (-not $l.HasExited) { Stop-Process -Id $l.Id -Force } }
}

# Log check, after the case - over every stretch of a resumed run.
$logs = @(Get-ChildItem $runDir -Filter "$Case*.log" | Where-Object Name -notmatch '-id-status\.log$' | ForEach-Object FullName)
# Sign-in logs the app's form config, whose actions include
#   "actionType": "UPDATE_IDENTIFIER_STATUS",
# (AZM build, 2026-11-02) - the config naming the action, not the app
# running it. Those are left out.
$idLines = @(Select-String -Path $logs -SimpleMatch 'UPDATE_IDENTIFIER_STATUS' -ErrorAction SilentlyContinue |
    Where-Object { $_.Line -notmatch '"actionType"\s*:' })
$idLines | ForEach-Object Line | Set-Content -Path (Join-Path $runDir "$Case-id-status.log") -Encoding utf8
$reallocated = @($idLines | Where-Object { $_.Line -match 'reallocat' }).Count
Write-Host ("Log check: {0} UPDATE_IDENTIFIER_STATUS line(s), {1} reallocated" -f $idLines.Count, $reallocated)

# The ID each form carried at Submit. The AZM builds logged it as
#   CONDITION_EVAL: navigation={nameOfIndividual: QAID-P1-A, UNIQUE_BENEFICIARY_ID: 082318772072, ...}
# (2026-10-30): the search text and the ID the search screen pre-loaded. A
# second person offered the first one's ID is the stale-screen bug;
# report.py compares it with the ID each was saved with. Whether the SMC
# build logs the line is not known yet - none found, nothing is reported.
$offered = [ordered]@{}
foreach ($hit in Select-String -Path $logs -Pattern 'CONDITION_EVAL: navigation=\{nameOfIndividual: ([^,]+), UNIQUE_BENEFICIARY_ID: (\w+)') {
    $name = $hit.Matches[0].Groups[1].Value.Trim()
    if (-not $offered.Contains($name)) { $offered[$name] = $hit.Matches[0].Groups[2].Value }
}
$offeredArg = ($offered.GetEnumerator() | ForEach-Object { '{0}={1}' -f $_.Key, $_.Value }) -join ';'
if ($offeredArg) { Write-Host "Offered at Submit: $offeredArg" }

# The deviceUuid each device's pool IDs carry - the cause of the AZM
# duplicates: 2.2.120 logged every pool ID as
#   UniqueIdPoolModel(id: ..., status: UN_ASSIGNED, deviceUuid: BP22.250221.010, userUuid: ...)
# - the Android build ID, the same on both emulators, which held one pool
# (X9, 2026-11-03); the fixed build sends each device's own in its ID
# download request, "deviceUuid": "8db6335da8f803fa". Device 2's logs end
# in ".device2.log".
$uuids = [ordered]@{}
foreach ($d in $devices) {
    $own = @($logs | Where-Object { ($_ -match '\.device2\.log$') -eq ($d -ne $Device) })
    $found = @(Select-String -Path $own -Pattern 'UniqueIdPoolModel\(.*?deviceUuid: ([^,)]+)|"deviceUuid": "([^"]+)"' -ErrorAction SilentlyContinue |
        ForEach-Object { $g = $_.Matches[0].Groups; if ($g[1].Success) { $g[1].Value.Trim() } else { $g[2].Value.Trim() } } | Sort-Object -Unique)
    if ($found) { $uuids[$d] = $found -join '/' }
}
$uuidArg = ($uuids.GetEnumerator() | ForEach-Object { '{0}={1}' -f $_.Key, $_.Value }) -join ';'
if ($uuidArg) { Write-Host "Pool IDs' deviceUuid: $uuidArg" }

python (Join-Path $PSScriptRoot 'report.py') record --case $Case --run-dir $runDir --exit-code $code `
    --reallocated $reallocated --id-lines $idLines.Count "--offered=$offeredArg" "--device-uuids=$uuidArg" `
    --phone $Device --user $envMap['HCM_CDD_USER_ID']

# A second case run inside this one (X2 inside X1) logs its lines tagged
# "X2:CHECK|..."; it is recorded as its own case from the same run.
$tags = @(Get-ChildItem $runDir -Recurse -Filter maestro.log |
    Select-String -Pattern 'JsConsole: ([A-Za-z0-9]+):(CHECK|NOTE|BLOCKED)\|' |
    ForEach-Object { $_.Matches[0].Groups[1].Value } | Where-Object { $_ -ne $Case } | Sort-Object -Unique)
foreach ($tag in $tags) {
    python (Join-Path $PSScriptRoot 'report.py') record --case $tag --tag $tag --run-dir $runDir --exit-code $code `
        --reallocated 0 --id-lines 0 --phone $Device --user $envMap['HCM_CDD_USER_ID']
}
exit $code
