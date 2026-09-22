---
description: Sistemin kendisini ölç — denetleyici sınavı + geri getirme evali
argument-hint: [hızlı] — "hızlı" yazarsan sadece özet
allowed-tools: Bash(python3 .claude/sinav.py:*), Bash(python3 .claude/degerlendir.py:*), Bash(python3 .claude/dogrula.py:*), Bash(python3 .claude/geri-bildirim.py:*), Read
---

# Değerlendir (dış halka)

Argüman: **$ARGUMENTS**

Diğer döngüler siteyi ölçer. Bu komut **döngülerin kendisini** ölçer.
Ölçülmeyen bir denetim, çalıştığını sandığın bir denetimdir.

## 1. Denetleyici sınavı

```
python3 .claude/sinav.py
```

Deponun kopyasına tek tek fay enjekte eder; her denetimin gerçekten
yakaladığını ve masum değişikliklere yanlış alarm vermediğini ölçer.

## 2. Araç sınavı

```
python3 .claude/arac-sinavi.py
```

Devre kesici, yargıç, geri bildirim ve kancayı geçici bir kopyada dener:
kesici sınırda kesiyor mu, yargıç eksik gönderimi yakalıyor mu, kapı
olayı sayacı boşuna artırıyor mu, bozuk bir araç denetimin tamamını
çökertiyor mu.

## 3. Mutasyon sınavı

```
python3 .claude/mutasyon.py
```

Araçları kasten bozup sınavın yakalayıp yakalamadığına bakar. Kaçan her
mutasyon, hiçbir testin korumadığı bir davranış demektir — testin var
olması yetmez, **canlı** olması gerekir. Yavaştır (~2 dk), her koşuda
değil; test eklendiğinde ve commit öncesi çalıştır.

## 4. Geri getirme evali

```
python3 .claude/degerlendir.py --ayrinti
```

Ölçülenler ve anlamları:

| Ölçü | Ne demek | Düşerse |
|---|---|---|
| `isabet@1/@3` | Doğru satır ilk / ilk üç sonuçta mı | Arama körleşti |
| `MRR` | Doğru sonuç ortalama kaçıncı sırada | Sıralama bozuldu |
| `gerçek kapsama` | Getirilen metin cevabı içeriyor mu | Doğru bölüm, yanlış parça |
| `konu dışı doğru` | Alakasız soruya susuyor mu | Uydurmanın kapısı açık |
| `sahte delil yok` | Cevapsız soruya sahte dayanak üretiyor mu | **En tehlikelisi** |

## 5. Açık geri bildirimler

```
python3 .claude/geri-bildirim.py listele
```

Otomatiğe çevrilemeyen kayıtlar insan işidir — canon düzeltmesi, yeni
denetim kuralı ya da komut değişikliği bekliyor olabilirler.

## 6. Düşen sayı ne demek

Bir ölçü eşiğin altına düştüyse üç ihtimal var, üçünü de ayır:

1. **Gerileme** — bir değişiklik sistemi bozdu. Düzelt.
2. **Kayma** — `LORE.md` düzenlendi, altın setteki satır numaraları kaydı.
   `altin-sorular.json` içindeki `satir` değerlerini güncelle.
3. **Vaka yeni** — geri bildirimden gelen bir vaka henüz düzeltilmedi.
   Bu **doğru** davranıştır; kırmızı kalması gerekiyor.

**Eşiği düşürerek yeşile döndürme.** Eşikler ölçülerek konuldu; indirilen
her eşik, testin ölçtüğü şeyi biraz daha azaltır.

## 7. Raporla

Barış telefondan bakıyor: sayıları tablo hâlinde ver, hangi ölçü düştü,
üç ihtimalden hangisi ve ne yapılması gerekiyor. Ham çıktıyı olduğu gibi basma.
