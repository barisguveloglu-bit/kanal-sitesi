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

## Aşama 14 — v4.3 geri alındı, kol düzeni ve buz mızrağı (v4.4)

### v4.3 geri alındı

Kullanıcı **v4.2'nin oyunda çalıştığını** bildirdi: ikonlar görünüyor, kollar
çiziliyor. v4.3 atlas biçimini "referansa uydurmak" için değiştirmişti
(`resource_pack_name` → `"vanilla"`, `textures` → dizi, klasör → `items/`).
Yani **çalışan bir şeyi düzeltmeye çalışıyordu.** Üçü de geri alındı ve
`kol2.mjs` artık v4.2 biçimini kilitliyor — bir daha kaymasın.

Ders: bir sonraki sürümde çalıştığı doğrulanmadan "daha doğru" görünen
biçime geçmek, düzeltme değil risk.

### Üretecin sildiği dosyalar

`kol_uret.py` yalnızca **yazıyordu**. Listeden bir kol çıkarılınca eski
`items/`, `attachables/` ve doku dosyaları diskte kalıyor, pakete giriyor ve
oyunda hâlâ görünüyordu — `kol_meteor` ve `kol_tnt` kaldırıldığında tam bunu
yaptı. Üreteç artık ürettiği kümede olmayan dosyaları siliyor: **disk = üretecin
çıktısı.**

### Kol düzeni değişti

| kol | yetenekler |
|---|---|
| **Toprak Kol** | Can Verme, Toprak Topu, Yön Şimşeği, Örs, Toprak Yükselişi, Toprak Duvar, **Meteor**, **Güçlü TNT** |
| **Buz Kol** | Buz Adam, **Buz Mızrağı** |
| diğer 8 kol | tek yetenek (değişmedi) |

`pa:kol_meteor` ve `pa:kol_tnt` **tamamen kaldırıldı** — yetenekleri Toprak
Kol'a taşındı, yetenek dosyalarına dokunulmadı.

### Dokular

- **Toprak Kol**: kırmızı vurgular kaldırıldı. Artık sadece toprak tonları —
  koyu kahve zemin üzerinde açık/orta kahve lekeler, arada tek tük gri taş.
- **Buz Kol**: kendi paleti (buzul mavisi), aynı lekeli desen mantığı.

### Buz Mızrağı

Baktığın yöne buz parçası fırlatıyor. Çarptığına **2 dakika** yavaşlık +
zehir + zayıflık veriyor. Zehir canı yavaş yavaş götürüyor ama **öldürmüyor**
(vanilla zehir 1 canda bırakır) — hedefi hapsedip eritiyorsun, anında infaz
değil.

Mızrak **varlık değil**, iş olarak uçuyor: her tick `MIZRAK_HIZ` blok
ilerleyip yolda çarpma arıyor. Böylece varlık bütçesi harcanmıyor, chunk
sınırında kaybolmuyor ve biri onu vurup yok edemiyor.

Çarptığı yere kısa bir buz dikiti bırakıyor; o da süresi dolunca eriyor ve
yalnızca **bizim koyduğumuz** blok kaldırılıyor.

Toplam: **19 yetenek, 10 kol, 5 iksir.**

## Aşama 15 — Dave1545 modu, hedef kilidi ve çift el (v4.5)

