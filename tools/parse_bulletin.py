"""Column-aware parser for OAK Bulletin dissertation topic tables.

Usage: python parse_bulletin.py BULLETIN.pdf parsed.json [first_page] [last_page]
Defaults match Bulletin 2026/2 (topic tables on pages 187-699).
Then: python build_corpus.py parsed.json ../data/oak_bulletin_2026_2.json
"""
import json, logging, re, sys
import pypdf

logging.getLogger("pypdf").setLevel(logging.ERROR)
PDF, OUT = sys.argv[1], sys.argv[2]
FIRST = int(sys.argv[3]) if len(sys.argv) > 3 else 187
LAST = int(sys.argv[4]) if len(sys.argv) > 4 else 699

REG = re.compile(r"[ВB]20\d\d\.\d\.(?:PhD|DSc)/[A-Za-zА-Яа-яЎўҚқҒғҲҳ]+\d+")
CODE = re.compile(r"^\d{2}\.\d{2}\.\d{2}$")
FIELD_CODE = re.compile(r"^\d{2}\.00\.00$")
HEADER_WORDS = {"Изланувчининг", "Ф.И.Ш.", "Ихтисослик", "шифри", "Диссертация", "мавзусининг", "рўйхатдан",
                "ўтказилган", "рақами.", "мавзуси", "Илмий", "раҳбарнинг", "маслаҳатчининг", "маслаҳатчи-нинг",
                "бажарилаётган", "муассаса", "номи", "МАЪЛУМОТ"}

# footnote lines printed under the first table page of each section
FOOTNOTE_MARKERS = ("Диссертация мавзулари тасдиқланган", "387/5-сон", "масъулдир", "мувофиқлиги ҳамда",
                    "Ўзбекистон рўйхатдан ўтказилган", "тақдим этилган", "этилган маълумотларнинг", "Изланувчи маълумотининг")
PATRONYMIC_WORDS ={"ўғли", "қизи", "угли", "кизи", "ўгли", "уғли"}
LOOKALIKE =str.maketrans("АВЕКМНОРСТХаеорсхТ", "ABEKMHOPCTXaeopcxT")

def norm_reg(s):
    return s.translate(LOOKALIKE)

def is_upper_line(s):
    letters = [c for c in s if c.isalpha()]
    return len(letters) >= 4 and all(c.isupper() for c in letters)

reader = pypdf.PdfReader(PDF)
stream = []           # (page, kind, payload)
page_codes = {}       # page -> [codes top-to-bottom]
plain_code_for = {}   # reg -> code from plain text adjacency

for pno in range(FIRST, LAST + 1):
    page = reader.pages[pno - 1]

    rot = []
    def v(text, cm, tm, font, size):
        t = text.strip()
        if CODE.match(t) and (tm[1] != 0 or cm[1] != 0):
            rot.append((tm[4] * cm[1] + tm[5] * cm[3] + cm[5], t))
    plain = page.extract_text(visitor_text=v)
    page_codes[pno] = [c for _, c in sorted(rot, key=lambda r: -r[0])]
    for m in re.finditer(r"(\d{2}\.\d{2}\.\d{2})\s+(" + REG.pattern + ")", plain):
        plain_code_for.setdefault(norm_reg(m.group(2)), m.group(1))

    layout = page.extract_text(extraction_mode="layout").split("\n")
    hdr = next((i for i, l in enumerate(layout) if re.fullmatch(r"\s*1\s+2\s+3\s+4\s+5\s*", l)), None)
    if hdr is None:
        continue
    pos = [m.start() for m in re.finditer(r"\d", layout[hdr])]
    c2, c4, c5 = pos[1], pos[3], pos[4]
    b12, b34, b45 = c2, c4 - 8, c5 - 13

    for line in layout[hdr + 1:]:
        if not line.strip():
            stream.append((pno, "blank", None)); continue
        s = line.strip()
        if re.fullmatch(r"2026/2\s+\d+", s) or s.startswith("Ўзбекистон Республикаси Фанлар академияси"):
            continue
        if any(k in s for k in FOOTNOTE_MARKERS):
            continue
        if FIELD_CODE.match(s):
            stream.append((pno, "fieldcode", s)); continue
        if is_upper_line(s) and not REG.search(s):
            stream.append((pno, "heading", s)); continue
        cols = [[], [], [], []]
        for m in re.finditer(r"\S+", line):
            w, x = m.group(), m.start()
            col = 0 if x < b12 else 1 if x < b34 else 2 if x < b45 else 3
            # a lowercase word just past the title column edge is the tail of a justified title line
            if col == 2 and x < b34 + 5 and w[:1].islower() and w not in PATRONYMIC_WORDS:
                col = 1
            cols[col].append(w)
        if all(w in HEADER_WORDS for c in cols for w in c):
            continue
        stream.append((pno, "row", cols))

