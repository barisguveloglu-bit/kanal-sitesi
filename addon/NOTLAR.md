# Simsek TNT ve Toprak Topu — geliştirme notları

Minecraft **Bedrock** behavior pack. Sadece resmî `@minecraft/server` Script API
kullanılıyor; resource pack, custom texture, üçüncü parti kütüphane yok.
Hedef platform Android tablet/telefon, o yüzden performans kararları
masaüstüne göre değil mobile göre alındı.

## Yapı

```
addon/
  Simsek_TNT_ToprakTopu/
    manifest.json
    scripts/
      main.js               -> giriş, tick yöneticisi, tetikleme yolları
      ayarlar.js            -> BÜTÜN sabit sayılar
      yardimcilar.js        -> günlük, API uyumluluğu, ortak yardımcılar
      butce.js              -> tick bütçesi + ölçüm harness'ı
      yetenekler/
        kayit.js            -> yetenek kayıt defteri
        _yagmur.js          -> şimşek/TNT için ortak yağmur işi
        yildirim.js
        yildirim_halkasi.js
        alan_simsegi.js
        tnt_yagmuru.js
        toprak_topu.js
  Simsek_Kol_Kaynak/          -> İSTEĞE BAĞLI resource pack
    manifest.json
    animations/simsek_kol.animation.json
  paketle.sh                  -> paketleri üretir
  Simsek_TNT_ToprakTopu_v3.mcpack   (behavior, tek başına çalışır)
  Simsek_Kol_Kaynak_v3.mcpack       (resource, isteğe bağlı)
  Simsek_TNT_v3.mcaddon             (ikisi birden)
```

## Kol animasyonları — isteğe bağlı resource pack

Özel animasyon tanımlamak resource pack gerektiriyor; behavior pack'ten
yaratılamıyor. Bu yüzden animasyonlar **ayrı ve isteğe bağlı** bir pakete
konuldu. Behavior pack o paket olmadan da tam çalışır.

| `OZEL_ANIMASYON` | ne olur |
|---|---|
| `false` (varsayılan) | `animation.zombie.attack_bare_hand` — oyunda hazır gelir, ek paket gerekmez. Kollar öne uzanır. |
| `true` | Kollar gerçekten havaya kalkar. Resource pack'in dünyada **etkin olması şart**. |

Resource pack etkin değilken `OZEL_ANIMASYON = true` bırakırsan
`playanimation` sessizce başarısız olur ve kol hiç kalkmaz.

Pakette dört animasyon var:

| animasyon | ne yapar |
|---|---|
| `animation.simsek.kol_kaldir` | iki kol yukarı, son karede kalır |
| `animation.simsek.kol_indir` | iki kol aşağı iner |
| `animation.simsek.tek_kol` | sadece sağ kol yukarı |
| `animation.simsek.ileri_it` | iki kol öne doğru iter |

Son ikisi henüz kullanılmıyor, ileriki yetenekler için hazır.

**Dönüş değerleri oyunda denenmedi.** Kol açıları (`-175`, `-85` gibi) hesapla
yazıldı; oyunda tuhaf duruyorsa `animations/simsek_kol.animation.json`
içindeki `rotation` değerleri ayarlanmalı.

Paketlemek için: `sh addon/paketle.sh`

## Yeni yetenek nasıl eklenir

1. `yetenekler/` altına bir dosya aç
2. İçinde `yetenekKaydet({...})` çağır
3. `main.js`'in üstündeki import listesine bir satır ekle

Üçüncü adım kaçınılmaz: Bedrock'ta klasör tarama yok, her dosyanın bir kez
import edilmesi gerekiyor.

```js
import { yetenekKaydet } from "./kayit.js";

yetenekKaydet({
  kimlik: "ornek",          // benzersiz kısa ad
  ad: "Örnek Yetenek",      // oyuncuya gösterilen ad
  esya: "minecraft:stick",  // bu eşya kullanılınca tetiklenir (isteğe bağlı)
  esyasiz: true,            // jest sırasına girsin mi
  sira: 60,                 // jest sırasındaki yeri
  olustur(oyuncu) {
    return {
      ad: "ornek",
      oyuncuId: oyuncu.id,
      calis() { /* her tick; true dönerse iş biter */ return true; },
      bitir() { /* temizlik */ }
    };
  }
});
```

Bütçe isteyen işler `butce.js`'ten `blokIste(n)` / `varlikIste(n)` çağırır ve
sadece dönen kadarını yapar. Kalanını sonraki tick'e devreder.

## Aşama 1 — performans (tamamlandı)

Bu aşamada **oynanış bilerek hiç değiştirilmedi**. Top aynı hızda, aynı
menzilde, aynı yerleri kırıyor. Sadece aynı sonuca daha ucuza varılıyor.

### Yapılanlar

**Delta yazımı.** Eski kod her adımda kürenin tamamını havaya çevirip
tamamını yeniden çiziyordu: adım başına 66 blok işlemi. Arka arkaya iki küre
büyük ölçüde üst üste bindiği için ortak kalan bloklara dokunmaya gerek yok.
Artık sadece fark yazılıyor.

Bakış yönü uçuş boyunca sabit olduğundan tüm uçuşta yalnızca **2 farklı tam
sayı ötelemesi** oluşuyor; delta kümesi bu ötelemeye göre önbelleğe alınıyor,
yani atış başına 2 kez hesaplanıp 30 kez kullanılıyor.

**Merkezî tick yöneticisi ve global bütçe.** Eski kodda her yetenek kendi
`system.runInterval`'ını açıyordu; toplam yüke bakan kimse yoktu. Artık tek
bir yönetici döngü var ve tick başına bütçeyi tüm oyuncular arasında
dağıtıyor:

- `TICK_BLOK_BUTCESI = 28` — tick başına toplam blok işlemi (1 `getBlock` + 1 `setType`)
- `TICK_VARLIK_BUTCESI = 4` — tick başına toplam varlık doğumu

Bütçe değeri **ölçülerek** seçildi. 120 rastgele yönde atış yapılıp uçuş
süresi ve tepe yük karşılaştırıldı (orijinal: 62 tick, 33 blok/tick):

| bütçe | uçuş süresi | tepe yük |
|---|---|---|
| 24 | 80 tick (**%29 yavaş**) | %27 az |
| **28** | **62 tick (aynı)** | **%15 az** |
| 32 | 62 tick (aynı) | %3 az |

28'in altına inince top gözle görülür şekilde yavaşlıyor. Tablette ölçüm
satırındaki `maks` sürekli 5 ms üzerindeyse düşürmek gerekebilir; o zaman
yavaşlama bilinçli bir takas olur.

Bütçe dolarsa iş sonraki tick'e devrediliyor. Kaç oyuncu aynı anda ateş
ederse etsin tavan sabit kalıyor; efektler yavaşlar, sunucu tick'i şişmez.

**Dünya sınırı istisnasız ele alınıyor.** Eski kodda küre y ekseninin dışına
taştığında `getBlock` her blokta istisna fırlatıyor ve boş `catch` bunu
yutuyordu. Artık sınır önceden kontrol ediliyor, istisna hiç oluşmuyor.
Küre sınırı aşarsa top **durmuyor** — eski davranışta olduğu gibi uçmaya
devam ediyor, sadece sınır dışı bloklar atlanıyor.

**Tahsis azaltma.** `getBlock`'a verilen koordinat nesnesi ve `getEntities`
seçenek nesnesi artık her çağrıda yeniden üretilmiyor, tek nesne yeniden
kullanılıyor. Atış başına ~2.070 nesne tahsisi ~5'e indi. `KORUNAN` listesi
dizi taraması yerine `Set`.

**Oyuncu başına tek aktif efekt** ve **ayrılma/ölüm temizliği** eklendi.
Oyuncu dünyadan çıkarsa işi anında iptal ediliyor.

### Ölçüm sonuçları

