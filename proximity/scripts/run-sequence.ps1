<#
.SYNOPSIS
    Runs one Search by proximity test sequence: moves the emulator's GPS
    (adb emu geo fix) between flow parts, runs the parts through
    proximity\run.ps1, records the result lists, and prints what the parts
    logged.

.DESCRIPTION
    In the ID-fix repo these sequences were run by hand, part by part, with
    the GPS moves typed in between (PROXIMITY-CASES.md, 2026-11-06). Here
    each is one command. Points are distances from the centre C (-Lat /
    -Lon): north and east in km, converted on a sphere (111.195 km per degree
    of latitude). C defaults to the emulator's own fix, Mountain View
    (37.421998, -122.084), where every root-suite flow and Beneficiary ID
    case registers (TEST_LATITUDE / TEST_LONGITUDE blank) - so, like Rigan
    Ori's C on the AZM build, many households and the root suite's consent-No
    ones are already in range there.

      NB1     sign in / boundary with Download (part 1), IDs, Search (2);
              the plain Near by list recorded; QAID-NB1-<tag>-A registered
              at C (3); the list recorded again; Near by + its name
              (P-02, P-04, E-01, E-11)
      NB2     the moving check: a household at C, 1, 4.9, 5.1 and 10 km
              north, each checked under Near by at once; then from C which
              are near by (P-05, N-01), Sync Data, the saved lat/long
      Radius  B8: from 0 m to 750 m north of NB2-C, is it near by?
              (-Tag of the NB2 run)
      E09     B9 / B10: the GPS moves 10 km with Search open (-Tag of NB2)
      NB3     B1's cause at F (30 km south): a consent-No household, then 5
              normal; the plain list and the list with the name typed
      NB4     control at G (30 km north): 6 normal households, no consent-No
      NB5     QA's manual case: register -Name at C, back to Search, Near by
              on, list recorded, then the name typed
      NB6     QA's clean start: sync and log out, clear the app's storage,
              sign in, download the village, then NB5

    The households' heads are aged so they can be told apart in a list whose
    names all read "--" (proximity\README.md): NB1-A 101; NB2 C 102, 1KM
    103, 4K9 104, 5K1 105, 10KM 106; NB3-1..5 111-115; NB4-1..6 121-126;
    NB5 -HeadAge (131).

    IRREVERSIBLE (all but Radius and E09): registers households on UAT.
    NB6 clears the app's storage - its beneficiary IDs and downloaded data.

.EXAMPLE
    .\proximity\scripts\run-sequence.ps1 -Sequence NB2
    .\proximity\scripts\run-sequence.ps1 -Sequence Radius -Tag 101530
    .\proximity\scripts\run-sequence.ps1 -Sequence NB5 -Name Ada -LastName Test
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [ValidateSet('NB1', 'NB2', 'Radius', 'E09', 'NB3', 'NB4', 'NB5', 'NB6')] [string] $Sequence,
    # adb serial; defaults to DEVICE_ID in .env, else the one device connected.
    [string] $Device,
    # The centre C, decimal degrees.
    [double] $Lat = 37.421998,
    [double] $Lon = -122.084,
    # The run's tag (QAID_RUN). Radius and E09 need the NB2 run's tag.
    [string] $Tag,
    # NB5 / NB6: the household QA registers.
    [string] $Name,
    [string] $LastName,
    [int]    $HeadAge = 131,
    # Seconds nearby-list.py waits after each swipe for a page to load.
    [double] $SwipeWait = 7
)

$ErrorActionPreference = 'Stop'
$prox = Split-Path -Parent $PSScriptRoot
$root = Split-Path -Parent $prox
$inv = [Globalization.CultureInfo]::InvariantCulture

