# v7.96.4 — F-Tech: Equipment alındı (MIT)

Kullanıcı JAR'ı gönderdi: *"bunu da ekle, alabildiğin hepsini al."*
Ölçümün tamamı [`REFERANS_FTECH.md`](REFERANS_FTECH.md), izin kaydı
[`KAYNAKLAR.md`](KAYNAKLAR.md).

## Lisans önce bakıldı: MIT

`fabric.mod.json` içinde `"license": "MIT"`, yapımcı **BillBodkin**.
Marka katmanı yok — mod tümüyle yapımcının kendi tasarımı. Yani
depo kuralının **üçüncü kademesi**: paylaşılabilir, dosya alınır.
Bugüne kadarki iki kalemden (shout, Iron Man) farkı yok; fark,
iznin bu sefer yazışmadan değil **lisans beyanından** gelmesi.

## Alınanlar

| ne | nereden | nereye |
|---|---|---|
| 13 eşya ikonu (32×32) | `textures/item/` + çanta dokusu | `kaynak_doku/ftech_ikon/` |
| 1 ses (`robot_arm.ogg`) | `sounds/` | `kaynak_ses/ftech/` |
| 2 eşya modeli | Java `elements` JSON | `kaynak_geo/ftech/` (çevrildi) |
| bütün sayılar | 156 sınıfın bytecode'u | `ayarlar.js` + `kol_uret.py` |

Kaynağın **sekiz robotik kolu** var (`BackpackArm` enum). Bedrock'ta
oyuncuya bağlı sekiz hareketli uzuv çizilemiyor: attachable başına
bir kemik gerekiyor ve `query.get_equipped_item_name` yalnız iki eli
okuyabiliyor. Bu yüzden 8 sayısı **görünüş değil paralellik** olarak
yaşıyor: bir turda en çok 8 blok, 8 hedef, 8 eşya; hedef başına en
çok 2 kol (`MAX_ARMS_PER_TARGET`).

## Modüller kilitli — kaynağın kendi ilerlemesi

Kaynakta her kip bir yükseltme eşyası istiyor ve yükseltmeler
çantanın 3×3 gridinde duruyor. Bedrock'ta **özel kap arayüzü yok**
(`ActionFormData` liste ve düğme çiziyor, yuva çizmiyor). Bu yüzden
yükseltme **elde kullanılarak** takılıyor ve eşya harcanıyor —
ilerleme aynı (üret → tak → modül açılır), değişen tek şey jest.

`allowsMultiple()` bytecode'dan okundu: altısı yalnız bir kez,
dördü istiflenir. Depo Mk.I/II/III = +500/+1000/+2000, Menzil = +1.
Dokuz yuva dolunca takma reddediliyor — üçü de ölçülüyor.

## Kendi testim kendi hatamı buldu

`koniHedefleri` **varlık** döndürüyor, sarmalayıcı nesne değil
(`.map((x) => x.varlik)` ile bitiyor). İlk yazışta üç yerde
`h.varlik` okunuyordu; `undefined` geliyor, çağrı kendi `try`ına
düşüyor ve **Dövüş ile Kavrama sessizce hiçbir şey yapmıyordu.**
Deponun `eldekiEsya` dize/nesne karışıklığıyla aynı sınıf hata.
`test/ftech.mjs` 5. ve 6. bölümü bunu ölçüyor.

## Üreteç yine kendi artığını topladı

13 eşya JSON'u yazılıyor, atlas kaydı ve dil satırı kalıyor,
**dosyalar aynı koşuda siliniyordu** — `beklenen` listesine
eklenmedikleri için. CLAUDE.md'deki *"bir şeyi eklerken ÜRETENİ de
ara"* kuralının bir kez daha yaşanması. Dosya sayısı 13'ten 0'a
düştüğü için yakalandı; `test/ftech.mjs` 8. bölümü listeyi kilitledi.

## Çeviricide sessiz bir hata kapatıldı

`arac/java_gorsel_coz.py` modelin kendi `texture_size` alanını
**hiç okumuyordu**; ölçek yalnız `--doku` ile veriliyor, verilmezse
16 varsayılıyordu. F-Tech'in iki modeli de `[32, 32]`. Bayrak
vermeden çevirmek UV'leri yarıya indiriyor: çıktı geçerli JSON,
oyun kabul ediyor, doku **kayık** duruyor. Artık sıra
`--doku` > `texture_size` > 16 ve `--rapor` hangisinin
kullanıldığını yazıyor.

## Alınmayanlar ve sebepleri

| alınmadı | sebep |
|---|---|
| Depolama (1000 eşya) | Bedrock Script API'sinde ItemStack serileştirmesi yok; dinamik özellik yalnız dize/sayı tutuyor. Büyülü ya da hasarlı eşyayı saklamak onu **bozardı** — "oyuncu eşyası asla kaybolmaz" kuralı. Sayılar `ayarlar.js`'te duruyor, hesap `depoKapasitesi()` ile ölçülüyor. |
| Platform bloğu | Eşya aktarımı için özel kap gerekiyor; aynı sınır. |
| WASD/zıpla/çömel ile uçuş | `applyImpulse` **oyunculara işlemiyor** (deponun kendi ölçümü, `toprak_ucus.js`). Hareket modülü levitation + hız ile karşılanıyor; en az bir kol tutunma kuralı korundu. |
| Kaydırma tekerleğiyle mesafe | Script API'sinde tekerlek olayı yok. Karşılığı **çömelme**: çömeliyken varlık uzaklaşıyor. Adım 0.35 ve sınırlar −1.75…6.0 kaynağın kendi sayıları. |
| Matkabın dayanıklılığı ve tier'i | `f_tech_core` bağımlılığından geliyor, o JAR elimizde yok. **Uydurulmadı**, boş bırakıldı. Kazma hızı (30) ölçülebildiği için alındı. |
| Görev kuyruğu (Queue) | Yükseltme olarak var ve takılıyor, ama bizde eylemler zaten sıraya giriyor (`butce.js`). Kaynaktaki "kollar çalışırken yeni görev ekle" davranışının bizde karşılığı yok — eklenmedi, uydurulmadı. |

---

# v7.96.3 sonrası — ikinci derin tarama (anlamsal katman)

Birinci tarama **yapıyı** ölçmüştü (ölü dosya, koşulmayan test, ölü
fonksiyon). Bu tarama **bağları** ölçtü: bir ad gerçekten bir şeye
denk geliyor mu. On bir katman tarandı, her tarayıcı **mutasyonla
ısırdığı gösterildikten sonra** hükmü kabul edildi.

## Bulunan ve düzeltilenler — hepsi Python/test tarafında

