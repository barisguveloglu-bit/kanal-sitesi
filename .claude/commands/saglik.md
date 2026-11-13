---
description: Tek komutla tam sağlık turu — bütün ölçümler, mandal ve eşiğin üstündeki gerileme
argument-hint: [hızlı] — "hızlı" yazarsan mutasyon sınavı atlanır
allowed-tools: Bash(python3 .claude/saglik.py:*), Bash(python3 .claude/mandal.py olc), Bash(python3 .claude/mandal.py kontrol), Bash(python3 .claude/geri-bildirim.py:*), Read
---

# Sağlık (dış halkanın tek komutu)

Argüman: **$ARGUMENTS**

Dört ölçümü ayrı ayrı hatırlamak gerekmez. Bu komut hepsini koşturur,
sonucu geçmişe yazar ve bir önceki kayıtla kıyaslar. Zamanlanmış bir işin
(Routine) çalıştıracağı komut budur.

## 1. Koş ve kaydet

Argüman "hızlı" ise:

```
python3 .claude/saglik.py --hizli --kaydet
```

Değilse:

```
python3 .claude/saglik.py --kaydet
```

Çıkış kodunu oku:

| Kod | Anlamı | Ne yapacaksın |
|---|---|---|
| `0` | Hepsi yeşil, gerileme yok | Kısa raporla, bitir |
| `1` | En az bir ölçüm kırmızı | Hangisi, neden — `/degerlendir` 6. adımdaki üç ihtimali ayır |
| `3` | İnsan kapısı | Onay bekleyen değişiklik, gevşeyen ölçü ya da eşiğin üstünde gerileme. **Düzeltme — sor** |

## 2. Gerileme varsa

Eşiği geçen ama önceki koşudan düşen bir ölçü "yeşil" sayılmaz.
`python3 .claude/saglik.py gecmis` ile eğilimi gör. Düşüş tek bir
değişikliğe bağlanabiliyorsa onu söyle; bağlanamıyorsa bu bir bulgudur,
Barış'a göster.

## 3. Mandal gevşediyse

```
python3 .claude/mandal.py kontrol
```

Gevşeyen ölçüyü (silinen vaka, düşen eşik, büyüyen sınır) **geri alma
kararı da onaylama kararı da senin değil.** Ne gevşediğini ve hangi
değişiklikle gevşediğini söyle, sor.

## 4. Raporla

Barış telefondan bakıyor. Tek tablo: ölçüm, durum, sayı. Altına en fazla
üç satır: ne düştü, neden, ne yapılmalı. Bekleyen geri bildirim kaydı
varsa (`python3 .claude/geri-bildirim.py listele`) sayısını ekle — onlar
insan kararı bekliyor.