Eski ve yeni algoritma sahte bir dünya üzerinde 13 senaryoda karşılaştırıldı;
**hepsinde blok durumu ve patlama noktası birebir aynı** çıktı. Aşağıdaki
rakamlar 120 rastgele yön üzerinden ortalamadır (eksen hizalı yönler
gerçekte olduğundan daha iyi sonuç verdiği için kullanılmadı).

| | eski | yeni |
|---|---|---|
| Atış başına blok işlemi | 1.980 | 1.414 (%29 az) |
| Tepe yük | 33 blok/tick | tavan 28 blok/tick (%15 az) |
| Uçuş süresi | 62 tick | 62 tick (değişmedi) |
| Sınıra teğet uçuşta istisna | 60 – 91 | 0 |
| Atış başına nesne tahsisi | ~2.070 | ~5 |

Bütçe tavanı 1, 2, 4 ve 8 oyuncu ile sınandı; hepsinde tick başına en fazla
28 blok işlemi yapıldı.

### Ölçüm harness'ı

Content Log'u tablette okumak zahmetli olduğu için ölçüm ve hata satırları
**sohbete de** düşüyor. İlgili ayarlar:

| ayar | ne yapar |
|---|---|
| `OLCUM_ACIK` | ölçümü açar/kapatır |
| `OLCUM_SOHBETE` | ölçüm satırı sohbete de düşsün mü |
| `HATA_SOHBETE` | hatalar sohbete de düşsün mü |

Dünyaya girince paketin çalıştığını doğrulayan satır:

```
[SimsekTNT v2.5] yuklendi · blok butcesi 28/tick · olcum acik
```

Her atıştan sonra sohbete iki satır düşüyor:

```
[OLCUM] maks 1.0ms ort 0.07ms toplam 5ms
        blok 1316 (17.5/tick) · varlik 0 · tick 75 · butce dolan 43
```

En önemli sütun **`maks`** — tek bir tick'in en kötü süresi. Renk kodu:
yeşil (< 2 ms) sorunsuz, sarı (2–5 ms) sınırda, kırmızı (> 5 ms) bütçe
düşürülmeli.

Hatalar hem Content Log'a hem sohbete düşüyor (aynı hata mesajı sohbete
en fazla 5 saniyede bir yazılır, sohbeti boğmasın diye):

```
[SimsekTNT] HATA @ toprakTopu.bosalt: <mesaj>
  <yigin izi>
```

Yayın veya normal oynanış öncesi `OLCUM_SOHBETE` ve `HATA_SOHBETE`
kapatılmalı.

### API dayanıklılığı

Orijinal kod yalnızca `world.afterEvents.itemUse` kullanıyordu. Performans
aşamasında `playerLeave` ve `playerSpawn` eklendi — bu olaylar oyuncunun API
sürümünde yoksa `.subscribe` çağrısı **script yüklenirken** hata fırlatır ve
paketin tamamı ölür. Bu yüzden:

- Bütün olay abonelikleri `olayaAbone()` üzerinden geçiyor. Eksik olay artık
  sadece ilgili özelliği kapatıyor, paketi öldürmüyor; Content Log'a uyarı
  düşüyor.
- `itemUse` kurulamazsa `KRITIK` satırı yazılıyor (o olmadan hiçbir yetenek
  çalışmaz).
