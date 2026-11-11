# Prompt 21 — DB audit of the CDD's actions

Given in conversation on 2026-11-11, word for word:

> use the same code of the db-audit or db realted code/cases to https://github.com/GhanateSwathi/HCM-Maestro-Automation-APP-SMC-Nigeria

## What it refers to

The repo [HCM-Maestro-Beneficiary-ID-Fix](https://github.com/GhanateSwathi/HCM-Maestro-Beneficiary-ID-Fix) holds a DB audit of the CDD's actions in `db-audit/`, run on 2026-11-10/11 on the Kaduna AZM "-db" build (`org.egov.azm.gombe` 2.2.122). In each case an action is done in the app as a CDD. That record is then read from the app's own local database through the build's **DB** card (the Drift DB viewer), field by field.

The ten cases:
1. Registration, then checklist -> referral.
2. Checklist -> delivery.
3. Checklist -> ineligible.
4. Referral with Case 2's dates.
5. Consent No.
6. Unable to Deliver.
7. Redose.
8. Revisit and edit.
9. An answer changed (SMC Yes -> No).
10. An abandoned checklist.

The results are in that repo's `RESULTS.md` and `CDD-field-capture.xlsx`.

## Where it lives here

[`db-audit/`](../db-audit/README.md) is a suite of its own, like `beneficiary-id/` and `proximity/`, over `beneficiary-id/`'s subflows:
- The cases, adapted to the SMC checklist: [`db-audit/TEST-CASES.md`](../db-audit/TEST-CASES.md).
- What changed for this app and what is not verified yet: [`db-audit/README.md`](../db-audit/README.md).

The checks need a build of this app with the DB card.
