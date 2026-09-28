# IlmYo‘l — Doktorantlar uchun AI Ilmiy Monitoring va Boshqaruv Platformasi

IlmYo‘l — tayanch doktorantlar, ilmiy rahbarlar va ilmiy bo‘limlar uchun mo‘ljallangan kompleks monitoring, 3 yillik reja boshqaruvi, dissertatsiya tuzilmasi tahlili hamda sun’iy intellektga asoslangan **Topic Novelty Engine (Mavzu Yangiligi Tahlili)** platformasi.

---

## 🚀 Loyiha Strukturasi

- **`ilmyol_dashboard/`** — Asosiy veb-platforma:
  - **Topic Novelty Engine v1.1:** Ko‘p tilli (o‘zbek, rus, ingliz) neyron semantik embeddinglar (`Sentence-Transformers`), kalit konseptlar qoplamasi va kanonik formula asosida yangilik darajasini tekshirish;
  - **3 Yillik Ilmiy Reja (Roadmap):** Bosqichlar, modullar, muddatlar va ilmiy rahbar tasdiqlari;
  - **Dissertatsiya Ichki Strukturasi:** Boblar, paragraflar, sahifalar va antiplagiat monitoringi;
  - **OAK Bulletin 2026/2 Test Korpusi:** 30 ta real PhD mavzusi va 12 ta benchmark juftligi;
  - **Supervisor & Department Views:** Rahbar tekshiruvi va bo‘lim hisobotlari.
- **`telegram_agent/`** — Telegram bot monitoring agenti (@IlmYol_Bot):
  - Attestatsiya eslatmalari, vazifalar holati va tezkor monitoring bildirishnomalari.

---

## 🛠 Ishga Tushirish

### 1. Veb Platforma va Real Embedding Serverni Ishga Tushirish:
```bash
cd ilmyol_dashboard

# Barcha serverlarni bir vaqtda ishga tushirish (Web Dashboard + Semantic Embedding API):
python start_ilmyol.py
```
- **Dashboard havolasi:** [http://localhost:3000](http://localhost:3000)
- **Embedding REST API:** [http://localhost:3001/api/health](http://localhost:3001/api/health)

### 2. Telegram Botni Ishga Tushirish:
```bash
cd telegram_agent
python main.py
```

---

## 📊 Topic Novelty Engine v1.1 Formulalari

$$\text{Final Similarity} = (\text{Semantic} \times 0.45) + (\text{Concepts} \times 0.25) + (\text{Title} \times 0.20) + (\text{Domain} \times 0.10)$$

- **Exact Duplicate Layer:** Aniq dublikatlar uchun prior qoida ($100\%$ dublikat ogohlantirishi).
- **Differentiation Index:** $100 - \text{eng yuqori o‘xshashlik balli}$ (Tekshirilgan korpusga nisbatan farqlanish darajasi).
