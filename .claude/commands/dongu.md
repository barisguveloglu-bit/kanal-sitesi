---
description: Beş döngüyü birlikte çalıştıran ana akış — planla, uygula, denetle, gerekirse sor
argument-hint: <hedef> (örn. "irade kademelerini LORE'daki son hâle güncelle")
---

# Birleşik Döngü

Hedef: **$ARGUMENTS**

Aşağıdaki beş döngü ayrı ayrı değil, iç içe çalışır. Her biri bir kat:

```
KAT 0  İnsan onayı      → kritik eşiklerde durur, Barış'a sorar
KAT 1  Orkestratör      → iş büyükse uzmanlara böler  (/orkestra)
KAT 2  Planla-Uygula    → alt görevlere ayırır, plana sadakati denetler
KAT 3  ReAct            → her adımda: oku → uygula → gözlemle → yeniden karar ver
KAT 4  Yansıt-İyileştir → çıktıyı dogrula.py'ye test ettirir, hatalıysa geri döner
```

## Başlamadan

1. `LORE.md` dosyasını oku. Hikayenin canon kaynağı orası — içerik işine
   oradan bakmadan başlama.
2. `CLAUDE.md` içindeki "Denetim sonrası eklenen kurallar" bölümünü oku.
   Oradakiler düzeltilecek eksik değil, bilinçli karar.
3. `python3 .claude/dogrula.py` çalıştır. Başlangıç durumu temiz mi gör —
   sonradan çıkan hata seninse ayırt edebilesin.

## KAT 2 — Planla-Uygula

**Önce hedefi çiviye as.** Çok adımlı bir işse (3+ alt görev):

```
python3 .claude/hedef.py ac --hedef "$ARGUMENTS" --teslim "<ne teslim edilecek>" \
    --basari "<bittiğini gösteren ölçüt>" --degismez "<bozulmayacak kural>"
```

Hedefin parmak izi alınır. Bundan sonra **plan değişebilir, hedef
değişemez** — aradaki farkı tutan bir şey yoksa "planı güncelledim"
demek "hedefi değiştirdim" demenin kibar hâli olur.

Sonra hedefi ağaca böl — düz liste değil, büyük aşama → alt görev:

```
python3 .claude/hedef.py dal --ne "<büyük aşama>"
python3 .claude/hedef.py dal --ust 1 --ne "<alt görev>"
python3 .claude/hedef.py basla --id 2
```

Her alt görev bittiğinde:

```
python3 .claude/hedef.py tamam --id 2
python3 .claude/hedef.py kontrol      # hâlâ hedefe mi hizmet ediyorum?
```

`kontrol` çıkış kodu **1 ise dur ve oku.** Hedef kaymış olabilir, bir
görev takılmış olabilir, onay bekleyen sapma olabilir.

Planı değiştirmen gerekirse **sessizce yapma, kaydet:**

```
python3 .claude/hedef.py sapma --ne "<ne değişti>" --neden "<neden>" [--onay-gerekli]
```

## KAT 3 — ReAct

Her alt görev içinde şu turu döndür:

1. **Gözlem** — ilgili dosyayı oku. Tahmin etme, bak.
   Canon'a dair bir şey gerekiyorsa `python3 .claude/ara.py "<soru>"` ile
   dayanağı satır numarasıyla getir. Hafızandan canon iddiası kurma —
   adres veremediğin cümleyi yazma.
2. **Akıl yürütme** — bu veri planı doğruluyor mu? Beklediğin şey mi çıktı?
3. **Eylem** — tek bir düzenleme yap. Aynı anda beş dosyaya dokunma.
4. **Yeni gözlem** — sonucu doğrula, bir sonraki adımı buna göre yeniden kur.

Bir gözlem planı yanlışlıyorsa planı düzelt, gözlemi görmezden gelme.

## KAT 4 — Yansıt-İyileştir

Her alt görev sonunda `python3 .claude/dogrula.py` çalıştır.
(Düzenleme kancası bunu zaten otomatik tetikler; sen yine de kapanışta çalıştır.)

Hata varsa: düzelt → tekrar çalıştır. Sınır **yazılı değil mekanik** —
her düzeltme turundan önce:

```
python3 .claude/devre.py dene --halka duzeltme --sinir 3 --not "<ne denenecek>"
```

Çıkış kodu **1 ise DUR.** Başka bir açıdan denemeye kalkma; KAT 0'a çık ve
neyi çözemediğini söyle. Düzenleme kancası da aynı sayacı ayrıca tutuyor,
yani bu sınırı konuşarak geçemezsin.

İş bitince: `python3 .claude/devre.py basari --halka duzeltme`

Hedef açtıysan kapanışta: `python3 .claude/hedef.py kapat`

Denetleyicinin göremediği iki şey var, onları sen kontrol et:

- İçerik değiştiyse `LORE.md` ile `assets/js/data.js` anlamca senkron mu?
  (Betik sadece adların iki yerde geçtiğini görür, tutarlılığı göremez.)
- Arayüz metinleri Türkçe mi, değişken/fonksiyon adları Türkçe mi?

## KAT 0 — İnsan onayı

Şu eşiklerde **dur ve `AskUserQuestion` ile sor**:

| Eşik | Neden |
|---|---|
| `LORE.md` içeriği değişecek | Canon kaynağı — evrenin tek doğrusu |
| Renk paleti / kontrast değeri değişecek | Değerler ölçülerek belirlendi |
| Yeni sayfa eklenecek | 9 HTML + `sitemap.xml` elle güncellenecek |
| "Açık Uçlar"dan birine karar gerekiyor | İrade kademeleri, derebeyi isimleri, zaman çizelgesi Barış'ın kararı |
| Video/isim/tarih bilgisi eksik | **Uydurma.** Boş bırak, eksik olduğunu raporla |
| Commit / push | Yayına giden her adım |

Soru sorarken Barış telefondan bakıyor:
**en fazla 4 seçenek, kısa etiketler, tek soru.** Uzun kod bloğu basma.

## Kapanış

Bitince şunları söyle: ne yaptın, denetleyici ne dedi, neye dokunmadın
ve neden. Eksik bıraktığın bir şey varsa açıkça yaz — sessizce kapsam daraltma.

Barış bu turda bir cevabını düzelttiyse orada bırakma:
`/geri-bildirim <ne yanlıştı>` ile kaydet. Düzeltilip unutulan hata geri gelir;
kaydedilen hata bir daha sessizce geçemez.
