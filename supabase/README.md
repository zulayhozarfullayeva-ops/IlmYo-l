# IlmYo‘l — Supabase baza

Loyiha: `ilmyol` (`cjjqmzgldfjvobelpkov`, eu-central-1).

Bazaga quyidagi migratsiyalar shu tartibda qo‘llangan (Supabase → Database → Migrations):

1. `core_schema` — rollar, `profiles`, reja/vazifa/bob/maqola/hujjat/dalil/izoh jadvallari, RLS, triggerlar, `topics` korpusi
2. `evidence_storage` — yopiq `evidence` fayl ombori (fayl yo‘li: `{student_id}/...`)
3. `move_helpers_private` — RLS yordamchi funksiyalari API ga ochiq bo‘lmagan `private` sxemaga ko‘chirildi
4. `optimize_policies` — RLS unumdorligi va qo‘shimcha indekslar

## Rollar

| Rol | Nima ko‘radi | Nima qila oladi |
|---|---|---|
| `doctoral_student` | faqat o‘z ma’lumotini | o‘z ma’lumotini kiritadi, rejani rahbarga yuboradi |
| `supervisor` | o‘ziga biriktirilgan doktorantlar | reja bandini tasdiqlaydi / qaytaradi, izoh va vazifa beradi |
| `department` | hamma | rol va rahbar biriktiradi, hisobot oladi |

Yangi foydalanuvchi har doim `doctoral_student` bo‘lib yaratiladi. Rol va rahbarni faqat `department` o‘zgartira oladi (`private.protect_profile_fields` trigger).
Reja bandini `approved`/`returned` qilishni faqat rahbar yoki bo‘lim qila oladi (`private.protect_plan_review` trigger).

Birinchi ilmiy bo‘lim foydalanuvchisini SQL Editor’da belgilash:

```sql
update public.profiles set role = 'department' where email = 'SIZNING@EMAIL';
```
