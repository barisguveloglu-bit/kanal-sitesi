---
description: LORE.md ile data.js arasındaki tutarsızlıkları bul (değiştirme, sadece raporla)
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git log:*), Bash(git status:*)
---

Canon (`LORE.md`) ile sitenin verisi (`assets/js/data.js`) arasındaki
tutarsızlıkları bul.

**Hiçbir şey değiştirme.** Bu bir denetim; çıktısı rapor.

Bakılacaklar:

1. **Karakterler.** `LORE.md` → `## 4. Karakterler` altındaki her karakter
   `data.js` → `KARAKTERLER` içinde var mı? Adlar, güçler ve "oynanan karakter"
   işaretleri örtüşüyor mu?
2. **Komutanlar ve cepheler.** `## 5. Mafya Yapısı` ile `KOMUTANLAR`,
   `MAFYA_TEPE`, `KOMUTAN_CEKISMESI` örtüşüyor mu? Cephe–mitoloji eşlemesi
   doğru mu (Batı–Nemesis/Yunan, Orta–Teşup/Hitit, Doğu–Ahriman/Pers)?
3. **Derebeyleri.** `### 81 il derebeyi` ile `IL_DEREBEYLERI` — hangi iller
   iki yerde de var, hangileri sadece birinde?
4. **İrade kademeleri.** `## 3. İrade Sistemi` tablosu ile `IRADE_KADEMELERI`
   aynı sayıda ve aynı adlarda mı?
5. **Şu anki durum.** `DURUM` içindeki özet ve sızan cümle canon ile çelişiyor mu?
6. **Ölü referans.** `CLAUDE.md`, `README.md` ve `TASARIM.md` içinde `LORE.md`'de
   artık bulunmayan bir bölüme yapılan atıf var mı?

Ayrıca değişmez kuralların çiğnendiği yer var mı diye bak — `lore` becerisindeki
"Değişmez kurallar" listesi.

Raporu şöyle ver:

- **Çelişki** — iki yer birbirini yalanlıyor. Hangisi doğru, önerin ne?
- **Eksik** — canon'da var, sitede yok (ya da tersi).
- **Ölü referans** — var olmayan bir şeye işaret eden satır. Dosya:satır ver.

Bulgu yoksa "tutarlı" de ve geç. Bulgu uydurma.
