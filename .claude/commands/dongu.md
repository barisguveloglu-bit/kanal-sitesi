---
description: Beş döngüyü birlikte çalıştıran ana akış — planla, uygula, denetle, gerekirse sor
argument-hint: <hedef> (örn. "irade kademelerini LORE'daki son hâle güncelle")
---

# Birleşik Döngü

Hedef: **$ARGUMENTS**

Aşağıdaki beş döngü ayrı ayrı değil, iç içe çalışır. Her biri bir kat:

```
KAT 0  İnsan onayı      → kritik eşiklerde durur, Barış'a sorar
KAT 1  Orkestratör      → iş büyükse uzmanlara böler  (/orkestra)
KAT 2  Planla-Uygula    → alt görevlere ayırır, plana sadakati denetler
KAT 3  ReAct            → her adımda: oku → uygula → gözlemle → yeniden karar ver
KAT 4  Yansıt-İyileştir → çıktıyı dogrula.py'ye test ettirir, hatalıysa geri döner
```

## Başlamadan

1. `LORE.md` dosyasını oku. Hikayenin canon kaynağı orası — içerik işine
   oradan bakmadan başlama.
2. `CLAUDE.md` içindeki "Denetim sonrası eklenen kurallar" bölümünü oku.
   Oradakiler düzeltilecek eksik değil, bilinçli karar.
3. `python3 .claude/dogrula.py` çalıştır. Başlangıç durumu temiz mi gör —
   sonradan çıkan hata seninse ayırt edebilesin.

## KAT 2 — Planla-Uygula

Hedefi 3–7 alt göreve böl. Her alt görev için tek satırda yaz:
ne değişecek, hangi dosyada, nasıl doğrulanacak.

`TaskCreate` ile listeye geçir. Bu liste plandır; **plan sabittir**.
Her alt görev bittiğinde şunu kendine sor:

> Yaptığım şey hâlâ asıl hedefe mi hizmet ediyor, yoksa yan bir yola mı saptım?

Sapma varsa iki seçenek var — geri dön, ya da KAT 0'a çıkıp planı
değiştirmek için izin iste. Sessizce plan değiştirme.

## KAT 3 — ReAct

Her alt görev içinde şu turu döndür:

1. **Gözlem** — ilgili dosyayı oku. Tahmin etme, bak.
2. **Akıl yürütme** — bu veri planı doğruluyor mu? Beklediğin şey mi çıktı?
3. **Eylem** — tek bir düzenleme yap. Aynı anda beş dosyaya dokunma.
4. **Yeni gözlem** — sonucu doğrula, bir sonraki adımı buna göre yeniden kur.

Bir gözlem planı yanlışlıyorsa planı düzelt, gözlemi görmezden gelme.

## KAT 4 — Yansıt-İyileştir

Her alt görev sonunda `python3 .claude/dogrula.py` çalıştır.
(Düzenleme kancası bunu zaten otomatik tetikler; sen yine de kapanışta çalıştır.)

Hata varsa: düzelt → tekrar çalıştır. **En fazla 3 tur.** Üçüncü turda
hâlâ kırmızıysa dur ve KAT 0'a çık — kendi kendine debug etmeye devam etme,
neyi çözemediğini söyle.

Denetleyicinin göremediği iki şey var, onları sen kontrol et:

- İçerik değiştiyse `LORE.md` ile `assets/js/data.js` anlamca senkron mu?
  (Betik sadece adların iki yerde geçtiğini görür, tutarlılığı göremez.)
- Arayüz metinleri Türkçe mi, değişken/fonksiyon adları Türkçe mi?

## KAT 0 — İnsan onayı

Şu eşiklerde **dur ve `AskUserQuestion` ile sor**:

| Eşik | Neden |
|---|---|
| `LORE.md` içeriği değişecek | Canon kaynağı — evrenin tek doğrusu |
| Renk paleti / kontrast değeri değişecek | Değerler ölçülerek belirlendi |
| Yeni sayfa eklenecek | 9 HTML + `sitemap.xml` elle güncellenecek |
| "Açık Uçlar"dan birine karar gerekiyor | İrade kademeleri, derebeyi isimleri, zaman çizelgesi Barış'ın kararı |
| Video/isim/tarih bilgisi eksik | **Uydurma.** Boş bırak, eksik olduğunu raporla |
| Commit / push | Yayına giden her adım |

Soru sorarken Barış telefondan bakıyor:
**en fazla 4 seçenek, kısa etiketler, tek soru.** Uzun kod bloğu basma.

## Kapanış

Bitince şunları söyle: ne yaptın, denetleyici ne dedi, neye dokunmadın
ve neden. Eksik bıraktığın bir şey varsa açıkça yaz — sessizce kapsam daraltma.
