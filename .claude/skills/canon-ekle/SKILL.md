---
name: canon-ekle
description: Kanlı Göz evrenine hikaye içeriği eklerken veya değiştirirken kullanılır — yeni karakter, güç, irade kademesi, komutan, il derebeyi, icraat, efsane detayı ya da mevcut bir tanımın düzeltilmesi. LORE.md ile assets/js/data.js arasındaki sırayı ve senkronu korur. Bir ismin, gücün veya olayın doğru olup olmadığı sorulduğunda da kullanılır.
---

# Canon içerik ekleme

Bu depoda hikaye iki yerde yaşıyor ve **ikisi ayrışırsa site yalan söyler.**
`LORE.md` tek doğru kaynak, `assets/js/data.js` onun siteye basılan hâli.

## Sıra — bozma

1. **Önce `LORE.md`.** İlgili bölümü bul ve orayı güncelle. Yeni bir şey
   uyduruyorsan değil, karar verilmiş bir şeyi yazıyorsan buraya yazılır.
2. **Sonra `assets/js/data.js`.** Aynı bilgiyi ilgili diziye yansıt.
3. **HTML'e dokunma.** Sayfalar sadece iskelet + `data-*` bağlama noktası.
   Yeni bir sayfa gerekiyorsa bu skill değil, `sayfa-ekle` skill'i.

Ters sıra çalışmaz: `data.js`'e yazıp `LORE.md`'i atlarsan bir sonraki
oturum canon'u eski hâliyle okur ve senin eklediğini hata sanıp geri alır.

## Hangi bilgi hangi diziye

| İçerik | `LORE.md` bölümü | `data.js` |
|---|---|---|
| Karakter | 4 | `KARAKTERLER` |
| İrade kademesi | 3 | `IRADE_KADEMELERI` |
| Mafya tepesi | 5 | `MAFYA_TEPE` |
| Cephe komutanı ve gücü | 5 | `KOMUTANLAR` |
| Komutanlar arası çekişme | 5 | `KOMUTAN_CEKISMESI` |
| İl derebeyi | 5 | `IL_DEREBEYLERI` |
| Karakterin yaptığı iş | — | `ICRAATLER` |
| Evrenin özeti / neden | 1 | `SEBEPLER` |
| Şu anki durum | 1 | `DURUM` |

`TARAF_ETIKET` taraf isimlerinin görünen karşılığı — yeni bir taraf
eklemedikçe dokunma.

## Kurallar

- **Uydurma yok.** Kararı verilmemiş bir şeyi doldurma. Emin değilsen
  `LORE.md` bölüm 10 "Açık Uçlar"a bak; orada açık yazıyorsa açık bırak ve
  kullanıcıya sor.
- **Türkçe.** Görünen metin de, alan ve değişken isimleri de.
- Derebeyi eklerken cephenin mitolojisine uy: batı = Yunan, orta = Hitit /
  Anadolu, doğu = Pers. `komutan` alanı `"bati" | "orta" | "dogu"`.
- Bir uç kapandıysa `LORE.md` bölüm 10'daki maddeyi "Kapanan uçlar"a taşı.

## Bitirmeden önce doğrula

```bash
# data.js sözdizimi bozulmadı mı (derleme adımı yok, tek kontrol bu)
node --check assets/js/data.js

# 81 derebeyi iki dosyada birebir eşleşiyor mu — çıktı yoksa temiz
diff <(grep -oE '^\| [0-9]+ \| [^|]+ \| \*\*[^*]+\*\*' LORE.md \
        | sed -E 's/^\| ([0-9]+) \| [^|]+ \| \*\*([^*]+)\*\*/\1 \2/' | sort -n) \
     <(grep -oE 'plaka: [0-9]+, il: "[^"]+", komutan: "[^"]+", ad: "[^"]+"' assets/js/data.js \
        | sed -E 's/plaka: ([0-9]+).*ad: "([^"]+)"/\1 \2/' | sort -n)
```

Derebeyi dışındaki içerik için otomatik kontrol yok: eklediğin ismin
**her iki dosyada da** geçtiğini `grep` ile teyit et. Tek dosyada
geçiyorsa iş bitmemiştir.
