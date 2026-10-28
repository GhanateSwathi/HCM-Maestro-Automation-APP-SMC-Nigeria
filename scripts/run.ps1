<#
.SYNOPSIS
    Runs the Maestro flows in this project against a connected device.

.EXAMPLE
    .\scripts\run.ps1
    .\scripts\run.ps1 -Tags smoke
    .\scripts\run.ps1 -Tags login
    .\scripts\run.ps1 -Flow flows\login\login-screen.yaml
    .\scripts\run.ps1 -Flow flows\login
#>
[CmdletBinding()]
param(
    [string[]] $Flow,
    [string]   $Tags,
    [string]   $ExcludeTags,
    [string]   $Device,
    # Reuse the signed-in session instead of wiping the app at sign-in
    # (KEEP_SESSION=true; subflows/home/keep-session.yaml). For chained runs
    # - see run-chain.ps1.
    [switch]   $KeepSession,
    # KEY=VALUE pairs that replace .env's for this run only (e.g. TEST_USER).
    [string[]] $Set
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

# The Maestro CLI hard-fails on Java 11, which is this machine's default.
# Pin 17 for this process only so Maven/Playwright keep running on 11.
$jdk17 = 'C:\Program Files\Amazon Corretto\jdk17.0.20_10'
if (Test-Path $jdk17) {
    $env:JAVA_HOME = $jdk17
} else {
    Write-Warning "Corretto 17 not found at $jdk17 - Maestro needs Java 17 or higher."
}

# Both banners print to stdout and are noise in CI logs.
$env:MAESTRO_CLI_NO_ANALYTICS = '1'
$env:MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED = 'true'

$maestro = Join-Path $env:USERPROFILE '.maestro\bin\maestro.bat'
if (-not (Test-Path $maestro)) {
    throw "Maestro CLI not found at $maestro. Install it from https://docs.maestro.dev."
}

$envFile = Join-Path $root '.env'
if (-not (Test-Path $envFile)) {
    throw "Missing $envFile. Copy .env.example to .env and fill in the values."
}

$cliArgs = @('test')

# -Set and -KeepSession replace any .env entry with the same key.
$overrides = @()
if ($Set)         { $overrides += $Set }
if ($KeepSession) { $overrides += 'KEEP_SESSION=true' }
$overrideKeys = @($overrides | ForEach-Object { ($_ -split '=', 2)[0].Trim() })
foreach ($line in Get-Content $envFile) {
    $entry = $line.Trim()
    if ($entry -eq '' -or $entry.StartsWith('#')) { continue }
    if ($overrideKeys -contains ($entry -split '=', 2)[0].Trim()) { continue }
    $cliArgs += '-e'
    $cliArgs += $entry
}
foreach ($entry in $overrides) {
    $cliArgs += '-e'
    $cliArgs += $entry
}

if ($Device)      { $cliArgs += '--device';        $cliArgs += $Device }
if ($Tags)        { $cliArgs += '--include-tags';  $cliArgs += $Tags }
if ($ExcludeTags) { $cliArgs += '--exclude-tags';  $cliArgs += $ExcludeTags }

# Each run gets its own folder: an HTML report of every flow's result, plus
# each flow's screenshots, logs and view hierarchies. Without
# --test-output-dir Maestro 2.10 writes screenshots under ~/.maestro/tests/,
# not the working directory.
# Not HTML-DETAILED: it lists every step as executed, and the password step
# then shows the password in clear text.
$runDir = Join-Path $root ('artifacts\runs\' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$cliArgs += '--test-output-dir'; $cliArgs += $runDir
$cliArgs += '--format';          $cliArgs += 'HTML'
$cliArgs += '--output';          $cliArgs += (Join-Path $runDir 'report.html')

# Target the workspace root rather than flows/ so config.yaml governs discovery.
# Maestro does not recurse into subdirectories on its own, and the flows are
# grouped into feature-area subfolders - passing 'flows' here would find none.
if ($Flow) { $cliArgs += $Flow } else { $cliArgs += '.' }

# Keep the PC awake and its display on while Maestro runs: on 2026-10-27 the
# PC went to sleep at 19:51 (5 minutes idle on the charger, 3 on battery) and
# froze a chained flow for 15 hours. Released when the run ends.
if (-not ('HcmRun.Power' -as [type])) {
    Add-Type -Namespace HcmRun -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint flags);'
}
# 0x80000003 = ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED; the
# call answers the state before, restored at the end.
$awakeBefore = [HcmRun.Power]::SetThreadExecutionState([uint32]2147483651)

# Screenshots that are all black: the emulator's screen capture has broken.
# On 2026-10-27 from 19:18 every screenshot was the same black frame while
# the flows went on passing (Maestro reads the view hierarchy, not pixels);
# only a cold restart brought it back (restart-emulator.ps1). Each PNG is
# sampled on a 12 x 24 grid; one lit point is enough.
function Get-BlackScreenshots([string] $dir) {
    Add-Type -AssemblyName System.Drawing
    foreach ($png in Get-ChildItem $dir -Recurse -Filter *.png -ErrorAction SilentlyContinue) {
        $bmp = $null
        try {
            $bmp = [System.Drawing.Bitmap]::FromFile($png.FullName)
            $lit = $false
            for ($x = 0; $x -lt 12 -and -not $lit; $x++) {
                for ($y = 0; $y -lt 24 -and -not $lit; $y++) {
                    $p = $bmp.GetPixel([int](($x + 0.5) * $bmp.Width / 12), [int](($y + 0.5) * $bmp.Height / 24))
                    if ($p.R + $p.G + $p.B -gt 24) { $lit = $true }
                }
            }
            if (-not $lit) { $png.Name }
        } catch {
            # An unreadable PNG is not a black one.
        } finally {
            if ($bmp) { $bmp.Dispose() }
        }
    }
}

Push-Location $root
try {
    & $maestro @cliArgs
    $code = $LASTEXITCODE
    $black = @(Get-BlackScreenshots $runDir)
    if ($black.Count) {
        # run-chain.ps1 looks for this file to restart the emulator before
        # the next role.
        Set-Content -Path (Join-Path $runDir 'SCREENSHOTS-BLACK.txt') -Value $black -Encoding utf8
        Write-Warning ("{0} of this run's screenshots are all black - the emulator's screen capture is broken. Cold-restart it before the next run: scripts\restart-emulator.ps1" -f $black.Count)
    }
    Write-Host "Report, screenshots and logs: $runDir"
    exit $code
} finally {
    if ($awakeBefore) { [HcmRun.Power]::SetThreadExecutionState($awakeBefore) | Out-Null }
    Pop-Location
}