- `isValid` bazı sürümlerde property, bazılarında metot. Metot olan sürümde
  `if (e.isValid)` **her zaman doğru** döner (fonksiyon truthy'dir), yani
  sessizce yanlış çalışır. `gecerliMi()` ikisini de doğru ele alıyor.
- `Date.now` yoksa ölçüm sıfır süreyle çalışmaya devam ediyor.

Bu yol ayrıca test ediliyor: `playerSpawn`/`playerLeave` silinmiş, `isValid`
metot yapılmış ve `Date` kaldırılmış sahte bir API'de script yükleniyor ve
toprak topu normal sonucu üretiyor.

## Aşama 2 — yıldırım ayarları ve eşyasız tetikleme

### Yıldırım süresi

Yağmurun süresi `ceil(sayı / grup) * aralık` tick (20 tick = 1 sn).

| | grup | aralık | süre |
|---|---|---|---|
| İlk hâli | 2 | 3 | 30 tick — 1.5 sn |
| Kısaltılan | 4 | 2 | 10 tick — 0.5 sn |
| **Şimdiki** | **1** | **3** | **60 tick — 3.0 sn** |
| TNT | 2 | 2 | değişmedi |

Şimşekler artık teker teker düşüyor, hepsi birden değil. Ölçüldü: 20 yıldırım
58 tick (2.9 sn).

Daha uzun istenirse `SIMSEK_ARALIK` büyütülür (4 → 4.0 sn, 5 → 5.0 sn).
`SIMSEK_SAYISI` artırmak da süreyi uzatır ve daha çok yıldırım düşürür.

**Dikkat:** yağmur `BEKLEME` süresinden uzun olursa yeni tetikleme beklemeye
takılır. Şu an ikisi de 60 tick. `SIMSEK_ARALIK`'ı 4'e çıkarırsan `BEKLEME`'yi
de 80 yap.

### Eşyasız tetikleme — dört yeteneğin hepsi

Eşya tutmadan hepsi kullanılabiliyor. Eşyalar da çalışmaya devam ediyor.

| jest | ne yapar |
|---|---|
| **eğil + tam yukarı bak** (≈0.4 sn tut) | yeteneği değiştirir, actionbar'da yazar |
| **eğil + zıpla** | seçili yeteneği çalıştırır |

Sıra: Yıldırım Halkası → Yön Şimşeği → Alan Şimşeği → TNT Yağmuru →
Toprak Topu → (başa döner). `ESYASIZ_SIRA` listesinden düzenlenir.

**Neden jest, "kol kaldırma" değil?** Minecraft'ta "kolunu kaldır" diye bir
oyuncu girdisi yok. `playanimation` kolu kaldıran bir **komut** — biz
oynatıyoruz, oyuncu yapmıyor ve okunamıyor. Script'in görebildiği gerçek
girdiler: eğilme, zıplama, koşma, bakış yönü, hareket.

**Neden çalıştırma zıplamaya bağlı?** Yön şimşeği, TNT ve toprak topu
baktığın yere gidiyor. Çalıştırma jesti bakışı kısıtlasaydı nişan
alamazdın. Zıplama bakıştan bağımsız.

Zıplama basılı tutulunca tekrarlamıyor — yalnızca "zıplamıyordu → zıplıyor"
geçişinde tetikleniyor.

| ayar | varsayılan | ne yapar |
|---|---|---|
| `ESYASIZ_ACIK` | `true` | özelliği açar/kapatır |
| `ESYASIZ_EGILME_SART` | `true` | jestler eğilme gerektirsin mi |
| `ESYASIZ_BAKIS_ESIGI` | `0.9` | yukarı bakış eşiği (1.0 = tam dik) |
| `ESYASIZ_TUTMA` | `8` | değiştirme jesti kaç tick tutulmalı |
| `ESYASIZ_TARAMA` | `4` | kaç tick'te bir kontrol |
| `ESYASIZ_IC_YARICAP` | `6` | oyuncuya en yakın kaç blok |
| `ESYASIZ_DIS_YARICAP` | `14` | en uzak kaç blok |

`player.isJumping` API'de yoksa çalıştırma jesti devre dışı kalıyor ve
Content Log'a uyarı düşüyor; değiştirme jesti çalışmaya devam ediyor.

Yıldırım Halkası için iki tasarım kararı:

**Yıldırım oyuncunun üzerine değil, etrafındaki halkaya düşüyor.**
Tetiklemek için yukarı bakmak gerektiğinden "baktığı yer" gökyüzü olurdu ve
yıldırım 150 blok yukarıda görünmez şekilde doğardı. Ayrıca üstüne düşseydi
tetikleyen kişi kendi yıldırımından ölürdü. İç yarıçap güvenlik payı.

**Duruşu bozmadan tekrar tetiklenmiyor.** İlk halde el yukarıda beklerken
bekleme süresi her dolduğunda kendiliğinden yeniden yağıyordu (testte 20
yerine 40 yıldırım çıktı). Artık tekrar tetiklemek için duruşu bozup yeniden
yapmak gerekiyor.

**Maliyet:** tarama 4 tick'te bir yapılıyor (saniyede 5 kez), sadece
`getAllPlayers` + `isSneaking` + `getViewDirection`. Blok bütçesine
dokunmuyor.

## Yetenekler (v3.1 — 9 adet)

| # | yetenek | eşya | jest sırası | maliyet |
|---|---|---|---|---|
| 1 | Yıldırım Halkası | — | 10 | düşük |
| 2 | Yön Şimşeği | blaze_rod | 20 | düşük |
| 3 | Alan Şimşeği | ghast_tear | 30 | düşük |
| 4 | TNT Yağmuru | nether_star | 40 | **yüksek** (30 patlama) |
| 5 | Toprak Topu | clay_ball | 50 | orta (1414 blok) |
| 6 | Baktığını Uçur | — | 60 | çok düşük (anlık) |
| 7 | Uçuş | — | 70 | çok düşük (anlık) |
| 8 | Güçlü TNT | — | 80 | orta (1 patlama, güç 8) |
| 9 | Yıldırım Meteoru | — | 90 | orta (6 patlama, güç 5) |

### Yeni yetenekler hakkında

**Baktığını Uçur.** Bakış konisindeki varlıkları savurur, blok kırmaz. Koni
genişliği `SAVUR_ACI` ile ayarlanır (0.6 ≈ 53°). Arkadakiler etkilenmez —
test edildi. Oyunculara `applyImpulse` çalışmadığı için `applyKnockback`
kullanılıyor; imzası sürümler arası değiştiğinden iki biçim de deneniyor.

**Uçuş.** `applyImpulse` oyuncularda çalışmaz, o yüzden `levitation` efekti
kullanılıyor. Bitince serbest düşüşe geçip ölmeyesin diye `slow_falling` da
veriliyor (7 sn uçuş + 17 sn yavaş düşme).

**Güçlü TNT.** Vanilla TNT'nin patlama gücü motor tarafında **sabit 4** ve
script ile değiştirilemez. Bu yüzden TNT varlığı fırlatılıyor, fitil dolunca
varlık **elle kaldırılıp** yerine kendi patlamamız çağrılıyor. Görünüm vanilla
TNT, güç bizim (`GTNT_GUC = 8`). Varlık kaldırılmazsa çift patlama olur.

**Yıldırım Meteoru.** Her meteor = 1 yıldırım + 1 patlama, 6 tane.

### Patlama bütçesi

Patlama en pahalı iş: güç 4'lük bir patlama ~50 blok kırar ve o kadar item
düşürür; güç 8 bunun kabaca 4 katı. Tablette gerçek maliyet **henüz
ölçülmediği için** tavan bilerek düşük tutuldu:

```js
export const TICK_PATLAMA_BUTCESI = 1;   // tick başına 1 patlama, TÜM oyuncular
```

4 oyuncu aynı anda meteor atınca bile tick başına 1 patlama işleniyor —
test edildi. Ölçüm satırındaki `maks` rahatsa bu değer yükseltilebilir.

## Aşama 3 — kol sistemi (v3.2)

Sekiz **özel kol eşyası**. Elde tutunca 3B kol olarak görünüyor ve o kolun
yeteneğini veriyor.

| eşya | görünen ad | tetiklediği yetenek |
|---|---|---|
| `pa:kol_halka` | Yıldırım Halkası Kolu | yildirim_halkasi |
| `pa:kol_simsek` | Şimşek Kolu | yon_simsegi |
| `pa:kol_alan` | Alan Şimşeği Kolu | alan_simsegi |
| `pa:kol_tnt` | Güçlü TNT Kolu | guclu_tnt |
| `pa:kol_top` | Toprak Topu Kolu | toprak_topu |
| `pa:kol_savur` | Savurma Kolu | savur |
| `pa:kol_ucus` | Uçuş Kolu | ucus |
| `pa:kol_meteor` | Meteor Kolu | meteor |

### Nasıl çalışıyor

**Görünüm** — resource pack'te `attachable`. Eşya elde tutulunca yerine 3B kol
modeli çiziliyor. Model tek: `geometry.simsek_kol`, 4×12×4 kutu (Minecraft'ın
standart kol ölçüsü), sekiz kol da onu paylaşıyor, sadece doku farklı.

**Doku düzeni** — `uv [40, 16]`, yani **64×64 oyuncu skin'indeki sağ kol
bölgesi**. Buraya normal bir skin PNG'si koyarsan kol doğru görünür.

**Tetikleme** — iki yol, ikisi de çalışıyor:
1. Eşyayı kullanmak
2. **Elde kol varken eğil+zıpla** → seçili yetenek yerine **kolun** yeteneği
   çalışır. "Kolu takınca o güce sahip olursun" mantığı bu.

Kol yokken jest sistemi normal seçili yeteneği çalıştırmaya devam ediyor.

### Kayıt

`yetenekler/kollar.js` sadece eşya→yetenek eşlemesi yapıyor; yetenek
dosyalarına hiç dokunulmadı. Kayıt defterine `esyaBagla()` eklendi — var olan
bir yeteneğe ikinci bir tetikleyici eşya bağlıyor.

### Dokular yer tutucu

`textures/entity/*.png` (64×64) ve `textures/item/*.png` (16×16) şu an
üretilmiş basit yer tutucular. Kendi çizimlerini aynı adlarla değiştirmen
yeterli, başka hiçbir şeye dokunmaya gerek yok.

### Yeni kol eklemek

Sekiz dosyayı elle senkron tutmak hataya davetiye olduğu için hepsini **tek bir
üretici** yazıyor: `kol_uret.py` (scratchpad'de). Yeni kol eklemek için oradaki
`KOLLAR` listesine bir satır ekleyip çalıştırmak yeterli — eşya JSON'u,
attachable, iki doku, `item_texture.json` satırı ve iki dil satırı birden
üretiliyor. Sonra `yetenekler/kollar.js`'e bir satır ekle.

## Aşama 4 — kol sistemi yeniden yazıldı (v3.4)

v3.2/v3.3'teki kol sistemi üç ayrı sebepten çalışmıyordu. Referans olarak
`add-ons.zip` içindeki "En İyi BoraLo Kol Modu V2" satır satır karşılaştırıldı.

### Hata 1 — kök kemik adı (görünüm hiç çalışmıyordu)

Geometrinin kök kemiği `kol_kok` adındaydı. Bedrock attachable modelini oyuncu
iskeletine bağlarken **kemik adlarını eşliyor**; oyuncuda `kol_kok` diye bir
kemik olmadığı için model kola hiç oturmuyordu.

Referanstaki 34 kol modelinin **33'ünde kök kemik `RightArm`**. Bizimki de artık
öyle:

```
RightArm  (pivot -5,22,0, kübü yok)
└── kol   (4×12×4, uv [40,16], inflate 0.15)
```

`inflate 0.15` skin'in kendi kolunun üstünü kapatıyor, z-fighting olmuyor.

### Hata 2 — `itemUse` özel eşyalarda tetiklenmeyebiliyor

Bazı sürümlerde `world.afterEvents.itemUse` vanilla eşyalarda çalışıyor ama
özel eşyalarda çalışmıyor. İkinci bir giriş yolu eklendi:

```
items/kol_top.json:  on_use -> "scriptevent simsek:kol kol_top"
main.js:             system.afterEvents.scriptEventReceive
```

İki yol da tetiklenirse ikincisi `yetenekTetikle` içindeki bekleme kontrolüne
takılıp yutuluyor, yani çift çalışma yok. Test: `kol2.mjs`.

### Hata 3 — teşhis edilemeyen `/give` hatası

`/give @s pa:kol_top` "söz dizimi hatası" veriyorsa sebep tek: eşya oyunun
kayıt defterinde yok, yani dünyada **eski sürüm behavior pack** etkin. Komut
satırı bunu söylemiyor. Artık script kendisi bakıyor:

- Açılışta `ItemTypes.get()` ile sekiz eşya tek tek sınanıyor, eksik olanlar
  **adıyla** Content Log'a ve sohbete yazılıyor.
- `/give` yazmaya hiç gerek kalmasın diye üçüncü bir jest eklendi:
  **eğil + tam aşağı bak, tut** → sekiz kol da envantere giriyor. Komut değil
  doğrudan `ItemStack` + `container.addItem()` kullanıyor.

Jest şeması artık tam:

| jest | sonuç |
|---|---|
| eğil + yukarı bak, tut | yetenek değiştir |
| eğil + zıpla | seçili yeteneği çalıştır |
| eğil + aşağı bak, tut | sekiz kolu envantere koy |

### Ek düzeltmeler

- `texts/en_US.lang` + `tr_TR.lang` eklendi — eşya adları artık Türkçe
  karakterli görünüyor (`minecraft:display_name` ASCII kalıyor, dil dosyası
  onun üstüne yazıyor).
- `minecraft:cooldown` 3 sn eklendi (`BEKLEME` = 60 tick ile aynı) — ekranda
  dönen bekleme göstergesi çıkıyor.
- `off_hand` render offset'leri eklendi.
- `import * as api from "@minecraft/server"` kullanıldı: adla import
  ("`import { ItemTypes }`") API'de o ad yoksa modül **bağlanırken** patlar ve
  tüm paket ölür; isim alanı importu sadece `undefined` bırakır.
- Üst düzey `await` kullanılmadı — Bedrock motorunda garantisi yok.

### Ölçüm sonucu — bütçe doğrulandı (v3.1, ~17 atış)

| ölçü | değer | yorum |
|---|---|---|
| blok/atış | 1202–1438 | orijinal ~2046 olurdu → delta önbelleği **%29–30** kazandırıyor |
| blok/tick | 21.1–22.8 | bütçe 28, tavana değmiyor |
| uçuş süresi | 55–66 tick | orijinal 62 → **yavaşlama yok** |
| bütçe dolan tick | 27–35 / ~60 | tick'lerin yarısında tavan zorlanıyor |
| ort | 1.71–2.73 ms | 50 ms'lik tick'in %4'ü |
| maks | 5–22 ms | tek tick'lik sıçrama, patlama tick'i |

`TICK_BLOK_BUTCESI = 28` **değiştirilmedi**. 24'e düşürmek uçuşu 80 tick'e
çıkarıyordu (ölçülmüştü), 32'ye çıkarmanın faydası yok çünkü zaten 22.8
blok/tick'i geçmiyor. 22 ms'lik maks patlamadan geliyor,
`TICK_PATLAMA_BUTCESI` zaten en düşük değerde (1).

## Aşama 5 — referanstan alınan dört yetenek (v3.5)

`add-ons.zip` içindeki iki mod (BoraLo Kol Modu V2 + Nitroksin) tamamen
söküldü. İkisi de aynı araçla üretilmiş (pamobile "Addons Maker"), tamamı
`.mcfunction`, hiç JavaScript yok. Kol Modu 3 MB ama **gerçek mantık 113
satır**; Nitroksin'de de durum aynı.

### Referansın komut dağarcığı

Altı kol ailesinin (Dirt, Bedrock, Anna1545, Bobby, Buz, Falen) bütün
yetenekleri şu sekiz komuttan ibaret:

| yetenek | referanstaki komut |
|---|---|
| şimşek | `summon lightning_bolt^^^12` |
| uçma | `effect @s levitation 1 2` |
| uçurma | `execute @s^^^N /effect @e[r=N,c=1] levitation 1 255` |
| meteor | `execute @s^^^12 /summon tnt ~~30~` |
| örs yağdır | `execute @s^^^6 /setblock ~~10~ anvil` |
| yamultma | `slowness 100000 255` + `animation.fox.sleep` |
| buz adam | hedefin kafasına `pa:buz_man` kaskını kilitle |
| can verme | `effect @s health_boost 100000 255` |

### Referansın menü sistemi

"Sağ Tıkla" eşyası bir menü açıcı: kullanınca envantere 5 yetenek eşyası
`give` ediyor. "Kapat" eşyası hepsini `clear` edip açıcıyı geri veriyor.
Gerçek bir menü yok. Bizde bu işi jest sistemi yapıyor; ileride
`@minecraft/server-ui` ile gerçek menü gelecek.

### Referansta bulunan hatalar

1. **`simsekbedrockarm.mcfunction` → `summin lightning_bolt^^^12`.** `summon`
   yazım hatası; Bedrock Arm'ın şimşeği hiç çalışmıyor. Diğer beş kolda doğru.
2. **`falenkol3` → `execute @s^^^7 /effect [r=7,c=1] levitation 1 30`.** Hedef
   seçici (`@e`) eksik; Falen Kol'un "Uçur"u çalışmıyor.
3. **`buzkoz` → `clear @a pa:buz_man`.** Bir kişiyi çözerken haritadaki
   herkesi çözüyor.
4. **Üç ayrı uçurma fonksiyonu sonunda `effect @s clear`.** Kendi
   levitation'ından kurtulmak için ama bütün faydalı efektleri de siliyor.
5. **`dirtarmyamultma` → `slowness 100000 255`,** yani ~83 dakika felç ve
   geri alan hiçbir fonksiyon yok.
6. **35 boş fonksiyon her tick çağrılıyor** (`tick.json`, hepsi 0 bayt).
   Nitroksin'de 22 girişin 12'si boş; dolu 10'u her tick **50 tane
   `@e[hasitem=...]`** taraması yapıyor. `@e` dünyadaki bütün varlıkları
   geziyor — gözü sadece oyuncu takabildiği için `@a` yeterdi.
7. **Nitroksin `ucmahiperiksin.mcfunction` → `animation...nitroksin_laze`.**
   Sondaki `r` eksik, uçuş pozu hiç oynamıyor.
8. **Nitroksin lazeri kendine vuruyor** (`@e[r=2,c=1]` oyuncuyu da sayıyor);
   çözüm yerine hemen öncesine `instant_health` konmuş.

### Nitroksin nasıl çalışıyor (aldığımız fikir)

İksir `minecraft:food` bileşenli bir eşya: içince efekt veriyor,
`using_converts_to` ile boş şişeye dönüşüyor ve bir fonksiyon çalıştırıyor.
O fonksiyon kafa zırhı slotuna **kilitli bir "göz" eşyası** takıyor
(`item_lock: lock_in_slot`). Göz hem görünüm hem durum bayrağı: `tick.json`
her tick `@e[hasitem={item=pa:beyaz_goz,location=slot.armor.head}]` seçip buff
veriyor. Görünüm `.player.json` attachable'ından geliyor ve
`variable.helmet_layer_visible = 0.0` ile kaskın kendisini gizliyor.

Bu numara Bedrock'ta beyaz göz yapmanın **doğru** yolu; ileride Nitroksin
yapılırsa aynen alınacak. Ama güç mantığı script'e taşınmalı: bizde durum
`Map<oyuncuId, kademe>` olur, her tick dünya taraması gerekmez.

### v3.5'te eklenenler

**Can Verme** (`can_verme.js`) — referans sadece `@s`'ye 100000 tick,
seviye 255 `health_boost` veriyordu. Bizimki:
- çevredeki **dostları** da iyileştiriyor (asıl "can verme" bu)
- süresi belli (`CAN_SURE`), seviyeler makul
- düşmanları atlıyor (`CAN_DUSMAN`) — yoksa sana saldıran zombiyi de iyileştirirsin
- `health_boost` yerine `absorption`: health_boost can barının **tavanını**
  yükseltiyor ama boşunu doldurmuyor, yani yaralı birine hiçbir şey yapmıyor

**Örs Yağdır** (`ors.js`) — referans tek örs koyup orada ne varsa yok
ediyordu. Bizimki birden fazla örs yağdırıyor, **sadece hava olan yere**
koyuyor, blok bütçesine uyuyor, dünya sınırının dışına çıkmıyor. Örsün
düşmesi ve hasar vermesi vanilla fiziği, ayrıca hesaplamıyoruz.

**Buz Adam** (`buz_adam.js`) — referans sadece görünüm değiştiriyordu
(hedef serbest kalıyordu) ve kalıcıydı. Bizimki gerçekten hapsediyor:
hedefin etrafına buz kabuğu örülüyor, yavaşlık veriliyor, süre dolunca
buz eriyor. Üç aşamalı iş: **ÖRME → BEKLEME → ERİME**. Örme ve erime blok
bütçesine uyuyor, bekleme bedava. Sadece havanın yerine buz konuyor ve
erirken yalnızca **bizim koyduğumuz** buz kaldırılıyor — hiçbir şey yok
olmuyor.

> `i` ve `eritilen` ayrı sayaçlar. Tek sayaç olsaydı iş ÖRME sırasında
> durdurulunca (oyuncu çıktı, hata oldu) `bitir()` yanlış yerden başlar ve
> koyduğumuz buzu temizlemeden bırakırdı.

**Düşen Meteor** (`meteor.js` yeniden yazıldı) — eski hâlimiz anlık
yıldırım + patlamaydı, **gelen bir şey görünmüyordu**. Referansın tek iyi
tarafı meteorun görünmesiydi (`summon tnt ~~30~`), zayıf tarafı vanilla
TNT'nin gücünün motorda sabit 4 olması. İkisi birleştirildi: gövde yukarıda
doğup gerçekten düşüyor, yere yaklaşınca kaldırılıp yerine **bizim**
patlamamız çağrılıyor. `METEOR_YUKSEK = 0` eski anlık davranışa döndürür.

Havada birden fazla gövde olabilir; hepsi tek listede izleniyor ve patlama
bütçesini paylaşıyorlar. `METEOR_TAVAN` takılan bir gövdenin işi sonsuza
kadar açık tutmasını engelliyor. `bitir()` havada TNT bırakmıyor — bıraksa
fitili dolunca vanilla güç-4 patlaması yapardı.

Üç yeni kol eklendi: `pa:kol_can`, `pa:kol_ors`, `pa:kol_buz`. Toplam **11
kol, 12 yetenek**.

### Testler

`dort.mjs` her yetenek için "referansın yaptığı hatayı biz yapmıyoruz"
iddiasını ayrı ayrı sınıyor: düşman iyileştirilmiyor mu, dolu yere örs
konmuyor mu, buzun hepsi eriyor mu, patlama gücü vanilla 4 değil mi, hiçbir
tick blok bütçesini aşmıyor mu.

İki test kendi hatalarını yakalattı:
- Sahte dünyanın `getViewDirection`'ı birim vektör döndürmüyordu; gerçek API
  döndürüyor. Düzeltilince `kol2.mjs`'teki "düz bakış" vektörünün
  `(0,-0.3,0)` olduğu ortaya çıktı — normalleştirilince **tam aşağı**, yani
  test yanlış şeyi sınıyormuş.
- `dort.mjs`'te nişan açısı fazla dikti, hedef taş katmanına düşüyordu ve
  "sadece havaya koyar" kuralı yüzünden hiçbir örs konmuyordu.

## Aşama 6 — eşya formatı: deneysel bağımlılıklar kaldırıldı (v3.6)

v3.5 oyunda **11/11 kol eşyası kaydolmadı**. Açılış teşhisi bunu doğru
yakaladı ama sebep tahmini yanlıştı ("eski sürüm pack etkin" diyordu; oysa
dünyada tek sürüm vardı, 3.5.0).

Tek bir JSON bozuk olsa **1/11** düşerdi. **11/11** düşmesi yapının
tamamının reddedildiğini gösteriyor. İki deneysel bağımlılık vardı:

1. **`format_version: "1.16.100"`** — eski veri-tabanlı eşya formatı.
   Modern sürümlerde **"Holiday Creator Features"** deneysel ayarı açık
   değilse sessizce yok sayılıyor.
2. **`minecraft:on_use` → `events` → `run_command`** — bu olay yanıtı hiçbir
   zaman kararlı hâle gelmedi.

İkisi de referans moddan (Addons Maker çıktısı) miras alınmıştı; o mod
deneysel ayarlarla çalışıyor olmalı.

### v3.6'daki eşya formatı

```json
{
  "format_version": "1.21.0",
  "minecraft:item": {
    "description": {
      "identifier": "pa:kol_top",
      "menu_category": { "category": "equipment" }
    },
    "components": {
      "minecraft:icon": "kol_top",
      "minecraft:display_name": { "value": "Toprak Topu Kolu" },
      "minecraft:max_stack_size": 1,
      "minecraft:hand_equipped": true,
      "minecraft:allow_off_hand": false,
      "minecraft:cooldown": { "category": "kol_top_bekleme", "duration": 3.0 }
    }
  }
}
```

Bileşenler bilerek az tutuldu: **her fazladan bileşen, eşyanın tamamen
reddedilme riski.** `render_offsets` da çıkarıldı — eski bir bileşen ve bize
gerekmiyor, çünkü modelin kök kemiği `RightArm` olduğu için zaten oyuncunun
koluyla aynı ölçekte çiziliyor.

`kol2.mjs` artık bu deneysel alanların **geri gelmediğini** sınıyor.

### Eşyasız yol her zaman çalışıyor

Eşyalar kaydolmasa bile 12 yeteneğin hepsi jestle çalışıyor. Açılış mesajı
artık bunu söylüyor; "eski paketi kaldır" tavsiyesi kaldırıldı çünkü yanlıştı.

Elle deneme yolu da duruyor: `/scriptevent simsek:kol kol_top` — eşya JSON'unda
`on_use` olmasa da `scriptEventReceive` dinleyicisi yerinde.

## Aşama 7 — Toprak Kol: tek kolda beş yetenek (v3.7)

Şu ana kadar her kol **tek** yetenek taşıyordu. Referans moddaki Dirt Arm ise
bir kol + o kola ait bir yetenek seti şeklinde. Toprak Kol bunu getiriyor:

| sıra | yetenek |
|---|---|
| 1 | Can Verme |
| 2 | Toprak Topu (kil topu) |
| 3 | Yön Şimşeği |
| 4 | Örs Yağdır |
| 5 | **Toprak Yükselişi** (bu kola özel uçuş) |

### Kayıt defteri: eşya → yetenek LİSTESİ

`esyaHaritasi` artık `esya -> [tanim, ...]` tutuyor. Tek yetenekli kollar da
aynı yolu kullanıyor, listede tek eleman var — iki ayrı kod yolu yok.

`esyaninYetenekleri(esya)` diziyi, `esyaninYetenegi(esya)` ilk elemanı
döndürüyor. `esyaBagla()` aynı eşyaya birden çok kez çağrılabilir; yetenekler
sırayla listeye eklenir.

### Seçim kol başına tutuluyor

```
kolSecim: oyuncuId -> { esya, i }
```

Kaydın içinde eşya kimliği de var: elindeki kolu değiştirip geri aldığında o
kolun seçimi yerinde kalıyor. Kol içi geçiş **genel eşyasız sırayı**
karıştırmıyor — ikisi ayrı.

Üç tetikleme yolu da (eşya kullanma, jest, `scriptevent`) aynı seçimi okuyor.

### Toprak Yükselişi

Düz `Uçuş` levitation verip bırakıyor, geride bir şey kalmıyor. Toprak
Yükselişi yükselirken **altında toprak sütunu** örüyor — uçuş bitince kule
duruyor, üstünde durabilirsin.

Levitation'a hâlâ ihtiyaç var çünkü `applyImpulse` oyunculara işlemiyor;
sütun itmiyor, sadece arkandan geliyor. Sadece havanın yerine blok konuyor.
Bütçe doluysa o tick sütun büyümez ama uçuş devam eder — sütunda boşluk olur,
iş durmaz. `TUCUS_TAVAN` sütunu sınırlıyor.

### Doku

Toprak Kol'un dokusu diğerlerinden ayrı üretiliyor (`toprak_dokusu()`):
koyu zemin üzerinde düzensiz toprak lekeleri ve birkaç koyu kırmızı vurgu.
Desen sabit tohumlu — her çalıştırmada aynı çıkıyor, git'te gereksiz
değişiklik görünmüyor. Beş yeteneği olduğu için envanterde ilk bakışta
ayırt edilmesi gerekiyordu.

Toplam: **12 kol, 13 yetenek.**

## Aşama 8 — iksirler, uçurma, yamultma (v3.8)

Kullanıcı iki yeni arşiv gönderdi: `toprakkol modu v3` ve `BoraLo Mod (V14)`.
İkisi de aynı araçla (pamobile Addons Maker) üretilmiş, tamamı `.mcfunction`.

### Ölçek: 21 MB, 1132 satır mantık

| | BoraLo V14 | toprakkol v3 |
|---|---|---|
| fonksiyon | 643 (**139'u boş**) | 165 (**47'si boş**) |
| komut satırı | 1132 | 352 |
| `tick.json` | 161 giriş, **139'u boş** | 48 giriş, **47'si boş** |
| eşya / blok | 245 / 49 | 58 / 10 |

BoraLo V14'te 1132 satırın **721'i** (%64) sadece `give` + `replaceitem` —
yani eşya taşıma, "menü" sistemi. Gerçek oynanış: `effect` 112, `summon` 32,
`playanimation` 31, `particle` 11, `tp` 8, `setblock` 2.

### Referansta bulunan yeni hatalar

1. **`op @s`** — bir fonksiyon oyuncuya operatör yetkisi veriyor, yanında
   `tellraw @a "ADMİN MOD:Eneblad"`. O eşyayı alan herkes op oluyor.
2. **`tp @a @s`** — üç ayrı yerde: bütün oyuncuları kendine ışınlıyor.
3. **`msg @a herkese merhaba`** — pakette kalmış hata ayıklama satırı.
4. **`tp @s^^^12 @s^^^12`** — hiçbir şeyi hiçbir yere ışınlamıyor, ölü satır.
5. **`summon lightning_bolt ^^^+10`** — caret koordinatı `+` kabul etmiyor.
   Aynı modda doğrusu (`^^^10`) da var, yani 6 çağrı sessizce çalışmıyor.
6. **`Gamerule`** — büyük harfle, komut çalışmıyor.
7. **`player.json` vanilla oyuncuyu eziyor** ama 23 bileşeni de vanilla
   kopyası, `animations`/`scripts` boş. Sıfır fayda, tam çakışma riski.
8. **`custom.animation_controllers.json`** içinde `controller.animation.nethercat`
   ve `augustolophus` var — alakasız bir mod'dan kalma ölü ağırlık.
9. **Davranış paketi animasyon denetleyicileri sonsuz döngü:** geçiş şartı
   `(1.0)` (her zaman doğru), iki durum da `on_entry`'de aynı fonksiyonu
   çağırıyor. Bağlanmadıkları için patlamıyorlar.
10. **64 + 68 + 294 tarif dosyasının hepsi boş `{}`.**

### Alınanlar

**İksir / kademe sistemi** (`iksir.js`) — Nitroksin'in bizdeki karşılığı.

Referans: iksir `minecraft:food`, içince kafa zırhına **kilitli** bir "göz"
takıyor, güç o gözden geliyor çünkü `tick.json` her tick
`@e[hasitem={item=pa:beyaz_goz,location=slot.armor.head}]` ile **dünyadaki
bütün varlıkları** tarıyor. Beş göz × beş efekt = tick başına 25 tam tarama.
Gözü çıkarmanın yolu yok, yani güç kalıcı.

Bizde durum script'te bir `Map`. Tarama yok — sadece iksir içmiş oyuncular
geziliyor, kimse içmemişse döngü hiç dönmüyor. **Göz sadece görünüm**, güç
bayrağı değil: oyuncu çıkarsa bile kademe devam eder, o yüzden kilitlemeye
gerek yok. Süre dolunca göz kendiliğinden çıkıyor.

Beş kademe: Nitroksin → Grinoksin → Ateş İksiri → Kan İksiri → Hiperoksin.
Kademeler **birikmiyor** — yeni iksir öncekini iptal eder.

> Kademe iş listesine **girmiyor**. Girseydi "oyuncu başına tek efekt" kuralı
> yüzünden 60 saniye boyunca bütün yetenekler kilitlenirdi.

İçme `itemCompleteUse` ile yakalanıyor (`itemUse` içmeye *başlayınca*
tetikleniyor — yarım bırakıp güç kazanmayasın).

**Uçurma** (`ucurma.js`) — `savur` ile karıştırılmasın: savur `applyImpulse`
ile yatay **iter**, uçurma `levitation` ile **kaldırır**, hedef çaresizce
havada asılı kalır. Referans üç ayrı mesafede (`^^^2`, `^^^5`, `^^^7`) tek tek
hedefliyordu, yani tam o noktalardakiler vuruluyordu; bizimki koninin tamamını
tarıyor. Referansın sonundaki `effect @s clear` bize gerekmiyor — kendimizi
zaten hedef listesine almıyoruz.

**Yamultma** (`yamult.js`) — referans `slowness 100000 255` veriyordu ve geri
alan **hiçbir fonksiyon yoktu**. Bizimki süreli ve **çaresi var**: felçli
birine aynı yeteneği tekrar kullanırsan çözülür. Sadece bizim felç
ettiklerimiz çözülüyor, başkasının verdiği yavaşlığa dokunulmuyor.

Üç yetenek de `koniHedefleri()` yardımcısını paylaşıyor; tavan aşılırsa
**en yakınlar** seçiliyor, rastgele değil.

Toplam: **15 yetenek, 12 kol, 5 iksir, 5 göz.**

### Alınmayanlar ve sebepleri

`op`/`tp @a`/`gamemode` komutları (tehlikeli), `player.json` override
(çakışma riski, sıfır fayda), boş tick fonksiyonları, `item_lock` kilidi,
`@e[hasitem]` tarama deseni, boş tarif dosyaları.

## Aşama 9 — yapı düzeltmesi ve görsel efektler (v3.9)

### İksirler artık yeteneklerle aynı yapıda

v3.8'de iksir sistemi `scripts/iksir.js` diye **özel durum** bir dosyaydı ve
`main.js` içinde kendine ait bir `itemCompleteUse` aboneliği vardı. Davranış
doğruydu ama yapı diğerlerinden ayrıydı.

Artık aynı kalıp:

| | yetenekler | kollar | iksirler |
|---|---|---|---|
| kayıt | `yetenekKaydet` | `esyaBagla` | `iksirKaydet` |
| yer | `yetenekler/*.js` | `yetenekler/kollar.js` | `yetenekler/iksirler.js` |
| main.js'te | bir import satırı | bir import satırı | bir import satırı |
| sabitler | `ayarlar.js` | `ayarlar.js` | `ayarlar.js` (`KADEMELER`) |

Dosya kendini kayıt defterine yazıyor ve **kendi aboneliğini kendi kuruyor**;
`main.js` sadece `iksirTara()` çağırıyor. Yeni iksir eklemek =
`ayarlar.js`'teki `KADEMELER`'e bir satır. **Davranış hiç değişmedi** —
`iksir.mjs` testinin tamamı dokunulmadan geçiyor.

### Toprak Duvar

Referans: `fill ^1^5^6 ^-2^^6 dirt` — tek tick'te kutuyu dolduruyor ve orada
ne varsa **yok ediyor**. Bizimki bütçeye uyuyor ve sadece havanın yerine
koyuyor.

Geometri: duvar bakış yönüne **dik** durmalı. Yatay bakış `(bx, bz)` ise dik
eksen `(bz, -bx)` — duvarın genişliği bu yönde uzuyor. Hücreler aşağıdan
yukarı ve ortadan dışa doğru sıralı: bütçe yetmezse duvar "yarım ama işe
yarar" kalıyor, delik deşik değil. Tam yukarı/aşağı bakarken yön belirsiz
olduğu için uyarı verip çıkıyor.

Toprak Kol'un altıncı yeteneği oldu.

### Parçacık ve ekran sarsıntısı

İkisi de `yardimcilar.js`'te, ayrı ayrı kapatılabiliyor (`PARCACIK_ACIK`,
`SARSINTI_ACIK`) çünkü tablette parçacık pahalıya gelebilir.

- Parçacık: referans `execute @s^^^4 /particle ...` diye **komutla** yapıyordu;
  script API'sinde `dimension.spawnParticle()` var, komut ayrıştırma maliyeti
  yok. Tip tanınmazsa bir kez uyarıp sessizce geçiyor.
- Sarsıntı: script API'sinde karşılığı yok, komut şart. Referans
  `camerashake add @s 4` diyordu — **4 çok fazla**, mide bulandırıyor.
  Bizimki 0.35 şiddet / 0.45 sn.

Patlamada (meteor, güçlü TNT) sarsıntı + patlama parçacığı; can vermede kalp;
buz adamda kar tanesi; duvarda toprak parçacığı.

### Doku paketi incelemesi — asıl sürpriz

`BoraLo Mod V14` kaynak paketinde 491 doku, 265 attachable, 182 model var.
Dosyaları gerçek türlerine göre taradım:

**8 dosyanın adı `.png` ama içeriği JPEG.** Bedrock JPEG yükleyemez — o
dokular oyunda hiç görünmüyor:

```
entity/pamobile/pa_boralo_kiyafet4.png    JPEG 4096x2048
entity/pamobile/pa_boralo_kiyafet_5.png   JPEG 4096x2048
entity/pamobile/pa_boralo_kiyafet_3.png   JPEG 3072x1536
entity/pamobile/pa_boralo_kiyafet_2.png   JPEG 3072x1536
entity/pamobile/pa_boralo_kiyafet_1.png   JPEG 1920x960
blocks/pa_negromeysr_evren_block_up.png   JPEG 420x420
blocks/pa_negromeysr_evren_block_side.png JPEG 225x225
blocks/pa_hhhh_block.png                  JPEG (bozuk başlık)
```

Yüklenebilenler arasında da ölçüsüz olanlar var:

| dosya | boyut | olması gereken |
|---|---|---|
| `pa_entity303_goz.png` | **3072×3072** (9.4 MP) | 64×64 |
| `pa_mezar.png` | 1024×1024 | 64×64 |
| `pa_altn_kulcesi.png` | 512×512 (blok) | 16×16 |
| `pa_gravity_gun.png` | 828×595 (eşya ikonu) | 16×16 |

Tek bir 4096×2048 doku bellekte sıkıştırılmamış **32 MB** yer kaplar. Beş
tanesi 160 MB eder — ve hiçbiri yüklenmiyor bile. Tablette oynanacak bir mod
için bu, script tarafındaki bütün optimizasyonlardan daha büyük bir kalem.

Bizim bütün dokularımız 16×16 ve 64×64; toplam paket 24 KB.

## Aşama 10 — göz lazeri ve gücü kapatma (v4.0)

v3.8/v3.9'da iksir sisteminin **buff kısmı** yapılmıştı ama Nitroksin'in
asıl ikonik yeteneği atlanmıştı: **gözden çıkan lazer**.

### Referanstaki lazer

Beş kademenin lazer fonksiyonu da **birebir aynı**:

```
replaceitem entity @s slot.armor.head 1 pa:X_goz_lazer 1 0 {"item_lock":...}
effect @s instant_health 1 4
execute @s^^^2 /damage @e[r=2,c=1] 6 fire
execute @s^^^4 /damage @e[r=4,c=1] 6 fire
execute @s^^^6 /damage @e[r=6,c=1] 6 fire
execute @s^^^8 /damage @e[r=8,c=1] 6 fire
give @s pa:X_lazer_bitid
playanimation @s animation.pa_yeni_haraket.nitroksin_lazer
```

Sabit 6 hasar, sabit 8 blok, kademe farkı yok. Üç sorunu var:

1. **Nokta tarıyor, çizgi değil.** 2/4/6/8. bloktakiler vuruluyor, 3., 5. ve
   7. bloktakiler kurtuluyor.
2. **`@e[r=2,c=1]` oyuncunun kendisini de sayıyor.** Bu yüzden her lazerden
   önce `effect @s instant_health 1 4` var — kendi lazerinle vurulup anında
   iyileşiyorsun. Yama, çözüm değil.
3. **"Lazeri kapat" düğmesi de aynı dört hasar satırını çalıştırıyor**, yani
   kapatmak da hasar veriyor.

Ayrıca **Kan (Bloody) kademesi tamamen bozuk**: dört eşya
`pa:Bloody_goz`, `pa:Bloody_goz_lazer`, `pa:Bloody_lazer_basla`,
`pa:Bloody_lazer_bitid` diye **büyük B** ile çağrılıyor ama
`pa:bloody_...` diye küçük harfle tanımlı. Bedrock kimlikleri büyük/küçük
harfe duyarlı, yani o kademenin gözü de lazeri de hiç çalışmıyor.

### Bizdeki lazer

Işın bir **çizgi**. Tek `getEntities` çağrısı yapılıyor, sonra her varlığın
ışın üzerine izdüşümü hesaplanıyor:

```
ileri     = (hedef - baş) · bakış          → ne kadar ilerde
sapmaKare = |hedef - baş|² - ileri²        → ne kadar yanda
vurulur   ⟺ 0 ≤ ileri ≤ menzil ve sapmaKare ≤ kalınlık²
```

Dört ayrı dünya taraması yerine **bir** tarama — hem daha doğru hem daha ucuz.
Kendimizi hedef listesine hiç almıyoruz, o yüzden kendini iyileştirme
yamasına gerek yok. Tavan aşılırsa en yakındakiler vuruluyor.

Hasar ve menzil **kademeye göre** artıyor:

| kademe | hasar | menzil |
|---|---|---|
| Nitroksin | 6 | 10 |
| Grinoksin | 8 | 14 |
| Ateş İksiri | 10 | 18 (+ ateşe verir) |
| Kan İksiri | 13 | 22 |
| Hiperoksin | 16 | 28 |

İksir içmemişsen lazer çalışmıyor ve sebebini söylüyor — lazer gözden çıkar,
göz de iksirden gelir.

Göz lazer atarken **parlak varyantına** geçip bitince normale dönüyor
(referansta da böyleydi, tek farkı bizde kilit yok). On göz eşyası: beş normal,
beş lazer.

### Gücü Kapat

Referanstaki `kapama` fonksiyonunun karşılığı. Orada sadece **eşyalar**
temizleniyordu (`clear @s pa:mavi_goz` vb.), efektler üzerinde kalıyordu —
üstelik göz `item_lock` ile kilitli olduğu için `clear`'ın işe yarayıp
yaramadığı da belirsiz. Bizimki efektleri siliyor, gözü çıkarıyor ve kayıttan
düşürüyor.

Toplam: **18 yetenek, 12 kol, 5 iksir, 10 göz.**

## Aşama 11 — ikon formatı (v4.1)

Eşyalar envanterde **var** ama ikonları görünmüyordu. Önce bizim tarafı
doğruladım, tahmin etmeden:

- 27 eşyanın 27'sinin `minecraft:icon` adı `item_texture.json`'da kayıtlı
- bütün PNG'ler geçerli (`file` ile doğrulandı), 16×16/64×64, içleri dolu
  (ikon başına ~78 saydam olmayan piksel)
- `.mcpack` içinde `textures/item_texture.json`, `texts/*.lang`, 28 ikon,
  23 attachable — hepsi yerinde

Yani atlas, doku ve paketleme sağlam. Geriye iki ihtimal kalıyor.

### İhtimal 1 — ikon bileşeninin biçimi

`minecraft:icon` iki biçimde yazılabiliyor:

```json
"minecraft:icon": { "texture": "kol_top" }   // 1.16.100'den beri
"minecraft:icon": "kol_top"                  // daha yeni kısayol
```

v3.6'da eşyaları kararlı formata taşırken düz metin kısayolunu kullanmıştım.
Eşyalar **kaydoldu** (envanterde çıkıyorlar) ama ikon araması başarısız.
Uzun süredir desteklenen `{"texture": ...}` biçimine dönüldü;
`format_version` `1.21.0` olarak kalıyor çünkü kaydolmanın o sürümle
çalıştığı zaten kanıtlandı.

### İhtimal 2 — kaynak paketi dünyada etkin değil

İkonların ve 3B kol görünümünün **tamamı** resource pack'te. Behavior pack
resource pack'i göremiyor (Bedrock'ta böyle bir API yok), o yüzden script
bunu tespit edip raporlayamıyor. Açılış mesajına kullanıcının nereye
bakacağı eklendi.

