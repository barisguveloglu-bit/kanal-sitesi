---
description: Canon'a dayanaklı soru-cevap — her iddia LORE.md satırıyla kaynaklanır
argument-hint: <soru> (örn. "Teşup'un zaafı ne")
allowed-tools: Bash(python3 .claude/ara.py:*), Read, Grep
---

# Sor (dayanaklı cevap)

Soru: **$ARGUMENTS**

Bu evren hakkında hafızadan cevap verme. Hafıza uydurur; dosya uydurmaz.

## 1. Dayanak getir

```
python3 .claude/ara.py "$ARGUMENTS"
```

Gerekirse `--sayi 5` ile genişlet, `--tam` ile parçayı kısaltmadan gör.

## 2. Getirdiğini oku, kabul etme

Geri getirme **en yakın** parçayı verir, **doğru** parçayı değil. Gelen
metni gerçekten oku ve şunu sor: bu parça sorulan şeyi söylüyor mu, yoksa
sadece benzer kelimeler mi taşıyor?

Şüphe varsa `Read` ile o satırların etrafını aç. Adres zaten elinde.

## 3. Cevapla

Her canon iddiasının yanına adresini yaz:

> Teşup kapalı ve dar alanda kırılıyor; tünelde sıradan bir savaşçı.
> (`LORE.md:201`)

Adres veremediğin cümle, canon iddiası olarak kurulmamalı.

## 4. Dayanak yoksa

İki ayrı durum var, ikisini karıştırma:

- **Arama hiçbir şey döndürmedi** → soru bu evrenle ilgili değil.
- **Dayanak geldi ama cevap içinde yok** → soru konu içinde, canon susuyor.
  Örnek: "Barış'ın kız kardeşi kim" sorusunda aile bölümü gelir ama kız
  kardeş geçmez.

Her iki durumda da cevap aynı: **"Canon bunu söylemiyor."** Boşluğu doldurma.

Bu, hikaye için bir eksik olabilir — o zaman `LORE.md` sonundaki
"Açık Uçlar"a aday olarak söyle. Ama kendin karara bağlama, Barış'a sor.

## 5. Yanlış çıkarsa

Barış cevabın yanlış olduğunu söylerse bunu bir kez daha yaşamamak için kaydet:

```
python3 .claude/geri-bildirim.py ekle --tur geri-getirme \
  --soru "$ARGUMENTS" --yanlis "<ne dedim>" --dogru "<doğrusu>" --kaynak LORE.md:<satır>
```

Sonra `python3 .claude/geri-bildirim.py isle` — hata kalıcı bir test vakasına
dönüşür ve bir daha sessizce geçemez.