$envMap = @{}
foreach ($line in Get-Content (Join-Path $root '.env')) {
    if ($line -match '^\s*([^#=]+?)\s*=\s*(.*)$') { $envMap[$Matches[1]] = $Matches[2].Trim() }
}
if (-not $Device) { $Device = $envMap['DEVICE_ID'] }
if (-not $Device) {
    $connected = @(adb devices | Select-String -Pattern '^(\S+)\s+device$' | ForEach-Object { $_.Matches[0].Groups[1].Value })
    if ($connected.Count -eq 1) { $Device = $connected[0] }
}
if (-not $Device) { throw "No device: pass -Device, set DEVICE_ID in .env, or connect exactly one emulator." }
if ($Device -notmatch '^emulator-') { throw "$Device is not an emulator: the sequences move the GPS with adb emu geo fix." }
if (($Sequence -in 'Radius', 'E09') -and -not $Tag) { throw "-Sequence $Sequence needs -Tag, the tag of the NB2 run whose households it uses." }
if (($Sequence -in 'NB5', 'NB6') -and -not $Name) { throw "-Sequence $Sequence needs -Name (and -LastName): the household QA registers." }
if (-not $Tag) { $Tag = Get-Date -Format 'ddHHmm' }

$seqDir = Join-Path $root ('artifacts\proximity\runs\{0}-{1}' -f (Get-Date -Format 'yyyyMMdd-HHmmss'), $Sequence)
New-Item -ItemType Directory -Force $seqDir | Out-Null
$log = Join-Path $seqDir 'sequence.log'
function Write-Log([string] $text) {
    $line = '{0} {1}' -f (Get-Date -Format 'HH:mm:ss'), $text
    Write-Host $line
    Add-Content -Path $log -Value $line -Encoding utf8
}
Write-Log "Sequence $Sequence on $Device, tag $Tag, centre C $($Lat.ToString($inv)), $($Lon.ToString($inv)); output $seqDir"

# Kilometres north / east of C as "lon lat" for adb emu geo fix.
function Get-Point([double] $north, [double] $east) {
    $la = $Lat + $north / 111.195
    $lo = $Lon + $east / (111.195 * [Math]::Cos($la * [Math]::PI / 180))
    [pscustomobject]@{ Lat = $la; Lon = $lo; Text = ('{0} {1}' -f $lo.ToString('F6', $inv), $la.ToString('F6', $inv)) }
}
function Set-Gps([double] $north, [double] $east, [string] $what) {
    $p = Get-Point $north $east
    adb -s $Device emu geo fix $p.Text.Split(' ')[0] $p.Text.Split(' ')[1] | Out-Null
    Write-Log "GPS $what - geo fix $($p.Text) ($north km N, $east km E of C)"
    Start-Sleep -Seconds 3
    $p
}

# One part: proximity\run.ps1 into <seqDir>\<label>; what it logged for the
# report (CHECK / PROBE / E09 / E14 / NOTE / LEDGER lines) goes to the log.
$script:failed = 0
function Invoke-Part([string] $flow, [string] $label, [string[]] $set) {
    $dir = Join-Path $seqDir $label
    Write-Log "Part $label - $flow $(if ($set) { '(' + ($set -join ', ') + ')' })"
    # To the console, not the pipeline: a function returns whatever its
    # commands output, and only the exit code may come back.
    & (Join-Path $prox 'run.ps1') -Flow (Join-Path $prox $flow) -Device $Device -Tag $Tag -Set $set -RunDir $dir | Out-Host
    $code = $LASTEXITCODE
    Get-ChildItem $dir -Recurse -Filter maestro.log -ErrorAction SilentlyContinue |
        Select-String -Pattern 'JsConsole: ((?:CHECK|PROBE|E09b?|E14|NOTE|LEDGER)\|.*)$' |
        ForEach-Object { Write-Log ('  ' + $_.Matches[0].Groups[1].Value) }
    Write-Log "  $(if ($code -eq 0) { 'passed' } else { "FAILED (exit $code) - report $dir\report.html" })"
    if ($code -ne 0) { $script:failed++ }
    $code
}

# The result list on screen, recorded down to the end and back up.
function Save-List([string] $label) {
    $out = Join-Path $seqDir "$label.json"
    Write-Log "List $label - scripts\nearby-list.py"
    python -I (Join-Path $PSScriptRoot 'nearby-list.py') $Device $out $SwipeWait.ToString($inv) | ForEach-Object { Write-Log "  $_" }
}

