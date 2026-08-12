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

**2 — Dağıt.** Her parçayı bir `Agent` ile gönder. Bağımsız olanları
**aynı anda** başlat. Her göreve şunları koy:

- Uzmanın okuması gereken dosyalar (`LORE.md`, `CLAUDE.md` dahil —
  ajan bunları bilmiyor)
- Somut, dar bir soru veya görev
- İstenen çıktı biçimi
- **"Bilgi eksikse uydurma, eksik olduğunu raporla"** — bu cümleyi
  her göreve koy. Sahte içerik bu projede en büyük risk.

Araştırma/denetim işleri için `Explore`, çok adımlı işler için
`general-purpose` uygun.

**3 — Birleştir.** Gelen sonuçları oku ve şunları ara:

- **Çelişki** — iki uzman aynı şey için farklı şey söylüyor mu?
- **Boşluk** — sorulan ama cevaplanmamış kısım var mı?
- **Uydurma** — ajan raporunu olduğu gibi yutma. İddia ettiği şeyi
  dosyada kendin doğrula, özellikle isim/sayı/tarih söylüyorsa.

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
