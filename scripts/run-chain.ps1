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
    left as the failure found it - except reconciliation, View Reports and
    View Transactions (Prompts 8, 9, 16): their soft checks fail at the end
    with a list of findings, which says nothing about the stock the next flow
    needs, so the chain goes on. Each flow gets its own run folder under
    artifacts/runs/.

    The PC is kept awake, display on, for the whole chain (a sleeping PC
    froze a 2026-10-27 chain for 15 hours). When a flow's screenshots come
    out all black (run.ps1 leaves SCREENSHOTS-BLACK.txt in its run folder -
    the emulator's screen capture has broken), the emulator is cold-restarted
    (restart-emulator.ps1) before the next role signs in, when the app holds
    nothing the chain still needs.

    -StockOnly keeps the CDD to its stock flows: Reject, Prompt 11 (the only
    flow in which the CDD accepts stock - it also registers a household and
    doses two children) and View Transactions.

    IRREVERSIBLE: accepts, rejects, dispatches, returns, reconciles, registers
    households and records doses on UAT. Needs, before the state user:
    National's undownloaded dispatch of at least two transactions per product
    variant.
.EXAMPLE
    .\scripts\run-chain.ps1                                  # all three roles
    .\scripts\run-chain.ps1 -StockOnly                       # state to CDD, stock flows only
    .\scripts\run-chain.ps1 -Role State                      # one role
    .\scripts\run-chain.ps1 -Role HealthFacility,Cdd -Device emulator-5554
#>
[CmdletBinding()]
param(
    [ValidateSet('State', 'HealthFacility', 'Cdd')]
    [string[]] $Role = @('State', 'HealthFacility', 'Cdd'),
    [string]   $Device,
    [int]      $DispatchParts = 2,
    [switch]   $StockOnly
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
            'flows\stock\state-stock-return.yaml',           # Prompt 4
            'flows\stock\state-stock-reconciliation.yaml',   # Prompt 8
            'flows\stock\state-stock-view-reports.yaml',     # Prompt 9
            'flows\stock\state-stock-view-transactions.yaml' # Prompt 16
        )
    }
    HealthFacility = @{
        UserKey = 'HCM_HF_STOCK_USER_ID'
        QrCamera = $true
        Flows   = @(
            'flows\stock\hf-stock-accept-receipt.yaml',      # Prompt 5
            'flows\stock\hf-stock-reject-receipt.yaml',      # Prompt 15
            'flows\stock\hf-stock-dispatch-cdd.yaml',        # Prompt 6, in parts
            'flows\stock\hf-stock-return-state.yaml',        # Prompt 7
            'flows\stock\hf-stock-reconciliation.yaml',      # Prompt 8
            'flows\stock\hf-stock-view-reports.yaml',        # Prompt 9
            'flows\stock\hf-stock-view-transactions.yaml'    # Prompt 16
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
            'flows\registration\cdd-search-nearby-and-id.yaml', # Prompt 18
            'flows\registration\cdd-eligibility-referral.yaml', # Prompt 19
            'flows\stock\cdd-stock-view-transactions.yaml'   # Prompt 16
        )
        # -StockOnly
        StockFlows = @(
            'flows\stock\cdd-stock-reject-receipt.yaml',     # Prompt 15
            'flows\registration\cdd-registration-full.yaml', # Prompt 11, for its receipt
            'flows\stock\cdd-stock-view-transactions.yaml'   # Prompt 16
        )
    }
}
# Flows whose failure is a list of findings: reported, and the chain goes on.
$softFlows = @('*-stock-reconciliation.yaml', '*-stock-view-reports.yaml', '*-stock-view-transactions.yaml')

# Awake, display on, until the chain ends - between flows too, when no
# run.ps1 holds it (same call as run.ps1's).
if (-not ('HcmRun.Power' -as [type])) {
    Add-Type -Namespace HcmRun -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint flags);'
}
[HcmRun.Power]::SetThreadExecutionState([uint32]2147483651) | Out-Null

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
$blackSeen = $false
foreach ($name in $chains.Keys) {
    if ($Role -notcontains $name) { continue }
    $chain = $chains[$name]
    $set = @("TEST_USER=$(Get-EnvValue $chain.UserKey)", "DISPATCH_PARTS=$DispatchParts")
    # The previous role logged out after syncing, so a restart loses nothing;
    # this role's first flow signs in fresh anyway.
    if ($blackSeen) {
        Write-Host "=== Black screenshots in the previous role - cold-restarting the emulator"
        & (Join-Path $PSScriptRoot 'restart-emulator.ps1') @deviceArgs
        $blackSeen = $false
    }
    if ($chain.QrCamera) {
        & (Join-Path $PSScriptRoot 'prepare-qr-camera.ps1') @deviceArgs -Minutes 240
    }
    $flows = if ($StockOnly -and $chain.StockFlows) { $chain.StockFlows } else { $chain.Flows }
    $first = $true
    foreach ($flow in $flows + @('flows\login\logout.yaml')) {
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
        $soft = @($softFlows | Where-Object { $flow -like $_ }).Count -gt 0
        $lastRun = Get-ChildItem (Join-Path $root 'artifacts\runs') -Directory | Sort-Object Name | Select-Object -Last 1
        $black = $lastRun -and (Test-Path (Join-Path $lastRun.FullName 'SCREENSHOTS-BLACK.txt'))
        if ($black) { $blackSeen = $true }
        $result = if ($code -eq 0) { 'Passed' } elseif ($soft) { 'FAILED (findings; chain went on)' } else { 'FAILED' }
        if ($black) { $result += '; screenshots black' }
        $results += [pscustomobject]@{ Role = $name; Flow = $flow; Result = $result }
        if ($code -ne 0 -and -not $soft) {
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