function Invoke-Nb5Steps {
    Set-Gps 0 0 'C' | Out-Null
    $set = @("NAME=$Name", "HEAD_AGE=$HeadAge") + $(if ($LastName) { @("ID_LAST_NAME=$LastName") } else { @() })
    if ((Invoke-Part 'cases\NB5\1-register-and-nearby.yaml' 'NB5-1-register-and-nearby' $set) -eq 0) {
        Save-List 'NB5-nearby-plain'
        Invoke-Part 'cases\NB5\2-type-name.yaml' 'NB5-2-type-name' $set | Out-Null
    }
}

switch ($Sequence) {
    'NB1' {
        Set-Gps 0 0 'C' | Out-Null
        if ((Invoke-Part 'cases\NB1\1-boundary-download.yaml' '1-boundary-download' @()) -ne 0) { break }
        if ((Invoke-Part 'cases\NB1\2-home-ids-search.yaml' '2-home-ids-search' @()) -ne 0) { break }
        Invoke-Part 'cases\NB3\nearby-on.yaml' '3-nearby-before' @() | Out-Null
        Save-List '3-nearby-before'
        if ((Invoke-Part 'cases\NB1\3-register-a.yaml' '4-register-a' @()) -ne 0) { break }
        Invoke-Part 'cases\NB3\nearby-on.yaml' '5-nearby-after-a' @() | Out-Null
        Save-List '5-nearby-after-a'
        Invoke-Part 'cases\NB3\nearby-on.yaml' '6-nearby-name' @("TYPE=QAID-NB1-$Tag") | Out-Null
        Save-List '6-nearby-name'
    }
    'NB2' {
        $points = @(
            @{ Key = 'C'; Km = 0; Age = 102 }, @{ Key = '1KM'; Km = 1; Age = 103 }, @{ Key = '4K9'; Km = 4.9; Age = 104 },
            @{ Key = '5K1'; Km = 5.1; Age = 105 }, @{ Key = '10KM'; Km = 10; Age = 106 })
        $expect = @()
        foreach ($p in $points) {
            $pt = Set-Gps $p.Km 0 $p.Key
            $expect += '{0}={1},{2}' -f $p.Key, $pt.Lat.ToString('F7', $inv), $pt.Lon.ToString('F7', $inv)
            Invoke-Part 'cases\NB2\register-and-check.yaml' "QAID-NB2-$($p.Key)" @("NAME=QAID-NB2-$Tag-$($p.Key)", "KEY=NB2_ID_$($p.Key)", "HEAD_AGE=$($p.Age)") | Out-Null
        }
        Set-Gps 0 0 'C' | Out-Null
        Invoke-Part 'cases\NB2\check-from-centre.yaml' 'Z-check-from-centre' @() | Out-Null
        # The sync's upload holds each household's saved lat/long.
        $logcat = Get-ChildItem (Join-Path $seqDir 'Z-check-from-centre') -Recurse -Filter device-logcat.txt -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($logcat) {
            Write-Log 'Saved lat/long - scripts\saved-latlong.py'
            python -I (Join-Path $PSScriptRoot 'saved-latlong.py') $logcat.FullName "QAID-NB2-$Tag-" @expect | ForEach-Object { Write-Log "  $_" }
        } else { Write-Log 'Saved lat/long - no device-logcat.txt in the check part; read it from a later sync log' }
        Write-Log "Next: -Sequence Radius -Tag $Tag, -Sequence E09 -Tag $Tag"
    }
    'Radius' {
        foreach ($m in 0, 10, 30, 60, 80, 90, 100, 250, 500, 750) {
            Set-Gps ($m / 1000) 0 "$m m N of C" | Out-Null
            Invoke-Part 'cases\NB2\probe-radius.yaml' "probe-$($m)m" @("TARGET=QAID-NB2-$Tag-C", 'TARGET_AGE=102', "DIST=$($m)m") | Out-Null
        }
        Set-Gps 0 0 'C' | Out-Null
    }
    'E09' {
        Set-Gps 0 0 'C' | Out-Null
        $dir = Join-Path $seqDir 'E09-stale-centre'
        $flow = Join-Path $prox 'cases\NB2\stale-centre.yaml'
        Write-Log "Part E09-stale-centre - the GPS moves 10 km N once the flow logs its STEP line"
        $cmd = "& '{0}' -Flow '{1}' -Device '{2}' -Tag '{3}' -RunDir '{4}'; exit `$LASTEXITCODE" -f (Join-Path $prox 'run.ps1'), $flow, $Device, $Tag, $dir
        $p = Start-Process -FilePath 'powershell.exe' -NoNewWindow -PassThru -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $cmd
        $null = $p.Handle
        $deadline = (Get-Date).AddMinutes(6)
        $moved = $false
        while (-not $p.HasExited -and (Get-Date) -lt $deadline -and -not $moved) {
            Start-Sleep -Seconds 2
            if (Get-ChildItem $dir -Recurse -Filter maestro.log -ErrorAction SilentlyContinue | Select-String -SimpleMatch 'STEP|search open at C') {
                Set-Gps 10 0 '10 km N, Search open' | Out-Null
                $moved = $true
            }
        }
        if (-not $moved) { Write-Log 'The STEP line never came - the GPS was not moved' }
        $p.WaitForExit()
        Get-ChildItem $dir -Recurse -Filter maestro.log -ErrorAction SilentlyContinue |
            Select-String -Pattern 'JsConsole: ((?:E09b?|E14|NOTE)\|.*)$' | ForEach-Object { Write-Log ('  ' + $_.Matches[0].Groups[1].Value) }
        Write-Log "  $(if ($p.ExitCode -eq 0) { 'passed' } else { "FAILED (exit $($p.ExitCode)) - report $dir\report.html" })"
        Set-Gps 0 0 'C' | Out-Null
    }
    'NB3' {
        Set-Gps -30 0 'F (30 km S)' | Out-Null
        Invoke-Part 'cases\NB3\consent-no-x.yaml' 'NB3-X-consent-no' @("NAME=QAID-NB3-$Tag-X") | Out-Null
        foreach ($i in 1..5) {
            Invoke-Part 'cases\NB2\register-and-check.yaml' "NB3-$i" @("NAME=QAID-NB3-$Tag-$i", "KEY=NB3_ID_$i", "HEAD_AGE=$(110 + $i)") | Out-Null
        }
        Invoke-Part 'cases\NB3\nearby-on.yaml' 'NB3-nearby-plain' @() | Out-Null
        Save-List 'NB3-nearby-plain'
        Invoke-Part 'cases\NB3\nearby-on.yaml' 'NB3-nearby-name' @("TYPE=QAID-NB3-$Tag") | Out-Null
        Save-List 'NB3-nearby-name'
        Set-Gps 0 0 'C' | Out-Null
    }
    'NB4' {
        Set-Gps 30 0 'G (30 km N)' | Out-Null
        foreach ($i in 1..6) {
            Invoke-Part 'cases\NB2\register-and-check.yaml' "NB4-$i" @("NAME=QAID-NB4-$Tag-$i", "KEY=NB4_ID_$i", "HEAD_AGE=$(120 + $i)") | Out-Null
        }
        Invoke-Part 'cases\NB3\nearby-on.yaml' 'NB4-nearby-plain' @() | Out-Null
        Save-List 'NB4-nearby-plain'
        Set-Gps 0 0 'C' | Out-Null
    }
    'NB5' { Invoke-Nb5Steps }
    'NB6' {
        if ((Invoke-Part 'cases\NB6\0-sync-logout.yaml' '0-sync-logout' @()) -ne 0) { break }
        $app = $envMap['HCM_APP_ID']
        adb -s $Device shell pm clear $app | Out-Null
        Write-Log "Cleared the app's storage (pm clear $app)"
        Set-Gps 0 0 'C' | Out-Null
        if ((Invoke-Part 'cases\NB1\1-boundary-download.yaml' '1-boundary-download' @()) -ne 0) { break }
        if ((Invoke-Part 'cases\NB1\2-home-ids-search.yaml' '2-home-ids-search' @()) -ne 0) { break }
        Invoke-Nb5Steps
    }
}
Write-Log "Done: $script:failed part(s) failed. Log $log"
exit $(if ($script:failed) { 1 } else { 0 })
