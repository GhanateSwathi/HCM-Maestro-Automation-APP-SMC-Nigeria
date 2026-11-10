<#
.SYNOPSIS
    Runs one Search by proximity flow (proximity\cases\) on the emulator.

.DESCRIPTION
    Wraps scripts\run.ps1 (.env forwarded as -e) and adds QAID_RUN, the tag
    the proximity households carry in their names - QAID-NB2-<tag>-C - so
    a typed "QAID-NB2-<tag>" lists only that run's households. Pass the same
    -Tag to every part of one test; scripts\run-sequence.ps1 does.

    Each part's report, screenshots and logs go to
    artifacts\proximity\runs\<yyyyMMdd>-<case>\<part> (a part run again the
    same day gets a -HHmmss suffix), or to -RunDir.

    Ported from the ID-fix repo's proximity\run.ps1, which also pinned the
    Kaduna build and boundary; here the app, the CDD and the boundary are the
    root .env's.

.EXAMPLE
    .\proximity\run.ps1 -Flow proximity\cases\NB3\nearby-on.yaml -Tag 101530
    .\proximity\run.ps1 -Flow proximity\cases\NB5\1-register-and-nearby.yaml -Tag 101530 -Set 'NAME=Ada','ID_LAST_NAME=Test','HEAD_AGE=131'
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $Flow,
    # adb serial; Maestro picks the device when blank.
    [string]   $Device,
    # The run's tag (QAID_RUN); default: now, ddHHmm.
    [string]   $Tag,
    # KEY=VALUE pairs for this run only (NAME, HEAD_AGE, TYPE, ...).
    [string[]] $Set,
    [string]   $RunDir
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if (-not $Tag) { $Tag = Get-Date -Format 'ddHHmm' }
$overrides = @("QAID_RUN=$Tag") + @($Set | Where-Object { $_ })

# scripts\run.ps1 runs Maestro from the repo root, so hand it a full path.
$flowPath = (Resolve-Path $Flow).Path
if (-not $RunDir) {
    $case = Split-Path -Leaf (Split-Path -Parent $flowPath)
    $part = [IO.Path]::GetFileNameWithoutExtension($flowPath)
    $RunDir = Join-Path $root ('artifacts\proximity\runs\{0}-{1}\{2}' -f (Get-Date -Format 'yyyyMMdd'), $case, $part)
    if (Test-Path $RunDir) { $RunDir += '-' + (Get-Date -Format 'HHmmss') }
}
Write-Host "Proximity tag $Tag (names QAID-<case>-$Tag-<letter>)"

$runArgs = @{ Flow = @($flowPath); Set = $overrides; RunDir = $RunDir }
if ($Device) { $runArgs.Device = $Device }
& (Join-Path $root 'scripts\run.ps1') @runArgs
exit $LASTEXITCODE
