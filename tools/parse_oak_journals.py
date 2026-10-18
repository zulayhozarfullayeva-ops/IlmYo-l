"""Parse the OAK recommended journals list (PDF table) into JSON for the website.

Usage: python parse_oak_journals.py LIST.pdf ../data/oak_journals.json "2026-08-03" "source note"

Table columns: No | Journal name (+ place, publisher on the next lines) | Type | Field codes | Field names |
Status | Added | Removed | Decision. Columns are recovered from character positions in pypdf's layout text.
"""
import json, logging, re, sys
import pypdf

logging.getLogger("pypdf").setLevel(logging.ERROR)
PDF, OUT = sys.argv[1], sys.argv[2]
AS_OF = sys.argv[3] if len(sys.argv) > 3 else ""
SOURCE = sys.argv[4] if len(sys.argv) > 4 else ""

SEG = re.compile(r"\S+(?: \S+)*")          # text runs separated by 2+ spaces
FIELD_CODE = re.compile(r"^\d{2}\.00\.00$")
RECORD = re.compile(r"^\s{0,8}(\d{1,4})\s{2,}\S")

def segments(line):
    return [(m.start(), m.group()) for m in SEG.finditer(line)]

def clean(s):
    s = re.sub(r"\s+", " ", s or "").strip()
    return "" if s in ("—", "-", "–") else s

reader = pypdf.PdfReader(PDF)
records, cur = [], None
for pno, page in enumerate(reader.pages, 1):
    lines = page.extract_text(extraction_mode="layout").split("\n")
    hdr = next((i for i, l in enumerate(lines) if "Jurnal nomi" in l and "Nashr turi" in l), None)
    if hdr is None:
        continue
    for line in lines[hdr + 1:]:
        if not line.strip() or "-bet" in line and "@" in line:
            continue
        m = RECORD.match(line)
        segs = segments(line)
        if m:
            # first line of a record: No, name, type, code, field, status, added, removed, decision
            vals = [v for _, v in segs]
            anchors = [x for x, _ in segs]
            cur = {"no": int(vals[0]), "_anchors": anchors, "name": vals[1] if len(vals) > 1 else "",
                   "lines": [], "type": "", "fields": [], "status": "", "added": "", "removed": "", "decision": "",
                   "page": pno}
            rest = vals[2:]
            # locate the field code inside the row; everything after it is positional
            ci = next((i for i, v in enumerate(rest) if FIELD_CODE.match(v)), None)
            if ci is not None:
                cur["type"] = " ".join(rest[:ci])
                code = rest[ci]
                fname = rest[ci + 1] if ci + 1 < len(rest) else ""
                cur["fields"].append([code, fname])
                tail = rest[ci + 2:]
                for key, v in zip(["status", "added", "removed", "decision"], tail):
                    cur[key] = v
                cur["_code_x"] = anchors[2 + ci + 1] if 2 + ci + 1 < len(anchors) else None
            records.append(cur)
            continue
        if cur is None:
            continue
        # continuation line: place/publisher under the name column, extra field codes under the code column
        texts = []
        for x, v in segs:
            if FIELD_CODE.match(v):
                cur["fields"].append([v, ""])
                cur["_last_code"] = True
            elif cur.get("_last_code") and cur["fields"] and not cur["fields"][-1][1] and x > 100:
                cur["fields"][-1][1] = v
            elif x < 100:
                texts.append(v)
            elif cur["fields"] and not cur["fields"][-1][1]:
                cur["fields"][-1][1] = v
        cur["_last_code"] = False
        if texts:
            cur["lines"].append(" ".join(texts))

from collections import Counter

# canonical field name per code = most frequent pairing (fixes rows where names shifted by one line)
pairs = Counter((c, clean(n)) for r in records for c, n in r["fields"] if clean(n))
FIELD_NAME = {}
for (c, n), k in pairs.most_common():
    FIELD_NAME.setdefault(c, n)

CYR2LAT = str.maketrans("АВЕКМНОРСТХаеорсхуіТ", "ABEKMHOPCTXaeopcxyiT")

def latinize_if_latin(s):
    """'Тhе USА' (mixed scripts) -> 'The USA' when the text is mostly Latin."""
    lat = sum(ch.isascii() and ch.isalpha() for ch in s)
    cyr = [ch for ch in s if "Ѐ" <= ch <= "ӿ"]
    lookalikes = set("АВЕКМНОРСТХаеорсхуіТ")
    # convert only when the text has Latin letters and every Cyrillic letter is a Latin look-alike
    return s.translate(CYR2LAT) if lat and cyr and all(ch in lookalikes for ch in cyr) else s

out = []
for r in records:
    lines = r["lines"]
    out.append({
        "no": r["no"],
        "name": clean(r["name"]),
        "place": latinize_if_latin(clean(lines[0])) if lines else "",
        "publisher": clean(" ".join(lines[1:])) if len(lines) > 1 else "",
        "type": clean(r["type"]),
        "fields": [[c, FIELD_NAME.get(c, clean(n))] for c, n in r["fields"]],
        "status": clean(r["status"]),
        "added": clean(r["added"]),
        "removed": clean(r["removed"]),
        "decision": clean(r["decision"]),
        "page": r["page"],
    })

doc = {"title": "OAK tavsiya etilgan ilmiy nashrlar ro‘yxati", "as_of": AS_OF, "source": SOURCE,
       "count": len(out), "field_names": FIELD_NAME, "journals": out}
json.dump(doc, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("field codes:", len(FIELD_NAME), sorted(FIELD_NAME.items())[:6])
print("records:", len(out), "| numbers 1..N contiguous:", [r["no"] for r in out] == list(range(1, len(out) + 1)))
print("status:", Counter(r["status"] for r in out))
print("type:", Counter(r["type"] for r in out))
print("no fields:", sum(1 for r in out if not r["fields"]), "| fields without name:", sum(1 for r in out for f in r["fields"] if not f[1]))
