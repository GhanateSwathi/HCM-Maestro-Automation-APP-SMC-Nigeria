<#
.SYNOPSIS
    Runs the existing flows of each role back to back in ONE app session per
    role, then syncs and logs out - state user, then health facility, then CDD.
.DESCRIPTION
    Every flow normally starts by signing in, which clears the app. Stock,
    balances and downloaded records live on the device, so flows that build on
    each other (accept -> reject -> dispatch -> return) cannot pass as separate
    runs. Here the first flow of a role signs in fresh, as usual, and the rest
    run with -KeepSession, reusing that session
    (subflows/home/keep-session.yaml). After a role's flows,
    flows/login/logout.yaml syncs and logs out.

    The flows are the prompts' own, unchanged. Per run this script sets:
      KEEP_SESSION=true        reuse the session
      TEST_USER=<role's ID>    read from .env (the role's *_USER_ID key)
      DISPATCH_PARTS=<n>       dispatch in n parts (default 2), so the next
                               role has one transaction to accept and one to
                               reject
    A failing flow stops the chain there, without logging out, so the app is
    left as the failure found it. Each flow gets its own run folder under
    artifacts/runs/.

    IRREVERSIBLE: accepts, rejects, dispatches, returns, registers households
    and records doses on UAT. Needs, before the state user: National's
    undownloaded dispatch of at least two transactions per product variant.
.EXAMPLE
    .\scripts\run-chain.ps1                                  # all three roles
    .\scripts\run-chain.ps1 -Role State                      # one role
    .\scripts\run-chain.ps1 -Role HealthFacility,Cdd -Device emulator-5554
#>
[CmdletBinding()]
param(
    [ValidateSet('State', 'HealthFacility', 'Cdd')]
    [string[]] $Role = @('State', 'HealthFacility', 'Cdd'),
    [string]   $Device,
    [int]      $DispatchParts = 2
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$run = Join-Path $PSScriptRoot 'run.ps1'

# Each role's flows, in the order they build on each other.
$chains = [ordered]@{
    State = @{
        UserKey = 'HCM_STATE_STOCK_USER_ID'
        Flows   = @(
            'flows\stock\state-stock-accept-receipt.yaml',   # Prompt 2
            'flows\stock\state-stock-reject-receipt.yaml',   # Prompt 15
            'flows\stock\state-stock-dispatch.yaml',         # Prompt 3, in parts
            'flows\stock\state-stock-return.yaml'            # Prompt 4
        )
    }
    HealthFacility = @{
        UserKey = 'HCM_HF_STOCK_USER_ID'
        QrCamera = $true
        Flows   = @(
            'flows\stock\hf-stock-accept-receipt.yaml',      # Prompt 5
            'flows\stock\hf-stock-reject-receipt.yaml',      # Prompt 15
            'flows\stock\hf-stock-dispatch-cdd.yaml',        # Prompt 6, in parts
            'flows\stock\hf-stock-return-state.yaml'         # Prompt 7
        )
    }
    Cdd = @{
        UserKey = 'HCM_CDD_USER_ID'
        Flows   = @(
            'flows\stock\cdd-stock-reject-receipt.yaml',     # Prompt 15 - first,
                                                             # while the balance is 0
            'flows\registration\cdd-registration-full.yaml', # Prompt 11 (accepts the rest)
            'flows\registration\cdd-consent-no.yaml',        # Prompt 12
            'flows\registration\cdd-household-utd.yaml',     # Prompt 13
            'flows\registration\cdd-household-redose.yaml',  # Prompt 14
            'flows\stock\cdd-stock-view-transactions.yaml'   # Prompt 16
        )
    }
}

# A role's user ID from .env, for TEST_USER. Never printed.
function Get-EnvValue([string] $key) {
    foreach ($line in Get-Content (Join-Path $root '.env')) {
        $entry = $line.Trim()
        if ($entry.StartsWith("$key=")) { return $entry.Substring($key.Length + 1) }
    }
    throw "$key is not set in .env."
}

$deviceArgs = @{}
if ($Device) { $deviceArgs.Device = $Device }
$results = @()
foreach ($name in $chains.Keys) {
    if ($Role -notcontains $name) { continue }
    $chain = $chains[$name]
    $set = @("TEST_USER=$(Get-EnvValue $chain.UserKey)", "DISPATCH_PARTS=$DispatchParts")
    if ($chain.QrCamera) {
        & (Join-Path $PSScriptRoot 'prepare-qr-camera.ps1') @deviceArgs -Minutes 240
    }
    $first = $true
    foreach ($flow in $chain.Flows + @('flows\login\logout.yaml')) {
        Write-Host "=== $name - $flow"
        # The role's first flow signs in fresh (a new sign-in, a clean
        # device - an old session's sign-in may have expired, and then
        # nothing syncs); the rest reuse that session.
        if ($first) {
            & $run -Flow $flow -Set $set @deviceArgs
        } else {
            & $run -Flow $flow -KeepSession -Set $set @deviceArgs
        }
        $first = $false
        $code = $LASTEXITCODE
        $results += [pscustomobject]@{ Role = $name; Flow = $flow; Result = $(if ($code -eq 0) { 'Passed' } else { 'FAILED' }) }
        if ($code -ne 0) {
            Write-Host "Chain stopped: $flow failed (see its run folder). The session is left as it is - not logged out."
            if ($chain.QrCamera) { & (Join-Path $PSScriptRoot 'prepare-qr-camera.ps1') @deviceArgs -Stop }
            $results | Format-Table -AutoSize | Out-String | Write-Host
            exit $code
        }
    }
    if ($chain.QrCamera) { & (Join-Path $PSScriptRoot 'prepare-qr-camera.ps1') @deviceArgs -Stop }
}
$results | Format-Table -AutoSize | Out-String | Write-Host
exit 0
