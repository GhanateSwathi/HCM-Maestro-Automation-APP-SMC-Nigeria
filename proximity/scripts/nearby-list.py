"""Record every household on the Search Beneficiary result list, in order.

proximity/PROXIMITY-CASES.md E-01 / E-03: with the result list on screen (e.g. Near
by households switched on), scrolls down to the end and then back to the
top, reading each household card off the screen (uiautomator). Prints the
order seen each way, and any household seen twice or only one way. The list
loads 5 households per page as it scrolls (AZM build: and drops pages beyond
15), so each swipe waits for the page to load.

    python -I proximity/scripts/nearby-list.py [serial] [out.json] [seconds per swipe]

A household card is the row with an "Open" button. On the AZM build its
name was the label left of that button. On this build every name reads
"--" (root TEST-CASES, 2026-10-21), so a card is named by its member rows
under the button - "--\n102y 0m\nFemale" each - as "head 102y 0m Female"
(+ "/ <next member>" ...). The proximity households' heads have ages no one
else's has (README, "Head ages"), so "head 102y 0m Female" is QAID-NB2-C.
Ported from the ID-fix repo's script; only the card naming changed.
"""
import html
import json
import re
import subprocess
import sys
import time

SERIAL = sys.argv[1] if len(sys.argv) > 1 else "emulator-5554"
OUT = sys.argv[2] if len(sys.argv) > 2 else None
# One page loads in well under a second ([QueryPerf] on the AZM build), but
# the software-rendered emulator draws slowly: at 3 s a sweep stopped before
# pages that arrived later (2026-11-06 14:12).
SWIPE_WAIT_S = float(sys.argv[3]) if len(sys.argv) > 3 else 6.0
STILL_LIMIT = 4         # this many swipes without a new household = the end
FRAMES = []             # every screen read: (direction, [cards top to bottom])
ROW = re.compile(r"(\d+y \d+m)\s+(\S+)\s*$")


def adb(*args):
    return subprocess.run(["adb", "-s", SERIAL, *args], capture_output=True, check=True).stdout


def screen_size():
    out = adb("shell", "wm", "size").decode("utf-8", "replace")
    m = re.search(r"(\d+)x(\d+)", out)
    return (int(m.group(1)), int(m.group(2))) if m else (1344, 2992)


def screen_households():
    adb("shell", "uiautomator", "dump", "/sdcard/ui.xml")
    xml = adb("exec-out", "cat", "/sdcard/ui.xml").decode("utf-8", "replace")
    nodes = []
    for m in re.finditer(r"<node [^>]*>", xml):
        n = m.group(0)
        desc = html.unescape((re.search(r'content-desc="([^"]*)"', n) or [None, ""])[1])
        b = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', n)
        if b and desc:
            nodes.append((desc, tuple(int(x) for x in b.groups())))
    opens = sorted((bb for d, bb in nodes if d == "Open"), key=lambda bb: bb[1])
    cards = []
    for i, (ox1, oy1, ox2, oy2) in enumerate(opens):
        next_top = opens[i + 1][1] if i + 1 < len(opens) else 10 ** 6
        name = ""
        rows = []
        for d, (x1, y1, x2, y2) in nodes:
            cy = (y1 + y2) / 2
            if "\n" not in d and d != "Open" and oy1 <= cy <= oy2 and x2 <= ox1:
                name = d
            if "\n" in d and oy1 <= y1 < next_top:
                r = ROW.search(d.replace("\n", " "))
                if r:
                    rows.append((y1, f"{r.group(1)} {r.group(2)}"))
        rows = [t for _, t in sorted(rows)]
        if name and name != "--":
            cards.append((name, oy1))
        elif rows:
            cards.append(("head " + " / ".join(rows), oy1))
        else:
            cards.append((f"(card at y={oy1}, nothing readable)", oy1))
    return [c for c, _ in sorted(cards, key=lambda t: t[1])]


def sweep(direction, w, h):
    """Scroll one way to the end; return households in the order first seen."""
    x, low, high = str(w // 2), str(int(h * 0.77)), str(int(h * 0.37))
    seen, still = [], 0
    while still < STILL_LIMIT:
        on_screen = screen_households()
        FRAMES.append((direction, on_screen))
        new = [n for n in on_screen if n not in seen]
        seen += new
        still = 0 if new else still + 1
        if direction == "down":
            adb("shell", "input", "swipe", x, low, x, high, "700")
        else:
            adb("shell", "input", "swipe", x, high, x, low, "700")
        time.sleep(SWIPE_WAIT_S)
    return seen


def main():
    t0 = time.strftime("%H:%M:%S")
    w, h = screen_size()
    down = sweep("down", w, h)
    up = sweep("up", w, h)
    result = {
        "started": t0,
        "down": down,
        "up": up,
        "down_count": len(down),
        "up_count": len(up),
        "only_down": [n for n in down if n not in up],
        "only_up": [n for n in up if n not in down],
        "frames": FRAMES,
    }
    print(f"Scrolled down: {len(down)} households")
    for i, n in enumerate(down, 1):
        print(f"  {i:3}. {n}")
    print(f"Scrolled back up: {len(up)} households (first seen on the way up: {up[:3]} ...)")
    print("Seen only going down:", result["only_down"] or "none")
    print("Seen only going up:", result["only_up"] or "none")
    twice = sorted({n for _, frame in FRAMES for n in frame if frame.count(n) > 1})
    print("On one screen twice:", twice or "none")
    if OUT:
        with open(OUT, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)


if __name__ == "__main__":
    main()
