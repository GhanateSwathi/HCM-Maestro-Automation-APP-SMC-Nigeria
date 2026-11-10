# Prompt 20 — Beneficiary ID Fix cases

Given in conversation on 2026-11-10, word for word:

> actually whatever test cases we have run in HCM-maestro-Beneficiary ID fix we need to use them in the HCM-Maestro-Automation-APP-SMC-Nigeria https://github.com/GhanateSwathi/HCM-Maestro-Automation-APP-SMC-Nigeria , so once we reuse the same cases in the app smc nigeria open that in the VC

## What it refers to

The repo [HCM-Maestro-Beneficiary-ID-Fix](https://github.com/GhanateSwathi/HCM-Maestro-Beneficiary-ID-Fix) holds the Maestro cases of the **Beneficiary ID Fix – QA Test Plan** (2026-10-30). That build fixes duplicate beneficiary IDs, and UUIDs saved in place of pool IDs. The repo ran on the AZM builds: Kaduna 2.2.120, then Kebbi 2.2.122 for X9, X9b and D5. Its cases:

- **One device:** P1, P1b, P2, P3, P4, P5, X1 (with X2), X3, X4, X5, X6, X8, D1, D2, D6 and D11.
- **Two emulators under one CDD:** X9, X9b and D5.

P6 has been out of scope since 2026-11-03.

## Follow-up, the same day

> move the proximity search too

The same repo's search-by-proximity suite (`proximity/`, NB1–NB6) was written on 2026-11-06 for QA's report: a household registered after the village's data was downloaded did not show under Near by households. It is ported as [`proximity/`](../proximity/README.md), a suite of its own like it was there. This repo's Prompt 18 checks one household under Near by; this suite covers the paging, radius and moving-device cases.

## Where it lives here

The Beneficiary ID cases: [`beneficiary-id/`](../beneficiary-id/) is a suite of its own, with a runner, ID ledger and report, because its cases run in parts within one app session. The cases are in [`beneficiary-id/TEST-CASES.md`](../beneficiary-id/TEST-CASES.md); what changed for the SMC app is in [`beneficiary-id/README.md`](../beneficiary-id/README.md).
