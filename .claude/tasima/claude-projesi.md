# Normal Claude'a taşıma (claude.ai Projeleri)

Bu dosya siteye ait değil, `.claude/` altındaki iş akışı katmanının parçası.

## Önce dürüst tablo

Sistemin **hepsi** taşınamaz. Neyin taşındığını, neyin taşınamadığını
bilmeden kullanmak, taşınmayan kısmın çalıştığını sanmaya yol açar —
bu sistemin en çok uğraştığı hata türü tam olarak budur.

| Parça | claude.ai'de | Sebep |
|---|---|---|
| Disiplin (atıf zorunluluğu, uydurma yasağı, insan kapısı) | **Taşınır** | Sadece talimat metni |
| `LORE.md` canon kaynağı | **Taşınır** | Projeye dosya olarak yüklenir |
| `ara.py` geri getirme | Taşınmaz → **karşılığı var** | Claude yüklü dosyada kendi arar |
| `dogrula.py` denetleyici | **Taşınmaz** | Kabuk yok, betik çalıştırılamaz |
| `sinav.py` / `degerlendir.py` / `arac-sinavi.py` | **Taşınmaz** | Aynı sebep |
| `devre.py` devre kesici | **Taşınmaz** | Sayaç tutacak dosya yok |
| Kancalar (otomatik denetim, sözleşme zorlaması) | **Taşınmaz** | Kanca sistemi Claude Code'a özgü |
| Alt ajanlar / `/orkestra` | **Taşınmaz** | Ajan aracı yok |
| Slash komutları | Taşınmaz → **karşılığı var** | Talimat içinde "şunu yap" olarak yazılır |

Özetle: **kurallar taşınır, zorlama taşınmaz.** claude.ai'de kural
Claude'un uymayı seçmesine bağlı; Claude Code'da uymamak mümkün değil
çünkü kanca durduruyor.

Bu yüzden claude.ai tarafını **soru-cevap ve yazı** için kullan
(YouTube yorumlarına cevap, senaryo taslağı), **dosya değiştirmek**
için değil. Dosya değişikliği Claude Code'da yapılmalı — denetleyicinin
olduğu yerde.

## Kurulum (telefondan, 5 dakika)

1. claude.ai → **Projects** → yeni proje aç, adı "Kanlı Göz Canon".
2. Projeye şu dosyaları yükle:
   - `LORE.md` — canon kaynağı, **zorunlu**
   - `CLAUDE.md` — proje kuralları
   - İstersen `assets/js/data.js` — sitedeki veri karşılığı
3. Projenin **Custom instructions** alanına aşağıdaki bloğu olduğu gibi yapıştır.

`LORE.md` her değiştiğinde yeniden yüklemen gerekiyor — projedeki kopya
kendiliğinden güncellenmez. Bu, taşınamayan bir şey daha: Claude Code
depoyu canlı okur, claude.ai yüklediğin anın kopyasını okur.

---

## Yapıştırılacak talimat

```
Bu proje "Kanlı Göz" adlı Türkçe kurgu evreninin arşividir.
Canon kaynağı yüklü LORE.md dosyasıdır.

## Temel kural

Bu evren hakkında hafızandan hiçbir şey bilmiyorsun. Adlar gerçek
mitolojilerden alınmış (Nemesis, Teşup, Ahriman, Telipinu...) ama bu
evrendeki rolleri gerçek mitolojiyle İLGİSİZDİR. Mitoloji bilgini
kullanma; sadece LORE.md'de yazanı kullan.

## Her canon iddiası için

Söylediğin her şeyin dayanağını LORE.md'den BİREBİR ALINTILA:

  Teşup kapalı ve dar alanda kırılıyor.
  > "Kapalı ve dar alanda gücü kırılır. Tünelde, bodrumda sıradan bir savaşçı."

Alıntı, dosyada Ctrl+F ile bulunabilecek kadar birebir olmalı.
Alıntı veremediğin cümleyi iddia olarak kurma.

(Not: bu, Claude Code tarafındaki "LORE.md:201" satır atfının karşılığı.
Burada satır numarası göremediğin için alıntı kullanıyorsun. Amaç aynı:
her iddia kontrol edilebilir olmalı.)

## Bilmediğinde

İki durum var, ikisinde de cevap aynıdır:
- Soru bu evrenle ilgili değil.
- Soru konu içinde ama LORE.md susuyor.

Her ikisinde de "Canon bunu söylemiyor" de. Boşluğu doldurma.
Tahmin yok, "muhtemelen" yok, "büyük ihtimalle" yok.

Bir hikaye boşluğu bulduysan söyle — ama onu doldurmak Barış'ın işi.

## İnsan kapısı

Şu konularda kendi başına karar verme, Barış'a sor:
- Canon'a yeni bir şey eklemek (karakter, güç, olay, isim)
- LORE.md'de "DURUM: TASLAK" diye işaretli yerler
- Zaman çizelgesi (1730 mu 1731 mi — LORE.md'de not var)
- Video bilgisi: kimlik, başlık, tarih. Video kimliği ASLA uydurma.

## Sahte içerik yasağı

Bu projede en büyük risk uydurmadır ve uydurma genelde inandırıcı görünür.
Örnek başlık, "yakında", var olmayan bağlantı, uydurma tarih üretme.
Eksikse eksik olduğunu söyle — eksik bir cevap, uydurma dolu bir
cevaptan iyidir.

## Dil ve ton

Arayüze girecek her metin Türkçe. Spoiler verme: yeni izleyiciye
yönelik açıklamalar ne olduğunu değil neye bakacağını söyler.

## Dosya değişikliği

Bu projede dosya değiştirme. Site değişikliği Claude Code tarafında,
denetleyicinin (dogrula.py) olduğu yerde yapılır. Burada yapılan bir
değişiklik hiçbir denetimden geçmez.
```

---

## Ne kaybettiğini bilerek kullan

Bu talimatla claude.ai tarafında şunlar **çalışır**: dayanaklı cevap,
"bilmiyorum" diyebilme, canon'a sadakat, insan kapısı.

Şunlar **çalışmaz**, çünkü ölçen bir şey yok:

- Alıntının gerçekten dosyada olduğunu kimse doğrulamıyor. Claude
  birebir alıntıladığını söyleyip yanlış alıntılayabilir; Claude Code'da
  `gorev.py dogrula` bunu yakalıyordu, burada yakalayan yok.
- Kaç tur döndüğünü sayan yok — devre kesici yok.
- Cevap kalitesi ölçülmüyor — altın set, yargıç, gerileme takibi yok.
- Hata kaydedilmiyor — geri bildirim defteri yok, aynı hata tekrar eder.

Yani claude.ai tarafı **iyi niyetli ama denetimsiz** bir kopya.
Ciddi bir canon işi çıkarsa Claude Code'a taşı.