| yer | ne | neden ölü |
|---|---|---|
| `kol_uret.py` | ikinci `return p` | ilkinden sonra, erişilmez |
| `ciz_bb.py` | `bb_ciz()` + `os` + `ciz_kemik` ithali | fonksiyonu kimse çağırmıyordu; o gidince iki ithal de öksüz kaldı |
| `dunya_uret.py` | `subprocess` | ithal edilmiş, kullanılmamış |
| `obj_coz.py` | `json`, `os`, `re` | üçü de kullanılmamış |
| `onizle_ilkel.py` | `json` | kullanılmamış |
| `skin_uret.py` | `golge` | `kol_uret`'ten alınmış, yalnız yorumlarda geçiyor |
| `test/denetim.mjs` · `test/inceleme_744.mjs` | `oyuncuKur` | ithal edilmiş, çağrılmamış |
| `test/evcil.mjs` | satırın tamamı (`dunyaKur, oyuncuKur`) | ikisi de kullanılmamış |

**Paket içeriği değişmedi.** Üretim yeniden koşuldu, tek bir üretilmiş
dosya bile oynamadı; bu yüzden sürüm numarası artmadı.

## Temiz çıkan on bir katman

| katman | ölçü | sonuç |
|---|---|---|
| ithal/ihraç uyuşması | 122 betik | 0 |
| ölü ithal (JS) | 122 betik | 0 |
| dairesel ithal | 122 betik | 0 — `ben10.js`'in "tek yönlü ithal" notu hâlâ doğru |
| çift nesne anahtarı / çift `case` | 48.696 satır | 0 |
| erişilmez kod / ölü yerel değişken (JS) | 48.696 satır | 0 |
| JSON geçerliliği + çift anahtar | 1.820 dosya | 0 |
| eşya → dil anahtarı | 550 eşya × 2 dil | 0 |
| eşya → atlas → doku dosyası | 549 atlas girdisi | 0 |
| ses adı → tanım → `.ogg` | 15 tanım | 0 |
| render/animasyon denetleyici bağları | iki oyuncu dosyası | 0 |
| manifest sürüm/UUID | 5 paket, 11 UUID | 0 |

## Yanlış alarmlar — neden sayılmadılar

Dört tarayıcı önce kırmızı yandı, dördü de kendi hatasıydı:

- **93 "eksik" doku/geometri** (`player.entity.json`): hepsi
  `kaynak_dis/ironman`'den geliyor. Bedrock dokuyu **yığının
  tamamında** arar, tek pakette değil — birleştirmenin amacı zaten
  alttaki paketin varlıklarını çalışır bırakmak. Dosyayı buraya
  kopyalamak izin şartını çiğnerdi. Tek tek doğrulandı: dışarıdan
  gelmeyen **sıfır** tane.
