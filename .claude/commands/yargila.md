---
description: LLM-as-judge halkası — cevapları önce mekanik, sonra nitel olarak yargılar
argument-hint: [hizli] — "hizli" yazarsan sadece mekanik yargı
---

# Yargıla (cevap kalitesi)

Argüman: **$ARGUMENTS**

`/degerlendir` aramanın doğru yeri bulup bulmadığını ölçer.
Bu komut bir adım ötesini ölçer: **doğru parça geldiğinde doğru cevap
verildi mi?** Doğru bölümü getirip yine de yanlış okumak, fazla iddia
etmek ya da canon'un sustuğu yerde konuşmak mümkün.

## Yargıcın kendini yargılaması sorunu

Bir modelin kendi cevabını beğenmesi, bu sistemin en baştan kaçtığı tuzak.
"LLM yargılasın" demek tek başına bunu çözmez — yargıç da aynı model.
Bu yüzden üç ayırma kuralı var, üçü de zorunlu:

1. **Cevaplayan altın gerçekleri görmez.** `hazirla` sadece soruları verir.
2. **Cevaplayan ayrı bir bağlamda çalışır** — `Agent` ile alt ajan.
   Aynı oturumda cevaplarsan doğruları zaten biliyorsundur, ölçüm çöp olur.
3. **Mekanik yargı önce gelir.** Güzel yazılmış ama uydurma bir cevap,
   kötü yazılmış doğru cevaptan beterdir.

## 1. Soruları hazırla

```
python3 .claude/yargi.py hazirla > /tmp/sorular.json
```

## 2. Cevaplat — ayrı bağlamda

`Agent` ile bir alt ajan başlat. Göreve şunları koy:

- `/tmp/sorular.json` içindeki her soruyu cevapla.
- Her soru için **önce** `python3 .claude/ara.py "<soru>"` çalıştır.
- Sadece gelen dayanağa göre cevapla. Hafızandan canon iddiası kurma.
- Dayanak yoksa ya da geldiği hâlde cevabı içermiyorsa **reddet**:
  `reddetti: true` ve cevapta uydurma yapma.
- Çıktıyı `/tmp/cevaplar.json` olarak şu biçimde yaz:

```json
[{"no": 1, "cevap": "...", "atiflar": ["LORE.md:201"], "reddetti": false}]
```

Alt ajana altın gerçekleri, beklenen satırları ya da bu dosyayı **verme.**

## 3. Mekanik yargı

```
python3 .claude/yargi.py puanla --dosya /tmp/cevaplar.json --not "<kısa not>"
```

Oynanamayan dört ölçü:

| Ölçü | Ne yakalar |
|---|---|
| Atıf geçerliliği | Uydurma satır numarası, dosya sınırı dışı atıf |
| Atıf isabeti | Cevabın geçtiği satırı gerçekten gösteriyor mu |
| Gerçek kapsama | Altın gerçek cevapta geçiyor mu |
| **Uydurma** | Canon susarken konuştu mu — **sıfır olmak zorunda** |

Uydurma varsa **dur.** Nitel yargıya geçme, önce onu çöz.

## 4. Nitel yargı (LLM kısmı)

Mekanik temizse, mekaniğin göremediklerine bak. Her cevap için:

- **Karşılıyor mu?** Doğru gerçeği içeriyor ama soruyu cevaplıyor mu?
  ("Kaç tır?" sorusuna karakterin hikayesini anlatmak geçerli değil.)
- **Fazla iddia var mı?** Canon'un söylemediği bir sonucu çıkarım gibi
  sunmuş mu? Çıkarımsa "bu benim yorumum" demeli.
- **Spoiler kaçmış mı?** Rota açıklamaları spoilersız olmalı.
- **Dil doğru mu?** Arayüze girecek bir metinse Türkçe ve mevcut tonda mı?

Her kusur için: soru numarası, ne yanlış, tek cümle gerekçe.
Emin olmadığında "geçti" deme — **kararsızlık kusurdur**, yargıç
şüpheliyi aklamaz.

## 5. Halkayı kapat

Bulunan her kusuru deftere yaz — yoksa bir dahaki sefere aynısı olur:

```
python3 .claude/geri-bildirim.py ekle --tur <tür> --soru "..." \
    --yanlis "..." --dogru "..." --kaynak LORE.md:<satır>
python3 .claude/geri-bildirim.py isle
```

Sonra gerilemeyi izle:

```
python3 .claude/yargi.py gecmis
```

## 6. Raporla

Barış telefondan bakıyor. Şu üçü yeter: mekanik kaç/kaç, uydurma sayısı
(sıfır değilse en üste yaz), nitel kusurların kısa listesi.
26 cevabı olduğu gibi basma.
