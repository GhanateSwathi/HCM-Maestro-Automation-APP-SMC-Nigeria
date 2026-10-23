<#
.SYNOPSIS
    Shows the QR code that flows scan to the emulator's camera.

.DESCRIPTION
    The app's QR scanner (Team Code, when the health facility dispatches to a
    CDD) reads only the camera: it has no gallery option and no manual entry,
    so Maestro's addMedia cannot feed it. On the Android emulator the back
    camera is a virtual room (AVD setting hw.camera.back = virtualscene).

    This plays the emulator's own "Walk_to_image_room" camera macro, which
    leaves the camera facing the room's wall poster, then starts a background
    loop that flashes QR_CODE_PATH (from .env, relative to the project root)
    on that poster: 2 seconds up, 10 seconds down, for -Minutes.

    Why it flashes: while a code stays in view the scanner keeps re-reading
    it, and each read raises a red "Code already scanned" banner over the
    scanner's Submit button, so Submit cannot be tapped. Shown in bursts, the
    code is read once and the banner clears in the gap (about 5 seconds after
    the code leaves the view, measured 2026-10-19).

    The camera stays put until the emulator restarts. Start this before
    running flows tagged qr-camera; stop it with -Stop afterwards, or let it
    run out.

.EXAMPLE
    .\scripts\prepare-qr-camera.ps1                 # emulator-5554, 30 minutes
    .\scripts\prepare-qr-camera.ps1 -Minutes 60
    .\scripts\prepare-qr-camera.ps1 -Stop
#>
[CmdletBinding()]
param(
    [string] $Device = 'emulator-5554',
    [int]    $Minutes = 30,
    [switch] $Stop,
    # Internal: the background loop itself, started by this script.
    [string] $BlinkImage
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $env:TEMP "hcm-qr-camera-$Device.pid"

$sdk = @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, (Join-Path $env:LOCALAPPDATA 'Android\Sdk')) |
    Where-Object { $_ -and (Test-Path (Join-Path $_ 'emulator')) } | Select-Object -First 1
if (-not $sdk) {
    throw 'Android SDK not found (ANDROID_HOME, ANDROID_SDK_ROOT or %LOCALAPPDATA%\Android\Sdk).'
}
$adb = (Get-Command adb -ErrorAction SilentlyContinue).Source
if (-not $adb) { $adb = Join-Path $sdk 'platform-tools\adb.exe' }

function Invoke-Console([string[]] $command) {
    $out = (& $adb -s $Device emu @command 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $out -notmatch 'OK') {
        throw "adb emu $($command -join ' ') failed: $out"
    }
}
function Stop-Blinking {
    if (Test-Path $pidFile) {
        $old = Get-Content $pidFile | Select-Object -First 1
        Stop-Process -Id $old -Force -ErrorAction SilentlyContinue
        Remove-Item $pidFile -Force
    }
    # Back to the room's own poster, so no other scanner reads the code.
    try { Invoke-Console @('virtualscene-image', 'wall') } catch { Write-Warning $_ }
}

# --- The background loop -----------------------------------------------------
if ($BlinkImage) {
    $until = (Get-Date).AddMinutes($Minutes)
    try {
        # A missed swap only shortens one burst; keep going.
        while ((Get-Date) -lt $until) {
            try { Invoke-Console @('virtualscene-image', 'wall', $BlinkImage) } catch { }
            Start-Sleep -Seconds 2
            try { Invoke-Console @('virtualscene-image', 'wall') } catch { }
            Start-Sleep -Seconds 10
        }
    } finally {
        try { Invoke-Console @('virtualscene-image', 'wall') } catch { }
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }
    return
}

if ($Stop) {
    Stop-Blinking
    Write-Host "Stopped showing the QR code on $Device."
    return
}

# --- Set up ------------------------------------------------------------------
# QR_CODE_PATH only - nothing else is read out of .env.
$envFile = Join-Path $root '.env'
if (-not (Test-Path $envFile)) {
    throw "Missing $envFile. Copy .env.example to .env and fill in the values."
}
$qrLine = Get-Content $envFile | Where-Object { $_ -match '^\s*QR_CODE_PATH\s*=' } | Select-Object -First 1
$qrRelative = if ($qrLine) { ($qrLine -split '=', 2)[1].Trim() } else { '' }
if (-not $qrRelative) {
    throw 'QR_CODE_PATH must be set in .env (e.g. assets/qr/cdd_qr.png).'
}
$qr = Join-Path $root $qrRelative
if (-not (Test-Path $qr)) {
    throw "QR code image not found at $qr (QR_CODE_PATH=$qrRelative)."
}
$qr = (Resolve-Path $qr).Path

$macros = Join-Path $sdk 'emulator\resources\macros'
foreach ($macro in 'Reset_position', 'Walk_to_image_room') {
    if (-not (Test-Path (Join-Path $macros $macro))) {
        throw "Emulator camera macro $macro not found under $macros."
    }
}

Stop-Blinking

# The macros move the camera to fixed poses; start from the default one so a
# second run lands in the same place. Each returns at once and plays on.
Write-Host "Walking the $Device camera up to the wall poster"
Invoke-Console @('automation', 'play', (Join-Path $macros 'Reset_position'))
Start-Sleep -Seconds 3
Invoke-Console @('automation', 'play', (Join-Path $macros 'Walk_to_image_room'))
# The walk lasts about 20 seconds (2026-10-19).
Start-Sleep -Seconds 30

$loop = Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -PassThru -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"",
    '-Device', $Device, '-Minutes', $Minutes, '-BlinkImage', "`"$qr`"")
Set-Content -Path $pidFile -Value $loop.Id
Write-Host "Showing $qrRelative to the camera in bursts for $Minutes minutes (stop with -Stop)."