Ayırt etme yolu: kolu eline al.
- **Düz bir kare** görüyorsan → resource pack etkin değil (attachable hiç
  yüklenmemiş)
- **Kol şeklinde** bir şey görüyorsan (mor/siyah bile olsa) → resource pack
  etkin, sorun doku yolunda

## Aşama 12 — içme hatası ve kademe güçlendirmesi (v4.2)

### İçince hiçbir şey olmuyordu — gerçek hata

İksir eşyasında `minecraft:use_animation` yoktu. **Bu bileşen olmadan oyun
eşyayı içilebilir saymıyor:** dokununca içme animasyonu başlamıyor,
dolayısıyla `itemCompleteUse` olayı hiç tetiklenmiyor ve iksir tamamen ölü
kalıyor. `minecraft:food` tek başına yetmiyor.

Eklenen: `"minecraft:use_animation": "drink"`.

### Yedek tetikleme yolu

Aynı hatanın tekrar sessizce olmaması için ikinci bir yol açıldı:

| olay | ne zaman | rol |
|---|---|---|
| `itemCompleteUse` | içme **bitince** | asıl yol — yarım bırakıp güç kazanamazsın |
| `itemUse` | içmeye **başlayınca** | yedek — içme hiç tamamlanmazsa devreye girer |

Çift tetiklenme sorun değil: aynı iksir 30 tick içinde ikinci kez gelirse yok
sayılıyor, süre baştan başlamıyor. Hangi yoldan geldiği Content Log'a
yazılıyor, yani bir daha teşhis etmek kolay.

