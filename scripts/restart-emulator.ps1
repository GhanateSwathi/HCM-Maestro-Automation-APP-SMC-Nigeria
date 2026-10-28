<#
.SYNOPSIS
    Cold-restarts the Android emulator - the cure for black screenshots.

.DESCRIPTION
    On 2026-10-27 the emulator's screen capture broke in the middle of a
    chained run: from 19:18 every Maestro screenshot was the same black frame
    (11,838 bytes) and adb screencap returned stripes, while the flows went on
    passing - Maestro reads the view hierarchy, not pixels. It stayed broken
    until the emulator was cold-booted (2026-10-28 11:08, the login screen
    captured again). What broke it was not reproduced: not the QR camera
    (prepare-qr-camera.ps1), not 20 s of display off, not a minimized
    emulator window.

    Kills the emulator, boots the same AVD without its snapshot and waits
    until Android has booted. The app's data survives - it is on the
    emulator's disk - but a flow running at the time does not, and the QR
    camera's pose resets: restart between flows, then prepare-qr-camera
    again. run-chain.ps1 calls this between roles after a role's screenshots
    came out black.

.EXAMPLE
    .\scripts\restart-emulator.ps1
    .\scripts\restart-emulator.ps1 -Device emulator-5556
#>
[CmdletBinding()]
param(
    [string] $Device = 'emulator-5554'
)

$ErrorActionPreference = 'Stop'

$sdk = @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, (Join-Path $env:LOCALAPPDATA 'Android\Sdk')) |
    Where-Object { $_ -and (Test-Path (Join-Path $_ 'emulator')) } | Select-Object -First 1
if (-not $sdk) {
    throw 'Android SDK not found (ANDROID_HOME, ANDROID_SDK_ROOT or %LOCALAPPDATA%\Android\Sdk).'
}
$adb = (Get-Command adb -ErrorAction SilentlyContinue).Source
if (-not $adb) { $adb = Join-Path $sdk 'platform-tools\adb.exe' }

# "adb emu avd name" answers the AVD's name, then OK.
$avd = ((& $adb -s $Device emu avd name 2>&1 | Out-String) -split "`r?`n" |
    ForEach-Object { $_.Trim() } | Where-Object { $_ -and $_ -ne 'OK' } | Select-Object -First 1)
if (-not $avd -or $avd -match 'error|not found|offline') {
    throw "Could not read the AVD name of $Device - is it running? ($avd)"
}

Write-Host "Cold-restarting $Device ($avd)"
& $adb -s $Device emu kill | Out-Null
for ($i = 0; $i -lt 60; $i++) {
    if (-not ((& $adb devices | Out-String) -match [regex]::Escape($Device))) { break }
    Start-Sleep -Seconds 2
}
# Without -no-snapshot-load the emulator resumes the snapshot it saved on the
# way down - the broken capture state with it.
Start-Process -FilePath (Join-Path $sdk 'emulator\emulator.exe') -ArgumentList '-avd', $avd, '-no-snapshot-load'
& $adb -s $Device wait-for-device
for ($i = 0; $i -lt 100; $i++) {
    if ("$(& $adb -s $Device shell getprop sys.boot_completed)".Trim() -eq '1') { break }
    Start-Sleep -Seconds 3
}
if ("$(& $adb -s $Device shell getprop sys.boot_completed)".Trim() -ne '1') {
    throw "$Device did not finish booting within 5 minutes."
}
# Boot completed is not idle yet: the launcher and system apps are still
# starting, and the first flow's launchApp can time out on a busy device.
Start-Sleep -Seconds 15
Write-Host "$Device booted ($avd, cold)"
