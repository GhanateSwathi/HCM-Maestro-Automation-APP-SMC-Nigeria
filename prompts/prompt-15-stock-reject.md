# Prompt 15 — Reject incoming stock (state user, health facility, CDD)

Written 2026-10-23, in the shape of Prompts 1–14. Hand it to the assistant
working in this repo. It is the counterpart of the accept prompts
([Prompt 2](prompt-02-state-stock-receipt.md) for the state user,
[Prompt 5](prompt-05-hf-accept-stock.md) for the health facility,
[Prompt 11](prompt-11-cdd-registration-and-delivery.md) Step 11 for the CDD):
the same Incoming Transactions screen, the same Stock Receipt Details, but
**Reject** instead of **Accept Stock**.

- **Implemented by:** [`state-stock-reject-receipt.yaml`](../flows/stock/state-stock-reject-receipt.yaml), [`hf-stock-reject-receipt.yaml`](../flows/stock/hf-stock-reject-receipt.yaml), [`cdd-stock-reject-receipt.yaml`](../flows/stock/cdd-stock-reject-receipt.yaml)
- **Test cases:** RJT-01–06 in [TEST-CASES.md](../TEST-CASES.md).

---

```
Automate rejecting incoming stock for every role that receives stock: the
state stock user, the health facility stock user and the CDD. Same app, build
and conventions as the accept flows (com.digit.hcm 2.2.113, mhbase, UAT).
Read the README's Conventions and CLAUDE.md first.

## Where each role's stock comes from

| Role | Signs in with | Rejects | Flow to create |
| --- | --- | --- | --- |
| State stock user | HCM_STATE_STOCK_* | National's dispatch to the state | flows/stock/state-stock-reject-receipt.yaml |
| Health facility stock user | HCM_HF_STOCK_* | the state's dispatch (Prompt 3) | flows/stock/hf-stock-reject-receipt.yaml |
| CDD | HCM_CDD_* | the health facility's dispatch (Prompt 6) | flows/stock/cdd-stock-reject-receipt.yaml |

One shared subflow folder, subflows/stock/reject-receipt/, run by all three;
the flow passes the role and its prerequisite as env. Reuse accept-receipt/
for everything accepting and rejecting share: init-variants, read-balances,
check-variants, count-transactions and open-transaction (product, MRN, sender
and quantity checked on Stock Receipt Details).

## Test data (.env)

- PRODUCT_VARIANT_1 / PRODUCT_VARIANT_2 (SPAQ1, SPAQ2) - as for accepting.
- REJECT_REASON - new. The reason typed when the app asks for one. ASCII only
  (Maestro's inputText types nothing else): "Automation test - stock rejected".
  Add it to .env.example with a comment.

Fail before the device is touched if any of these is missing.

## Preconditions

- Download Stock Data first; the incoming list stays empty without it.
- Record each variant's home Stock Balance.
- Incoming Transactions lists at least one transaction for each variant, else
  BLOCKED - Test Cases 1 to 6: No incoming transactions for <role>; <prerequisite> not received.
  BLOCKED - Test Cases 1 to 6: Expected product variants SPAQ1 and SPAQ2; found <...>.
  A blocked run rejects nothing.

## Test cases

Test Case 1 - Stock Receipt Details offers Reject
  Open the first PRODUCT_VARIANT_1 transaction. Details show the card's
  product, MRN, sender and quantity, and offer both Accept Stock and Reject.

Test Case 2 - Reject asks for confirmation
  Tap Reject. Expected: a popup with a confirming button and Cancel (the accept
  popup is "Accept Confirmation" / "Are you sure you want to accept this
  stock?" / Confirm / Cancel). Log its title, buttons and any reason field.
  If no popup appears, the tap has already rejected the stock: log a
  DEVIATION, skip Test Cases 3-4 for it and go straight to Test Case 5's
  checks.

Test Case 3 - Cancel leaves the stock pending
  Cancel. The popup closes; Stock Receipt Details is still up for the same
  product with Accept Stock and Reject still offered. Back on the list, both
  variants still have every transaction they had.
  "Cancel returned to Stock Receipt Details; stock not rejected."

Test Case 4 - A reason is required (QA to confirm)
  The popup has a reason field marked mandatory ("*"). Confirm with it empty
  is refused ("<label> is required") and the popup stays.
  Soft check: no field, a field not marked mandatory, or an empty Confirm that
  goes through is a DEVIATION. Never press Confirm with the reason empty
  unless the field is marked mandatory - that would reject without a reason.

Test Case 5 - Reject SPAQ1, then SPAQ2
  For each variant in turn: open its first transaction, Reject, type
  REJECT_REASON, Confirm. Expected: a message about the rejection (QA to
  confirm the wording; none is a DEVIATION), the transaction and its MRN gone
  from Incoming Transactions, the other variant's transactions untouched until
  its turn. A failure on the second reads
  "Partial rejection: SPAQ1 rejected, SPAQ2 failed - <reason>".

Test Case 6 - Nothing was received
  Home: each Stock Balance is unchanged - rejected stock never reaches the
  receiver. Download Stock Data again: the rejected MRNs are not listed again.
  "Test Case 6 - stock was rejected, but the balance changed: <...>"

## What the app is expected to do (from its source, not yet seen on the build)

From egovernments/health-campaign-field-worker-app (main), read 2026-10-23:
Reject is the form's secondary button. The tenant's config decides whether
it asks first; when it does, the popup has a title, an optional description,
optional text fields (a mandatory one left empty shows "<label> is
required"), a confirming button and Cancel. A rejected dispatch is marked
REJECTED: the receiver's incoming list leaves it out, the receiver's balance
never counts it, and the sender's balance gets the quantity back when the
sender next downloads stock. Read every string off the app before trusting
it, and record what you read, with the date, in the YAML comments.

## Soft checks

The popup, the reason field and the success message are not confirmed by QA.
Run every case, log each difference as "DEVIATION - ...", and fail once at the
end listing them all ("Stock rejection for <role> differs from Prompt 15:
..."), as the reconciliation flows do. A transaction that stays listed after
Confirm, a list that changes after Cancel, or a balance that moves fails at
once.

## Execution report (log at the end)

Role; incoming transactions before (per variant); whether Reject asked first,
and the popup's title, buttons and reason field; the Cancel result; the
empty-reason result; each rejected MRN with product and quantity; the message
shown; Stock Balance before / after; the deviations.

## Out of scope - note it in TEST-CASES as not covered

- The sender's balance coming back. It happens on the sender's device when the
  sender downloads stock, so it needs the sender's session; check it by hand
  until a flow chains both roles.
- View Reports after a rejection.

## Safety

Rejecting is irreversible and writes to UAT, and every run consumes one
dispatch per variant: tag the flows consumes-data, and ask before running
anything that taps Reject. A fresh sign-in wipes the device, so check with the
user that no unsynced session is still needed. Before each run, the sender
must dispatch SPAQ1 and SPAQ2 to the role under test.

## Keep the docs in step

TEST-CASES.md (a new section, one case per test case above, status Blocked
until a run; the coverage table), the README (variables, flow table, layout,
subflow table) and .env.example - in the same change.
```