### Efektler artık görünür

`showParticles: false` idi — oyuncu efekt aldığını anlayamıyordu. `true`
yapıldı; artık iksir içince etrafında parçacık dönüyor ve efekt ikonları
ekranda çıkıyor.

### Kademeler güçlendirildi

Kullanıcının istediği gece görüşü ve kalkan (absorption) **beş kademeye de**
eklendi. Hiperoksin açık ara en güçlüsü olacak şekilde ayrıldı:

| kademe | efekt | öne çıkan |
|---|---|---|
| Nitroksin | 6 | hız 2, güç 2, kalkan 2, gece görüşü |
| Grinoksin | 7 | + direnç |
| Ateş İksiri | 7 | + ateş bağışıklığı |
| Kan İksiri | 7 | + kazma hızı, kalkan 5 |
| **Hiperoksin** | **11** | hız 6, güç 6, **kalkan 7**, su altında nefes, yüksekten düşme koruması |

Hiperoksin'de levitation bilerek yok: sürekli levitation kontrolü elinden
alıyor, yerde duramıyorsun. Yerine `slow_falling` — yüksekten atlayabilirsin,
ölmezsin, ama kontrol sende. Uçmak istersen zaten Uçuş yeteneği var.

### Eşyalar görünmüyor — teşhis

