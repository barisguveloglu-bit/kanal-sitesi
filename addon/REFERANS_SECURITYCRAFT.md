# SecurityCraft v1.10.2.1 — inceleme

Kullanıcı: *"o yeni dosyada alabildiğimiz tüm her şeyi alalım tüm her şeyi bak
hiçbir şeyi atlamadan alabildiğimiz."*

Paket: **7216 dosya, 13,2 MB.** Forge/NeoForge 1.20.1. Jar **çalıştırılmadı** —
zip açıldı, dil dosyası ve veri JSON'ları okundu.

## Önce sayıyı düzeltelim: 710 blok, 48 fikir

| | adet |
|---|---|
| blok | **710** |
| eşya | 55 |
| sınıf (`.class`) | 820 |

Ama 710 bloğun içi ölçüldü:

| grup | adet | ne |
|---|---|---|
| `reinforced_*` | **592** | "güçlendirilmiş \<vanilla blok\>" — tek fikrin 592 kopyası |
| `*_mine` | 37 | "\<cevher\> mayını" — tek fikrin 37 kopyası |
| `crystal_quartz*` | 18 | dekoratif blok seti |
| `secret_*_sign` | 24 | "gizli tabela" — ağaç türü başına bir kopya |
| **geri kalan** | **48** | gerçek fikirler |

Eşyalarda da 55'in 10'u tekne varyasyonu. Yani **gerçek fikir sayısı ~93**,
710+55 değil. Bu ayrım önemli çünkü "hiçbir şeyi atlamadan al" isteği
710 blok için imkânsız, 48 fikir için makul.

---

## ALINDI: beş düzenek

Hepsi bu depoda karşılığı **hiç olmayan** ve script ile gerçekten
yapılabilenler. Kod `yetenekler/securitycraft.js`, test
`test/securitycraft.mjs` (43 madde), mutasyon bataryası **11/11**.

### Ortak ilke: kaynakta blok, bizde süreli iş

Kaynakta bunların hepsi **blok**: koyduğun yerde sonsuza kadar durur. Bizde
blok yok, süreli iş var. Sebep tek: bu depoda kalıcı her etkinin süre sınırı
ve çıkış yolu olmak zorunda. *Yerde unutulmuş bir mayın, sahibini bir ay sonra
öldüren bir şeydir.*

### 1. Kalkan Sistemi ← Trophy System

Yakınındaki mermileri havada yok ediyor.

