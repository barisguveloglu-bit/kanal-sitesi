# Defter

Oturumlar arası hafıza. **En yeni kayıt en üstte.**

Her oturumun başında bu dosyanın başı otomatik okunur
(`.claude/settings.json` içindeki `SessionStart` kancası).
Gün sonunda `/gunluk` yazarak yeni kayıt ekle.

Kısa tut — burası günlük değil, devir teslim notu.

---

## 2026-08-05

**Yapıldı**
- `.claude/` bağlam altyapısı kuruldu: `skills/lore` (canon haritası),
  `commands/lore-denetle`, `commands/gunluk`, `settings.json`.
- `DEFTER.md` açıldı; oturum başı kancasına bağlandı.
- `CLAUDE.md` içindeki ölü referans düzeltildi — "Açık Uçlar" diye bir bölüm
  `LORE.md`'de yok, doğrusu `## 3. İrade Sistemi` başındaki TASLAK uyarısı.

**Karar**
- Canon `LORE.md`, site verisi `data.js`. Yön hep aynı: önce lore, sonra veri.
- `LORE.md` bir daha baştan sona okunmayacak; `lore` becerisindeki tablodan
  ilgili bölüm bulunup sadece o okunacak.

**Kaldığımız yer**
- Bağlam altyapısının ikinci turu: alt ajan (`.claude/agents/`) ve izin
  listesinin genişletilmesi konuşulacak.
- Netleşmemiş canon: irade kademeleri (taslak), 81 derebeyi kadrosu,
  zaman çizelgesi.
