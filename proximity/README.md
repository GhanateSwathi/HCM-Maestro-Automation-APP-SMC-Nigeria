# Search by proximity (SMC Nigeria)

Maestro cases for **Near by households** (search by proximity) on Search Beneficiary, ported from the ID-fix repo's `proximity/` suite. That suite was written and run on 2026-11-06 for QA's report against the AZM Kaduna build 2.2.122. QA's report: a newly registered household does not show under Near by after the village's data is downloaded. This is a suite of its own, apart from the [Beneficiary ID cases](../beneficiary-id/README.md), whose subflows it reuses: sign-in that keeps the app's data, register and read, consent No, search field, sync and logout.

| | |
| --- | --- |
| App | `HCM_APP_ID` from the root `.env` (`com.digit.hcm`, mhbase UAT) |
| User | The root `.env`'s CDD (`AU-CDD-001`); the boundary is the root suite's (first facility, first three communities), the village the first offered or `REGISTRATION_VILLAGE` |
| Device | An emulator (`DEVICE_ID`, else the one connected): the GPS is moved with `adb emu geo fix` |
| Centre C | The emulator's own fix, Mountain View (37.421998, -122.084), where every flow of this repo registers |
| Cases | [PROXIMITY-CASES.md](PROXIMITY-CASES.md): 41 cases (positive, negative, edge), the AZM build's bugs B1-B10 and their cause, results |

The related Prompt 18 flow (`flows/registration/cdd-search-nearby-and-id.yaml`) checks one household under Near by. This suite checks what QA reported: many households in range, consent-No households among them, paging, the radius, and a device that moves.

## Where we left off (2026-11-10)

**Ported, not run yet on this app.** Every flow passes `maestro check-syntax`. Section 5 of [PROXIMITY-CASES.md](PROXIMITY-CASES.md) reads NOT RUN.

Next session, start here:

1. Download beneficiary IDs (`beneficiary-id\setup\download-ids.yaml`). Then run `-Sequence NB1`: it checks the selectors on this app and shows whether B1 (the list stops after the first short page) is here too. C already holds the root suite's households, consent-No ones among them.
2. Run NB2, then Radius and E09 with NB2's tag, then NB3 and NB4. Fill in section 5 as you go.
3. The AZM findings for the dev (B1's cause and fix options, B8's live radius) are in the ID-fix repo's `proximity/README.md`. If this app shows the same bugs, they apply here as well.

## What changed from the AZM suite, and why

- **Households are found by head age, not name.** Every name in this build's result cards reads "--" (root TEST-CASES, 2026-10-21). Each household here gets a head age no other test household has, and the flows find it by its row, `102y 0m Female` ([subflows/is-listed.yaml](subflows/is-listed.yaml)), as Prompt 18 does:
  - NB1-A: 101
  - NB2 C / 1KM / 4K9 / 5K1 / 10KM: 102-106
  - NB3-1..5: 111-115
  - NB4-1..6: 121-126
  - NB5: 131

  [nearby-list.py](scripts/nearby-list.py) names a card the same way, "head 102y 0m Female". Ages from 101 up keep downloaded households out of the way.
- **Names carry the run's tag:** `QAID-NB2-<tag>-C`. Typing `QAID-NB2-<tag>` then lists one run's households only. The households of earlier runs, and of the downloaded village, have their own names.
- **The GPS sequences are scripted.** On 2026-11-06 the GPS moves were typed between parts by hand. [run-sequence.ps1](scripts/run-sequence.ps1) does them: NB1, NB2, Radius, E09, NB3, NB4, NB5, NB6.
- **Centre C is Mountain View, not Rigan Ori** (10.5222, 7.4388). The distances are the same.
- **The Near by switch** is tapped as Prompt 18 taps it: left of its label, below the screen's subtitle. The AZM suite tapped a fixed point (8%, 29%). Search Beneficiary is left through its Back link, or else home through the side menu ([subflows/reopen-search.yaml](subflows/reopen-search.yaml)).
- **The app, the CDD and the boundary are the root `.env`'s.** The AZM `run.ps1` pinned the Kaduna build and boundary. On "Data found!", NB1 always downloads the village's data.
- **NB5's household is not fixed.** On the AZM build it was QA's own name; here it is `-Name` / `-LastName`.