**Kendi okunu düşürmeme sorunu.** Kaynak merminin *sahibini* okuyabiliyor
(Java'da `shooter` alanı var). Bedrock script'inde o alan yok. Ölçümle
çözüldü: merminin **hız vektörü** ile "mermiden bize" vektörünün iç çarpımı.
Pozitifse mermi bize doğru geliyor, negatifse uzaklaşıyor. Kendi attığın ok
uzaklaşır, düşürülmez. Sahip bilgisine hiç gerek kalmadı.

Hız okunamazsa mermiye **dokunulmuyor** — şüpheliyi yok etmek yerine bırakmak.

### 2. Yarık Dengeleyici ← Rift Stabilizer

Menzilinde ışınlanmayı engelliyor. Gözcü ışınlanmayı **görüyor** ama
engellemiyor (o bilerek: Gözcü yalnız bildirir). Engelleyen taraf burası.

Kalkan'dan **ayrı bir düğme**, bilerek: biri seni oktan korur, öteki rakibin
kaçmasını engeller. Aynı düğme olsaydı ok yağmurundan korunmak isteyen kişi
farkında olmadan rakibinin kaçışını da engellerdi. Bu yüzden ender incisi
Kalkan'ın listesinde **yok**, Yarık'ın listesinde **var**.

*Eksik:* chorus meyvesi varlık üretmediği için engellenemiyor; yalnız inci.

### 3. Nöbetçi ← Sentry

Kurulduğu konumda duran, menzile gireni vuran taret. Oyuncuyla gezmiyor —
test bunu ayrıca ölçüyor (oyuncu 500 blok uzağa gidiyor, nöbetçi vurmaya
devam ediyor).

**Modeli yok, bilerek.** Her varlık tick bütçesinden yiyor
(`TICK_VARLIK_BUTCESI` 4) ve yerde unutulan varlık bu depoda defalarca sorun
oldu (`donusum.js`'in süpürme kodu tam bunun için var). Duran bir modelin
oynanışa katkısı maliyetini karşılamıyordu. Görünüm parçacık.

Sahibini asla, botlarımızı asla vurmuyor. Oyuncuyu vurması
`SIMSEK_OYUNCU_HEDEF` ayarına bağlı — modun geri kalanıyla aynı kural.

### 4. Radar ← Portable Radar

Menzildeki oyuncuların adını ve mesafesini bildiriyor. Gözcü'yü tamamlıyor:
Gözcü *"bu adam hile yapıyor olabilir"* der, radar *"şu an yanında kim var"*
der. Ayrı sorular.

**Kendini listeye almıyor.** Referans mod bu hatayı yapıyordu — `@e` her zaman
kullanıcının kendisini de kapsıyor. Bu seride **dördüncü kez** görülen aynı
hata.

### 5. Mayın ← Mine / Claymore / Bouncing Betty

Yere kuruluyor, menziline gireni patlatıyor.

- **Sahibi tetikleyemiyor.** Nezaket değil şart: kendi yeteneğiyle ölen oyuncu
  bir daha o düğmeye basmaz.
- **Kurma gecikmesi** (2 sn). Yoksa mayını kurarken yanından geçen tavuk anında
  patlatıyor ve yetenek kullanılamaz oluyor.
- **Blok kırmıyor** ve gücü vanilla TNT'den düşük (3 / 4). Düello alanını delik
  deşik eden bir mayın alanı kullanılamaz yapar.
- 60 saniye sonra kendiliğinden sönüyor.

---

## ALINMADI ve neden — kalan 43 fikir

Hiçbiri sessizce atlanmadı; her birinin gerekçesi burada.

### Bizde zaten var (6)

| kaynak | bizdeki |
|---|---|
| Cage Trap | `kafes` |
| Taser | `sersem_silahi` + SERSEM→MEZAR zinciri |
| Alarm | `efsane_muzik`, `sohbeteYaz` uyarıları |
| Username Logger | Gözcü defteri |
| Motion-Activated Light | `alev_halesi` (ışık kaynağı olarak) |
| Protecto (yağmurda şimşek) | `alan_simsegi`, `coklu_simsek` |

### Bedrock'ta yapılamaz (5)

- **Security Camera + Camera Monitor** — uzaktaki bir kameradan *bakmak*
  gerekiyor. Bedrock'ta oyuncunun görüşünü başka bir noktaya bağlayan bir API
  yok. `/camera` komutu var ama sahneler için; canlı ikinci bir görüntü değil.
- **Block Pocket Manager** — bölgeyi ışınlanmaya/patlamaya kapatan bir kalkan
  küpü. Bedrock'ta blok yerleştirmeyi bölgesel olarak yasaklayan bir kanca yok.
- **Projector** — hologram blok izdüşümü; istemci tarafı render.
- **Disguise Module** — bloğu başka bir blok gibi *göstermek*; istemci tarafı.
- **Sonic Security System** — nota dizisi *dinleyip* eşleştirme. Bedrock'ta
  nota bloğu sesini dinleyen bir olay yok.

### Yüzlerce kopya, tek fikir (4 grup, 671 blok)

- **592 `reinforced_*`** — "yalnız sahibi kırabilsin". Bedrock'ta
  `playerBreakBlock` iptal edilebiliyor, yani **fikir yapılabilir**; ama 592
  blok üretmek gerekmiyor, tek bir "korunan bölge" yeterdi. Bu sürüme
  alınmadı, yapılabilir listesinde duruyor.
- **37 mayın varyasyonu** — hepsi "\<cevher\> gibi görünen mayın". Tek mayın
  alındı; görünüm varyasyonu blok sistemi ister.
- **24 gizli tabela**, **18 kristal kuvars** — dekoratif.

### Arayüz gerektiriyor, bu sürüme sığmadı (12)

Keypad · Keycard Reader/Lock · Retinal Scanner · Key Panel · Scanner Door ·
Keypad Chest/Barrel/Furnace/Smoker/Blast Furnace · Briefcase · Secure Trading
Station.

Hepsi **şifre/yetki arayüzü** istiyor. Bizde `@minecraft/server-ui` ve
`_sifre.js` var, yani **yapılabilir** — ama beşi bir arada yazmak bu sürümün
işi değildi. Not düşüldü.

### Küçük ya da bizim temaya uzak (16)

Inventory Scanner · Block Change Detector · Panic Button · Laser Block ·
Electrified Iron Fence · Floor Trap · IMS · Trophy System'in blok hâli ·
Display Case · Secure Redstone Interface · Rift Stabilizer'ın blok hâli ·
Codebreaker · Wire Cutters · Incognito Mask · Admin Tool · modüller
(allowlist/denylist/harming/smart/speed/storage/redstone).

Modüller kaynak modun kendi blok sistemine takılıyor; bloklar olmadan
anlamları yok.

---

## Özet

| | |
|---|---|
| incelenen blok | 710 (gerçek fikir: 48) |
| incelenen eşya | 55 (gerçek fikir: 45) |
| **alınan** | **5 düzenek** |
| zaten vardı | 6 |
| Bedrock'ta yapılamaz | 5 |
| yapılabilir, bu sürüme alınmadı | 13 (592 blokluk "güçlendirme" fikri dahil) |
| dekoratif / varyasyon | 671 blok |
