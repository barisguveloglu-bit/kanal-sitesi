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

## 4. Dayanak yoksa — önce bir kez daha ara

"Canon bunu söylemiyor" demeden önce aşağıdaki denemeyi yap. Her durumda
**en fazla bir** yeniden arama; ikincisi de boşsa dur.

Bu adım 30 soruluk bir deneme sınavından sonra eklendi. Önceki hâli
"arama hiçbir şey döndürmedi → soru bu evrenle ilgili değil" diyordu ve
bu **yanlıştı**: arama, cevabı canon'da olan soruları da boş döndürüyordu
(ağız dili, eş anlamlı kelime, ek yüzünden). Boş sonucu "konu dışı" diye
okumak, kendinden emin bir yanlış cevap üretiyordu.

**a) Arama hiçbir şey döndürmedi.** Soruyu **canon'un kendi kelimeleriyle**
bir kez yeniden yaz: ağız dilini yazı diline çevir, eş anlamlı bir kelimeyi
canon'da geçebilecek karşılığıyla değiştir, eki at ve kelimenin yalın
hâlini kullan, karakterin tam adını yaz. Yeniden arama da boşsa
→ soru bu evrenle ilgili değil.

**b) Dayanak geldi ama cevap içinde yok.** Soru iki şey arasındaki bir
**ilişkiyi** soruyorsa ("X'i kim koruyor", "X kimin emrinde"), ilişki
yalnızca **karşı tarafın** bölümünde yazılı olabilir: "A → B" diye yazılmış
bir satır A'nın bölümünde durur ve B'nin bölümünde A'nın adı hiç geçmeyebilir.
İlişki fiilini tek başına ara. Yine yoksa → soru konu içinde, canon susuyor. Örnek:
"Barış'ın kız kardeşi kim" sorusunda aile bölümü gelir ama kız kardeş
geçmez.

**c) Dayanak yalnız `data.js`'ten geldi.** `data.js` canon'dan türetilmiş
site verisi, canon'un kendisi değil — adres olarak verilemez. Aynı bilgiyi
karakterlerin **tam adlarıyla** `LORE.md`'de ara ve oradaki satırı adresle.
`LORE.md`'de yoksa bu bir senkron hatası olabilir: söyle.

Denemeden sonra hâlâ dayanak yoksa cevap: **"Canon bunu söylemiyor."**
Boşluğu doldurma.

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
