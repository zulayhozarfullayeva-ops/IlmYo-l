"""Build the web corpus file from parsed bulletin records (adds Uzbek Latin titles)."""
import json, re, sys

SRC, OUT = sys.argv[1], sys.argv[2]
recs = json.load(open(SRC, encoding="utf-8"))

VOWELS = set("аеёиоуэюяўАЕЁИОУЭЮЯЎ")
MAP = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "ж": "j", "з": "z", "и": "i", "й": "y",
    "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t",
    "у": "u", "ф": "f", "х": "x", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sh", "ъ": "’", "ы": "i",
    "ь": "", "э": "e", "ю": "yu", "я": "ya", "ё": "yo", "ў": "o‘", "қ": "q", "ғ": "g‘", "ҳ": "h",
}

def translit(text):
    out = []
    for i, ch in enumerate(text):
        low = ch.lower()
        prev = text[i - 1] if i else " "
        if low == "е":
            lat = "ye" if (not prev.isalpha() or prev in VOWELS or prev in "ъЪьЬ") else "e"
        elif low in MAP:
            lat = MAP[low]
        else:
            out.append(ch); continue
        if ch.isupper() and lat:
            nxt = text[i + 1] if i + 1 < len(text) else " "
            lat = lat.upper() if (nxt.isupper() and len(lat) > 1) else lat[0].upper() + lat[1:]
        out.append(lat)
    s = "".join(out)
    return re.sub(r"\s+", " ", s).strip()

rows = []
seen = set()
for r in recs:
    rid = r["registration_id"]
    if rid in seen or not r["title_original"] or len(r["title_original"]) < 10:
        continue
    seen.add(rid)
    rows.append({
        "id": rid,
        "prev": r["previous_registration_id"],
        "deg": r["degree"],
        "code": r["specialty_code"] or "",
        "field": r["field"] or "",
        "name": r["candidate_name"],
        "title": r["title_original"],
        "lat": translit(r["title_original"]),
        "sup": "" if r["supervisor_name"] in ("-", "–") else r["supervisor_name"],
        "inst": r["institution"],
        "page": r["source_page"],
    })

doc = {
    "source": "O‘zbekiston Respublikasi OAK Byulleteni, 2026/2-son",
    "note": "PDFdan avtomatik ajratilgan. Ayrim yozuvlarda so‘z tartibi yoki bo‘g‘in ajralishida xatolik bo‘lishi mumkin.",
    "count": len(rows),
    "topics": rows,
}
json.dump(doc, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("written", len(rows))
for x in rows[:2] + [t for t in rows if t["id"] == "B2026.2.PhD/Fil7603"]:
    print(x["lat"])
