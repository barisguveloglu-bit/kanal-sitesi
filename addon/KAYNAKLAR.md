# Kaynaklar ve İzinler

Bu dosya, eklentide **başkasının emeğinden gelen ne varsa** onu ve
hangi izinle geldiğini kaydeder.

Kullanıcı (depo sahibi) kullandığımız modların yapımcılarına tek tek
ulaştı — kendi sözüyle **bir yılını** buna harcadı — ve izin aldı.
Bu dosya o izinlerin kaydı.

---

## Depoda BULUNAN dış varlıklar

Bugün eklentide taşınan tek dış varlık kümesi bu:

### `shout` 1.0.0 — dönüşüm nidaları

| | |
|---|---|
| ne | 11 `.ogg` ses, her Ben 10 uzaylısına bir tane |
| nerede | `Simsek_Kol_Kaynak/sounds/nida/` |
| bağlandığı yer | `BEN10_NIDA` (ayarlar.js) → dönüşüm anında çalıyor |
| izin | **Yapımcısından alındı, paylaşılabilir.** |

Dosyalar kaynaktan **birebir** kopyalandı (md5 ile doğrulandı),
yeniden kodlanmadı. Kaynaktaki komut şuydu:

```
playsound shout:<uzaylı> master @a[distance=..15]
```

Bizde karşılığı `ben10.js` içindeki `donusumSahnesi()`.

---

## Depoda BULUNMAYAN ama ölçümü alınan modlar

Aşağıdakilerden **hiçbir dosya** alınmadı; yalnızca sayılar ve
mekanik fikirler okunup **kendi kodumuzla** yeniden yazıldı.
Her birinin ölçümü kendi `REFERANS_*.md` dosyasında.

| mod | yapımcı | belge |
|---|---|---|
| AlienEvo (Ben 10) | Habb and Stephen | `REFERANS_BEN10.md` |
| Pinnacle of Evolution | Gorrini | `REFERANS_BEN10.md` |
| Ionstrike (Max Steel) | Bionic | `REFERANS_IONSTRIKE.md` |
| Symbiote | kitigawa | `REFERANS_SIMBIYOT.md` |
| NarutoMod | AHZNB | `REFERANS_NARUTO.md` |
| Iron Man Add-on | Mr. Nido | `REFERANS_IRONMAN.md` |
| NPA | KID_SKY | `REFERANS_NPA.md` |
| Craftformers Prime | Bit & Byte | `REFERANS_TFP.md` |
| GeckoLib | (MIT) | `REFERANS_GECKOLIB.md` |

Diğer `REFERANS_*.md` dosyaları da aynı düzende.

---

## Kural

1. **Ölçüm serbest, dosya izinli.** Bir mekaniğin sayısını okuyup
   kendi uygulamamızı yazmak her zaman serbest. Dosya kopyalamak
   yapımcının açık iznini ister.
2. **İzin yazılır.** Bir varlık depoya giriyorsa buraya satırı
   eklenir: ne, nereden, hangi izinle.
3. **İzin yapımcının kendi emeğini kapsar.** Marka katmanı
   (Ben 10 → Cartoon Network, Iron Man → Marvel, Transformers →
   Hasbro) ayrı bir konudur ve onu mod yapımcısı veremez.
   Bu satır bir uyarı değil, bir kayıt: depo sahibi bunu biliyor
   ve kişisel kullanım için karar verdi.
4. **Kısıtlı izin yerelde durur.** Yalnız kişisel kullanıma izin
   verilmiş varlıklar `addon/yerel/` altına konur ve commit'lenmez
   (bkz. CLAUDE.md "Yerel varlık kolu"). Paylaşılabilir izinliler
   depoya girer — buradaki `shout` gibi.
