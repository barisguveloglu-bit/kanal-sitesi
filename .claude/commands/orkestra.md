---
description: Yönetici-uzman döngüsü — büyük işi uzman ajanlara böler, sonuçları birleştirir, eksik kalanı geri gönderir
argument-hint: <büyük hedef> (örn. "81 il derebeyi verisini LORE ile karşılaştır")
---

# Orkestra (yönetici + uzmanlar)

Hedef: **$ARGUMENTS**

## Önce: buna gerçekten gerek var mı?

Uzman ajan çağırmak pahalıdır ve her ajan sıfırdan başlar — senin
bildiklerini bilmez. Şu ikisinden biri doğru değilse **`/dongu` kullan,
bu komutu kullanma:**

- İş birbirinden bağımsız 3+ parçaya ayrılıyor (farklı dosyalar,
  birbirini beklemeyen işler).
- Parçalar farklı uzmanlık istiyor (içerik/canon denetimi ≠ CSS kontrastı
  ≠ veri tutarlılığı).

Tek dosyalık iş, küçük düzeltme, tek konu → orkestraya gerek yok.

## Döngü

**1 — Böl.** Hedefi bağımsız parçalara ayır. Her parça için yaz:
ne isteniyor, hangi dosyalar, hangi çıktı bekleniyor.

**2 — Dağıt.** Görev metnini **elle yazma, üret:**

```
python3 .claude/gorev.py brief --konu "<ne isteniyor>" --cikti "<beklenen çıktı>" --mod okuma
```

`--mod` ajanın **yetkisini** belirler ve varsayılan `okuma` (salt okunur).
Doğrulama görevleri her zaman `okuma` olmalı: bulmak ile düzeltmek ayrı
işlerdir, düzeltme kararı insanındır. `yazma` sadece gerçekten dosya
değişecekse — o modda bile `git commit` ve `git push` yasak.

Çıkan sözleşmeyi görevin başına koy, altına o parçaya özel ayrıntıları ekle.
Sonra `Agent` ile gönder; bağımsız olanları **aynı anda** başlat.

Sözleşme isteğe bağlı değil: `PreToolUse` kancası sözleşmesiz görevi
**göndermez**, eksik kavramları söyleyip geri çevirir. Bunun sebebi basit —
"ajana şunları söyle" bir yazıydı, yazı uygulanmayan kuraldır.

Araştırma/denetim işleri için `Explore`, çok adımlı işler için
`general-purpose` uygun.

**3 — Birleştir.** Önce raporu **makineye doğrulat**, sonra oku:

```
python3 .claude/gorev.py dogrula --rapor <dosya> --mod okuma --deftere-yaz
```

`--mod okuma` verirsen atıfların yanı sıra **yetki de denetlenir**: salt
okunur beyan edilen ajan depoya dokunmuşsa yakalanır. Bu harness alt
ajanın araçlarını kısıtlamaya izin vermiyor — yani gerçek ayrıcalık
ayrımı yapılamıyor; yapılabilen, beyanı sonradan sınamak.

Her atıfın gerçekten o satırı gösterip göstermediğine bakar. Ajan raporu
düzgün Türkçeyle gelir ve doğru **görünür**; en yaygın hata "dayanaklı
görünen ama atıfı cümleyi desteklemeyen" cümledir. `--deftere-yaz`
bulunan kusuru geri bildirim defterine düşürür — halka böyle kapanır.

Doğrulama geçtikten sonra sen de oku ve şunları ara:

- **Çelişki** — iki uzman aynı şey için farklı şey söylüyor mu?
- **Boşluk** — sorulan ama cevaplanmamış kısım var mı?
- **Adressiz iddia** — atıfsız gelen isim/sayı/tarih. Doğrulanamayan
  rapor delil değildir.

**4 — Yeniden gönder.** Çelişki veya boşluk varsa **yeni görev ver.**
Bu adım döngüyü döngü yapan şeydir; tek seferlik dağıtım yaparsan bu
bir iş akışıdır, döngü değil.

Yeniden göndermeden önce sınırı yokla — uzman ajanlar pahalıdır ve
sonsuz dağıtım maliyeti patlatır:

```
python3 .claude/devre.py dene --halka orkestra --sinir 2 --not "<hangi boşluk>"
```

Çıkış kodu **1 ise yeniden gönderme.** Elindekiyle devam et ve neyin
çözülemediğini açıkça söyle. Bitince: `python3 .claude/devre.py basari --halka orkestra`

**5 — Denetle.** Birleştirme bittiğinde `python3 .claude/dogrula.py`
çalıştır. Uzmanlar dosya değiştirdiyse bu şart.

## İnsan kapısı

Uzmanlardan gelen sonuç şunlardan birine dokunuyorsa uygulamadan önce
`AskUserQuestion` ile sor: canon değişikliği, renk değeri, yeni sayfa,
"Açık Uçlar" kararı, commit.

Barış telefondan bakıyor — **uzman raporlarını olduğu gibi basma.**
Özet ver: kaç parça, ne bulundu, ne karar gerekiyor.
