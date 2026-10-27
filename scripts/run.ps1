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

Push-Location $root
try {
    & $maestro @cliArgs
    $code = $LASTEXITCODE
    Write-Host "Report, screenshots and logs: $runDir"
    exit $code
} finally {
    Pop-Location
}