def join(words):
    out = ""
    for w in words:
        if out.endswith("-") and len(out) > 1 and out[-2].isalpha() and w[:1].islower():
            out = out[:-1] + w
        elif out.endswith("-") and len(out) > 1 and out[-2].isalpha():
            out += w
        else:
            out = (out + " " + w) if out else w
    out = re.sub(r"\s+([,.;:)])", r"\1", out)
    out = re.sub(r"([(«“])\s+", r"\1", out)
    return out.strip()

records, cur, field = [], None, None
pending_field_code = None
for pno, kind, payload in stream:
    if kind == "fieldcode":
        pending_field_code = payload; continue
    if kind == "heading":
        if pending_field_code:
            field = payload.title(); pending_field_code = None
        continue
    if kind == "blank":
        continue
    name, title, sup, inst = payload
    regs = [w for w in title if REG.fullmatch(w)]
    # A reg number starts a new record, unless the current record has no title yet
    # (then it is the previous registration number of a re-registered topic).
    if regs and (cur is None or cur["_title"]):
        new_reg = norm_reg(regs[0])
        cur = {"registration_id": new_reg, "_regs": [new_reg], "source_page": pno, "field": field,
               "_name": [], "_title": [], "_sup": [], "_inst": []}
        records.append(cur)
        regs = regs[1:]
    if cur is None:
        continue
    for r in regs:
        cur["_regs"].append(norm_reg(r))
    cur["_name"] += name
    cur["_title"] += [w for w in title if not REG.fullmatch(w)]
    cur["_sup"] += sup
    cur["_inst"] += inst

# specialty codes: plain-text adjacency first, else rotated codes in page order
by_page = {}
for r in records:
    by_page.setdefault(r["source_page"], []).append(r)
for pno, recs in by_page.items():
    codes = page_codes.get(pno, [])
    for i, r in enumerate(recs):
        r["specialty_code"] = plain_code_for.get(r["registration_id"]) or (codes[i] if len(codes) == len(recs) else None)

out = []
for r in records:
    degree = "DSc" if "/DSc" in r["registration_id"] or ".DSc/" in r["registration_id"] else "PhD"
    out.append({
        "registration_id": r["registration_id"],
        "previous_registration_id": r["_regs"][1] if len(r["_regs"]) > 1 else None,
        "degree": degree,
        "kind": "re-registered" if len(r["_regs"]) > 1 else "registered",
        "specialty_code": r["specialty_code"],
        "field": r["field"],
        "candidate_name": join(r["_name"]),
        "title_original": join(r["_title"]),
        "supervisor_name": join(r["_sup"]),
        "institution": join(r["_inst"]),
        "source_page": r["source_page"],
    })

json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
from collections import Counter
print("records:", len(out), Counter((r["degree"], r["kind"]) for r in out))
print("unique:", len({r["registration_id"] for r in out}))
print("no code:", sum(1 for r in out if not r["specialty_code"]),
      "| no supervisor:", sum(1 for r in out if not r["supervisor_name"]),
      "| no institution:", sum(1 for r in out if not r["institution"]),
      "| no name:", sum(1 for r in out if not r["candidate_name"]))
