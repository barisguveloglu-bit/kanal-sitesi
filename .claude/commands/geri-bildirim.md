---
description: Bir hatayı kalıcı teste çevir — feedback döngüsünün giriş kapısı
argument-hint: <ne yanlıştı> (örn. "Teşup'un zaafını yanlış söyledin")
allowed-tools: Bash(python3 .claude/geri-bildirim.py:*), Bash(python3 .claude/degerlendir.py:*), Bash(python3 .claude/ara.py:*), Read, Grep
---

# Geri bildirim

Barış'ın söylediği: **$ARGUMENTS**

Bir hatanın en kötü hâli, düzeltilip unutulmasıdır — çünkü geri gelir.
Bu komut hatayı kalıcı bir teste çevirir. Model öğrenmez, **sistem öğrenir**;
ve sistemin hafızası git'te durduğu için yeni bir sohbette de orada olur.

## 1. Hatayı sınıflandır

| Tür | Ne oldu | Nereye gider |
|---|---|---|
| `geri-getirme` | Arama yanlış yeri getirdi | Altın sete vaka (otomatik) |
| `canon` | Cevap `LORE.md`'ye aykırıydı | `LORE.md`/`data.js` düzeltmesi (insan) |
| `kural` | Kural ihlali denetimden kaçtı | `dogrula.py`'ye yeni denetim (insan) |
| `davranis` | Döngü yanlış davrandı | Komut dosyası düzeltmesi (insan) |

Emin değilsen Barış'a `AskUserQuestion` ile sor — dört şık, kısa etiket.

## 2. Doğrusunu bul

Kaydetmeden önce doğru cevabın canon'da nerede olduğunu **bul**:

```
python3 .claude/ara.py "<ilgili soru>"
```

Adres olmadan kayıt yarım kalır; `geri-getirme` türü satır numarası olmadan
otomatik vakaya çevrilemez.

## 3. Kaydet

```
python3 .claude/geri-bildirim.py ekle --tur <tür> \
  --soru "<sorulan soru>" \
  --yanlis "<sistem ne üretti>" \
  --dogru "<ne üretmeliydi>" \
  --kaynak LORE.md:<satır>
```

`--yanlis` alanını yumuşatma. "Tam isabet değildi" yazarsan altı ay sonra
neyin bozuk olduğunu kimse anlamaz.

## 4. Vakaya çevir ve ölç

```
python3 .claude/geri-bildirim.py isle
python3 .claude/degerlendir.py
```

Yeni vakanın **kırmızı çıkması beklenir** — hata henüz düzeltilmedi.
Halkayı kapatan adım şu: düzelt, tekrar ölç, yeşile döndür.

Düzeltemiyorsan eşiği indirme, vakayı silme. Açık bırak ve Barış'a
neyin çözülemediğini söyle.

## 5. İnsan işi olanlar

`canon`, `kural` ve `davranis` kayıtları otomatiğe çevrilmez — çünkü
`LORE.md`'ye ne yazılacağı Barış'ın kararı, yeni denetim kuralı ise
yazılması gereken kod. Bunları `listele` ile açık tut, `/dongu` ile ele al.
