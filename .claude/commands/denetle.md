---
description: Yansıt-İyileştir turu — siteyi kurallara karşı test eder, bulduğunu düzeltir
argument-hint: [düzelt] — "düzelt" yazmazsan sadece rapor verir
allowed-tools: Bash(python3 .claude/dogrula.py:*), Bash(git diff:*), Bash(git status:*), Read, Grep, Glob
---

# Denetle

Argüman: **$ARGUMENTS**

Yansıtma katmanı. Kendi çıktını kendin beğenmek denetim değildir —
harici kural setine test ettir.

## 1. Makine denetimi

```
python3 .claude/dogrula.py
```

Dokuz başlık denetlenir: `menu`, `harita`, `gizleme`, `odak`, `defer`,
`sahte`, `video`, `kontrast`, `lore`.
Tek başlık için: `python3 .claude/dogrula.py kontrast`

Çıkış kodunu oku, sadece metni değil:

| Kod | Anlamı | Ne yapacaksın |
|---|---|---|
| `0` | Temiz | Devam |
| `1` | Kural ihlali | Düzelt |
| `3` | **İnsan kapısı** | Düzeltme — **sor.** Betik bunun doğru olduğunu doğrulayamıyor |

Kod `3` genelde `video` denetiminden gelir: `VIDEOLAR`'a yeni bir kimlik
girmiştir. Biçimi geçerli bir kimlik uydurma da olabilir; betik ikisini
ayıramaz. Barış onaylamadıysa o satırı geri al.

## 2. Betiğin göremediği şeyler

Bunları elle kontrol et — otomatikleştirilemeyen kısım bu:

- **Canon tutarlılığı** — `LORE.md` ile `assets/js/data.js` sadece aynı
  adları içermiyor, aynı şeyi mi söylüyor? (Güçler, tır sayıları, taraflar.)
- **Sahte içerik** — sayfada "yakında", örnek başlık, uydurma tarih,
  var olmayan bağlantı var mı? Boş olması gereken yer boş mu?
- **Dil** — arayüz metinleri Türkçe mi? Yeni değişken/fonksiyon adları
  Türkçe mi, mevcut düzene uyuyor mu?
- **JS'siz hâl** — eklenen bir şey JavaScript yüklenmezse kayboluyor mu?
  Menü her HTML'de yazılı kalmalı.
- **Gizleme** — yeni gizleme `hidden` özniteliğiyle mi yapılmış,
  `opacity: 0` ile mi? İkincisi hareket azaltmada kalıcı görünmezliktir.

## 3. Raporla

Bulduklarını iki listede ver:

- **Hata** — kural ihlali, düzeltilmeli.
- **Bilinçli** — kurala aykırı görünen ama `CLAUDE.md`'de gerekçesi
  yazılı olan şeyler. Bunlara **dokunma**, sadece "bu bilerek böyle" diye geç.

## 4. Düzeltme

Argümanda `düzelt` yazıyorsa hataları gider, sonra denetimi tekrar çalıştır.
**En fazla 3 tur.** Üçüncüde hâlâ kırmızıysa dur ve neyi çözemediğini söyle —
kendi kendine döngüde kalma.

Argümanda `düzelt` yoksa hiçbir dosyayı değiştirme, sadece raporla.