İşlevleri çalışıyor ama ikonları görünmüyor. Bizim taraf tekrar doğrulandı
(27/27 ikon atlasta, PNG'ler geçerli ve dolu, paket içeriği tam), yani
kaynak paketi dünyada etkin değil.

Behavior pack ve resource pack Minecraft'ta **ayrı iki liste**. İki `.mcpack`
ayrı ayrı kurulunca davranış paketi açılıp kaynak paketi kapalı kalabiliyor.
Çözüm: tek dosyalık `.mcaddon` — Minecraft ikisini birlikte içe aktarıyor.

## Aşama 13 — atlas biçimi (v4.3)

v4.2'de "kaynak paketi etkin değil" tahmini **yanlış çıktı** — kullanıcı ikisini
birlikte kuruyor ve kaynak paketi açık olmasına rağmen ikonlar görünmüyordu.

Bu sefer tahmin yerine, referansın **çalışan** kaynak paketiyle bizimkini
karşılaştırdım. Üç fark çıktı:

| | referans (çalışıyor) | bizde (v4.2) |
|---|---|---|
| `resource_pack_name` | `"vanilla"` | `"simsek_kol"` |
| `textures` değeri | dizi: `["textures/items/x"]` | düz metin: `"textures/item/x"` |
| klasör | `textures/items/` (çoğul) | `textures/item/` (tekil) |

`resource_pack_name` bilinen bir tuzak: atlasın vanilla atlasıyla birleşmesi
buna bağlı, kendi paket adını yazınca girdi bulunamıyor. `textures` alanının
dizi biçimi de belgelerde ikisi de geçiyor ama çalıştığı **kanıtlı** olan dizi.

Üçü de referansa uyduruldu. `kol2.mjs` artık bu biçimi de doğruluyor:
atlas başlığı `"vanilla"` mı, her girdi dizi mi, yol `textures/items/` ile mi
başlıyor.

### Ek düzeltmeler

- **`pack_icon.png`** eklendi (iki pakete de). Yoksa paket listesinde boş gri
  kare çıkıyor ve hangi paket olduğunu ayırt etmek zor.
- Kaynak paketinin adı hâlâ "v3" diyordu → **"Simsek Kol Gorunumleri v4"**,
  açıklaması da ne işe yaradığını söylüyor artık.
- `min_engine_version` iki pakette de `[1,20,0]`'a çekildi — bir değişken daha
  elendi (referans `[1,17,0]` kullanıyor).

## Bekleyen işler

Sıradaki aşamalarda yapılacaklar, henüz **yapılmadı**:

1. **Uyumluluk.** `manifest.json` içinde `@minecraft/server` `"2.0.0"`
   isteniyor ama `min_engine_version` `[1, 21, 0]`. 2.0.0 stable API'si
   bundan çok daha yeni bir sürümle geldi. Doğru değeri yazmak için oyunun
   tablet üzerindeki sürümünün bilinmesi gerekiyor.
2. **Yeni özellikler.** Toprak topu için "blokları düşürerek kır" modu,
   yetenek başına ayrı bekleme süresi, `@minecraft/server-ui` seçim menüsü.
5. **TNT yükü.** 30 TNT tabletteki en ağır kalem ve bu script
   optimizasyonuyla çözülmüyor — sayı/oynanış kararı gerekiyor.
6. **Kalan yetenekler.** Mermi varlığı (`pa:ucur123_bullet` benzeri),
   `@minecraft/server-ui` seçim menüsü, yetenek başına ayrı bekleme süresi.
7. **Kol dokuları.** `textures/` altındakiler hâlâ üretilmiş yer tutucu; her
   kolun rengi farklı ama çizim değil. Aynı adlarla değiştirmen yeterli.
8. **Oyunda denenmedi.** Attachable'ın gerçekten doğru çizildiği ve
   `scriptevent` köprüsünün tablette çalıştığı henüz görülmedi.
