---
description: Sadece plan çıkarır — uygulamadan önce onay bekler (Planla-Uygula, insan kapısıyla)
argument-hint: <hedef>
---

# Planla (uygulama yok)

Hedef: **$ARGUMENTS**

Bu komut **hiçbir dosyayı değiştirmez.** Sadece plan üretir ve durur.
Telefondan bakarken önce ne olacağını görmek istediğinde bunu kullan.

## Yap

1. `LORE.md` ve `CLAUDE.md` oku. `python3 .claude/dogrula.py` ile
   mevcut durumu gör.
2. İlgili dosyaları oku — hangi dosyaların değişeceğini tahminle değil,
   bakarak belirle.
3. Hedefi 3–7 alt göreve böl.

## Planı şu biçimde sun

Her alt görev için tek satır, en fazla:

```
N. <ne olacak> — <hangi dosya> — <nasıl doğrulanacak>
```

Sonra ayrıca üç başlık:

- **İnsan kararı gereken yerler** — "Açık Uçlar"a değen, canon'a dokunan
  ya da bilgi eksikliği olan noktalar. Bunları uydurma, listele.
- **Dokunmayacaklarım** — hedefe yakın durup bilerek dışarıda bıraktığın şeyler.
- **Risk** — planın yanlış olabileceği yer.

## Sonra dur

Planı yazdıktan sonra `AskUserQuestion` ile tek soru sor:
plan onaylanıyor mu, değişsin mi, yoksa iptal mi.
En fazla 4 seçenek — Barış telefondan dokunacak.

Onay gelirse `/dongu <hedef>` ile uygulamaya geç.