Not verified yet on this app, beyond the [Beneficiary ID suite's list](../beneficiary-id/README.md#not-verified-yet-on-this-app):

- whether the search screen's Back link exists;
- how long the Near by switch stays disabled after the screen opens;
- the result rows' text in a uiautomator dump, which `nearby-list.py` parses;
- whether the app logs the upload bodies that `saved-latlong.py` reads.

## Running

```powershell
.\scripts\run.ps1 -Flow beneficiary-id\setup\download-ids.yaml      # IDs on the device first
.\proximity\scripts\run-sequence.ps1 -Sequence NB1                   # the reported state at C
.\proximity\scripts\run-sequence.ps1 -Sequence NB2                   # moving check; prints its tag
.\proximity\scripts\run-sequence.ps1 -Sequence Radius -Tag <NB2 tag>
.\proximity\scripts\run-sequence.ps1 -Sequence E09 -Tag <NB2 tag>
.\proximity\scripts\run-sequence.ps1 -Sequence NB3                   # B1's cause at F
.\proximity\scripts\run-sequence.ps1 -Sequence NB4                   # the control at G
.\proximity\scripts\run-sequence.ps1 -Sequence NB5 -Name <first> -LastName <last>
.\proximity\scripts\run-sequence.ps1 -Sequence NB6 -Name <first> -LastName <last>   # clears the app first
```

**Output.** Each sequence writes to `artifacts\proximity\runs\<yyyyMMdd-HHmmss>-<sequence>\`:

- one folder per part;
- `<label>.json` per recorded list;
- `sequence.log`: every GPS move and every `CHECK` / `PROBE` / `E09` / `NOTE` / `LEDGER` line the parts logged.

**One part, by hand:**

```powershell
adb -s emulator-5554 emu geo fix -122.084 37.421998          # longitude first
.\proximity\run.ps1 -Flow proximity\cases\NB3\nearby-on.yaml -Tag 101530
python -I proximity\scripts\nearby-list.py emulator-5554 artifacts\proximity\runs\list.json 7
```

Variables some flows need (`-Set` on `run.ps1`; `run-sequence.ps1` passes them):
- `NAME`, `HEAD_AGE`: register, consent No, location page; `KEY`: register-and-check.
- `TARGET`, `TARGET_AGE`, `DIST`: radius probe.
- `TYPE`: Near by on, optional.

**Irreversible.** NB1-NB6 register households on mhbase UAT; NB6 also clears the app's storage. Every root-suite flow and NB6 wipe the app's beneficiary IDs, so download them again before the next registration.

## Layout

| Path | Holds |
| --- | --- |
| `PROXIMITY-CASES.md` | Cases, the AZM bugs and their cause, results here and on the AZM build |
| `run.ps1` | Runs one flow through `scripts\run.ps1`, with the run's tag (`QAID_RUN`) and output folder |
| `scripts/run-sequence.ps1` | The GPS sequences, each part in turn, with the log |
| `scripts/nearby-list.py` | Records every card in the result list while swiping down, then up |
| `scripts/saved-latlong.py` | Reads each household's saved lat/long from the sync's upload log |
| `cases/NB1/` | Sign in and boundary with download, IDs and Search, register A at C |
| `cases/NB2/` | Register-and-check where the GPS is (also NB3 and NB4), check from the centre, radius probe, stale centre (E-09), location page (B6) |
| `cases/NB3/` | Consent-No household; Near by on (optionally a name typed) |
| `cases/NB5/` | QA's manual case: register, back to Search, Near by on; then type the name |
| `cases/NB6/` | Clean start, part 0: sync, then log out before the storage is cleared |
| `subflows/` | The Near by switch, "is this household listed", reopen Search Beneficiary |
| `artifacts/proximity/runs/` (repo root) | Run output (gitignored: Maestro logs hold the typed password) |