Kaynak: `Dave1545.zip` (BoraLo'nun "toprak atan" karakteri).
15 eşya, 44 `.mcfunction`, tamamı tek satırlık komut.

### Referanstaki hatalar

Beş yetenek fonksiyonundan **dördü hiç çalışmıyordu** — sözdizimi bozuk:

| Dosya | Komut | Sorun |
|---|---|---|
| `dave1545_koll_barrier` | `fill ~~50~~50~~0barrier` | boşluk yok, ayrıştırılamıyor |
| `dave1545kasirga` | `tp ^5^1^1 facing @p` | boşluk yok |
| `dave1545kollsumsek` | `summon lightning_bolt^^^15` | boşluk yok |
| `davekollbaktiniucur` | `execute positioned^^^10 ...` | boşluk yok |
| `dave1545koll_ors` | `fill ~~15~ ~~11~ anvil keep` | koordinat eksik |

Çalışsalardı da sorunluydular:

- `fill ~ ~50 ~ ~50 ~ ~0 barrier` **dolu** 50³ küp = 125.000 blok. Tablet
  donar; üstelik geri alınmıyor, dünyada kalıcı görünmez bir küp bırakır.
- Kasırga `@e[type=!player]` kullanıyor — **yarıçap yok**, yüklü bütün
  varlıkları çekiyor. `tp` ile taşıdığı için de duvarın içine sokuyor.
- `@e[r=10,c=1]` seçicisi iki yerde geçiyor ve ikisinde de aynı iki kusur
  var: `@e` **oyuncunun kendisini** de kapsıyor, ve **bakış yönüne
  bakmıyor** — arkandaki koyun da "hedef" olabiliyor.
- `levitation 15 255` (baktığını uçur) anında ölümcül.
- Eşyaların hepsi `format_version 1.16.100` + `run_command` — v3.6'da
  teşhis ettiğimiz, eşyaların hiç kaydolmamasına yol açan kombinasyon.

### Alınanlar

**Hedef kilidi** (`KILIT_*`, `yildirim.js`). Kullanıcının istediği:
"tekli şimşek attığında direk karşıdaki hedefe odaklansın, hedef yoksa
normal şimşek atsın." Referansın `@e[r=10,c=1]` fikri alındı, iki kusuru
düzeltildi: `kilitliHedef()` kendini dışlıyor ve bakış konisine bakıyor
(`koniHedefleri` üzerinden, zaten yakından uzağa sıralı).

Referansta olmayan bir ek: kilit **takip ediyor**. `_yagmur.js` artık
`kilit` seçeneği alıyor ve merkezi her partide yeniden okuyor, yani hedef
kaçarsa yıldırım peşinden gidiyor. Hedef ölürse son bilinen yere devam
ediyor (çökmüyor). Kilitliyken saçılma 7 → 1 blok ve şimşek sayısı
20 → 6; nişan alınmış tek hedefe 20 yıldırım hem gereksiz hem tick israfı.

**Kasırga** (`kasirga.js`). Işınlama yerine `applyImpulse`: teğet kuvvet
(döndürme) + merkeze çekim + yukarı kaldırma. Üçü birlikte yörünge
oluşturuyor; teğet tek başına savurur, çekim tek başına toplar. Yarıçap
ve aynı anda işlenen varlık tavanı var. Tavan yüksekliğine varınca
kaldırma kesiliyor, sadece dönmeye devam ediyorlar.

**Koruma kubbesi** (`kubbe.js`). Dolu küp değil **içi boş küre kabuğu**
(~134 blok). Sadece havaya koyuyor, koyduğu yerleri kaydediyor ve süre
dolunca tek tek geri alıyor — dünyada iz bırakmıyor. `bitir()` iş yarıda
kesilse de (oyuncu çıktı, hata oldu) kalanları topluyor; yoksa görünmez
barrier blokları kalırdı.

Üçü de Toprak Kol'a değil **yeni Dave Kolu'na** kondu (`pa:kol_dave`),
yanına daha önce eşyasız kalan `cekme` ve `isinlanma` eklendi. Toprak Kol
zaten sekiz yetenekli; onuncuya geçmek için sekiz kez jest gerekirdi.

### Alınmayanlar (bizde zaten var)

`daveTp` → `isinlanma` · `davekollbaktiniucur` → `savur` ·
`dave1545kendiniucur` → `ucus` · `dave1545koll_ors` → `ors` ·
`pa_kapat` → `guc_kapat` · `dave1545koll_elharaketu` → `kollariKaldir`

Karakter derisi değiştirme (`invisibility 1 0 true` + göğüslük
attachable) alınmadı: görsel bir numara, oynanışa bir şey katmıyor.

### Bütçe sayımı düzeltildi

`ciftel.mjs` yazılırken çıktı: `toprak_topu` blok başına **1** bütçe
birimi istiyordu ama `blokYaz` iki blok API çağrısı yapıyor (getBlock +
setType). Diğer bütün yetenekler doğru sayıyordu (`blokIste(2)`).

Yani top gerçekte tick başına 56 işlem yapıyordu ve tablette ölçüm de o
hâliyle alınmıştı. `toprak_topu` diğerleriyle aynı sayıma geçirildi ve
`TICK_BLOK_BUTCESI` 28 → 56 yapıldı. **Gerçek yük değişmedi** — uçuş
68 tick, tepe 56 işlem/tick, 1360 blok; değişiklikten önce ve sonra
birebir aynı ölçüldü. Sadece rakam artık doğruyu söylüyor.

### Çift el (aynı sürümde)

`AYNI_ANDA = 2`: sağ ve sol eldeki kollar aynı anda çalışıyor. Tek
tetikleme sayılıyor, yani sol el sağ elin beklemesine takılmıyor. Bütçe
ortak olduğu için tick yükü artmıyor, paylaşılıyor.

---

## Aşama 16 — Kevin1545 modu, hapis ve dondur (v4.6)

Kaynak: `Kevin1545_modu.mcaddon`. 37 `.mcfunction`, 10 eşya.
Dave1545 ile **aynı üretici aracından** çıkmış (aynı `.data` dosyası,
aynı `_effect`/tick düzeni, aynı `player.json` şablonu).

### Referanstaki hatalar

| Dosya | Sorun |
|---|---|
| `kol_kopar` | `@e [r=10,c=1]` — `@e` ile parantez **arasında boşluk**, komut çalışmıyor |
| `kevinn_duzelr` | aynı boşluk hatası (geri alma da bozuk) |
| `hapis` | sözdizimi doğru ama **dolu** 3×3×3 dolduruyor — kafes değil demir bloğu |
| `hapis` | `keep` yok: orada ne varsa yok ediyor |
| `hapis` | geri almıyor, dünyada kalıcı demir kule bırakıyor |
| `hapis` | `@e[r=10,c=1]` — oyuncunun kendisini kapsıyor, yön bakmıyor |

Dave1545'ten devralınan aynı kusurlar:

- **Script yok ama script bağımlılığı var.** `modules` sadece `data`,
  hiç `.js` dosyası yok; buna rağmen `@minecraft/server` 1.14.0,
  `@minecraft/server-ui` 1.3.0 ve `@minecraft/common` 1.2.0 isteniyor.
- `min_engine_version` `[1,19,51]` ama RP bağımlılığı `[1,21,80]` istiyor.
- `player.json` yine 22/22 can veren component group'larla dolu.
- `tick.json`'daki 10 fonksiyonun **7'si tamamen boş** — her tick çalışıp
  hiçbir şey yapmıyor.
- 9 `replaceitem ... air` fonksiyonu birebir aynı.

Kevin1545'e özgü yeni hata sınıfları:

- **10 recipe dosyasının 10'u da boş `{}`.** Hiçbiri geçerli tarif değil.
- `entities/pa_heykel_kevin1545.json` "Kevin heykeli" adında ama içeriği
  **köylü**: `make_love`, `open_door`, `panic`, `play`, `random_stroll`
  davranışlarıyla. Çiftleşen ve kapı açan bir heykel.
- `kevin_sifirla` fonksiyonları 1,2,3,**5**,6,7,8 diye numaralı — 4 yok,
  onun yerine `kevin_sword4` diye ayrı isimde bir dosya var.

### Alınanlar

**Hapis** (`hapis.js`). Referansın dördü de düzeltildi: içi boş kabuk
(taban ve tavan kapalı, hedefin durduğu iki kat boş), sadece havaya
koyuyor, süre dolunca geri alıyor, `kilitliHedef` ile nişan alıyor.

**Dondur** (`dondur.js`). Referansın "kol koparma"sı çalışsaydı bile
**sadece görsel** olurdu — `playanimation` bir poz oynatıyor, zombi o
poz içinde sana doğru yürümeye devam ediyor. Videoda "dondu" gibi duran
şey aslında durmuyor. Burada poz korundu ama hedef gerçekten yerinde
tutuluyor (slowness VI). Referansın kalıcı `a 999`'u yerine **süreli**;
etki kısa aralıklarla tazeleniyor, yani iş yarıda kesilirse hedef
saatlerce değil en fazla bir aralık kadar kilitli kalıyor. Hasar yok —
bu bir tutma yeteneği, infaz değil.

İkisi de yeni **Kevin Kolu**'na kondu (`pa:kol_kevin`).

### Alınmayanlar

`kevin1545_tp` → `isinlanma` · `yildirim` → `yon_simsegi` ·
`kevin1545_kol_hareketi` → `kollariKaldir` · heykel entity (köylü
kopyası) · boş recipe'ler.

### Ortak altyapı çıkarıldı

`kubbe` ve `hapis` aynı işi yapıyordu: blok koy, bir süre dursun,
sonra kaldır. `_gecici_yapi.js` içinde toplandı — "sadece havaya koy,
koyduğunu kaydet, süre dolunca geri al, bütçeye uy" mantığı artık tek
yerde. `kubbe.js` 150 satırdan 55 satıra indi, davranışı değişmedi
(testler doğruluyor).

Test: 18/18 geçti (`kevin.mjs` yeni).

---

## Aşama 17 — hapis süresiz oldu, aç/kapa (v4.7)

Kevin1545 dosyası ikinci kez gönderildi; **birebir aynı dosya**
(md5 eşleşiyor). Kafesi açan bir şey var mı diye tüm paket tarandı:

`iron_bars` **tüm pakette tek bir yerde** geçiyor — `hapis.mcfunction`,
yani kuran komutta. Blok silen hiçbir komut yok (`setblock ... air`,
`fill ... air`, `structure`, `clone` — hiçbiri). `kevin_sifirla*`
dosyaları sadece eşya `clear`/`give` ediyor, kafesle ilgisi yok.

**Sonuç: referansta aç/kapa yok.** Kurduğun kafes sonsuza kadar
duruyor, elle kırmaktan başka çaresi yok. Sıfırdan yazıldı.

### Nasıl çalışıyor

Kafes artık **süresiz**. Aynı yetenek neye baktığına göre iki iş yapıyor:

| Durum | Sonuç |
|---|---|
| Önünde hedef **var** | yeni kafes kurar |
| Önünde hedef **yok** | en yakın kafesini **açar** |

Yani nişan alıp kapatıyorsun, boşluğa bakıp açıyorsun. Yeni bir girdi
ya da menü gerekmedi; jest düzeni aynen kaldı.

### Bunun getirdiği üç mimari sorun

**1. Süresiz iş, iş yuvasını tutar.** `AYNI_ANDA` 2; süresiz bir kafes
iş listesinde dursaydı oyuncunun iki yuvasından birini sonsuza kadar
tutardı. Çözüm: kafes iş değil, **kayıt**. `_kafes_defteri.js` tutuyor;
kurma ve açma ayrı ayrı kısa işler.

**2. Script yeniden yüklenince kafesler sahipsiz kalır.** Dünyadan çıkıp
girince modül değişkenleri sıfırlanır — dünyada duran ama açılamayan
demir kutular kalırdı, yani tam da referansın hatası. Çözüm: defter
`world.setDynamicProperty` ile kaydediliyor. Özellik tespiti var; API
yoksa bellekte kalıyor ve kullanıcı uyarılıyor.

**3. Sınırsız kafes = şişen kayıt.** Dünya özelliğinin boyut sınırı var.
`HAPIS_TAVAN = 8`; dolunca yeni kafes kurulmuyor, sebebi söyleniyor.

Kayıt bilerek kısa tutuldu: bloklar merkeze **göre** saklanıyor
(değerler -1..3 arası), yani JSON kısa çıkıyor.

### Altyapı üçe bölündü

`_gecici_yapi.js` içinde artık üç iş var, ortak adımlayıcıları
paylaşıyorlar:

- `geciciYapiIsi` — koy, bekle, kaldır (kubbe; süreli kaldı)
- `yapiOrIsi` — sadece koy, bitince listeyi geri ver (hapis kurma)
- `yapiSokIsi` — sadece kaldır (hapis açma)

`yapiOrIsi` iş yarıda kesilirse (oyuncu çıktı) koyduğu blokları hemen
topluyor — henüz deftere yazılmadıkları için kimsenin kaydında
olmazlardı, dünyada sahipsiz kafes kalırdı.

### Uzaklık sınırı

`HAPIS_AC_MENZIL = 48`. Daha uzaktaki kafes açılmıyor: uzak blok yazımı
yüklenmemiş chunk'a denk gelir ve **sessizce başarısız olur** — kafes
açıldı sanıp açılmamış olurdun. Bu durumda kaç blok uzakta olduğu
söyleniyor.

Boyut kontrolü de var: Nether'dayken Overworld'deki kafes açılmıyor.

Test: 18/18 geçti (`kevin.mjs` genişletildi: süresizlik, dünya yeniden
yüklenmesi, tavan).

---

## Aşama 18 — Güneş modu: menü, ışın topu, yumruk (v4.8)

Kaynak: `güneş modu muhammetlo mz.mcaddon`. Öncekilerden **çok farklı** —
bu mod gerçek script içeriyor: 835 satır JS, `@minecraft/server-ui`
menüleri, script tabanlı mermiler. Fikirleri iyi, uygulaması sorunlu.

### Referanstaki hatalar

**Var olmayan fonksiyon çağrılıyor.** `sp_hiperoksin_ultimega_system`
iki ayrı dosyadan `runCommand("function ...")` ile çağrılıyor ama
`functions/` altında **yok**. Lazer modunun ana eylemi bu — yani her
sağ tıkta komut hatası.

**Her atış kendi `system.runInterval`'ını açıyor.** Bütçe yok, üst üste
biniyor. `kullanDalga` 3 tickte bir 8 hasar × 10 tekrar = 6 blok
yarıçapındaki her şeye 80 hasar, oyunculara 100.

**Oyuncu çıkınca interval durmuyor.** İçerideki `if (!p) return` sadece
o tick'i atlıyor, `system.clearRun` çağrılmıyor — döngü dünya kapanana
kadar dönüyor.

**Durumlar oyuncu ADIYLA anahtarlanıyor** (`player.name`). Ad
değişebilir; `sun_catalina_menu.js` adla, `gunesinoglu_hf.js` kimlikle
tutuyor — aynı pakette iki farklı yöntem.

**Her hedef iki kez vuruluyor.** `getEntities` + `getPlayers` ayrı ayrı
taranıyor ama Bedrock'ta `getEntities` zaten oyuncuları kapsıyor.

**`fireball.isValid()`** — yeni API'de `isValid` bir **özellik**, metot
değil. Çağırınca hata fırlatıyor, `catch` yakalayıp interval'i hemen
kapatıyor; yani yeşil topun çarpma tespiti hiç çalışmıyor.

**Kırmızı Yumruk kalıcı.** Menüden "Aç" deyince kapatana kadar açık;
`entityHurt` içinde `applyDamage` çağrılıyor ve bu yeni bir `entityHurt`
üretiyor — sonsuz döngü koruması yok.

**11 adet 0 baytlık JSON dosyası.** `items/pa_gunes_adam.json`,
`entities/pa_lazer.json` ve benzerleri tamamen boş. Yanlarında iki nokta
üst üsteli gerçek dosyalar var (`items/pa:gunes_adam.json`). **22 dosya
adında `:` var** — Windows'ta bu dosyalar zaten çıkartılamaz.

Devralınan tanıdıklar: `.data` (Addons Maker proje dosyası, içinde
`/storage/emulated/0/Android/data/co.pamobile...` yolları), `player.json`
şablonu, `@minecraft/server` **1.9.0** bildirimi.

Hakkını yiyelim: `durability_manager.js` gerçekten iyi yazılmış (modern
`ItemComponentTypes`, `startup` kaydı, private class alanları) ve
`custom:fire_ball` parçacığı düzgün tanımlanmış.

### Alınanlar

**Menü** (`menu.js`). Fikir doğrudan referanstan: kolu **eğilerek**
kullanınca yetenek menüsü açılıyor, normal kullanınca seçili yetenek
çalışıyor. Toprak Kol'da sekiz yetenek var; sekizinciye jestle geçmek
yedi kez "eğil + yukarı bak + bekle" demekti. Menü bunu tek dokunuşa
indiriyor. Uzun süredir bekleyen iş listesindeydi.

Kritik ayrıntı: `@minecraft/server-ui` **ayrı bir modül**. Statik import
edilseydi ve modül yoksa `import` satırı modül bağlanırken patlar ve
**paketin tamamı** ölürdü — kollar da, iksirler de. Dinamik `import()`
kullanıldı; yüklenemezse menü sessizce kapanıyor ve jestle seçim eskisi
gibi çalışıyor. Test bunu doğruluyor.

**Işın Topu** (`isin_topu.js`). Script ile ilerleyen, her tick önünü
tarayan mermi — bizde bu tür bir yetenek yoktu. Referansın beş kusuru
da kapatıldı: merkezi iş listesinde (bütçeli), oyuncu çıkınca duruyor,
tek tarama (iki kat hasar yok), duvara ve dünya sınırına çarpınca
duruyor, kimlikle anahtarlanıyor. Hazırlık aşaması "Yeşil Top"tan
alındı — elinde toplanırken nişanı değiştirebiliyorsun.

**Güneş Yumruğu** (`yumruk.js`). Açıkken yumruğun ek hasar veriyor.
Bizde "pasif mod" türünde hiç yetenek yoktu. Referansın kalıcılığı
yerine **süreli**; ayrıca sonsuz döngü koruması var (`kendiHasarimiz`
bayrağı) — referansta bu yoktu.

İkisi de yeni **Güneş Kolu**'nda (`pa:kol_gunes`).

### Alınmayanlar

`Yıldırım` → `yon_simsegi` · `Dalga` → `alan_simsegi` + `cekme` ·
`Lazer` → `goz_lazeri` · `Yeşil Top` (hazırlık fikri ışın topuna
alındı, ateş topu fırlatma kısmı `guclu_tnt` ile örtüşüyor) ·
`durability_manager.js` (bizim eşyalarımızda dayanıklılık yok).

Test: 19/19 geçti (`gunes.mjs` yeni).

---

## Aşama 19 — Boralo Mod V2: yakala/bırak, çoklu şimşek (v4.9)

Kaynak: `Boralo Mod V2`. **1148 dosya**, 265 mcfunction, 114 eşya,
112 blok, 2054 satır JS. Şimdiye kadarki en büyüğü.

### Referanstaki hatalar

**"Mob Picker" mobu hiç yakalamıyor.** Adı Mob Picker ama kodu yalnızca
`getNearestPlayer` çağırıyor — sadece **oyuncu** yakalıyor. Adıyla
yaptığı iş tutmuyor.

**Yakalama yöntemi hatalı.** Kurbanı 200 blok yukarı ışınlayıp **5
tickte bir oraya geri ışınlıyor**. Tutsak, dünya boyunca sürekli
ışınlanan bir varlık. Üstelik yakalayan oyuncu çıkarsa `clearCapture`
hiç çağrılmıyor: interval dönmeye devam ediyor ve kurban **sonsuza
kadar** yukarıda kalıyor.

**`victim.isValid()`** — yeni API'de `isValid` bir özellik, metot değil.
İlginç olan: aynı pakette `iceman_staff.js` doğru kullanıyor
(`player.isValid`), `mobpicker.js` yanlış. Tek pakette iki farklı
anlayış.

**`stone_converterr.js` 5,5 saatlik tam kilit.** Vurduğun oyuncuya
`slowness 255` + `invisibility` + `resistance 4` (20000 saniye) veriyor,
üstüne `inputpermission set @s camera disabled` ve `movement disabled`.
Çözen eşya kaybolursa kurban kalıcı olarak donuyor. Çözme komutu da
`effect @s clear` — kurbanın bütün faydalı efektlerini de siliyor.

**`astrape_weapon.js` bekleme süresini `Date.now()` ile tutuyor** —
duvar saati. Oyun duraklayınca veya tick hızı düşünce oyunla alakası
kalmıyor. Ayrıca `cooldowns` Map'i hiç temizlenmiyor.

**`iceman_staff.js`'in bekleme süresi hiç yok** (yorumda "Bekleme
Süresi: YOK" yazıyor) — sağ tık spam'i serbest.

Devralınanlar: `.data`, `player.json` şablonu, `@minecraft/server`
**1.8.0** bildirimi (bu seriye kadarki en eskisi).

### Alınanlar

**Yakala / Bırak** (`yakala.js`). Referansın adının hakkını veriyor:
**mob** yakalanıyor, oyuncu yakalanmıyor. Yöntem de tersine çevrildi —
ışınlayıp tutmak yerine varlık dünyadan alınıp **türü kaydediliyor**.
Sonuç: tutarken **hiç tick maliyeti yok** (test 2000 tick bekleyip
doğruluyor), yakalayan çıksa da kayıt duruyor, dünya yeniden yüklense
de bırakılabiliyor.

Sınırı açıkça yazıldı: bırakınca yeni bir varlık doğuyor, yani
evcilleştirme/envanter korunmuyor. Script API'de NBT kopyalama yok.
Boss'lar ve oyuncu yasak listesinde.

**Çoklu Şimşek** (`coklu_simsek.js`). Astrape'nin en iyi fikri **min
mesafe**: 4 bloktan yakındakini vurmuyor, böylece yıldırımın alan
hasarından kendin yanmıyorsun. `alan_simsegi`'mizde bu yok — o
yarıçaptaki herkesi vuruyor. Bekleme `system.currentTick` ile (referans
duvar saati kullanıyordu) ve yıldırımlar tek tick yerine partiye
bölünerek düşüyor.

İkisi de yeni **Boralo Kolu**'nda (`pa:kol_boralo`).

### Alınmayanlar

`golden_fist` → `savur` · `stone_converter` (5,5 saatlik kilit, oyuncu
hedefli) · `fly_potion` → `ucus` + iksir sistemi · `toprakkol_ui` /
`gelismistoprakkol_ui` → v4.8'de menü zaten geldi · `iceman_staff` →
`buz_mizragi` · `durability_manager` (eşyalarımızda dayanıklılık yok).

Test: 20/20 geçti (`boralo.mjs` yeni).

---

## Aşama 20 — yamultma karşılaştırması, silah denetimi (v4.10)

Soru: Boralo Mod V2'de yamultma var mı, iyiyse alalım? Ve silahları
alalım.

### Yamultma: onlarınki vs bizimki

Onlarınki `spm_advanced_dirtarms_power_3`:

```
tag @p[r=8,rm=1] add Yamul
inputpermission set @p[tag=Yamul,r=8,rm=1] movement disabled
inputpermission set @p[tag=Yamul,r=8,rm=1] camera disabled
playanimation @p[...] animation.sp_m_animasyon_yamulma.
```

**Bizden iyi olan tek yanı: görsel.** Hedef gerçekten yamulmuş gibi
duruyor. Bizde hiç poz yoktu, sadece efekt vardı. **Poz alındı.**

Gerisi bizde zaten daha iyiydi:

| | Boralo Mod V2 | Bizim |
|---|---|---|
| Hedef | `@p` — **sadece oyuncu** | mob + oyuncu |
| Süre | **süresiz** | 8 saniye |
| Çare | ayrı menü kipi ("Düzel/Düzelt") | aynı yeteneği tekrar kullan |
| Kamera | **kapatılıyor** | dokunulmuyor |

`@p` olması tek kişilik dünyada yeteneği **tamamen işlevsiz** bırakıyor.
Süresizlik + ayrı çare kipi de tanıdık tuzak: kolu kaybedersen kurban
kalıcı kilitli.

`inputpermission camera disabled` alınmadı — kurban etrafına bile
bakamıyor ve mobda zaten hiçbir etkisi yok.

**Kelepçe silahından alınan:** `mining_fatigue`. Yamulan biri kazma da
sallayamamalı. Onlarınki 99999 saniye veriyordu; bizimki yeteneğin kendi
süresi kadar.

### Silahlar: neden alınmadı

Moddaki yedi silah scriptinin **altısı sadece oyuncu hedefliyor** —
tek kişilik dünyada hiçbir şey yapmıyorlar:

| Silah | Ne yapıyor | Sorun |
|---|---|---|
| `bugged_diamond_sword` | vurduğun oyuncuyu 60 sn spectator + tam kilit | oyuncu hedefli |
| `voidmultitool` | 5,5 saat slowness 255 + görünmezlik + input kilidi | oyuncu hedefli |
| `stone_converterr` | aynısı, taş derisiyle | oyuncu hedefli |
| `mobpicker` | oyuncuyu 200 blok yukarı hapsediyor | oyuncu hedefli |
| `golden_fist` | 15-22 blok knockback | oyuncu hedefli, `savur` var |
| `fallen_donus1` | dönüştürme | oyuncu hedefli |
| `kelepcejsoenaam` | kelepçe, "30 tıkla kır" | `@e` kullanıyor, mobda çalışır |

Kelepçe tek işe yarar olanı ve fikri güzel — ama kırma eşyası
**yakalayanın** elinde, yani kurban kendini kurtaramıyor; kilidi açması
gereken kişi zaten onu kilitleyen. Actionbar'da kurbana "Kırmak için 30
sağ tık" yazıyor ama kurbanın tıklayacağı bir şey yok. Mekaniği ters.
`mining_fatigue` fikri alındı, gerisi alınmadı.

Kalan hatalar: `effect @e clear` faydalı efektleri de siliyor,
`@e[name="..."]` ile hedefleme (aynı adlı iki zombi varsa ikisi de),
`Date.now()` ile sayaç, `mining_fatigue 99999 255`.

Test: 21/21 geçti (`yamultma.mjs` yeni).

---

## Aşama 21 — iksir modu: içme parlaması (v4.11)

Kaynak: `iksir modu muhammetlo mz`. Güneş modu ile **aynı yapımcı**.
353 dosya. Altı iksir: nitroxin, hiperoksin, grinoxin, redoxin,
firenoxin, forest_fire.

### Kademeler karşılaştırması

Bizimki zaten daha zengin:

| | Referans | Bizim |
|---|---|---|
| Efekt sayısı | 3–5 | 6–7 |
| Seviye | hep 0 ya da 1 | kademeye göre 0–5 |
| Lazer | tek ayar, hepsi aynı | kademeye göre hasar/menzil |
| Gece görüşü | yok | her kademede |
| Emiş (absorption) | yok | kademeye göre 1–5 |

Referansın efektleri düz: `nitroxin` ve `hiperoksin` neredeyse aynı
(ikisi de instant_health + resistance + speed + strength), aralarındaki
tek fark biri jump_boost biri regeneration veriyor. Yani "en güçlüsü
hangisi" sorusunun kodda karşılığı yok.

### Alınan: içme parlaması

Bizde **hiç görsel yoktu** — içiyordun, sadece sohbete satır düşüyordu.
Referansta her iksir kendi renginde ekranı parlatıyor (`camera fade`).
Alındı, beş kademenin beşi de kendi renginde parlıyor.

**Referanstaki hata:** `camera fade` rengi **0.0–1.0** aralığında olmalı.
Aynı pakette:

- `firenoxin` → `color 1 0.5 0` ✓
- `grinoxin` → `color 0.0 1.0 0.0` ✓
- `redoxin` → `color 255 0 0` ✗
- `nitroxin` → `color 255 255 255` ✗

Yani **kırmızı iksir kırmızı değil beyaz parlıyor.** Tek pakette iki
farklı anlayış. Bizim renkler tabloda ve hepsi aralıkta; test bunu
ayrıca doğruluyor (komutta iki basamaklı sayı olmamalı).

### Alınmayanlar

**`gamerule sendcommandfeedback false`** — referans her içme
fonksiyonunun başında bunu ve `commandblockoutput false`'u çalıştırıyor.
Bunlar **dünya ayarı**; iksir içmek dünyanın ayarını kalıcı
değiştirmemeli ve geri de almıyorlar.

**`item_lock: lock_in_slot`** — göz eşyasını kaskı çıkaramayacak şekilde
kilitliyorlar. Sistem bozulursa çıkaramadığın bir kaskla kalırsın;
bizimki süre dolunca gözü kendisi çıkarıyor.

Test: 22/22 geçti (`parlama.mjs` yeni).

---

## Aşama 22 — hiyerarşi kalktı, 3 yeni iksir, duvar delme (v4.12)

### Hiyerarşi kaldırıldı

v4.11'e kadar beş iksir bir **güç merdiveniydi**: nitroksin en zayıf,
hiperoksin en güçlü. Her basamak bir öncekinin her şeyini daha yüksek
seviyede veriyordu — yani dördü aslında gereksizdi, hep sonuncuyu
içerdin.

Artık **yedi iksirin her biri kendi alanında en iyi**, diğer alanlarda
ortalama:

| İksir | Uzmanlık |
|---|---|
| Nitroksin | hız ve zıplama |
| Grinoksin | dayanıklılık |
| Redoksin | saldırı ve kazma |
| Firenoksin | ateş |
| Orman Ateşi | denge |
| Kan İksiri | vampir (lazer can çalar) |
| Hiperoksin | her şeyden biraz — **hiçbirinde en iyi değil** |

Hiperoksin artık "en güçlü" değil: hız 2 (Nitroksin 3), vuruş 3
(Redoksin 4), dayanıklılık 2 (Grinoksin 3). "Ne yapacağımı bilmiyorum"
iksiri.

### Üç yeni iksir + referansa göre güçlendirme

Referanstan alınanlar: **redoksin**, **firenoksin**, **orman ateşi**.

Hepsi onun karşılıklarından güçlü — mantık aynı, seviye yüksek:

| | Referans | Bizim |
|---|---|---|
| Nitroksin | speed 0, jump 0, strength 0 | speed 3, jump 3, strength 2 |
| Grinoksin | **hiç efekt yok** | resistance 3, regen 3, absorption 4 |
| Redoksin | regen 0, speed 0, strength 0 | strength 4, haste 4, speed 2 |
| Firenoksin | fire_res 0, speed 0, strength 0 | fire_res, strength 3, speed 3 |
| Orman Ateşi | instant_health 0, resist 0, speed 0 | 8 efekt, hepsi seviye 2 |

**Referansın grinoxin'inin hiç efekt fonksiyonu yok** — içince yeşil bir
parlama ve göz geliyor, başka hiçbir şey olmuyor. Bizimki dayanıklılık
uzmanı.

### Lazer menzili tekleşti

Kullanıcı isteği. v4.11'e kadar 10/14/18/22/28 blok idi ve "hangisi daha
uzağı vuruyor" diye düşünmek gerekiyordu. Artık hepsi **22 blok**;
iksirler yalnızca **hasar** ve **yan etki** ile ayrılıyor:

- Firenoksin → ateşe veriyor
- Grinoksin → zehirliyor
- Kan İksiri → verdiği hasarın üçte birini cana çeviriyor

### Duvar delme

**Referansta yok.** Tüm pakette "wall" geçen tek yer
`damage @e[r=3] 4 fly_into_wall` ve orası bir **hasar türü** adı (elytra
ile duvara çarpma), blok kırmayla ilgisi yok. Sıfırdan yazıldı.

Lazer önüne çıkan blokları deliyor. Korumalar: `KORUNAN_KUME`deki
bloklar (bedrock, sandık, komut bloğu) delinmiyor, blok bütçesine
uyuyor, tek atışta en fazla 60 blok, `DUVAR_DELME_ACIK = false` ile
kapatılabiliyor.

Test: 23/23 geçti (`duvardel.mjs` yeni, `lazer.mjs` hiyerarşi kalktığı
için yeniden yazıldı).

---

## Aşama 23 — BoraLo V15: ok yağmuru, sarsıntı (v4.13)

Kaynak: `En İyi BoraLo Modu V15`. **3018 dosya**, 809 mcfunction, 309
eşya, 330 tarif, 142 animasyon denetleyici. Şimdiye kadarki en büyüğü —
ama **hiç script yok**, hepsi komut.

### İçeriğin çoğu tekrar

Komut dağılımı: 464 `give`, 154 `replaceitem`, 109 `execute`, 72
`effect`. Yetenek mantığının tamamı `execute @s^^^N /… @e[r=N,c=1]`
kalıbında — bu seride dördüncü kez gördüğüm nokta-örnekleme lazeri.
`slowness 100000 255`, `levitation 1 255`, `setblock ~~10~ anvil`,
`fill … iron_bars` — hepsinin karşılığı bizde zaten var.

Gerçekten yeni olan iki şey alındı.

### Ok Yağmuru

Referans `okyamuru.mcfunction`, 25 satır:

```
summon arrow ^0^7^10
summon arrow ^1^7^10
...
```

Dört hatası:

1. **`^0^7^10` boşluksuz** — komut hiç çalışmıyor (bu seride en yaygın hata).
2. Izgara `^0`..`^4` arası, yani **hepsi tek yana**. Baktığın yere değil,
   sağına bir ok duvarı oluyor. Bizimki hedefin etrafına ortalıyor.
3. **`summon arrow` ile doğan okun hızı yok** — olduğu yerde belirip
   düşüyor. Ok değil, düşen bir cisim. Bizimki `applyImpulse` ile aşağı
   hız veriyor (`setLinearVelocity` yedeğiyle).
4. 25 ok tek tick'te doğuyor, bütçe yok. Bizimki varlık bütçesini
   kullanıp partiye bölüyor.

Ayrıca referansta tam ızgara; bizde hafif rastgelelik var, yoksa yağmur
değil cetvel gibi duruyor.

### Sarsıntı

Referans `shadowstaffozlelik.mcfunction`:

```
execute @s^^^6 /camerashake add @e[r=6,c=1] 4
```

Hasar yok, ölüm yok — sadece karşıdakinin ekranını sallayıp nişan
almasını zorlaştırıyor. Bizde kendi ekranımızı sarsan yardımcı vardı
(`ekraniSars`), başkasınınkini sarsan yoktu.

Dört hatası:

1. **`@s^^^6` boşluksuz** — çalışmıyor.
2. `c=1` en yakını seçiyor ama `@e` **oyuncunun kendisini de sayıyor** —
   çoğu zaman kendi ekranını sarsıyorsun. Bu seride **üçüncü kez**
   gördüğüm aynı hata.
3. `camerashake` yalnızca **oyuncuda** çalışıyor; `@e` mobları da tarayıp
   boşa dönüyor. Bizimki mobları süzüyor ve sebebini söylüyor.
4. **Süre verilmemiş** (varsayılan 1 sn) ve şiddet `4`, yani tavan. Bizde
   ikisi de ayardan: 1.6 şiddet, 2.5 saniye.

İkisi de yeni **Gölge Kolu**'nda (`pa:kol_golge`).

Test: 24/24 geçti (`v15.mjs` yeni).

---

## Aşama 24 — menü her kolda, tek dokunuşla (v4.14)

Kullanıcı isteği: "her kolda bir tane menü olsun, menüler kolay
açılabilir olsun."

### Neydi

Menü v4.8'de gelmişti ama iki kapının arkasındaydı:

1. **Eğilerek** kullanmak gerekiyordu — tablette eğilme düğmesini basılı
   tutup eşyaya dokunmak zahmetli.
2. Sadece **çok yetenekli** kollarda açılıyordu (`liste.length > 1`).
   Örs Kolu gibi tek yetenekli kollarda menü hiç yoktu.

### Ne oldu

**Kola dokunmak menüyü açıyor.** Tabletteki en kolay hareket bu.
`MENU_DOKUNUSLA = true`.

**Seçince hemen çalışıyor.** Eskiden menüden seçmek yalnızca *seçili*
yapıyordu, çalıştırmak için ayrıca eğil+zıpla gerekiyordu. Artık seçim
tetiklemenin kendisi — tek akış, hiç jest gerekmiyor. Bekleme
süresindeyse kaç saniye kaldığını söylüyor.

**Tek yetenekli kollarda da açılıyor**, çünkü menüde artık yeteneklerin
altında yardımcı düğmeler var:

- `Bütün kolları al` — on beş kolu envantere koyar
- `Gücü kapat` — açık iksiri kapatır

Yani Örs Kolu'nda bile menü işe yarıyor.

**Başlık artık okunur.** `pa:kol_toprak` yerine "toprak kolu".

### Bozulmayanlar

Jestler aynen duruyor: eğil+zıpla çalıştırır, eğil+yukarı bak değiştirir,
eğil+aşağı bak kolları verir. Menü onların yerine değil yanına geldi.

`MENU_DOKUNUSLA = false` yapılırsa v4.13 davranışına döner: dokunmak
çalıştırır, eğilerek dokunmak menüyü açar.

Modül yoksa (server-ui sürümü tutmazsa) dokunmak eskisi gibi seçili
yeteneği çalıştırıyor — test bunu ayrıca doğruluyor, çünkü bu yol
bozulursa kollar tamamen ölürdü.

Test: 25/25 geçti (`menu.mjs` yeni).

---

## Aşama 25 — ışın topu patlıyor, optimizasyon ölçümü (v4.15)

### Işın topu artık patlıyor

Durduğu yerde **TNT gücünde** (`4`) patlıyor — toprak topunun sonundaki
patlamayla aynı güç. Üç durumda da patlar: hedefe çarpınca, duvara
çarpınca, menzil dolunca.

Patlama ayrı bir aşama olarak tutuluyor çünkü patlama bütçesi tick başına
`1`; sırasını beklemesi gerekebilir. Referansta ("Güneş modu — Sarı
Particle At") patlama hiç yoktu, sadece hasar veriyordu.

`ISINTOP_BLOK_KIRAR = false` yaparsan kendi üssünü havaya uçurmaz.

### Sahte dünya düzeltildi — bir testin yalancı yeşili

Ölçüm yazarken çıktı: `dunya.mjs`'teki `getEntities()` **seçenekleri yok
sayıp** bütün listeyi döndürüyordu. Yani "menzil dışındaki vurulmadı"
diyen testler aslında hiçbir şey sınamıyordu — sahte dünya her varlığı
menzilde sayıyordu.

Artık gerçek API gibi `location` + `maxDistance`/`minDistance` ve
`excludeTypes` süzülüyor. Bunu açınca `kevin.mjs`'in tavan testi kırıldı
ve sebebi öğreticiydi: test tavana vurduktan sonra iki kez daha deniyor,
o denemeler menzil dışına düştüğü için "hedef yok" sayılıp **var olan
kafesleri açıyordu**. Ürün doğruydu, test fazla döngü çeviriyordu.

### Optimizasyon ölçümü

32 yeteneğin tamamı tek tek çalıştırılıp ölçüldü (`olcum.mjs`):

| | |
|---|---|
| Bütçeyi aşan yetenek | **yok** |
| En yüksek tepe yük | `hapis` — 56/56 |
| En uzun süren | `kubbe` — 208 tick (10,4 sn) |
| En çok işlemci yiyen | `toprak_topu` — 7,74 ms |
| 32 yeteneğin toplamı | 28,5 ms |
| Anlık yetenek (tick tutmaz) | 11 |
| Süreli yetenek | 21 |

**Çift el ölçümü:** iki ağır yetenek (Toprak Kol + Toprak Topu Kolu) aynı
anda çalışırken tepe yük yine **56/56** — bütçe paylaşılıyor, toplanmıyor.
Çift el tick yükünü artırmıyor.

Dikkat çeken üç şey:

- **`toprak_topu` tek başına 1360 blok yazıyor** ve toplam sürenin
  dörtte birini yiyor. Beklenen — bütün paketteki en ağır iş o.
- **Yeni yeteneklerin hiçbiri ağır değil.** `isin_topu` 0,75 ms,
  `ok_yagmuru` 0,68 ms, `sarsinti` 0,15 ms. Hepsi eski yeteneklerin
  disiplinine uymuş.
- **`hapis` tek tick'te tavanı tam dolduruyor** (56/56) ama bir tick
  sürüp bitiyor, yani sorun değil.

Test: 25/25 geçti + ölçüm aracı (`olcum.mjs`) eklendi.

---

## Aşama 26 — her iksire bir buff (v4.16)

Kullanıcı isteği: "genel olarak iksirleri güçlendir, her iksire bu
güncellemede 1 buff ekle."

Yedi iksirin her birine **tam bir** yeni efekt eklendi. Her biri o
iksirin kimliğine uyuyor:

| İksir | Yeni buff | Neden |
|---|---|---|
| Nitroksin | `slow_falling` | zıplama kimliğini tamamlıyor — yüksekten atlayıp yavaş iniyorsun |
| Grinoksin | `water_breathing` | dayanıklılık: suda da boğulmuyorsun |
| Redoksin | `saturation` | kazarken acıkmıyorsun |
| Firenoksin | `haste 2` | ateş bloğu yumuşatır gibi, daha hızlı kazma |
| Orman Ateşi | `health_boost 2` | denge: biraz da fazladan can |
| Kan İksiri | `invisibility` | vampir kimliği: göze görünmüyorsun |
| Hiperoksin | `conduit_power` | her şeyden biraz — su altı paketi de var |

### Hiyerarşi korundu

Buff'lar seçilirken v4.12'nin kuralı gözetildi: **hiçbir iksir her
alanda en iyi olmamalı.** Eklenen seviyeler uzmanların altında kaldı:

- Firenoksin `haste 2` < Redoksin `haste 4` — kazma hâlâ Redoksin'in
- Orman Ateşi `health_boost 2` < Grinoksin `health_boost 4` — dayanıklılık hâlâ Grinoksin'in

Ölçüm: en yüksek seviyeye sahip olma sayısı — Grinoksin 5, Nitroksin 4,
Redoksin 3, Firenoksin 1, Kan İksiri 1, **Hiperoksin 1**. Hiperoksin
hâlâ "her şeyden biraz, hiçbirinde en iyi değil".

`saturation` artık iki iksirde (Redoksin ve Orman Ateşi) — sorun değil,
`resistance` ve `speed` de birkaç iksirde ortak. Her iksir yine tam bir
yeni efekt kazandı.

Test: 25/25 geçti.

---

## Aşama 27 — göz kaplaması gözlük gibi görünüyordu (v4.17)

Kullanıcı oyundan ekran görüntüsü gönderdi: iksir içince gözler değil
**gözlük** görünüyordu — yüzü boydan boya kaplayan bir bant. Sonra
BoraLo'nun **gerçek skin dosyasını** buldu; iki sürüm, biri normal göz
biri nitroksin gözü.

### Ölçüm

İki skin dosyası piksel piksel karşılaştırıldı. Yüz `(8,8)-(15,15)`
karesinde **tek bir satır** farklı:

```
        x=8   9    10   11   12   13   14   15
  y=12       KOYU KOYU  ten  ten  KOYU KOYU     göz bebeği
  y=13       KOYU KOYU  ten  ten  KOYU KOYU     göz bebeği
  y=14       GÖZ  GÖZ   ten  ten  GÖZ  GÖZ      ← DEĞİŞEN
```

- normal sürüm → `y=14` rengi `(12, 255, 255)` turkuaz
- nitroksin sürümü → `y=14` rengi `(255, 255, 255)` bembeyaz

Başka hiçbir piksel değişmiyor.

**Yani iksir yalnızca `y=14` satırını boyuyor: her gözde 2 piksel,
toplam 4.** Göz bebeği skinin kendi pikseli — kaplama onu çizmiyor,
altında bırakıyor.

### Bizde ne yanlıştı

v4.16'ya kadar `goz_dokusu()` şunu yapıyordu:

1. Her gözü **3×2** çiziyordu (`y=12-13`)
2. Sonra her birinin **etrafına 1 piksel dış hat** ekliyordu

İki dış hat ortada birleşince yüzün sekiz pikselinin tamamı boyunca
uzanan bir bant oluşuyordu: **28/64 piksel**. Oyunda göz değil gözlük.

Lazer varyantı daha da genişti — `y=11..14` arası, artı çepeçevre hale.

### Düzeltme

Artık referansla aynı: `y=14` satırı, `x=9-10` ve `x=13-14`, dış hat
yok, hale yok. **4/64 piksel.** Lazer varyantı bir satır yukarı da
taşıyor (göz bebeğinin üstünü kaplayıp "parlıyor" etkisi veriyor) —
**8/64 piksel**, yine bant değil.

Satır konumu tek sabitte: `GOZ_SATIR = 14`. Skinin gözü başka
satırdaysa tek sayı değişikliği.

Test: 25/25 geçti.

---

## Aşama 28 — Orman Ateşi kaldırıldı (v4.18)

İstek: *"sen başka bir iksir daha kendin yapmışsın sanırım orman ateşi
diye geçiyor onu kaldır."*

### Bir düzeltme: uydurma değildi

Orman Ateşi **referanstan geliyordu**. `iksir modu muhammetlo mz`
paketinde `forest_fire` adıyla 18 dosya var:

- `items/sp_m_forest_fire_bottle.json` — içilebilir iksir
- `items/sp_forest_fire_bottle_goz.json` — içince gelen göz
- `items/sp_m_forest_fire_lazer.json` — lazer varyantı
- `functions/sp_forest_fire_bottle_goz_effect.mcfunction`:
  ```
  effect @e[hasitem={item=sp:forest_fire_bottle_goz,...}] instant_health 1 0 true
  effect @e[hasitem={item=sp:forest_fire_bottle_goz,...}] resistance 1 0 true
  effect @e[hasitem={item=sp:forest_fire_bottle_goz,...}] speed 1 0 true
  effect @e[hasitem={item=sp:forest_fire_bottle_goz,...}] strength 1 0 true
  ```
- `functions/forest_fire_ver_komut.mcfunction`

v4.12'de eklenmesini isteyen de sendin: *"mesela forest_fire ve
firenoksin ve redoksin bizde var mı yoksa onları da ekleyelim."*
"Orman Ateşi" o `forest_fire`'ın Türkçesi.

### Yine de kaldırıldı — çünkü kaldırılması doğru

Sebep "referansta yok" değil, **tasarım**: v4.12'de her iksire bir
uzmanlık verdik, Orman Ateşi'ne düşen "denge" oldu — her şeyden 2.
Ama zaten Hiperoksin de "her şeyden biraz" veriyor. İki iksir aynı
boşluğu dolduruyordu ve Orman Ateşi'ni içmek için hiçbir sebep
kalmıyordu: hız istiyorsan Nitroksin, dayanıklılık istiyorsan
Grinoksin, karar veremiyorsan Hiperoksin.

Yani **7 → 6**. Kalan altısının hepsinin net bir cevabı var:

| İksir | Ne için |
|---|---|
| Nitroksin | hız ve zıplama |
| Grinoksin | dayanıklılık |
| Redoksin | saldırı ve kazma |
| Firenoksin | ateş |
| Kan İksiri | vampir (vur, canını geri al) |
| Hiperoksin | her şeyden biraz |

### Neler silindi

`ayarlar.js` içindeki `KADEMELER` girdisi, `kol_uret.py` içindeki
`IKSIRLER`/`IKSIR_TR`/`GOZ_TR` satırları ve üretilmiş 10 dosya:

```
items/iksir_orman_atesi.json      items/goz_orman.json
items/goz_orman_lazer.json        attachables/goz_orman.json
attachables/goz_orman_lazer.json  textures/item/iksir_orman_atesi.png
textures/item/goz_orman.png       textures/item/goz_orman_lazer.png
textures/entity/goz_orman.png     textures/entity/goz_orman_lazer.png
```

Eşya sayısı **36 → 33**. `.lang` ve `item_texture.json` üretici
tarafından yeniden yazıldı, artık ismi hiçbir yerde geçmiyor.

### Testte çıkan bir hata

`lazer.mjs` menzil testi iksir listesine `KADEMELER[6]` diye sabit
indisle bakıyordu — liste altıya inince `undefined.kimlik` patladı.
Son elemana `KADEMELER.length - 1` ile bakacak şekilde düzeltildi;
bundan sonra iksir eklense de çıkarılsa da kırılmaz.

Test: 27/27 geçti.

---

## Aşama 29 — göz kaplaması ağzın yanına düşüyordu (v4.19)

Oyun içi ekran görüntüsü: hiperoksin içildi, mavi kaplama **gözlerde
değil ağzın iki yanında** belirdi.

### Kök sebep: yanlış skini ölçmüşüm

v4.17'de satır numarasını **BoraLo'nun** skininden almıştım. Ama
kaplama **kullanıcının** skininin gözüne oturmak zorunda, ve iki skin
farklı yerde:

| satır | BoraLo'nun skini | bu skin |
|---|---|---|
| y=11 | ten | saç |
| y=12 | koyu (saç/kaş) | **GÖZ** — akı + bebek |
| y=13 | koyu (saç/kaş) | ten |
| y=14 | **GÖZ** | **AĞIZ** |

Yani `GOZ_SATIR = 14` BoraLo'da doğru, burada tam ağzın satırı.

### Ölçüm

Ekran görüntüsü PNG olarak çözüldü (zlib + filtre geri alma), kafanın
ön yüzü 8×8 ızgaraya bölündü — kafa 138 ekran pikseli, satır başına
17.25:

| doku satırı | ekran y | orada ne var |
|---|---|---|
| y=12 | 121–137 | göz bebeği `(11,13,21)`, akı `(146,138,138)` |
| y=13 | 139–154 | düz ten `(142,87,64)` |
| y=14 | 157–174 | ağız `(70,39,19)` **+ kaplama** `(83,124,151)` |

Sütunlar zaten doğruydu: `x=9,10` ve `x=13,14` — kaplama tam göz
akı ve bebeğinin üstüne geliyor. **Sadece satır iki aşağıdaydı.**

`GOZ_SATIR = 14` → `12`. Tek sayı.

### Yan bulgu: inflate esnemesi

Attachable kutusu `inflate: 0.52` ile büyütülmüş, bu da dokuyu kutu
**merkezinden** dışarı doğru geriyor. Kayma merkeze uzaklıkla artıyor:

```
kayma = (28 − satır_merkezi) × (9.04/8 − 1)

  y=14 (merkez 25.5)  ->  2.5 × 0.13 = 0.33 satır   (gözle görülür)
  y=12 (merkez 27.5)  ->  0.5 × 0.13 = 0.07 satır   (görünmez)
```

Ölçümle doğrulandı: y=14'teki kaplama ekranda 160–179 arasındaydı,
oysa o satırın kendisi 157–174. Tam 0.33 satır aşağı. Doğru satıra
geçince esneme de kendiliğinden kayboluyor — geometriye dokunmaya
gerek kalmadı.

### Lazer varyantı yön değiştirdi

Parlak varyant fazladan bir satır boyuyor; **yukarı** boyuyordu
(`GOZ_SATIR - 1`). Yeni satırda yukarısı `y=11` yani **saç** — parlama
orada kaybolurdu. **Aşağı** çevrildi (`GOZ_SATIR + 1` = `y=13`, düz
ten): ışık yanağa vurmuş gibi görünüyor.

Üretilen doku doğrulandı — koda güvenilmeyip PNG geri çözüldü:

```
goz_mavi         4 opak piksel   x=9,10,13,14  y=12
goz_mavi_lazer   8 opak piksel   x=9,10,13,14  y=12 ve y=13
```

Geri kalan 4092 piksel saydam. Test: 27/27 geçti.

---

## Aşama 30 — kalp ekleme (v4.20)

İstek: kalp ekleme özelliği, "bayağı bayağı" ekleyen türden.

### `can_verme` ile karıştırılmaması gereken bir şey

Zaten `can_verme` vardı ama o **boş kalpleri doldurur** (iyileştirme,
geçici). İstenen ise **kalp sayısını büyütmek** — kalıcı ve birikmeli.
İki ayrı yetenek olarak duruyorlar.

### Sayılar

Bedrock'ta maksimum can `health_boost` ile büyüyor:

```
health_boost seviye N  ->  +4 can x (N + 1)
1 kalp = 2 can
eklenen kalp = 2 x (seviye + 1)
```

Yani kalpler **çift sayılarla** artabiliyor; tek sayı verilirse aşağı
yuvarlanıyor (`kalbiDuzelt`).

| ayar | değer | neden |
|---|---|---|
| `KALP_ADIM` | 10 | bir basışta bir tam can barı, fark hemen görünsün |
| `KALP_TAVAN` | 100 | toplam 110 kalp; yukarısı ekranda okunamıyor |
| `KALP_TAZELEME` | 40 | efekt yenileme aralığı |
| `KALP_SURE` | 200 | efekt süresi (tazelemenin 5 katı, arada sönmesin) |

Motorun kendi sınırı seviye 255, yani 512 kalp — `kalbiDuzelt` orada
kırpıyor ki ayar elle yükseltilirse sessizce bozulmasın.

### Referansın üç hatası

İncelenen iksir modlarının hepsinde aynı tek satır vardı:

```
effect @s health_boost 100000 255
```

1. **255 seviye = 256 kalp.** Can barı ekrana sığmıyor.
2. **Geri alınamıyor.** Süt içmek dışında çıkış yok, o da bütün
   efektleri siliyor.
3. **Kalıcı değil.** Ölünce efekt gidiyor, kalpler kayboluyor ve geri
   gelmiyor — "kalıcı güç" diye verilen şey ölümde sıfırlanıyor.

### Bizde: defter kaynak, efekt görüntü

`_kalp_defteri.js` kim kaç ek kalp aldığını tutuyor ve dünya
özelliğine yazıyor. Efekt `KALP_TAZELEME`'de bir yeniden veriliyor.
Minecraft'ta efektlerin silindiği **üç yer** — ölüm, sürenin dolması,
süt — artık kalpleri götürmüyor; defter yerinde, efekt geri geliyor.

İş listesine **girmiyor**: kalıcı olduğu için oyuncunun iki iş
yuvasından birini sonsuza kadar tutardı ve kalp aldıktan sonra tek
elle oynamak zorunda kalırdın. Hapis kafesleri de aynı sebeple ayrı
defterde.

### health_boost'un sessiz tuzağı

Eklenen kalpler **boş** gelir. "10 kalp geldi" dersin, bar boş görünür.
Ekledikten sonra can dolduruluyor — `resetToMaxValue`, yoksa
`setCurrentValue(effectiveMax)`, o da yoksa `instant_health`. Üçü de
yoksa kalpler yine ekleniyor, sadece boş geliyor.

### Geri alma

`kalp_sifirla` yeteneği ve **her kolun menüsünde** "Kalpleri sıfırla".
Kalıcı bir güç geri alınamıyorsa oyunu bozar — referansın hatası tam
buydu. Sıfırlarken can da dolduruluyor, yoksa tavan düşünce 2 canla
kalırdın.

### Yeni kol

`pa:kol_kalp` — Kalp Kolu, iki yetenek (ekle + sıfırla). Kol sayısı
15 → 16, yetenek 32 → 34, eşya 33 → 34.

### Testte çıkan bakım tuzağı

`kol2.mjs` kol listesini **elle yazılmış bir dizide** tutuyordu ve her
yeni kolda kırılıyordu — üçüncü kez. Daha kötüsü, testin işi "items/
altındaki eşya `kollar.js`'te bağlı mı" diye bakmaktı ama
karşılaştırdığı şey elle tutulan bir kopyaydı; kopya güncellenmeyi
unutulunca test gerçeği değil kendini doğruluyordu. Liste artık
`kollar.js` kaynağından okunuyor.

Yeni test dosyası `kalp.mjs` — 9 bölüm, özellikle "efekt silinse de
geri geliyor" ve "dünya özelliğine yazılıyor" kısımları.

Test: 27/27 geçti.

---

## Aşama 31 — lazer ulaşılamıyordu, sohbet komutları (v4.21)

### "Göz lazeri attım, etrafa yıldırım çarptı"

**Lazer bozuk değildi — ulaşılamıyordu.**

Eşyasız jest sırasında 34 yetenek var. Sıralamayı bastırdım:

```
  0  sira= 10  Yildirim Halkasi     <-- varsayılan seçim
  1  sira= 20  Yon Simsegi
  ...
 21  sira=170  Goz Lazeri           <-- 21 kez "eğil + yukarı bak"
```

Seçim hiç değiştirilmediyse `secimAl()` **0** döner. "Eğil + zıpla"
yapınca sıfırıncı çalışıyor — **Yıldırım Halkası**, yani etrafına
yıldırım yağdıran yetenek. Tam olarak görülen şey.

**Referans bu sorunu yaşamıyor** çünkü orada lazer bir jest değil,
bir **eşya**:

```json
"walking": { "transitions": [{ "default":
  "query.get_equipped_item_name=='nitroxin_goz_lazer' && query.is_using_item" }] }
```

İksiri içiyorsun, göz takılıyor, lazer elinin altında.

**Bizdeki karşılığı:** iksir içilince eşyasız jest seçimi otomatik
olarak Göz Lazeri'ne geçer (`IKSIR_LAZERI_SEC`). İç, eğil + zıpla,
lazer. İksir bitince eski seçimine dönersin — ama iksirliyken seçimi
**elle** değiştirdiysen ona dokunulmuyor.

### Yan bulgu: on bir çift aynı `sira` değerini paylaşıyordu

110, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220 — her birinde
en az iki yetenek. Eşitlikte sıralamanın sonucu **import sırasına**
kalıyor; yani yeni bir yetenek eklemek, ilgisiz bir yeteneğin jest
sırasını kaydırabiliyordu. Hepsi benzersiz yapıldı ve
`kayit.js:siraDenetimi()` açılışta çakışma varsa uyarıyor.

### Sohbet komutları — "aramızda bir dil"

İstek: *"her şeyi kol yapma, kol israfını önle... ya chat'e bir şey
yazacağım ya da Toprak kola ekleyeceğiz."*

```
can 10        10 kalp ekle (tavan 100)
can           varsayılan 10 kalp
can sifirla   eklenen kalpleri geri al
lazer         göz lazeri at
kol           bütün kolları al
guc kapat     açık iksiri kapat
yardim        listeyi yaz
```

**İki giriş kapısı, tek çözümleyici.** `world.beforeEvents.chatSend`
sürümler arası oynadığı için varsa kullanılıyor; yoksa özellik sessizce
kapanıyor ve aynı komutlar `/scriptevent simsek:komut can 10` ile
çalışıyor. İkisi de aynı koddan geçiyor.

**Türkçe yazım:** `sıfırla` da `sifirla` da, `güç` de `guc` de kabul.
Girdi sadeleştiriliyor — Türkçe'de `I`'nın küçüğü `ı` olduğu için
`toLowerCase()`'e güvenilmiyor, dönüşüm elle yapılıyor.

**"Sınır vardı" sorunu:** `can 500` yazınca sessizce kırpmak yerine
sebebi yazılıyor: *"+100 kalp · 500 istedin ama tavan 100 ek kalp"*.

**Komut olmayan mesaj sohbette kalıyor** — `canim sikildi` yazınca
`can` komutu sanılmıyor.

### Kol israfı

`pa:kol_kalp` **kaldırıldı** (v4.20'de eklemiştim, kullanıcının kuralına
aykırıydı). `kalp_ekle` ve `kalp_sifirla` **Toprak Kol**'a taşındı — o
kol artık 10 yetenekli, menü tek dokunuşla açıldığı için sorun değil.
Kol 16 → **15**.

### Bot ertelendi

`BOT_ACIK = false`, hiç bot kodu yazılmadı. Plan duruyor:
`.claude/plans/concurrent-roaming-cosmos.md`

### Testler

Yeni `sohbet.mjs` — 11 bölüm. `kalp.mjs` ve `menu.mjs`'teki **elle
yazılmış sayılar** (8 yetenek, `pa:kol_kalp`) yine kırıldı; ikisi de
kaynaktan türetilecek şekilde düzeltildi. `kol2.mjs`'te aynı dersi
v4.20'de almıştık.

Test: 28/28 geçti.

---

## Aşama 32 — bot (aşama 1) ve iksir süreleri (v4.22)

### İksir süreleri

60 saniye azdı — içiyordun, bir şey yapmaya fırsat bulamadan bitiyordu.

| iksir | süre |
|---|---|
| Nitroksin, Grinoksin, Redoksin, Firenoksin, Kan İksiri | **5 dakika** (6000 tick) |
| Hiperoksin | **480 saniye** (9600 tick) |

Hiperoksin'in daha uzun olması hiyerarşiyi geri getirmiyor: hiçbir alanda
hâlâ uzman değil (hız Nitroksin'de, vuruş Redoksin'de, dayanıklılık
Grinoksin'de). Farkı artık **güçte değil sürede** — "her şeyden biraz,
ama uzun süre". Bu ona uzmanların yerini almadan kendi sebebini veriyor.
Test bunu ayrıca doğruluyor.

Süreyi uzatmak tick maliyetini **artırmıyor**: efektler `IKSIR_TAZELEME`
(40 tick) aralığıyla yenileniyor, sadece daha uzun süre yenileniyor.

---

### Bot — depodaki ilk özel varlık

Şimdiye kadar sadece **eşya** vardı. Bot bir **varlık** (entity), ve bu
yeni bir alan.

**Aşama 1 kapsamı** (kullanıcının seçimi): var olsun, takip etsin,
beklesin, kalıcı olsun. Odun toplama / maden kazma sonraki aşama.

#### Mimariyi belirleyen kısıt

`@minecraft/server`'da **yol bulma API'si yok**. Script'ten bir varlığa
"şu koordinata yürü" denemiyor. İş bölündü:

- **Yürümeyi vanilla AI yapıyor** — `minecraft:behavior.follow_owner`
  (kurdun/kedinin kullandığı hedef) + `minecraft:navigation.walk`.
  Gerçek yol bulma, bedava, akıcı.
- **Kurtarmayı script yapıyor** — bot çok geride kaldıysa, sıkıştıysa ya
  da başka boyuttaysa yanına ışınlanıyor. Vanilla takip bunların hiçbirini
  çözmüyor.

`@minecraft/server-gametest` / `SimulatedPlayer` **kullanılmadı**: deneysel
ayar istiyor, test amaçlı bir modül, tablette riskli ve dünya yeniden
yüklenince yaşamıyor.

#### Bilerek iki yollu bırakılan nokta

`follow_owner` bir **sahip** ister; sahip `tameable.tame(oyuncu)` ile
atanıyor. O çağrının bu API sürümündeki tam şekli **kesin değil**:

```
tame() tuttuysa  -> vanilla yürüyor, script sadece 24 blokta kurtarıyor
tutmadıysa       -> script takibi: 8 blokta ışınlanıyor
```

Hangisinin çalıştığı Content Log'a yazılıyor. Tahmin edilmedi — tablet
denemesi söyleyecek.

#### Plandan sapma: ayrı kol yapılmadı

Planda `pa:kol_bot` vardı. Yapılmadı — kullanıcının kuralı *"her şeyi kol
yapma, kol israfını önle"*. Bot **sohbetten** yönetiliyor:

```
bot          çağır / yanına getir
bot bekle    olduğu yerde dursun
bot takip    peşinden gelsin
bot geri     gönder (sil)
```

Ayrıca **bota dokununca** aynı seçenekler menü olarak açılıyor
(`playerInteractWithEntity`). Menü yoksa dokunmak takip ↔ bekle arasında
geçiş yapıyor — hiçbir şey olmamasından iyi.

`bot geri` **bekleme süresine takılmıyor**: bu bir güç değil, güvenlik
çıkışı. Bot ayak altında dolaşıyorsa 3 saniye beklemek sinir bozucu.
Aynı gerekçe kalp sıfırlamada da vardı.

#### Testin yakaladığı gerçek hata

İlk yazılışta `botCagir` bütçeden `varlikIste(1)` istiyordu ve **bot hiç
doğmuyordu**. Sebep `main.js`'teki tick döngüsü:

```js
if (isler.length === 0) return;
butceSifirla();
```

Bütçe ancak **aktif iş varken** doluyor. Bot çağırmak anlık bir istek; o
anda çalışan bir iş yoksa bütçe 0'da kalıyor ve spawn sonsuza kadar
reddediliyordu. Bütçe zaten tick başına onlarca şey doğuran yetenekler
için var (ok yağmuru, TNT yağmuru); tek bir bot bir kez doğuyor ve zaten
`BEKLEME` (3 sn) ve `BOT_TAVAN` (oyuncu başına 1) kapılarına takılı.
Bütçe çağrısı kaldırıldı.

#### İkinci yakalanan hata: `paketle.sh`

Yeni klasörler (`entities/`, `entity/`) zip satırlarında yoktu — bot
pakete **hiç girmeyecekti** ve oyunda "bot kayıtlı değil" diyecekti.
Betiğe DİKKAT notu eklendi.

#### Üretilen dosyalar

Hepsi `kol_uret.py`'den — elle JSON yazılmadı:

```
BP/entities/bot.json                    sunucu varlığı (AI, sağlık, olaylar)
RP/entity/bot.entity.json               görünüm + yumurta rengi
RP/models/entity/simsek_bot.geo.json    insansı model (vanilla skin UV'si)
RP/animations/simsek_bot.animation.json yürüyüş
RP/textures/entity/bot.png              64×64 yer tutucu
```

Model **vanilla 64×64 skin düzeniyle aynı UV** kullanıyor: dokuyu bir
Minecraft skiniyle değiştirmek istersen üzerine yazman yeterli. Göz satırı
v4.19'da ölçülen yer (`y=12`, `x=9,10,13,14`).

Yürüyüş animasyonu **kendimizin**; vanilla `animation.humanoid.*`
kimliklerine bilerek güvenilmedi.

Yumurta **var** (`is_spawnable: true`) — tablette elle test etmenin en
kolay yolu.

Test: **29/29** geçti (yeni `bot.mjs`, 11 bölüm).

---

## Aşama 33 — sohbet komutları çalışmıyormuş (v4.23)

### Kanıt

Kullanıcı dört kez `bot` yazdı, bot gelmedi. Ekran görüntüsünde sebep
açıkça duruyor:

```
<SmokeyInk8762> bot
<SmokeyInk8762> bot
<SmokeyInk8762> bot
<SmokeyInk8762> Bot
```

Mesajlar **sohbete düz metin olarak düşmüş**. Yani `e.cancel = true`
hiç çalışmamış, yani abonelik hiç kurulmamış.

`world.beforeEvents.chatSend` **kararlı API'de yok** — dünya ayarlarında
**Beta APIs** deneysel ayarını istiyor. v4.21'de bu ihtimal için
`/scriptevent` yedeği yazılmıştı ama **kullanıcıya söylenmiyordu**:
durum yalnızca Content Log'a yazılıyordu, tablette kimse oraya bakmıyor.

Büyük/küçük harfin hiçbir etkisi yok — girdi zaten sadeleştiriliyor.

### Çözüm: menü

Tablette tek-dokunuşluk tek yol menü. Bot kontrolleri **her kolun
menüsüne** kondu:

```
Bot çağır / Bot: yanıma gel
Bot: bekle  /  Bot: takip et      (duruma göre değişiyor)
Bot: geri gönder
Can +10 kalp
```

Jest sırası çözüm değildi: `bot_cagir` 36 yeteneğin sonuna yakın, oraya
ulaşmak için onlarca kez "eğil + yukarı bak" gerekiyor — göz lazerindeki
hatanın aynısı.

### İkinci düzeltme: durum artık oyunda söyleniyor

Dünyaya girince oyuncuya yazılıyor:

> Sohbet komutları bu sürümde ÇALIŞMIYOR (dünya ayarlarında Beta APIs
> kapalı). Bunun yerine: kola dokun → menü, ya da
> `/scriptevent simsek:komut bot`

Beta APIs açıksa onun yerine "sohbete `yardim` yaz" diyor.

### Üçüncü düzeltme: sohbet seli

`OLCUM_SOHBETE` **kapatıldı**. Görüntüde sohbetin tamamı `[OLCUM]`
satırlarıyla dolmuştu ve gerçek mesajlar arada kayboluyordu. Ölçüm
Content Log'a yazılmaya devam ediyor. `HATA_SOHBETE` açık kalıyor —
hatalar seyrek ve görülmesi gerekiyor.

### Görüntüden doğrulananlar

- `Hiperoksin ictin - 480 saniye` → süre değişikliği çalışıyor
- `blok 68 (34.0/tick)`, `maks 23.0ms` → toprak topu bütçesi normal
- `Kafes kuruldu`, `1 can yenilendi` → jestler yanlışlıkla tetikleniyor
  (yürürken eğil+zıpla). Rahatsız ediciyse `ESYASIZ_ACIK = false`.

Test: **29/29** (bot.mjs'e 12. bölüm eklendi — sohbet kapalıyken de
ulaşılabiliyor mu).

---

## Aşama 34 — Beta API'ler açıldı (v4.24)

Kullanıcı dünya ayarlarından **Beta API'ler**'i açtı ve botun oradan
yapılmasını istedi.

### Anahtarı açmak tek başına yetmiyor

Ayarın kendi açıklaması belirleyici:

> *Eklenti paketlerinde API modüllerinin **"-beta" sürümlerini** kullanın*

Yani anahtar, paketlerin beta modül sürümü **istemesine izin veriyor** —
istemeyen paket kararlı modülü almaya devam ediyor. Bizim manifest
`"@minecraft/server": "2.0.0"` diyordu, yani anahtar açık olsa da
`chatSend` yine gelmezdi.

`manifest.json` → `"2.0.0-beta"`.

### Bunun bedeli

Artık **Beta API'ler kapatılırsa script modülü hiç yüklenmez ve paketin
tamamı ölür** — kollar, iksirler, bot, hepsi. Bu bilinçli bir takas ve
tek satırla geri alınabilir: manifest'te `2.0.0-beta` → `2.0.0`. O zaman
sohbet komutları kapanır, **geri kalan her şey çalışmaya devam eder** —
menü yolu bilerek korundu, tek yol sohbet değil.

`@minecraft/server-ui` **kararlı** (`2.0.0`) bırakıldı: menü artık ana
arayüz, onu da beta yüzeyine taşımanın faydası yok, riski var.

### Test yeni bir kayma yakaladı

`bot.mjs`'e eklenen 13. bölüm manifest ile kodu bağlıyor. İlk çalıştırmada
hemen yakaladı:

```
✗ manifest surumu ayarlardaki SURUM ile ayni :: manifest 4.23.0 / ayar v4.24
```

`SURUM` sabitini yükseltmiş, manifest'i unutmuştum. Artık her sürümde
otomatik kontrol ediliyor — `BETA_GEREKLI` ile manifest'in `-beta`
istemesi de aynı testte bağlı, ikisi sessizce ayrışamıyor.

Test: **29/29**.

---

## Aşama 35 — "Content Log ne olduğunu bilmiyorum" (v4.25)

Kullanıcı sürüm bilgisini yollayıp ekledi: *"Content Log ne olduğunu
bilmediğim için her şeyi"*.

### Bu bir kullanıcı hatası değil, tasarım hatası

Şu ana kadar **bütün teşhis** Content Log'a yazılıyordu:

```
kol denetimi: 15 esyanin hepsi kayitli.
bot denetimi: pa:bot kayitli.
sohbet komutlari: sohbet ACIK, scriptevent ACIK
API: @minecraft/server 2.0.0-BETA isteniyor...
```

Yani "bot neden gelmiyor" sorusunun cevabı hep oradaydı — ama
okunamıyordu. v4.23'te `OLCUM_SOHBETE` kapatılınca son bağ da koptu.

### `durum` komutu

```
durum      (ya da 'bilgi' / 'test')
```

Sohbete basıyor:

```
--- Simsek durum ---
Surum v4.25 · API 2.0.0-beta · yetenek 36
Sohbet komutlari: ACIK
Menu: ACIK
Kollar: 15/15 kayitli
Bot: varlik kayitli · seninki var (takip)
Iksir: Hiperoksin · lazer icin egil + zipla
Kalp: +20 ek (toplam 30, tavan 100)
```

Her kolun menüsünde de **"Durum (her şey çalışıyor mu)"** düğmesi var —
sohbet çalışmasa bile ulaşılabilir olsun diye.

`_bot_defteri.js`'e `botKayitliMi()` eklendi; üç durum ayırıyor:
kayıtlı / kayıtlı değil / denetim yapılamadı.

### Kullanıcının sürümü

```
Sürüm: v26.44        Branch: r/26_u4
Protokol: 12168      SHA: 93e8d22a...
```

Bekleyen işler listesindeki **`min_engine_version` uyumsuzluğu** artık
karara bağlanabilir: manifest `[1, 20, 0]` diyor, oyun `26.44`.
`min_engine_version` bir **taban**, tavan değil — oyunun sürümü bunun
üstünde olduğu sürece sorun yok ve şu an her şey çalışıyor (kollar
görünüyor, eşyalar kayıtlı). **Yükseltilmedi**: yükseltmek eski
sürümleri dışarıda bırakır ve hiçbir şey kazandırmaz. Madde kapandı.

Test: **29/29** (`sohbet.mjs`'e 12. bölüm).

---

## Aşama 36 — "hiçbir şey çalışmıyor" (v4.26)

> *"kanka modu bir kontrol et hiç bir şey çalışmıyor eğilip aşağıya
> baktım kol bile gelmedi"*

### Sebep: v4.24'teki beta denemesi

v4.24'te manifest `"@minecraft/server": "2.0.0-beta"` istemişti. Sonuç:
**script modülü hiç yüklenmedi ve paketin tamamı öldü** — kol yok, jest
yok, menü yok, bot yok.

Kullanıcının dünyasında **Beta API'ler açıktı**. Yani anahtar yetmiyor:
istenen beta *sürümü* o yapıda bulunmuyor. Oyun `v26.44` / protokol
`12168`; hangi beta sürümünü sunduğu dışarıdan bilinmiyor ve script hiç
çalışmadığı için **içeriden de sorulamıyor** — modül yüklenmezse kod da
yüklenmez, `durum` komutu bile yok.

Git farkı, v4.23 (çalışan) ile v4.25 (ölü) arasında işlevsel tek bir
değişiklik gösterdi:

```
-      "version": "2.0.0"
+      "version": "2.0.0-beta"
```

**Kararlı sürüme dönüldü.** Yanlış sürüm yazmanın cezası "özellik
çalışmaz" değil "paket ölür" olduğu için bir daha körlemesine
denenmeyecek.

### İkinci hata: bir tırnak

Düzeltmeyi yaparken `sohbet.js`'e fazladan bir `"` kaçtı. Tek karakter —
ama JS ayrıştırılamayınca yine **paketin tamamı ölür**. Testler yakaladı
(hepsi `main.js`'i import ediyor), ama bu tesadüf: hiçbir test bu satırı
kullanmıyordu.

### Kalıcı önlem: `canli.mjs`

Yeni test dosyası, tam olarak "her şey ölü" hata sınıfını hedefliyor:

1. **Her `.js` dosyası tek tek yükleniyor** — sözdizimi hatası varsa
   hangi dosya olduğunu adıyla söylüyor.
2. **Manifest oyunun reddetmeyeceği hâlde mi**: geçerli JSON, UUID
   biçimleri, benzersizlik, `entry` dosyası gerçekten var mı, ve
   bağımlılıklarda `-beta` **yok** mu.
3. **`paketle.sh` bütün klasörleri zipliyor mu** (v4.22'de `entities/`
   unutulmuştu, bot pakete hiç girmemişti).

`bot.mjs`'teki beta testi de yön bağımsız hâle getirildi: artık "beta
olsun" demiyor, **manifest ile `BETA_GEREKLI` aynı şeyi söylesin** diyor.

### Sohbet komutları ne olacak

Kararlı API'de `chatSend` yok, yani sohbete `bot` yazmak çalışmıyor.
İki yol da kararlı:

1. **Menü** — kola dokun, listeden seç (tablette en hızlısı)
2. **`/scriptevent s:k bot`** — kısa takma ad eklendi (eskiden
   `simsek:komut` yazmak gerekiyordu)

Test: **30/30**.

---

## Aşama 37 — bot aşama 2: odun ve maden, 20 bot (v4.27)

Bot takip etmeye başladı, sıra işe geldi. Ayrıca bot tavanı **1 → 20**.

### Botlar neden kendi etrafını işliyor

Bedrock'ta yol bulma API'si yok — bota *"şu ağaca git"* denemiyor. Bot
**kendi etrafını** işliyor: sen ormana yürüyorsun, bot peşinden geliyor
(vanilla takip), "odun" diyorsun, etrafındakini kesiyor. Referans
modların "çalışan bot"u da tam olarak bu; yürüyor görünen şey aslında
seni takip etmesi.

### Arama ucuz olmak zorunda

Yarıçap 6'lık kutuda 2000+ blok var; her tick hepsini okumak tableti
öldürürdü. İki önlem:

1. **Offset listeleri modül yüklenirken bir kez** hesaplanıyor ve
   mesafeye göre sıralanıyor — bot önce dibindekini alıyor.
2. **Tarama imleçli**: her tick bütçenin verdiği kadar blok okunuyor,
   kaldığı yerden devam ediyor.

**Odun için gövde takibi:** ağaç ararken küre taramak israf, gövde
dikey. Bot hizasında yatay disk taranıyor; kütük bulununca "tırmanma"
moduna geçilip o sütun yukarı kırılıyor. Yapraklara dokunulmuyor.

**Maden için** aşağı ağırlıklı küre (`y −6 … +1`).

### 20 bot tick yükünü artırmıyor

Blok bütçesi **ortak**: yirmi bot da aynı 56 işlem/tick'i paylaşıyor.
Bot sayısı işi *yavaşlatıyor*, yükü artırmıyor. Asıl maliyet vanilla
tarafında (her bot yol bulan bir mob) ve onu biz ölçemiyoruz — tablette
takılma olursa önce bot sayısını düşür.

Botlar yay üzerinde doğuyor; yirmi bot aynı noktaya doğsa üst üste binip
birbirini iterdi.

### İş oyuncunun yuvasını yemiyor

İş nesnesinin `oyuncuId`'si `"bot:"` önekli — merkezi yönetici onu ayrı
kovada sayıyor, oyuncunun `AYNI_ANDA` (2) yuvası boş kalıyor. Kalp ve
kafeslerde öğrenilen ders.

### Testin yakaladığı gerçek kusur

İlk yazılışta blok **önce kırılıyor**, sonra eşya verilmeye
çalışılıyordu. `ItemStack` oluşturulamazsa (kimlik tablosunda yanlış
varsa) blok gitmiş, eline hiçbir şey geçmemiş oluyordu — **bot cevheri
yok ediyordu.** Sıra tersine çevrildi: eşya üretilemiyorsa blok
kırılmıyor.

Eşya envantere konuyor; envanter doluysa botun yanına bırakılıyor.
Kütükler kendi eşyalarını veriyor, cevherler **düşen** eşyayı
(`iron_ore → raw_iron`, `deepslate_diamond_ore → diamond`).

### İkinci "paket ölür" hatası — ve `canli.mjs` yine yakaladı

`ayarlar.js`'te yorum bloğunu erken kapattım; 51 dosyanın **hepsi**
sözdizimi hatası verdi (hepsi `ayarlar.js`'i import ediyor). v4.26'da
eklediğim `canli.mjs` bunu ilk çalıştırmada yakaladı. İki sürümde iki
kez işe yaradı.

### Komutlar

```
bot           bir bot daha çağır (tavan 20; tavandaysa hepsini yanına getirir)
bot odun      botlar etrafındaki ağaçları keser
bot maden     botlar etrafındaki cevheri kazar
bot gel       hepsini yanına getir
bot bekle / bot takip / bot geri
```
Hepsi menüde de var.

Test: **30/30** (`bot.mjs` 17 bölüm).

---

## Aşama 38 — teslim, model, savaş (v4.28)

Üç istek: *"odunu bana versinler"*, *"modelleri geliştir"*, *"köpek gibi
savaşsınlar"*.

### 1. Teslim — ekip çantası

v4.27'de eşya zaten doğrudan envantere giriyordu, ama **görünmüyordu**:
ne geldiğini iş bitince öğreniyordun, envanter doluysa sessizce yere
düşüyordu.

Artık toplanan şey önce **ekip çantasına** giriyor, sonra topluca teslim
ediliyor:

- iş bitince **otomatik**
- `bot teslim` deyince elle
- çanta dolunca blok **kırılmıyor** — yerinde duruyor (kırıp döksek fark
  etmeden bırakıp giderdin)

Çanta bot başına değil **ekip başına**: yirmi ayrı çanta ne kayıtta ne
oynanışta bir şey kazandırır, sen tek bir yığın alıyorsun.

**Teslim menzili 32 blok** — botu ormanda bırakıp evde eşya toplamak
çalışma hissini bozardı. Ekipten en az bir bot yakında olmalı.

Kayıt sıkıştırılıyor: `"minecraft:"` öneki atılıyor, `"oak_log:12,raw_iron:3"`
gibi duruyor. Eski (v4.27) düz-dizi kaydı da okunuyor — dünyanı açınca
botların kaybolmasın.

### 2. Model

Yer tutucu düz renklerden **gerçek bir yüze** geçildi. Kafanın ön yüzü
(`x=8..15, y=8..15`) elle çizildi: saç + perçem, kaşlar, göz akı + bebek
(v4.19'da ölçülen `y=12` satırı), burun gölgesi, ağız. Gövdede yaka,
kemer, kol ağzı, eller, botlar.

**6 görsel çeşit** eklendi — yirmi bot birbirinin aynısı olunca hangisine
ne dediğin karışıyordu. `minecraft:variant` + component group, doğumda
rastgele; istemci tarafı `query.variant` ile diziden doku seçiyor. Bu
vanilla'nın kendi yöntemi (koyun rengi, papağan türü hep böyle).

Yeni klasör `render_controllers/` — `paketle.sh`'a da eklendi (v4.22'de
`entities/` unutulmuştu, aynı hatayı tekrarlamamak için).

### 3. Savaş — köpek modeli

Tarif aynen uygulandı: *"köpek evcilleştirirsin ya, birine vurduğun zaman
ona saldırıyor"*. Vanilla kurdun **üç davranışı**:

| davranış | ne yapar |
|---|---|
| `owner_hurt_target` | sen bir şeye vurunca bot ona saldırır |
| `owner_hurt_by_target` | sana vurulunca bot vurana saldırır |
| `hurt_by_target` | bota vurulunca karşılık verir |

Üçü de `pa:savas` grubunda, `minecraft:attack` (5 hasar) ve
`melee_attack` ile birlikte. Bot canı 24.

**Botlar birbirini dövmüyor**: hedef süzgecinde `pa_bot` ailesi dışarıda.
Oyuncular dışarıda **değil** — "benim için savaşsınlar" denince arkadaşın
da dahil.

**Kapatılabilir** (`bot savas`): ormanda odun toplarken botun her koyuna
saldırması istenmez. Varsayılan açık, kurtta da öyle. Savaş kapalıyken
**sonradan doğan bot da barışçı** geliyor — yoksa "kapattım ama yeni bot
saldırıyor" olurdu.

### Komutlar

```
bot teslim    topladıklarını sana verir
bot savas     köpek modu aç/kapat (bot savas ac / bot savas kapat)
```
Menüde de var; menüde çanta doluluğu ve savaş durumu yazıyor. `durum`
raporuna da eklendi.

Test: **30/30** (`bot.mjs` 22 bölüm — çanta, teslim menzili, kayıt
göçü, savaş grupları, çeşit dokuları).

---

## Aşama 39 — bot özel güçleri (v4.29)

İstek: *"aynen benim gibi şimşek yağdırabilsin ve kil topu atabilsin"*
+ bot 7 hasar / 25 can.

### Hedefi sen veriyorsun

Bota "şunu vur" demenin bir yolu yok. Botun **kendi bakışı kullanılamaz**:
`look_at_player` yüzünden bot sürekli sana bakıyor — top doğrudan sana
gelirdi.

Çözüm: **nişan senin.** Baktığın nokta (ya da kilitlendiğin varlık)
hesaplanıyor, botlar oraya atıyor. *"Aynen benim gibi"* tam olarak bu —
senin yaptığın işi senin nişanınla yapıyorlar.

### Kod kopyalanmadı

Şimşek için `_yagmur.js`'teki `yagmurIsi`, top için `toprak_topu.js`'teki
iş fabrikası kullanılıyor. İkincisi bunun için **dışarı açıldı**
(`topIsi(atan, seçenek)`): "atan"ın sağlaması gereken tek şey
`dimension · id · getViewDirection() · getHeadLocation()` — oyuncu da bot
da bunlara sahip. 250 satırlık optimize edilmiş kodu (delta önbelleği,
bütçe sayımı, çarpma kontrolü) kopyalamak yerine parametrelendirildi.

Yeni seçenekler: `yon` (botun kendi bakışı yerine), `oyuncuId`
(`"bot:"` kovası), `kolIndir` (botun kolu yok).

### Testin yakaladığı iki gerçek kusur

**1. Nişan kendi botlarına kilitleniyordu.** Bot önünde dururken "şimşek"
deyince kilit **kendi botuna** takılıyordu — hem botların güçlerinde hem
**oyuncunun kendi `yon_simsegi`'nde**. Bot da bir varlık ve koninin tam
ortasında duruyor. Tek yerde çözüldü: `koniHedefleri` artık
`KILIT_ATLA_TIPLER` kümesindekileri atlıyor. Yani ne sen kendi botuna
yıldırım indiriyorsun ne botlar birbirine.

**2. `getHeadLocation` yoksa iş sessizce hiç açılmıyordu.** "Hiçbir şey
olmadı" sınıfından bir hata. `yardimcilar.js`'e `basKonumu()` eklendi:
`getHeadLocation` varsa onu, yoksa ayak konumu + göz yüksekliği.

### Tavanlar

| güç | tavan | neden |
|---|---|---|
| şimşek | 5 bot | varlık doğurma, ucuz |
| kil topu | 3 bot | blok yazan iş; 20 tanesi ortalığı kullanılmaz yapardı |

Bütçe ortak olduğu için tablet ölmez — ama her top saniyelerce
sürünürdü. Şimşek **oyunculara vurmuyor** (`BOT_SIMSEK_OYUNCU = false`):
yıldırım yangın çıkarıyor ve alan etkisi var, botun kendi kararıyla
arkadaşına yıldırım indirmesi istenmez.

### Çoklu iş

`olustur()` artık **iş dizisi** de dönebiliyor — beş bot = beş iş, ama
tek tetikleme sayılıyor (bekleme süresi bir kez işliyor).

### Güçlendirme

`BOT_HASAR` 5 → **7**, `BOT_CAN` 24 → **25**. Karşılaştırma: vanilla
kurt 4 hasar / 8 can, demir golem 21 / 100. Bot ikisinin arasında ve
yirmi tane olabildiği için bilerek golemin çok altında.

### Komutlar

```
bot simsek    baktığın yere şimşek yağdırırlar
bot top       baktığın yere kil topu atarlar
```
Menüde de var.

Test: **30/30** (`bot.mjs` 24 bölüm).

---

## Aşama 40 — bot görünmez oldu (v4.30)

> *"bot gözükmüyor hallet onu ama diğer işleri de yapıyor onda sıkıntı yok"*

### Teşhis: sunucu sağlam, çizim kırık

Bot takip ediyor, odun topluyor, savaşıyor, doğuyor — yani **davranış
tarafı çalışıyor**. Görünmeyen tek şey çizim. Bu, hatayı ikiye böldü ve
yarısını eledi: sorun `entities/bot.json`'da değil, **resource pack'in
çizim yolunda**.

Zaman çizelgesi kesin: **v4.27'de bot görünüyordu** (kullanıcının
ekran görüntüsü var). **v4.28'de görünmez oldu** — o sürümde çizim
yolunu değiştirdim:

```
v4.27:  render_controllers: ["controller.render.default"]
        textures: { default: "textures/entity/bot" }

v4.28:  render_controllers: ["controller.render.simsek_bot"]
        arrays: { textures: { "Array.cesitler": [...6 doku...] } }
        textures: ["Array.cesitler[query.variant]"]
```

Yapı belgelere uygundu (vanilla köylü/koyun aynı kalıbı kullanıyor) ama
oyunda çizim hiç olmadı. Hangi parçanın reddedildiğini **oyun içi
denemeden bilemem** ve tahminle bir tur daha kaybetmek istemiyorum.

### Karar: kanıtlanmış yola dön

v4.27'nin çalışan kurulumuna dönüldü. **Kaybedilen tek şey botların
birbirinden renkle ayrılması.** Asıl görsel iyileştirme — gerçek yüz,
saç, kıyafet, kemer, eller, botlar — **duruyor**; o dokunun kendisiydi,
çeşit mekanizması değil.

Sunucu tarafındaki `pa:tipN` grupları ve `minecraft:variant` **bilerek
bırakıldı**: çeşitleri tekrar denemek istersek iş yalnızca client
entity'yi ve bir render controller'ı yazmak. Ama o denemeyi **tek
çeşitle** yapmak lazım — görünmezlik sessiz bir hata.

### Testin dürüst sınırı

`bot.mjs` 22. bölüm artık çizim yolunu **kilitliyor**: vanilla
controller mi, `arrays` yok mu, doku PNG'si diskte mi, geometri hâlâ
bizim modelimiz mi.

Ama açıkça yazdım: **bu test görünürlüğü sınayamaz.** Çizim oyunun işi;
buradan yapılabilecek tek şey "çalıştığı bilinen yapıyı koru" demek.
`canli.mjs`'ten de `render_controllers` klasör kontrolü kaldırıldı.

Test: **30/30**.

---

## Aşama 41 — bot topluyor gibi yapıyordu (v4.31)

> *"bot yanımda takılıyor ama bir yandan da odun kendi boşuna kırılıyor,
> botun onu yapmasını görmem gerek"* + *"çantasına baktım sıfır, odun
> olması gerekirken yok"*

İki şikâyet, **tek sebep**.

### Kök sebep: imleç her adımda sıfırlanıyordu

```js
// v4.30'a kadar:
const m = merkezAl(b.varlik);
if (!b.merkez || b.merkez.x !== m.x || ...) { b.merkez = m; b.imlec = 0; }
```

Tarama imleci, bot **bir blok bile kımıldayınca** sıfırlanıyordu. Bot
seni takip ettiği için sürekli hareket halinde — yani imleç hep 0'a
dönüyor ve bot **yalnızca en yakın ~8 offseti** tekrar tekrar tarıyordu
(`BOT_IS_BOT_BASI = 8`).

Sonuç tam olarak görülen şey:
- Uzaktaki ağaçlara **hiç sıra gelmiyor** → çanta boş
- Ara sıra dibindeki bir kütük kırılıyor → *"odun kendi kendine kırılıyor"*

### Neden testler kaçırdı

Testteki bot **hiç kımıldamıyordu**. `bot.mjs` 14. bölüm sabit bir botla
ağacı kesiyor ve geçiyordu. Gerçek oyunda bot hiç durmuyor.

Yeni 25. bölüm botu her tick oynatıyor ve ağacı taramanın **uzak ucuna**
dikiyor. Eski kodla çalıştırıldığında birebir kullanıcının gördüğü sonucu
veriyor:

```
✗ bot HAREKET EDERKEN de uzaktaki agaci kesti  ::  4 kutuk kaldi
✗ odun gercekten teslim edildi                 ::  0 esya
```

### Çözüm: bot çalışırken duruyor

`BOT_IS_DURARAK` — iş başlayınca botlar **duruyor**, iş bitince takibe
dönüyor. Tek çözümle iki şikâyet birden kapanıyor:

- **Toplama düzeldi**: duran botun imleci sıfırlanmıyor, tarama gerçekten
  ilerliyor.
- **Görünürlük düzeldi**: bot orada durup çalışıyor, nerede ne yaptığı
  belli.

Ayrıca imleç eşiği gevşetildi (`BOT_IS_MERKEZ_KAYMA = 3`): fizik itmesi
veya mob çarpması taramayı baştan başlatmasın.

### Görsel ve işitsel geri bildirim

Kırılan blokta **parçacık** çıkıyor ve **ses** çalıyor. Ayrıca ilerleme
actionbar'a yazılıyor (`BOT_IS_RAPOR_ARALIK`): *"⛏ 3 bot odun topluyor ·
47 parça"*. Kullanıcı çalıştığını göremediği için boşuna kırıldığını
sanmıştı.

### Yan düzeltme: çanta artık her blokta diske yazılmıyor

`cantayaKoy` her blokta `JSON.stringify` + `setDynamicProperty`
çağırıyordu. Bot saniyede onlarca blok kırdığı için işin **en pahalı
kısmı** olmuştu. Kayıt artık toplu: `cantaKaydet()` iş bitince ve
teslimde.

Test: **30/30** (`bot.mjs` 27 bölüm).

---

## v4.32 — Derin tarama

> "Madenlerde 10 dakika boyunca kazım yapsın... Elmas getir dediğimde
> veya başka bir zorlu maden getir dediğimde... 10 dakika boyunca madende
> tarama yapsın ardından çeşitli yerlere baksın... verdiğim zorluğa göre
> işin dakikası artsın; yanımda odun var 'odun topla' dediğimde hemen
> yapar ama 'elmas bul 64 tane' veya '4 tane 64'lük demir topla'
> dediğimde iş dakikası artsın... ben bu adam gerçekten yapıyor hissini
> versin."

Yeni dosya: `yetenekler/bot_derin.js`. Normal `bot maden` duruyor;
derin tarama **onun yerine değil yanına** geldi.

### 1. Süre elle girilmiyor, zorluktan hesaplanıyor

```
süre = DERIN_TABAN_SURE + adet × zorluk × DERIN_PARCA_TICK   (tavan: 10 dk)
```

Zorluk katsayıları `ayarlar.js:DERIN_HEDEFLER` içinde, oyunun kendi
cevher dağılımından çıktı:

| istek | süre |
|---|---|
| 64 odun | 1.4 dk |
| 64 demir | 2.3 dk |
| 256 demir ("4 tane 64'lük") | 6.1 dk |
| 64 elmas | 8.5 dk |
| 64 netherit | 10.0 dk (tavan) |

**Süre bir tavan, zorunlu bekleme değil.** 64 elmas 3. dakikada
bulunursa iş 3. dakikada biter. Test bunu kilitliyor (bölüm 5).

### 2. Durak durak arıyor ("çeşitli yerlere baksın")

Bir tarama küresi bitince bot **bir sonraki durağa** gidiyor:

- **yatay:** altın açılı sarmal (`durakNo × 2.39996` radyan, yarıçap
  `DURAK_ADIM × √durakNo`). Düzgün daire aynı yerleri üst üste tarar;
  altın açı noktaları birbirine en uzak dağıtır.
- **dikey:** cevherin gerçek Y seviyesine doğru `DERIN_Y_ADIM`'lık
  basamaklarla. Tek hamlede inmiyor — iniş yolundaki kömürü, demiri de
  topluyor.
- **botlar ayrı yöne gidiyor:** her botun sarmalı `sıra × 2π/n` kadar
  dönük başlıyor. Beş bot beş ayrı koridor tarıyor.

Işınlanma kullanılıyor çünkü **Bedrock'ta yol bulma API'si yok** —
bota "şu mağaraya yürü" denemiyor. Varış noktası taş doluysa iki blok
açılıyor (madenci zaten tünel kazar), lav varsa o durak atlanıyor.

### Yakalanan hata: bot dibindeki elmasa bakmadan gidiyordu

İlk sürümde sarmal 1'den başlıyordu, yani bot işe başlar başlamaz 14
blok öteye ışınlanıyordu. Test bunu yakaladı: etraf baştan başa elmas,
bot **sıfır** getirdi. Artık **durak 0 = botun durduğu yer** — önce
dibindeki alınıyor, sonra sarmal açılıyor (`bot_is.js`'teki offset
sıralamasının aynı mantığı).

### 3. İş boyunca "bekle", sonunda geri dönüyor

Durum "takip" kalsaydı `botTara()` botu `BOT_KURTARMA_MENZIL`'de
yakalayıp yanına ışınlardı ve bot madene bir türlü inemezdi. İş boyunca
"bekle", bitince `botYanaCagir()` — "gitti, çalıştı, geri döndü" hissi
de buradan geliyor. Dönüş teslim menzili için de şart.

### Komut: kullanıcının ağzından

```
bot elmas               → 64 elmas
bot elmas 64            → 64 elmas
bot 64 tane elmas       → 64 elmas
bot 4 tane 64luk demir  → 256 demir   (sayılar ÇARPILIR)
bot demir 4x64          → 256 demir
bot derin               → ne cevher çıkarsa
bot odun 64             → hedefli odun
bot odun / bot maden    → ESKİ hızlı iş (derin tarama değil)
```

Ayrım şu: **sayı ya da "derin" kelimesi varsa hedeflidir.** Kullanıcının
kendi cümlesi de böyleydi. Türkçe ek yutuluyor ("elması" → elmas).

Yazmak istemeyene **menü**: kola dokun → "Bot: DERIN TARAMA". Liste
`ayarlar.js`'ten üretiliyor, elle yazılmıyor — yeni cevher eklenince
menüde kendiliğinden çıkıyor ve süresi de doğru görünüyor.

### Sahte iş yok

- Netherit/kuvars Overworld'de istenirse iş **başlamıyor**, sebebi
  yazılıyor. On dakika boş kazmaktansa doğruyu söylemek.
- Hiçbir şey bulunamazsa "y=... seviyesine yakın bir yerden başlat"
  deniyor; uydurma sonuç üretilmiyor.
- Yol üstündeki başka cevherler de çantaya giriyor ama **hedefe
  sayılmıyor**.

### Yan düzeltme

`main.js` açılışta "2.0.0-BETA isteniyor" yazıyordu; `BETA_GEREKLI`
v4.25'te `false` olmuştu, yani satır **yanlış bilgi veriyordu**. Artık
ayardan okunuyor.

Test: **31/31** (`derin.mjs` 15 bölüm).

---

## v4.33 — Kol temizliği + üç moddan iki fikir

### Kaldırılanlar (kullanıcı isteği)

| kol | ne oldu |
|---|---|
| `pa:kol_can` | **can_verme yeteneği tamamen silindi** |
| `pa:kol_alan` | `alan_simsegi` → Yıldırım Halkası Kolu'na |
| `pa:kol_top` | `toprak_topu` zaten Toprak Kol'daydı |
| `pa:kol_golge` | iki yeteneği de Boralo Kolu'na |

**15 kol → 11 kol.** Gölge Kolu'nun gerekçesi kullanıcının kendi sözüydü:
"gölge kolunun yeteneklerini boralo koluna ekle" — ikisi de aynı kaynaktan
(BoraLo modları) geliyordu ve ikisi de iki yetenekliydi.

**can_verme neden tamamen gitti:** "zaten hem kalp ekleme var, hem iksir
içince onun 4-5 katı süreyle yenilenme geliyor". Rakamlar doğruluyor:

```
can_verme  ->  200 tick (10 sn) yenilenme
iksirler   -> 6000 tick (300 sn) yenilenme
kalp ekle  -> KALICI ek kalp
```

Aynı ihtiyacın üç karşılığı vardı; en zayıfı gitti. `CAN_*` ayarları ve
`CAN_DUSMAN` listesi de silindi.

**Yetenek kaybı yok** (can_verme hariç, o bilerek). `temizlik.mjs` bunu
kilitliyor: kollara bağlı her kimlik gerçek bir yetenek olmalı ve
kaldırılan kolların yetenekleri başka bir kola geçmiş olmalı.

### Silerken yapılan hata

`find -name "*kol_top*" -delete` — **`kol_toprak` dosyalarını da sildi.**
Üretici hepsini geri yazdığı için kalıcı zarar olmadı ama test artık bu
tuzağı bekliyor: "kol_toprak SİLİNMEDİ (kol_top temizliğine kurban
gitmedi)".

### Üç moddan alınan iki fikir

Üç mod da **CraftyCraft** ile üretilmiş (`Bilemiyorum` ve `YeniBoraLoV3`
neredeyse birebir aynı, ~10.5k satır ortak kod; `naber`'in BH/RP klasörleri
ters isimlendirilmiş ve manifest'inde `1.0.0-beta` gametest bağımlılığı var
— paketi bir kez öldüren tuzağın aynısı). Mantık `.mcfunction` dosyalarında,
scriptler sadece `runCommand("function ...")` sarmalayıcısı. İki fikir
alındı:

**1. `zaman_durdur.mcfunction` → `dondur` gerçek kilit kazandı**

```
inputpermission set @a movement disabled
inputpermission set @a camera disabled
```

Tespit doğru: slowness bir oyuncuyu **yavaşlatır ama durdurmaz**,
`inputpermission` gerçekten kilitler. Uygulaması tehlikeliydi:

- **süresiz** — açan komut ayrı, kapatan ayrı dosyada; unutursan oyuncu
  sonsuza kadar kilitli
- `@a` — dünyadaki herkes, mesafe süzgeci yok
- kamerayı da kapatıyor: kilitli oyuncu etrafına bile bakamıyor

Bizde: sadece nişan aldığın hedefe, `DONDUR_SURE` kadar, `bitir()`'de kesin
serbest (iş yarıda kesilse de — test bunu ayrıca sınıyor). Kamera açık
kalıyor. **Son emniyet:** dünyaya her girişte `inputpermission ... enabled`
— script tam kilitliyken çökse bile oyuncu serbest başlar.

**Test yazarken çıkan gerçek hata:** `koniHedefleri()` oyuncuları
varsayılan olarak atlıyor ve `dondur` `oyuncuDahil` geçmiyordu — yani girdi
kilidi **ölü koddu**, hedef hiçbir zaman oyuncu olamazdı. `DONDUR_OYUNCU`
eklendi.

**2. Köylü klonlarından → bot yerdeki eşyayı topluyor**

Üç modun ortak yanı bütün karakterlerin köylü klonu olmasıydı; köylüler
`minecraft:behavior.pickup_items` taşır. Onlarda bu bir **yan etkiydi**
(köylüyü kopyalayınca geldi). Burada bilinçli: bot yere düşen eşyayı alıyor,
`botTara()` da botun kutusunu ekip çantasına boşaltıyor.

Neden aktarılıyor: yoksa iki ayrı depo olurdu ve "bot teslim" dediğinde
botun kutusundaki gelmezdi. Sıra `çantaya koy → kutudan sil`; silme
başarısız olursa çanta geri alınıyor, yoksa **eşya kopyalanırdı** (test
bunu da sınıyor).

Test: **32/32** (yeni `temizlik.mjs`).

---

## v4.34 — İlkel Beşli

Kullanıcı bir boss listesi getirdi (İlkel Beşli) ve "bunlar benim kişisel
botlarım olacak" dedi. Yani beş **düşman**, beş **müttefik** oldu.

### Çeviri kuralı

| | |
|---|---|
| **sayılar** | AYNEN korundu — can, hasar, iyileşme miktarı, efekt seviyesi, süre |
| **hedefler** | TERS çevrildi — "oyuncuya Yavaşlık III" → botun **vurduğu şeye** |

Kendi botun seni körleştirseydi bu bir özellik değil ceza olurdu. Raxxan'ın
"30 blok civarındaki oyunculara Bulantı V"i de civardaki **düşmanlara**
gidiyor; sahip ve ekip arkadaşları dışarıda (`ILKEL_AURA_OYUNCU`).

### Üyeler

| üye | can/hasar | script tarafı |
|---|---|---|
| Kajaros | 1750 / 23 | vurulunca +20 can · vurduğuna Yavaşlık III + Bulantı III + Körlük III (7,5 sn) |
| Miskel | 1300 / 14 | vurulunca +40 can · vurduğuna Körlük XVI (6 sn) **veya** Solgunluk VII (4 sn) |
| Harkos | 1300 / 13 | tik başına 0,5 HP pasif iyileşme |
| Raxxan | 1000 / 15 | 30 blokta düşmana Bulantı V · ara ara görünmezlik · %10 ihtimalle +100 can |
| Okazor | 1200 / 50 | 4 sn'lik pencerede 3 üst üste vuruş → can tamamen dolar |

### Neden ayrı varlık değil

Beşi de `pa:bot`'un **bileşen grupları**. Böyle olunca defter, çanta,
teslim, odun/maden, derin tarama, savaş anahtarı — hepsi olduğu gibi
çalışıyor. Kajaros da odun toplar, Harkos da derin tarama yapar. Ayrı varlık
yapsaydık `_bot_defteri.js` baştan yazılırdı ve "bot varlığı kayıtlı değil"
hatası beş katına çıkardı.

**Varlık JSON'unda** (kol_uret.py): can, hasar, ölçek, geri itilme
bağışıklığı (Kajaros/Raxxan/Okazor), Miskel'in ok atması
(`shooter` + `ranged_attack`), Harkos'un sıçraması (`leap_at_target`).
**Script'te** (bot_ilkel.js): vuruşa/hasara bağlı her şey, pasif iyileşme,
aura, Okazor'un serisi.

### Görünüş

Beş üye de normal bot gibi çizilir; farkı **boyu ve ismi** (`nameTag`).
Ayrı doku denemedim — v4.28'de bot dokusuna dokununca bot tamamen görünmez
olmuştu ve sebebini bulmak üç sürüm aldı.

### Yakalanan hata: `botCagir`'ın `tavan` alanı iki anlamda

```js
başarıda       { dogdu: true, ..., tavan: BOT_TAVAN }   // sayı, bilgi
tavan dolunca  { tavan: true, ... }                     // bayrak
```

`if (sonuc.tavan)` başarılı çağrıyı da yakalıyordu: bot doğuyor ama
"tavandasın" hatası dönüyordu. Doğru sınama `dogdu`.

### Denge notu

Bunlar patron sayıları: Okazor 50 hasar vuruyor (demir golem 21), Kajaros
1750 can taşıyor (ender ejderi 200). Yanında bir tanesi bile oyunu
kolaylaştırır — bilinçli bir tercih, sayılar kullanıcının verdiği listeden.
`ILKEL_TAVAN` (isim başına kaç tane) ve `ILKEL_ACIK` ile ayarlanabilir.

Komut: `bot ilkel` (sıradaki eksik üye) · `bot kajaros` · `bot suikastci`.
Menü: kola dokun → "Bot: İLKEL BEŞLİ" → listede kimin ne yaptığı yazıyor,
"Hepsini çağır" düğmesi de var.

Test: **33/33** (yeni `ilkel.mjs`, 12 bölüm).

---

## v4.35 — Beş skin, beş varlık, bir rütbe zinciri

Kullanıcı beş adet 64×64 skin gönderdi ve "bunlar beni özel koruyanlar,
bunlar ekip" dedi. Ayrıca rütbe istedi: **Okazor lider, Harkos en alt** —
bu ikisi kullanıcının kararı, değiştirilemez. Aradaki üç sıra bana bırakıldı.

### Rütbe sıralaması

| # | üye | ünvan | gerekçe |
|---|---|---|---|
| 1 | **Okazor** | Ekip Lideri | kullanıcı kararı |
| 2 | **Kajaros** | Muhafız Komutanı | 1750 can (en yüksek), geri itilmez — lideri koruyan duvar |
| 3 | **Raxxan** | Gölge Ustası | görünmezlik + 30 bloklu zihin aurası; psikolojik harp |
| 4 | **Miskel** | Savaş Büyücüsü | menzilli destek, uzmanlık sınıfı |
| 5 | **Harkos** | Gölge Çırağı | kullanıcı kararı — en düşük hasar (13), en hızlı |

Rütbe isim etiketinde görünüyor (`[2] İlkel Muhafız Kajaros · Muhafız
Komutanı`), menü rütbe sırasında diziliyor ve "çağır"a bastıkça ekip
**yukarıdan aşağı** kuruluyor.

### Neden beş ayrı varlık oldular

v4.34'te beşi de `pa:bot`'un bileşen gruplarıydı. Beş ayrı **skin** gelince
bu yetmedi: **bir varlığın tek istemci tanımı, tek dokusu vardır.** Çeşide
göre doku seçmek `arrays` + `query.variant` + özel render controller
gerektiriyor — v4.28'de tam o denendi ve **bot görünmez oldu**, sebebini
bulmak üç sürüm aldı.

Bu yüzden yol değiştirildi: **her üye kendi varlığı, kendi istemci tanımı,
kendi tek dokusu.** Çizim yolu botunkiyle birebir aynı
(`controller.render.default` + tek texture) — yani çalıştığı bilinen kurulum
beş kez tekrarlanıyor, çalışmadığı bilinen kurulum hiç kullanılmıyor.

Riski de dar: beşinin çizimi bozulsa bile **normal bot etkilenmez**, onun
dosyalarına dokunulmadı.

Skinler doğrudan kullanılabildi çünkü bot geometrisi zaten oyuncu skin
düzeninde: kafa 0,0 · gövde 16,16 · sağ kol 40,16 · sol kol 32,48 · sağ
bacak 0,16 · sol bacak 16,48.

### Eşleştirme (değiştirmek kolay)

`kol_uret.py:ILKEL_SKIN` tablosunda dosya adını değiştirip üreteci tekrar
çalıştırmak yeterli.

### Kimlik artık çoğul

`BOT_KIMLIK` tek başına yetmiyor; `BOT_KIMLIKLER` **`ILKEL_BESLI`'den
türetiliyor**, elle yazılmıyor. Bunu unutmak sinsi olurdu: bot menüsü
açılmaz, **nişan kendi Okazor'una kilitlenir**, botlar birbirini döverdi.
`KILIT_ATLA_TIPLER` de artık bu kümeden geliyor.

Defter tarafı: `botCagir(oyuncu, kimlik)`, boyut taraması altı türü de
geziyor, `eksikBotTurleri()` kayıtsız varlıkları durum raporuna basıyor.

### Koruma görevi

"Bunlar beni özel koruyanlar" — ekip savaşı kapalı olsa bile bu beş üye
**savaşa hazır doğuyor** (`ILKEL_KORUMA`). Elle "bot savaş kapat" dersen
yine susarlar; bu bir başlangıç durumu, kilit değil.

### `canli.mjs` bölüm 4: her varlığın çizimi tam mı

Yeni varlık = yeni sessiz hata riski. Artık `entities/` altındaki her
varlık için sınanıyor: istemci tanımı var mı, kimlikler aynı mı, dokusu
gerçekten diskte mi, geometrisi tanımlı mı, **özel render controller
kullanmıyor mu**. v4.28'in hatası bir daha sessizce geçemez.

Test: **33/33** (`ilkel.mjs` 13 bölüm, `canli.mjs` 4 bölüm).

---

## v4.36 — Hiyerarşi kesinleşti

Dört seçenek sunuldu, kullanıcı beşincisini seçti:

| # | üye | ünvan | can |
|---|---|---|---|
| 1 | **Okazor** | Ekip Lideri | 1200 |
| 2 | **Miskel** | Baş Büyücü | 1300 |
| 3 | **Kajaros** | Muhafız Komutanı | 1750 |
| 4 | **Raxxan** | Gölge Ajanı | 1000 |
| 5 | **Harkos** | Gölge Çırağı | 1300 |

Bu ekipte **büyü askerî rütbenin üstünde**: Miskel, ekibin en canlı üyesi
olan Kajaros'un amiri. Rütbe can/hasar sırasıyla **kasten örtüşmüyor** —
rütbe bir görev sırası, güç sıralaması değil. Test bunu ayrıca kilitliyor
("rütbe, can sıralamasından bağımsız"), yani ileride biri "canına göre
dizelim" diye düzeltmeye kalkarsa patlar.

### "Hepsini çağır" kaldırıldı

> "bir anda 5 tanesi de gelmesin tek tek aralarından seçerim"

Haklı: beş patronu aynı anda yan yana dizmek hem ekibi sıradanlaştırıyor
hem kimin ne yaptığını görmeni engelliyor. Üye seçmek artık bilinçli bir
karar — menüden birini seç, o gelir. `bot ilkel` komutu da sıradaki eksik
üyeyi getiriyor, hepsini değil.

Test: **33/33** (`ilkel.mjs` 13 bölüm + hiyerarşi bekçisi).

---

## v4.37 — El-Harkos

Kullanıcı bildirdi: **tam adı El-Harkos**, "Harkos" kısaltması. Görünen ad
güncellendi (isim etiketi, menü, dil dosyası, yumurta adı); sohbette
`el-harkos`, `elharkos`, `el` ve kısaltma `harkos` — hepsi aynı üyeye
gidiyor.

**Varlık kimliği `pa:harkos` olarak KALDI.** Kimliği değiştirmek mevcut
dünyalarda doğmuş El-Harkos'u "bilinmeyen varlık" yapardı; doku dosyası ve
bot kayıtları da ona bağlı. **Ad bir görünüm, kimlik bir sözleşme** — test
bu ayrımı da kilitliyor.

---

## v4.38 — Skin eşleştirmesi tahmindi, tutmadı

Kullanıcı beş skini tek mesajda gönderdi, kimin kim olduğunu söylemedi.
v4.35'te eşleştirmeyi **ben tahmin ettim** (renk ve havaya bakarak). Oyunda
çağırınca çıktı: gri miğferli asker **Kajaros değil, El-Harkos**'muş.

Ders şu: **skin bir görünüş değil kimlik.** Tahmin edilmez, sorulur. Kalan
dördü artık tabloda açıkça `? tahmin` diye işaretli; sadece El-Harkos
`ONAYLI`.

### `onizle_ilkel.py` — eşleştirme tablosu

Kullanıcının doğrulamak için oyuna girip tek tek çağırması gerekiyordu.
Artık gerekmiyor: bu betik her üyenin **atanmış** skinini oyuncu skin
düzeninden ön görünüme çevirip rütbe + ünvan + onay durumuyla tek bir PNG'ye
diziyor.

Rütbe ve adlar `ayarlar.js`'ten **okunuyor**, betiğe elle yazılmıyor —
yoksa tablo kodla birlikte bayatlardı.

Eşleştirmeyi düzeltmek: `kol_uret.py:ILKEL_SKIN` içinde dosya adını
değiştir, üreteci çalıştır.

---

## v4.39 — Miskel ve Raxxan da onaylandı

Kullanıcı iki düzeltme birden verdi:

- "Raxxan olarak adlandırılan kişi aslında **Miskel**"
- "Kajaros'tan Raxxan'a, **bu**" (o an Kajaros'ta duran skin)

Kalan iki skin (Okazor ↔ Kajaros) hâlâ tahmin — ikisi de iki yuvaya
sığdığı için artık düz bir ya/ya da.

### Onay durumu tek kaynağa taşındı

`kol_uret.py:ILKEL_SKIN_ONAY`. Önizleme betiği de artık orayı **okuyor**;
önce iki ayrı yerde tutuluyordu ve "tablo onaylı derken üretici tahmin
der, kimse fark etmez" durumu vardı.

**Yamanın kendisi ilk denemede sessizce tutmadı** — `str.replace` eşleşmedi
ve dosya değişmeden geri yazıldı, tablo eski etiketleri göstermeye devam
etti. Artık `assert` var: eşleşmezse patlıyor. (Aynı ders, üçüncü kez:
sessizce hiçbir şey yapmayan kod, hata veren koddan beterdir.)

### Eşleştirme tamamlandı

| # | üye | skin | durum |
|---|---|---|---|
| 1 | Okazor | siyah kapüşon + altın kuşak | ONAYLI |
| 2 | Miskel | siyah/beyaz maske | ONAYLI |
| 3 | Kajaros | beyaz başlık + kahve göğüs | ONAYLI |
| 4 | Raxxan | miğfersiz, kahve saç | ONAYLI |
| 5 | El-Harkos | gri miğferli asker | ONAYLI |

Beş tahminden **üçü yanlıştı**. `kol_uret.py`'deki tabloya "bu tabloyu
değiştirme, renklere bakıp düzeltmeye kalkma" notu düşüldü — tam o hata
yapılmıştı.

Dokular değişmediği için paket yeniden kurulmasına gerek yok: v4.39 son hâli.

---

## v4.40 — Sürüm artık paketin adında

Kullanıcı v4.39'dan sonra "sorun hâlâ düzelmedi, isimler yanlış" dedi.
Paketin içi **kontrol edildi ve doğruydu** — beş dokunun md5'i onaylanan
eşleştirmeyle birebir aynı. Yani hata dosyada değil, **oyunun hangi paketi
yüklediğindeydi.**

### Kök sebep: iki ayrı paket, ayrı ayrı güncelleniyor

Bedrock'ta davranış paketi (script, isimler) ile kaynak paketi (skinler)
**ayrı iki pakettir** ve dünyaya ayrı ayrı uygulanır. Biri güncellenip
diğeri eski kalırsa ortaya anlaşılmaz bir tablo çıkıyor:

| belirti | sebep |
|---|---|
| isimler doğru, **skinler yanlış** | kaynak paketi eski |
| isimler de yanlış | davranış paketi de eski |

Bunu dışarıdan görmenin bir yolu yoktu — paket listesinde ikisi de aynı
adla duruyordu.

### Çözüm

`paketle.sh` artık paketlemeden önce `header.name`'i **manifest'teki
sürümden** üretiyor:

```
Simsek TNT ve Toprak Topu v4.40
Simsek Kol Gorunumleri v4.40
```

Dünya ayarlarındaki paket listesine bakınca hangi sürümün etkin olduğu
okunuyor. Ad elle yazılmıyor, sürümden geliyor — yani bir daha ayrışamaz.

Ayrıca dünyaya girerken zaten basılan `[SimsekTNT v4.40] yuklendi` satırı
davranış paketinin sürümünü söylüyor. İkisi birlikte bakılınca hangi
paketin geride kaldığı tek bakışta belli oluyor.

---

## v4.41 — Canlar kalp cinsindenmiş, hepsi ikiye katlandı

Kaynak listedeki "1750 HP" aslında **1750 KALP** demekmiş. Minecraft'ta
1 kalp = 2 HP olduğu için dosyaya iki katı yazılması gerekiyordu; ilk
sürümde sayılar olduğu gibi girilmişti, yani **herkes yarım canla
dolaşıyordu.**

| üye | önce | şimdi | oyunda görünen |
|---|---|---|---|
| Kajaros | 1750 HP | **3500 HP** | 1750 kalp |
| Miskel | 1300 | **2600** | 1300 kalp |
| El-Harkos | 1300 | **2600** | 1300 kalp |
| Okazor | 1200 | **2400** | 1200 kalp |
| Raxxan | 1000 | **2000** | 1000 kalp |

Aynı kural **iyileşme miktarları** için de geçerli — onlar da kaynakta
"HP" diye yazılıydı: Kajaros +20→**40**, Miskel +40→**80**, Raxxan'ın ani
iyileşmesi +100→**200**, Harkos'un tik başına 0,5→**1**.

**Hasara dokunulmadı:** kaynakta "23 Hasar" yazıyor, "23 HP" değil.

### İki hata, ikisi de yakalandı

1. **Sıralı `replace` birbirini yedi.** `20→40` sonra `40→80` yapınca
   Kajaros'un yeni 40'ı da 80 oldu: Kajaros 80, Miskel 40 — ters. Çıktıyı
   tabloya basınca görüldü. Ders: aynı dosyada zincirleme değiştirme
   yaparken önceki adımın çıktısı sonrakinin girdisi olabiliyor.
2. **Üreteci çalıştırmayı unuttum.** `kol_uret.py` güncellendi ama varlık
   JSON'ları eski kaldı. `ilkel.mjs` bölüm 1 tam bunun için yazılmıştı ve
   yakaladı: *"JSON 1750 / ayar 3500"*.

Testlerdeki rakamlar da artık `ayarlar.js`'ten **türetiliyor** — elle
yazılsaydı bu tur sessizce eski rakamı sınamaya devam ederdi.

### `paketle.sh`: dosya adı da sürümden

Paketin içi v4.41'di ama dosya adı `SimsekTNT_v440.mcaddon` diyordu — `S=`
elle yazılıyordu. Artık manifest'ten okunuyor. Sürüm bilgisi üç yerde
(dosya adı, paket adı, açılış satırı) ve üçü de **tek kaynaktan**.

---

## v4.42 — Hasarlar da kalp cinsinden

Kaynaktaki "23 Hasar" da kalp demekmiş. Aynı kural, ikiye katlandı:

| üye | hasar (HP) | **kalp/vuruş** |
|---|---|---|
| Okazor | 100 | **50** |
| Kajaros | 46 | 23 |
| Raxxan | 30 | 15 |
| Miskel | 28 | 14 |
| El-Harkos | 26 | 13 |

**Okazor'un tek vuruşu 50 kalp.** Normal bir oyuncuyu (10 kalp) beş kez
öldürür; kalp tavanındaki bir oyuncuyu (110 kalp) üç vuruşta bitirir.
Bilinçli — sayılar kullanıcının listesinden ve o liste patron listesiydi.

Bununla İlkel Beşli'nin bütün sayıları kaynakla birebir aynı hâle geldi:
can, hasar, iyileşme, efekt seviyesi, süre.

---

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
