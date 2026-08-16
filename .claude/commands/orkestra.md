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

**1 — Böl ve havuza koy.** Kadroyu **elle sayma, hesaplat:**

```
python3 .claude/havuz.py ekle --is "<görev>" --zorluk 3 --kaynak assets/js/data.js
python3 .claude/havuz.py kadro
```

Kadro büyüklüğü sabit değil, **1-10 arası ve zorluktan çıkıyor.** İki kural
mekanik:

- **Aynı kaynağa dokunan görevler aynı ajana gider.** Ayrılırsa çakışırlar:
  ikisi de aynı satırı değiştirir, biri diğerini ezer ve bu ancak
  birleştirmede görünür. Zincirleme de sayılır.
- **Bağımsız görevler bölünür.** Birbirini beklemezler.

Yani hangi görevlerin toplanacağını **görev tipi** belirliyor, kadro değil.
Kapasiteyi aşan bölünemez küme sessiz kalmaz, raporlanır.

**2 — Dağıt.** Görev metnini **elle yazma, üret:**

```
python3 .claude/havuz.py dagit          # havuzdaki her ajan için sözleşme
python3 .claude/gorev.py brief --konu "<ne isteniyor>" --mod okuma   # tek görev
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

### Uzman Claude değilse — dış ajan

Bir parçayı Claude dışında bir ajana (Codex, ChatGPT) verecekseniz görev
metnini `gorev.py` değil `disajan.py` üretir. İki ayrı kip var ve seçim
ajanın **depoya erişip erişemediğine** göre yapılır:

| Ajanın durumu | Kip | Teslim biçimi |
|---|---|---|
| Depoya erişiyor, `git` çalıştırabiliyor | `disajan.py brief --dal codex/<ad>` | dal push eder, PR açar |
| Sadece sohbet — depo yok, komut yok | `disajan.py sohbet --dosya <yol> --imza "<satır>"` | `ESKI`/`YENI` bloğu döner |

Sohbet kipinde değişecek parça ve canon alıntısı brief'in **içine** konur:
dosya okuyamayan bir ajana "dosyayı oku" demek, ona tahmin ettirmektir.
Cevap `disajan.py uygula` ile işlenir — ESKI bloğu dosyada bulunmalı ve
tek olmalı, yoksa reddedilir.

Her iki kipte de sonuç `disajan.py kapi` ile üç ölçümden geçer. Dış ajanın
çıktısına "başka bir yapay zeka yazdı" diye güvenilmez; aynı duvardan
Claude'un işi de geçiyor. `.claude/` altına dokunan dal doğrudan
reddedilir — sınavı gevşeterek geçmek geçmek değildir.

Taşıma insan üzerinden olduğunda döngü bozulmaz, sadece kablosu değişir:
şef sensin, kapı mekanik, karar Barış'ın.

**3 — Birleştir.** Önce bütün raporları **makineye doğrulat**:

```
python3 .claude/havuz.py birlestir --rapor r1.md r2.md r3.md
```

Kusurlu rapor **sunuma gitmez** — dayanağı denetlenmemiş rapor delil
değildir. Tek rapor için:

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

**5 — Codex.** Raporlar doğrulandıktan sonra **dış ajana gider.**
`disajan.py sohbet` ile brief üret, gelen metni `disajan.py uygula` ile
işle. Codex hem derler hem denetler: uzmanların bulduklarını tek okunur
metne çevirir **ve** kaçırdıklarını arar.

> **Bu adım atlanamaz.** Akış şu sırayla işler:
> **uzman ajanlar → Codex → Opus 5 → Barış.**
> Hiçbir rapor Codex'e uğramadan Opus 5 kontrolüne çıkmaz.

Neden zorunlu: 15 ajanın hepsi aynı modelden. Aynı modelin on beş
kopyası, on beş bağımsız göz değildir — aynı kör noktayı on beş kez
paylaşırlar. Codex başka bir taraftan bakıyor; değeri "daha iyi olması"
değil, **farklı yanılması.**

Bu gerçekten işe yaradı: 1428 taslağında iki Claude denetçisinin
kaçırdığı doğum/ölüm ayrımını Codex yakaladı (`LORE.md:13` döngüyü
"doğar" ile tanımlıyor, 1728 ise ölüm yılı).

Codex'in çıktısı da **denetimden geçer** — "başka bir yapay zeka
söyledi" güven sebebi değildir. Gelen raporu oku, atıflarını
`gorev.py dogrula` ile ölç, kendi içinde çelişiyorsa söyle. (Aynı
koşuda Codex bir maddeyi başlıkta "bozuyor" diye etiketleyip
gerekçesinde "çelişki kurulamıyor" dedi.)

Codex fazla sert davranabilir de: taslağı canon'un **kendine
uygulamadığı** bir standarda tuttuğu bir madde vardı. Şef olarak
işin gelen denetimi de tartmak, olduğu gibi geçirmek değil.

**6 — Opus 5 kontrolü.** `python3 .claude/dogrula.py` çalıştır.
Uzmanlar dosya değiştirdiyse bu şart.

Hata varsa iş 4. adıma (yeniden gönder) döner, temizse Barış'a çıkar.
Barış'a çıkan şey, **kapıdan geçmiş** olandır.

**7 — Kapat.** Bir parça bir geri bildirim kaydını çözdüyse kaydı
**koruyan testi adıyla** kapat:

```
python3 .claude/geri-bildirim.py kapat --no <n> --vaka "<sınav vakası>"
```

Testsiz kapatılan hata, düzeltilmiş değil ertelenmiş hatadır.

## İnsan kapısı

Uzmanlardan gelen sonuç şunlardan birine dokunuyorsa uygulamadan önce
`AskUserQuestion` ile sor: canon değişikliği, renk değeri, yeni sayfa,
"Açık Uçlar" kararı, commit.

Barış telefondan bakıyor — **uzman raporlarını olduğu gibi basma.**
Özet ver: kaç parça, ne bulundu, ne karar gerekiyor.