- **358 "eksik" doku** (attachable'lar): hepsi
  `textures/misc/enchanted_actor_glint` ve `enchanted_item_glint` —
  vanilla.
- **15 "tanımsız" `pa:` kimliği**: dördü çalışma anında birleştirilen
  **önek** (`pa:iksir_`, `pa:mahou_`, `pa:mrv_`, `pa:zirh_mod_`),
  kalanı olay adı veya sis kimliği, hepsi karşılığını buluyor.
- **15 "yanlış argüman sayısı"**: isteğe bağlı parametre imzada
  `= varsayılan` ile değil, gövdede `slot || "Mainhand"` ile
  karşılanıyor. Ölçü yanlıştı, kod değil.

## Ölü ihraç sayısı: 196 değil, 6

Ham sayım 196 diyor. Testlerin `pack/` üzerinden yaptığı ithaller
sayılınca 47'ye, kendi dosyasında kullanılanlar ayıklanınca **6**'ya
iniyor — ve o altı `LAZER_*` ayarının öksüz olduğu `ayarlar.js`'te
zaten **yazılı**. Yani betik tarafında yeni ölü kod yok.

Kalan 41 ad "ölü" değil, yalnız `export` anahtarı gereksiz: hepsi
kendi dosyasında çağrılıyor. Dokunulmadı — kazancı yok, riski var.

## Dışlanan üç test çürümemiş

`dunya.mjs`, `eski.mjs`, `olcum.mjs` tek tek koşuldu; üçü de `0` ile
çıkıyor. v7.96.3'teki ders (*"dışlama listesi bir çöp kutusu
değil"*) bu koşuyla ölçüldü, iddia edilmedi.

---

# v7.94.0 — Error 404: ikinci geçiş

Kullanıcı: *"ben sana her zaman ne yiyorum hepsini al demiyor muyum… bundan
sonra kuralımdan vazgeçmeyeceksin… güzel mekanik diye geçme, diğerleri de
güzeldir ama sen onları almazsan o mod kalitesinde olmaz."*

**Kural kabul edildi.** Alınabilecek her şey alınır; alınmayan her şeyin
sebebi yazılır ve sebep ya bir depo kuralı ya ölçülmüş bir Bedrock sınırı
olur — "bence bu daha güzel" bir sebep değil.

Tam hesap [`REFERANS_ERROR404_EK.md`](REFERANS_ERROR404_EK.md).

## Bu mod v7.74'te kısmen alınmıştı

`Error404-1.3.8` (modId `glitchmanv`, 512 dosya, 253 sınıf, **113 prosedür**)
o zaman taranmış ve altı olay alınmıştı. Almadıklarımı da `ayarlar.js`'e tek
tek yazmışım. **Bu sürüm o listeye geri dönüyor.** 113 prosedürün hepsi
`javap` ile açıldı, çağrılan metotlar ve string sabitleri okundu.

| v7.74'te ne yazmıştım | şimdi |
|---|---|
| Faz sistemi: *"kurulabilir ama ayrı bir iş"* | **ALINDI** |
| `ReplaceBlocksCode`: *"kalıcı bozar"* | **ALINDI** — defterle |
| `LiftChunks`: *"geri koyma garantisi yok"* | **ALINDI** — tersine çevrilerek |
| Config GUI (hiç değinilmemişti) | **ALINDI** — altı düğme |
| Şifre bilmecesi (hiç değinilmemişti) | **ALINDI** — birebir |
| `CodemanDie` / bitiş (hiç değinilmemişti) | **ALINDI** — satırları birebir |
| `ChangeMobTextures`: *"Bedrock'ta olmaz"* | **YARISI ALINDI** |

## Alınanlar

**Faz sistemi.** Durakta geçirilen süreyle yükseliyor, düşmüyor, dünyaya
yazılıyor. Her fazın kaynaktaki kendi cümleleri var — üçüncü fazdaki
`dQw4w9WgXcQ` bir YouTube kimliği ve kaynağın kendi şakası, uydurma değil.

**Bozulan Blok.** v7.74'teki itiraz "kalıcı bozar"dı; çözüm zaten depodaydı —
meşale defterinin birebir aynısı. Üstüne iki koruma: yalnız **doğal zemin**
bozuluyor (sandık/fırın/yatak/cam listede yok) ve oyuncu araya girip bir şey
koyduysa dokunulmuyor.

**Yükselen Zemin, tersine çevrilerek.** Kaynak zemini yukarı itiyor, yani
zeminden blok eksiliyor. Burada hiçbir blok silinmiyor: zeminin bir parçası
**havada yankılanıyor**, sonra siliniyor. En kötü ihtimal havada bir blok
kalması — evinden bir şey eksilmiyor. Test "zeminden tek blok bile eksilmedi"
diye ölçüyor.

**Bozulmuş Sürü.** Doku değiştirilemiyor (bu ölçüm hâlâ doğru), ama davranış
değiştirilebiliyor: çevredeki hayvanlar duruyor ve sana dönüyor. Hasar yok.

**Yapılandırma.** Kaynaktaki altı düğmenin altısı da: beliriş, blok bozma,
zemin oynatma, sıklık 1-2-3, temizle, durum. Hepsi kalıcı.

**Şifre ve bitiş.** Telefon **334-303-9542**, kod **334303** — ikisi de
birebir. `korku_not` → notu okur, `korku_sifre` → reddedilir,
`korku_sifre_334303` → `CodemanDie`'nin dört satırı ve bitiş. Bitiş fazı
sıfırlar, defterleri boşaltır ve kaynağın kendi sözü gereği yapılandırmadan
geri açılabilir.

## Hâlâ alınmayan dört şey — hepsinin sebebi ölçülmüş

- **`kick @p`** — sahte bir çökme mesajıyla oyuncuyu atıyor. Bedrock'ta `kick`
  yok; olsaydı da sahte bağlantı kopması üretmek yalan olurdu.
- **Jumpscare / deathmode** — Bedrock script'te istemci render kancası yok;
  öldürme kısmı da şarta aykırı.
- **`DisturbSleep`** — hasar veriyor (şart dışlıyor) **ve** Bedrock'ta yatak
  kancası yok.
- **Mob dokusu değiştirme** — Bedrock'ta çalışma anında olmuyor.

10 ogg, 10 nbt yapı, 61 png ve 6 GeckoLib modeli de alınmadı: bunlar
"alınmadı" değil **alınamaz** — modun telifli varlık dosyaları.

## Şart bozulmadı

`error404.js` içinde `applyDamage(`, `createExplosion(`, `.kill(`,
`setOnFire(`, `clearAll(` ve `minecraft:inventory` hiç geçmiyor. Test bunu
**yorumları soyarak** ölçüyor — ilk yazımda dosyanın kendi başlığındaki
"applyDamage / createExplosion / kill YOK" cümlesi yasak sayılıyordu.

## Üç tuzağa düşüldü, üçü de yazıldı

1. **Faz eşiği 0'dan başlıyordu** (`[0, 40, 120]`), yani ilk taramada faz 1
   oluyordu ve faz 0 diye bir durum kalmıyordu. Olay listesi uzuyor,
   `efsane_korku.mjs`'in olay zorlama düzeneği **sessizce başka bir olayı**
   çalıştırıyordu — "sönme bekliyorum" diyip "kayıt" çalıştırdı. Düzeltme:
   eşik `[20, 60, 160]` ve faz artık listenin **uzunluğunu** değil, olayın
   **kendisini** kapatıyor.
2. **`siraDogrula` deseni `[a-z]` idi**, `faz_satir`'daki alt çizgi
   eşleşmiyordu; sıra karşılaştırması sessizce eksik listeyle yapılıyordu.
3. **Ölü bir koruma yazmışım.** Faz hesabındaki `Math.max` kaldırıldığında
   hiçbir test düşmedi — çünkü gerçekten ölüydü: `yeni` zaten `d.faz` ile
   başlıyor ve `yeni > d.faz` kapısı düşmeyi ayrıca engelliyor. Ölü koruma
   okuyana "burada bir şey korunuyor" diye yalan söyler; kaldırıldı ve
   korumayı gerçekten yapan kapı için **kayıttan yüklenen faz düşmüyor**
   testi yazıldı.

35 mutasyonun 35'i yakalanıyor. İlk turda yedisi kaçtı; biri yukarıdaki ölü
koruma, altısı gerçek test boşluğuydu — tavan ölçümleri gevşekti, ayar
kapıları `undefined` bir boyutla deneniyordu (o zaten istisna atıp `false`
dönüyordu) ve bitişin temizlediği defterler zaten boştu.

---

# v7.93.0 — Infintrix: Sonsuzluk Taşları

Kullanıcı: *"yeni bir tane mod daha buldum, bunu da ekle... alabildiğin tüm
her şeyi al."*

Tam ölçüm listesi [`REFERANS_INFINTRIX.md`](REFERANS_INFINTRIX.md).

## Bu bir köprü modu

`infintrix-2.2.jar` (124 KB, **sıfır Java sınıfı**) kendini şöyle tanıtıyor:
*"Adds compatibility from Pugmeowla's Infinity Stone Core to Alien Evo."*
176 dosyanın dağılımı:

| ne | adet | alındı mı |
|---|---|---|
| render katmanı | 28 | hayır — AlienEvo'nun modeline giydirilmiş |
| doku | 62 | hayır — başka modun telifli dokuları |
| GeckoLib modeli | 6 | hayır |
| güç dosyası | 5 | **evet** |
| `.mcfunction` | 2 | **evet** |

45 yetenek kaydının 28'i render katmanı. Geriye kalan 16 komut yeteneği tek
tek okundu; **gerçek mekanik beş tane** ve beşi de alındı.

## Kritik ölçüm: taşların kendi güçleri bu jar'da yok

`power_stone`, `mind_stone`, `space_stone`, `reality_stone`, `time_stone`,
`soul_stone` — altısı da yalnız `objective_score` olarak **okunuyor**. Bu
skorları **yazan** taraf `Pugmeowla's Infinity Stone Core` ve o mod
yüklenmedi. Yani bu jar'da dört taşın tek işlevi "altı taş tamam mı"
sayımına katılmak. **Onlara güç uydurulmadı.**

## Alınan sistem

Sekiz yetenek, sıra 800–807: `eldiven`, altı taş yuvası, `sonsuzluk_durum`.

1. Eldiven açık, taş yok → 60 sn dönüşüm, 10 sn şarj.
2. **Güç Taşı** → şarj anında bitiyor (`infinite_power` birebir: sayaç ≥10
   ise 2'ye çekiliyor). Kesinti 10 taramadan 1 taramaya iniyor.
3. **Altı taş** → Usta Denetimi: yaratığı elinde tutmadan son türün
   güçleri devam ediyor (`MasterControl`).
4. 30 sn sonra **yanıyor**; ceza biçime göre — Prototip 2999, Recal 3000,
   10K 3000 tick. Kaynaktaki sayılar aynen.
5. Yanık cezasını Güç Taşı **atlayamıyor** (`no_instant_timein`); eşiğin
   altına inince sert kilit kalkıyor (`remove_tag`).

## Mevcut Ben 10 zayıflatılmadı

En önemli karar bu. Omnitrix sayacı **yalnız eldiven takılıyken** işliyor;
eldiven kapalıyken Ben 10 bugüne kadar nasıl çalışıyorsa öyle çalışıyor.
Yani bu bir nerf değil, isteğe bağlı bir kumar: sınırsız dönüşüm ve Usta
Denetimi isteyen yanma riskini de alıyor.

## Beyan edilmiş iki ikame, bir de alınmayan

- **Taşı yuvaya oturtma komutla.** Kaynakta bu işi Infinity Stone Core
  yapıyor. Uydurma bir toplama mekaniği kurmak yerine her taş bir aç/kapa
  yeteneği oldu.
- **`playsound infinity:reality_stone` → `random.levelup`.** O ses diğer
  modun ses bankasında; var olmayan bir dosya adını pakete yazmak sessizce
  çalışmayan bir ses demek olurdu.
- **`unlock_omnitrix` alınmadı:** bizde kilitli yaratık yok, 24 türün 56
  kaydı zaten açık. Kilit sistemi kurup sonra onu açan bir yetenek yazmak,
  olmayan bir soruna çözüm üretmek olurdu.

## Mutasyon turu üç gerçek boşluk buldu

30 mutasyonun 30'u yakalanıyor; ilk turda beşi kaçtı ve dördü gerçek test
boşluğuydu:

- **Eldiven kapısının ikinci dalı ölçülmemişti.** Test yalnız *hiç kaydı
  olmayan* oyuncuyu deniyordu; `!s` dalı oradan geçiyor, `!s.eldiven`
  dalı ölçüsüz kalıyordu. Eldiveni takıp çıkarmış oyuncu eklendi.
- **Güç Taşı'nın kısaltması iki yerde** ve ikincisi tek başına sonucu 2'ye
  çekiyor; "şarj 2 oldu mu" ölçüsü ilkini kaçırıyordu. Gerçek fark kesinti
  **uzunluğu** — artık tarama sayarak ölçülüyor.
- **Eldiven kapanınca sayaçların sıfırlanması** hiç ölçülmüyordu.
- **`ben10Unut` hatırlanan türü de silmeli.** İlk düzeltme yanlış yere
  konuldu: `kur()` içindeki `sonsuzlukUnut()` durumu zaten sildiği için
  satır hiçbir şey ölçmüyordu ve mutasyon yine kaçtı. Doğru yere taşındı
  ve o tuzak testin içine yorum olarak yazıldı.

Beşinci mutasyon (`omniIlerlet` ekrana yazıyor) **kötü kurulmuştu**:
fonksiyonun elinde oyuncu nesnesi yok, yalnız kimlik var — ekrana yazması
yapısal olarak mümkün değil. Test boşluğu değil.

---

# v7.92.0 — AlienEvo eklentileri: Evrim kademesi

Kullanıcı üç jar yükledi: *"AlienEvo diyebilir, ben 10 modu vardı ya kanka,
işte onların eklentilerini buldum, yani ekstra özellikler ekleyen şeyleri
buldum."*

Tam ölçüm listesi [`REFERANS_BEN10_EK.md`](REFERANS_BEN10_EK.md).

## Üçünün ikisi ses paketi — alınmadı

| jar | güç JSON | komut | alındı mı |
|---|---|---|---|
| `shout-1.0.3` | 1 | **11 komutun 11'i `playsound`** | hayır |
| `yelling_alien-0.8.0` | 14 | **14 komutun 14'ü `playsound`** | hayır |
| `pinnacle_of_evolution` | 9 | — | **evet** |

İkisinde de tek bir `effect`, `damage`, `summon`, `setblock` ya da
`particle` komutu yok; yaptıkları iş uzaylıya dönüşünce adını bağırmak.
"Eksik bırakıldı" değil — **alınacak mekanik yok.**

## Alınan: altı evrimleşmiş uzaylı

`pinnacle_of_evolution` (id `evolved` v4.1.0) gerçek bir kademe ekliyor.
287 yetenek kaydı var ama yarısından çoğu görsel (iz rengi, render katmanı,
animasyon sayacı) ya da aynı özelliğin kademesi (`speed_1`..`speed_5`).
**Gerçek mekanik altı** ve altısı da alındı:

| tür | kaynak | bizdeki mekanik |
|---|---|---|
| Ateş | `evolved_pyronite_nova.mcfunction` | alan hasarı + ateşe verme |
| Vahşi | `evolved_vulpimancer_stun.mcfunction` | yavaşlık + bulantı, **hasar yok** |
| Elmas | `alienevo:crystal_pillar` | diken hasarı |
| XLR8 | `speed_1..speed_5` | kademeli hız, tavan 5 |
| Gri Madde | `corewithstuff:telekinesis` | hedefleri kendine çekme |
| Dört Kol | `alienevo:sonic_clap` | hasar + savurma |

Yetenek: `evrim`, sıra **790**, süre 20 sn. Elinde evrimleşebilen bir
yaratık tutman gerekiyor; bırakırsan ya da başka türe geçersen evrim biter.

## Bilerek değiştirilen üç şey

1. **Kristal diken BLOK olarak alınmadı.** Kaynak hedefin etrafına gerçekten
   blok koyuyor (`crystal_pillar`, `block_placer`). Bir oyuncuyu bloğun
   içine hapsetmek bu depoda yasak — aynı karar `kafes.js`'te yazılı.
   Test 8. bölümde "hiç blok koymadı" diye ölçülüyor.
2. **`alienevo:invulnerable` alınmadı.** Süresiz dokunulmazlık "her kalıcı
   etkinin süresi ve çıkışı olacak" kuralına aykırı; `yenilmez_zirh.js`
   zaten sayaçlı bir karşılığını veriyor.
3. **Evrim bir BİÇİM değil, KADEME.** Bizdeki `_proto` / `_10k` aynı türün
   görünümü — "görünüm farklı, güç aynı". Kaynakta evrim ayrı
   `powers/evolved_*.json` dosyalarıyla geliyor. O yüzden `BEN10_BICIM`'e
   dördüncü ek olarak eklenmedi; üç görünümün üçü de **aynı** evrime
   giriyor.

## Testte bir ölçüm hatası bulundu (kodda değil)

`test/ben10_evrim.mjs` ilk yazımda adım değil **tick** sayıyordu. `calis()`
sırası gelmemiş tick'te de `false` dönüyor, yani "bir tur döndü" ile "bir
adım attı" aynı görünüyordu. XLR8 kademe tavanı testi bu yüzden 2'de takıldı
— **kod doğruydu, ölçü yanlıştı.** Adım sayacı artık her adımın sonundaki
evrim parçacığı.

29 mutasyonun 29'u yakalanıyor. Beş tanesi ilk turda kaçtı ve beşi de gerçek
test boşluğuydu: Gri Madde'nin hasarı, kapı kapanırken kolların inmesi,
giriş sesi, geçersiz oyuncuda işin bitmesi ve adımların aralıklı olması.

---

# v7.91.0 — Avaritia'dan üç mekanik

Kullanıcı: *"bence moddaki her şeyi alalım gitsin vallahi zırhı da alalım."*

Zırh v7.90'da alınmıştı. Tam hüküm listesi
[`REFERANS_AVARITIA_EK.md`](REFERANS_AVARITIA_EK.md).

## Önce sayıyı düzeltelim

117 eşya görünüyor ama **25'i tekillik** (aynı tarifin 25 kopyası), **~35'i
dört ayrı kademe takımı** (blaze/crystal/neutronium/infinity), **~10'u
yemek/dekor**. 49 script modülünün yarısından çoğu tarif/arayüz tesisatı.
**Gerçek mekanik ~20** ve yedisinin bizde karşılığı zaten var.

## Alınan üç tanesi

| bizdeki | kaynak | ne değişti |
|---|---|---|
| **Diken Zırhı** | thorns surplus | süreli + **tavanlı** — vuran kendi vuruşundan ölmesin |
| **Ağaç Devir** | `veinMining.js` | bütçeye bölündü |
| **Bedrock Kır** | `bedrock_breaker.js` | süre aynen (188 tick), **en alt katman kırılmıyor** |

**Diken Zırhı** senin "tamamen savunmaya yönelik" yönüne tam oturuyor:
saldıran ceza alıyor, sen saldırmıyorsun.

**En alt katman kuralı kaynakta yok.** Senin "Efsanenin Dünyası" dünyan tek
kat bedrock — orada bu yetenek zemini delip dünyayı kullanılamaz yapardı.

**`veinMining` adı yanıltıcı:** cevher damarı değil **ağaç** kesiyor. Adına
bakıp "damar madenciliği" demek yanlış olurdu; koda bakıldı.

## Alınmayanın en büyüğü: sıkıştırma ekonomisi

Avaritia'nın çekirdeği bir **ilerleme sistemi** — 9×9 tezgahta bin blok
sıkıştırıp tekillik, tekillikleri birleştirip katalizör. Bu bir mekanik değil
bir **ekonomi**; almak 9×9 tezgah + 200'den fazla tarif + kendi arayüzü
demek, yani ayrı bir mod. Dört kademe takım da alınmadı: bizde `kns_*`,
Marvel'ın 300 parçası ve Ben 10 zaten var, beşinci bir kademe merdiveni
kimsenin kullanmayacağı bir şey olurdu.

## Test iki gerçek hata buldu

**1. Bedrock kırıcı hiç kırmıyordu.** `sureliIs` önce "süre doldu mu" diye
bakıp `true` dönüyor, adım ondan sonra çalışıyor. Süre tavanı
`SURE + 2` yazılmıştı, adım aralığı 10 tick — son adım 190. tickte gelecekti
ama iş 190'da zaten bitmiş oluyordu. Tavan genişletildi; işi bitiren artık
adımın kendisi.

**2. Yaprak uzaklık sınırı test edilmiyordu.** Mutasyon sınırı kaldırdı,
hiçbir madde düşmedi — test ağacı küçüktü, bütün yapraklar zaten sınırın
içindeydi. Uzun bir yaprak zinciri eklendi; sınır artık ölçülüyor.

Ayrıca bir sayım yanlışım vardı: kütüğe komşu yaprak `d=0` ile başlıyor, yani
`d <= 6` sınırının karşılığı zincirde **7.** blok. Kodda hata yoktu.

## Test

`test/avaritia.mjs` 25 madde. Mutasyon bataryası **10/10**.

---

# v7.90.0 — Yenilmez Zırh

Kullanıcı: *"bu modda o zırhı taktığın zaman /kill yazınca bile öldürmüyormuş,
öyle bir mekanik var mı? … /kill yazınca hata mesajı versin, İngilizce."*

## Önce ölçüm: kaynakta öyle bir mekanik YOK

Tam inceleme [`REFERANS_AVARITIA.md`](REFERANS_AVARITIA.md).

Avaritia'daki `immortal` bir **etiket** ve tek işi **modun kendi silahlarının**
seni atlaması — sonsuzluk kılıcı sana 100000 yerine 1 hasar veriyor. `/kill`
ile hiçbir ilgisi yok.

Bundle'daki bütün `beforeEvents` abonelikleri sayıldı:
`entityHurt` **sıfır**. `entityDie` ile dirilten bir şey de yok. İddia
karşılıksız.

## Ama kullanılabilir bir teknik vardı

Mod düşme hasarını `afterEvents.entityHurt` içinde **geri iyileştirerek**
iptal ediyor:

```js
health.setCurrentValue(min(effectiveMax, currentValue + ev.damage))
```

Alınan şey bu, her hasar sebebine genişletilmiş hâli.

## Ne kesin, ne değil

- **Geri iyileştirme kesin çalışır** — kaynakta çalışan tekniğin aynısı.
- **`/kill` garanti edilemez.** Hasarı iptal eden bir kanca Bedrock'ta yok;
  `entityHurt` olaydan sonra çalışıyor. Script'in ölümü sonlandırmadan önce
  yetişip yetişmediği oyunda denenmeden bilinemez ve burada oyun
  çalıştırılamıyor.

İki iş **ayrı** yazıldı: iyileştirme ayrı, öldürme girişimi bildirimi ayrı.

## Mekanik

Kapı: **Güç Zırhı tam set** (4 parça birden). Tek parça eksikse zırh yok.

- Hasar geri iyileştiriliyor, **şarj** harcanıyor (8 şarj).
- Şarj bitince zırh **soğuyor**, 30 saniyede bir dolum.
- Öldürme girişiminde (`selfDestruct` · `suicide` · `void` ya da ≥100 hasar)
  herkese İngilizce mesaj:

```
✖ COMMAND FAILED
Target is protected by the ARMOR OF THE LEGEND.
» /kill cannot be executed on this entity.
Entity: Earsh · Status: UNDYING · Charges: 7/8
```

Mesaj susturmalı — `/kill` spam'i sohbeti boğmasın.

**Neden şarjlı:** sınırsız olsaydı hem bu deponun en temel kuralını çiğnerdi
(kalıcı etkinin sınırı olmalı) hem düelloyu bitirirdi. Yenilmez bir rakiple
oynamak oynamak değildir.

## Mutasyon bataryası bir ölü ayar buldu

`YENILMEZ_TAVAN_HASAR = 200` yazmıştım, gerekçesi "tavan yoksa sınırsız
iyileştirme olur" idi. Batarya ayarı kaldırdı ve **hiçbir madde düşmedi** —
çünkü iyileştirme zaten `Math.min(maks, …)` ile can tavanına vuruyor. İkinci
tavanın gözlenebilir hiçbir etkisi yoktu. Silindi; gerçek sınır olan can
tavanı ayrıca test edildi.

## Test

`test/yenilmez.mjs` 36 madde. Mutasyon bataryası **11/11**.

---

# v7.89.0 — Savunma Merdiveni

Kullanıcı kararı: *"biz bunu tamamen savunmaya yönelik yapalım … canım
azaldığında ekstra güç açacağım, veya rakibimin gücü benden daha güçlüyse en
azından defansımı geliştireyim … o kurtarıcı dediğimiz ile bir sistem kuralım
… kurtarıcı bitti ondan sonra da sıralı olsun … hepsine de can okuyucu ekle ki
sıralı bir şekilde devreye girsinler."*

## Beş basamak, canın oranına bağlı

| can | basamak | ne veriyor |
|---|---|---|
| %70 | Tetikte | Direnç I |
| %50 | Zırh | Direnç II · ateş direnci · emilim |
| %35 | Kalkan Sistemi | Direnç II + **mermi düşürücü açılır** |
| %20 | Nöbetçi | Direnç III · yenilenme + **taret kurulur** |
| %10 | Son Direniş | **Direnç IV** · yenilenme II · yavaş düşme · emilim II + üstündekileri ayırır |

Oyuncu hiçbir şey yapmıyor; merdiven canı okuyor ve açıyor.

## Sıralı olması

Her taramada **en fazla bir basamak** açılıyor. Can bir anda dibe vursa bile
merdiven 1'den başlayıp tırmanıyor. Bu senin açık isteğindi ve ayrıca doğru:
beş basamak birden açılsaydı hangisinin işe yaradığı hiç anlaşılmazdı.

## "Rakibim benden güçlü" nasıl ölçülüyor

Rakibin gücünü okuyan bir API yok. Ölçülebilen şey **canın ne hızla gittiği**:
2 saniyelik pencerede oranın dörtte birinden fazlası giderse merdiven bir
yerine **iki basamak** birden çıkıyor. Tahmin değil ölçüm.

## Test bir tasarım hatası buldu

İlk yazılışta toparlama dalı can geçmişini siliyordu. Sonuç: **tam candan
başlayan düşüş hiç ölçülemiyordu** — %100'deki örnek silindiği için bir
sonraki taramada pencerede tek değer kalıyor ve "hızlı düşüş" hiçbir zaman
doğru çıkmıyordu. Kaçırılan şey tam da senin anlattığın durumdu: tam candan
bir anda dibe vurmak. Testin 4. maddesi yakaladı, düzeltildi.

## Direnç V yok

Tavan **Direnç IV** (amp 3). Direnç V tam dokunulmazlık ve bu depoda yasak —
`tarama.mjs` onu ayrıca deniyor, merdiven testi de kendi tablosunda deniyor.
"Asla yenilmemek" anlaşılır bir istek ama dokunulmazlık savunmayı değil oyunu
bitirir.

## Hiçbir basamak hasar vermiyor

Tamamen savunma. Son basamağın itmesi bile hasarsız: üstündekileri **ayırır,
öldürmez**. Botlarımızı itmiyor, kendimize dokunmuyor.

## Kurtarıcı duruyor

`ruh.js`'teki Kurtarıcı **değiştirilmedi** — ruh yakan, karaktere bağlı, tek
kademe. Merdiven ondan bağımsız ve genel. "Yerine" değil "ardına" bir sistem
istendi, öyle yapıldı.

## Test

`test/merdiven.mjs` 40 madde. Mutasyon bataryası **10/10** — sıralılığın
kaldırılması, hızlı düşüş kuralının silinmesi, geçmişin yine silinmesi,
Direnç V konması, son basamağın hasar vermesi, oranın yerine mutlak canın
okunması… hepsi yakalandı.

Bir mutasyon (can okuma **istisna** atarsa 0 dönmesi) ilk turda **kaçtı** ve
gerçek bir test boşluğuydu: `getComponent` undefined dönen yol deneniyordu ama
istisna atan yol denenmiyordu. 0 dönmek "canın %0" demek, yani okunamayan
oyuncunun bütün merdivenini yakar. Madde eklendi.

---

# v7.88.0 — Üçüncü nefes: Bambu

Kullanıcı: *"bu kadar dolu olmasa da 3 sırada olan en dolu yeteneğe sahip
olan nefes hangisi onu da alabilir misin."*

## Ölçüm

Güneş ve Ay dışarıda bırakıldı, kalan 14 nefes aynı ölçütlerle sayıldı:

| nefes | dolu form | kendi kılıcı | dil kaydı |
|---|---|---|---|
| **bambu** | **12** | **2** | **22** |
| su | 11 | — | 20 |
| canavar | 10 | — | 21 |
| yıldırım | 10 | — | 14 |

**Bambu her ölçütte önde.** İlk sayımda iç sınıflar (`$1`) kılıçları ikiye
katlıyordu; tekilleştirip tekrarladım, sonuç değişmedi.

**Kanonda yok, bilerek aldım.** Bambu Nefesi Kimetsu no Yaiba kanonunda
geçmez, moda özgü. İstek "dosyadaki en dolu üçüncü" idi. Kanon bir üçüncü
istenirse **Su** (11 form) hazır.

## İmzası ayrı: sersemletme

Güneş yakıyor, Ay tekrarlı kesiyor. Bambu bir **tahta** kılıç — kesmez, ezer:
bulantı + yavaşlık. Üçüncü üslubun üçüncü bir imzası olmasaydı Güneş'in
renksiz bir kopyası olurdu. Test hem Bambu'nun sersemlettiğini hem **Güneş'in
sersemletmediğini** ayrı ayrı ölçüyor.

12 formun hepsi dolu — Bambu'da modda boş anahtar yok.

## Sıra payı açıldı

Üçüncü üslupla nefes 637'ye çıktı, PowerBorne 640'tan başlıyordu: **üç slot**
pay kalmıştı, dördüncü üslup çarpardı. PowerBorne **700**'e taşındı, araya 62
slot (yaklaşık iki üslup daha) girdi. Test bu payı ayrıca ölçüyor — daralırsa
haber verir.

## Test

`test/nefes.mjs` 48 madde (8. bölüm yeni). Mutasyon bataryası **5/5**:
sersemletmenin kaldırılması, süresiz yapılması, Güneş'e de verilmesi,
uydurma form eklenmesi ve sıra payının daraltılması — beşi de yakalandı.

---

# v7.87.0 — Nefes (Kimetsu) + PowerBorne'un on bir mekaniği

Kullanıcı dört şey istedi.

## 1. "Frisk's heroes'un tüm karakterlerini sil" — zaten silinmişti

FiskHeroes **v5.2'de tamamen kaldırılmıştı**: dokuz kahraman, yedi ışını,
kostüm geometrisi, `kahraman.js`, `REFERANS_FISK.md`. `test/marvel.mjs` 1.
bölüm on bir maddeyle kalıntı arıyor, hepsi temiz. Yapacak bir şey yoktu.

## 2. "Marvel Project'i çıkarma, powerborne yanında dursun"

Duruyor — 54 kahraman, 300 parça, hiç dokunulmadı. `test/powerborne.mjs`
**0. bölüm** bunu ayrıca bekçiliyor: biri gün gelip "yerine koyduk" diye
silmeye kalkarsa test düşer.

## 3. PowerBorne'un on bir mekaniği alındı

Geçen sürümde ölçülüp "bizde yok" diye işaretlenmişlerdi. Hepsi yazıldı:

duvarda yürüme · örümcek hissi · ağ atma · kalkan fırlatma · çekiç çağırma ·
yukarı yumruk · dalış vuruşu · donduran nefes · gök gürlemesi · madde
dönüştürme · elde pişirme

Kaynaktan ayrıldığımız yerler ve sebepleri
[`REFERANS_POWERBORNE.md`](REFERANS_POWERBORNE.md)'de. Özetle: ağ **hasar
vermiyor** (tutuyor), donduran nefes **blok koymuyor** (oyuncuyu bloğun içine
hapsetmek yasak), çekiç çağırma eşyayı **silmiyor**, elde pişirme **adedi
koruyor**, dalış vuruşu **yerdeyken çalışmıyor**, madde tablosu **bilerek
zayıf** (taşı elmasa çevirmek hile olurdu).

Bir hatayı test buldu: kalkan en **uzaktakine** önce vuruyordu. Sebebi
ölçülür — göz yüksekliği 1,6 blok olduğu için tam önündeki üç hedeften en
uzaktaki en küçük açıyı veriyor. Açı sıralaması nişan almak için doğru,
sekme için doğru olan mesafe.

## 4. Kimetsu no Yaiba: en güçlü iki üslup

Tam inceleme [`REFERANS_KIMETSU.md`](REFERANS_KIMETSU.md).

**Seçim beğeniyle değil ölçümle yapıldı.** Modda 18 nefes var; Güneş ve Ay
modun kendi içeriğinde ayrılıyor — Güneş'in **iki** procedure'ü
(`Sun` + `HinokamiKagura`) ve üç karakter varlığı, Ay'ın **kendi mermi
varlığı** ve üç zırh parçası var. Öteki 16'sında hiçbiri yok. Kanonla da
örtüşüyor: Güneş kök, Ay ondan türeyen tek nefes.

**Bir ölçüm hatasını düzelttim:** ilk sayım "Sun 39 sınıf" dedi ve yanlıştı —
`sun` alt dizesi **Kimet`sun`oyaiba**'nın içinde geçiyor, mod iskeletinin her
sınıfı eşleşiyordu. Kelime sınırıyla tekrarladım.

**23 form, adları moddan birebir.** Modda boş bırakılmış altı anahtar
(`sun13`, `moon4/11/12/13/15`) **alınmadı** — olmayan şeyi uydurmak yasak;
test o altısının eklenmediğini ayrıca ölçüyor.

720 procedure altı mekaniğe indirildi (kesik · halka · atılım · mermi ·
koruma · çekiş) ve her formun türü **adından değil kaynaktaki işinden**
seçildi. İki üslubun imzası ayrı: **Güneş yakıyor, Ay tekrarlı kesiyor.**

## Test

`test/nefes.mjs` 34 madde, `test/powerborne.mjs` 40 madde.
Mutasyon bataryası **18/18** (7 nefes + 11 powerborne).

`tarama.mjs` bir ölü ithal yakaladı (`nefes.js`'te `KILIT_ATLA_TIPLER`),
silindi. `yetenek_ara.mjs` düştü çünkü yeni aileler jest kuyruğunun sonunu
değiştirdi — maddenin ölçtüğü şey "şu aileler kuyrukta" değil "kuyrukta
erişilemeyen bir aile var", o yüzden liste genişletildi ve gerekçesi yazıldı.

---

# v7.86.0 — SecurityCraft'tan beş savunma düzeneği + PowerBorne denetimi

Kullanıcı iki jar gönderdi. İkisi de **çalıştırılmadı** — zip açıldı, veri
dosyaları okundu.

## PowerBorne Heroes 0.5.1 — "aldık mı diye bak"

Tam cevap [`REFERANS_POWERBORNE.md`](REFERANS_POWERBORNE.md).

**Bu mod hiç işlenmemiş.** Marvel içeriğimiz `REFERANS_MARVEL.md`'de yazılı ve
başka bir moddan: *Marvel Project Addon v3.0.1* (Bedrock). PowerBorne ise
Forge + Palladium + KubeJS. Adları benzediği için karışmış olabilir.

Altı karakter (Superman · Spider-Man · Thor · Captain America · Sentry ·
Firestorm), sıfır `.class`, ~420 yetenek girdisi ama çoğu tesisat; gerçek
mekanik ~45.

Karşılaştırma yapıldı: **11 gerçek mekanik bizde yok** — duvarda yürüme,
örümcek hissi, ağ atma, kalkan fırlatma, çekiç çağırma, yukarı yumruk, dalış
vuruşu, dondurucu nefes, thunderclap, madde dönüştürme, elde pişirme.
Çoğu Bedrock'ta yapılabilir. Bu sürümde alınmadı çünkü bu dosya için istek
"aldık mı diye bak" idi.

## SecurityCraft v1.10.2.1 — "hiçbir şeyi atlamadan al"

Tam cevap [`REFERANS_SECURITYCRAFT.md`](REFERANS_SECURITYCRAFT.md).

**Önce sayıyı düzelttim:** 710 blok görünüyor ama 592'si "güçlendirilmiş
\<vanilla blok\>", 37'si "\<cevher\> mayını", 24'ü gizli tabela, 18'i
dekoratif kuvars. Gerçek fikir sayısı **48**, 710 değil.

**Alınan beş düzenek:**

| | kaynak | ne değişti |
|---|---|---|
| Kalkan Sistemi | Trophy System | kendi okunu düşürmüyor — hız vektörü ölçümüyle |
| Yarık Dengeleyici | Rift Stabilizer | Gözcü görür, bu engeller |
| Nöbetçi | Sentry | modeli yok (ölçülü karar), sahibini/botları vurmaz |
| Radar | Portable Radar | kendini listelemez |
| Mayın | Mine / Claymore | sahibi tetikleyemez, kurma gecikmesi var, blok kırmaz |

**Kendi okunu düşürmeme sorunu** en ilginci: kaynak merminin sahibini
okuyabiliyor (Java'da `shooter` alanı var), Bedrock script'inde o alan yok.
Ölçümle çözüldü — merminin hız vektörü ile "mermiden bize" vektörünün iç
çarpımı. Pozitifse bize geliyor, negatifse uzaklaşıyor. Sahip bilgisine hiç
gerek kalmadı.

**Hepsi süreli.** Kaynakta hepsi blok: koyduğun yerde sonsuza kadar durur.
Yerde unutulmuş bir mayın, sahibini bir ay sonra öldüren bir şeydir.

**Alınmayan 43 fikrin her biri gerekçesiyle yazılı** — 6'sı bizde zaten var,
5'i Bedrock'ta yapılamaz (kamera, blok cebi, projektör, kılık modülü, sonik
sistem), 13'ü yapılabilir ama bu sürüme sığmadı, gerisi dekoratif.

## Test

`test/securitycraft.mjs`, 43 madde. Mutasyon bataryası **11/11** — kendi okunu
düşürme, sahibini vurma, mayını sahibinin tetiklemesi, kurma gecikmesinin
kalkması gibi mutasyonların hepsi yakalandı.

Tarama aracı bir ölü ithal yakaladı (`varlikIste` kullanılmıyordu), silindi.

---

# v7.85.0 — Efsanenin Dünyası

Kullanıcı: *"bana ait bir özel tohum olacak … her yeri bedrock ama her yeri
hava … ben hani havayı yapmak istedim ama etraf oluyor yani gökyüzü olmuyor,
gökyüzünü de ayarla … bana özel bir dünya olacak. Bir efsanenin ona özel bir
dünyası olması gayet güzel bence."*

## Şikâyet doğruydu: gökyüzü ayrı bir mekanizma

`/fog` **yalnızca mesafe sisini** boyuyor. Gökyüzü kubbesi vanilla mavi
kalıyor — kullanıcının "bildiğin sis oluyor" dediği şey tam olarak bu.
Gökyüzü için kaynak paketinde `biomes/` altında **istemci biyomu** tanımı
gerekiyor (`minecraft:sky_color`). İkisi ayrı dosya, ayrı bileşen.

## Renk ölçüldü, seçilmedi

Sis rengi zaten skinden ölçülmüştü: **#20C5B5** (turkuaz, `kol_uret.py`).
Kullanıcı "gökyüzü biraz koyu olsun" dedi. "Biraz" ölçülebilir bir şey değil;
ölçülebilen şey **ufuk çizgisinin görünmesi**.

Aynı ton (174°), aynı doygunluk (%72), parlaklık %45 → **%22**:
**#106159**, sis ile kontrast **3.38:1**.

3:1 eşiği WCAG'in grafik nesneler için ayırt edilebilirlik sınırı. Altına
düşerse gökyüzü ile sis tek bir düz duvar gibi duruyor — yani şikâyetin
kendisi geri geliyor. Test hem alt (≥3:1) hem üst (≤6:1) sınırı tutuyor;
üst sınır siyaha kaçmasın diye.

## İki şey üretiliyor

**`Simsek_Efsane_Gokyuzu`** — gökyüzü + sis paketi, 87 biyom dosyası.
**AYRI paket, bilerek.** Ana pakete konsaydı modu kuran herkesin bütün
dünyası değişirdi; bu depoda oyuncunun dünyasını geri alınamaz biçimde
değiştiren şey alınmıyor (`REFERANS_BORALO_V5.md`, biyom ezmesi maddesi).
`.mcaddon`'a **girmiyor** — testin en önemli maddesi bunu dosyada denetliyor,
niyet beyanında değil.

**`Simsek_v7.85.0_Efsane_Dunyasi.mctemplate`** — açınca kurulu gelen dünya:
tek kat bedrock, üstü boş, üç paket de bağlı. Doğum noktası y=1 (zeminin
üstü); y=4 yazılsaydı her girişte üç blok düşerdi.

Tohum addan türetiliyor (`sha256("Efsanenin Dünyası · Şimşek TNT · #20C5B5")`),
yani yeniden üretilebilir. Düz dünyada tohum arazi üretmiyor — arazi
`FlatWorldLayers`'tan geliyor — ama kullanıcı "bana ait bir tohum" istedi ve
dünyanın kimliği orada duruyor.

## level.dat elle yazıldı

Bu depoda paket yöneticisi yok, o yüzden küçük bir NBT yazıcı/okuyucu yazıldı
(`arac/nbt.py`). Bedrock biçimi Java'dan üç yerde ayrılıyor: sayılar **küçük
sonlu**, dosyanın başında **8 baytlık başlık**, kök etiket **boş adlı**.

**Bu dosyayı oyunda deneyemedim.** Gösterebildiğim tek şey, yazdığımı geri
okuyup birebir aynı sözlüğü elde etmek — `dogrula()` bunu yapıyor ve üretim
ona bağlı: geçmezse dosya hiç yazılmıyor.

Tür denetimi ayrıca test ediliyor, çünkü bu biçimde en sinsi hata **yanlış
tür**: oyun alanı sessizce atlıyor, hiçbir şey söylemiyor. İlk yazılışta
`rainLevel` CIFT yazılmıştı (Bedrock KESIR bekliyor); zaten varsayılanı 0
olduğu için alan tamamen silindi.

## Test

`test/efsane_dunyasi.mjs`, 33 madde. Mutasyon bataryası 11 mutasyon —
**biri kaçtı ve gerçek bir hata buldu**: üretici klasörü temizlemiyordu,
`BIYOMLAR` listesinden çıkarılan biyomun eski dosyası diskte kalıyordu. Yani
liste ile klasör ayrışabiliyordu. Bu deponun daha önce defalarca düştüğü
tuzak (`kol_uret.py`'deki `beklenen` kümesi tam bunun için var). Düzeltildi,
11/11 yakalandı.

---

# v7.84.0 — Boralo V6: 201 eşya okundu, 2 yetenek alındı

İncelemenin tamamı [`REFERANS_BORALO_V6.md`](REFERANS_BORALO_V6.md).

201 eşyanın 121'inde komut var, o eşyaların çağırdığı **176 function'ın
tamamı** okundu. Çıkan mekanik listesinin **ikisi hariç hepsi bu modda zaten
vardı**. Alınan ikisi: **Kan Yağmuru** (bu depoda havaya dokunan tek satır
yoktu) ve **Göz Sensörü** (körlük başka yeteneklerin içindeydi ama tek işi
körlük olan bir şey yoktu; `SERSEM_KOR` bilerek `false`).

Kaynağın amacı korundu, altyapısı değil: süresiz `weather rain` → süreli;
`damage @e` → menzil + kendimiz hariç; `blindness 9999 255` → 60 tick;
`effect @s clear` → oyuncunun etkilerine dokunulmuyor.

Alınmayanlar: `op @a`, `clear @s`, `fatal_poison 9999 255`, `tp @a @s`,
`replaceitem slot.armor.head`, `entities/player.json`. Ayrıca 11 function
komut olarak geçersiz.

---

# v7.83.5 — Gözcü yanlış pozitif taraması + sürüm numaralandırması

v7.82'deki Warden yanlış alarmı bir sınıftı; altı tanesi bulundu: uzun mob
(gövde ekseni), ölçeksiz sıçrama eşiği, 1.21 öncesi katı blok listesi, zamanda
gezen geri itme ölçümü, rüzgâr yükü, vuruş hızı eşiği 8→14.

Sürüm numaralandırması değişti:

| hane | ne zaman artar |
|---|---|
| üçüncü | hata düzeltmesi, yanlış alarm, ayar |
| ortanca | yeni yetenek, yeni sistem, yeniden yapılandırma |
